import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { pool, logAuditEvent } from '../db';
import { config } from '../config';
import { revokeJwtToken } from '../middlewares/security';
import {
  AuthResponse,
  LoginDto,
  RegisterDto,
  UpdateProfileDto,
  UserRole,
  UserWithProfile,
} from '../../../packages/shared/src/contracts/user';
import {
  isValidAgeGroup,
  isValidEmail,
  isValidSkillLevel,
  sanitizeOptionalText,
  validateRegistrationPayload,
} from '../../../packages/shared/src/security/validation';

const PROTECTED_DEMO_EMAILS = new Set([
  'admin@smarttennis.com',
  'treinador@smarttennis.com',
  'jogador@smarttennis.com',
  'kids@smarttennis.com',
]);

export function mapUserRowToUserWithProfile(userRow: any): UserWithProfile {
  return {
    id: userRow.id,
    name: userRow.name,
    email: userRow.email,
    role: userRow.role,
    isActive: Boolean(userRow.is_active),
    createdAt: userRow.created_at,
    updatedAt: userRow.updated_at,
    profile: userRow.profile_id
      ? {
          id: userRow.profile_id,
          userId: userRow.id,
          skillLevel: userRow.skill_level,
          ageGroup: userRow.age_group,
          trainingGoals: userRow.training_goals,
          preferences: userRow.preferences,
          physicalRestrictions: userRow.physical_restrictions,
          guardianName: userRow.guardian_name ?? null,
          guardianConsent: Boolean(userRow.guardian_consent),
          telemetryConsent:
            userRow.telemetry_consent !== undefined ? Boolean(userRow.telemetry_consent) : true,
          createdAt: userRow.created_at,
          updatedAt: userRow.updated_at,
        }
      : null,
  };
}

export const USER_WITH_PROFILE_SELECT = `
  SELECT u.id, u.name, u.email, u.password_hash, u.role, u.is_active, u.created_at, u.updated_at,
         p.id as profile_id, p.skill_level, p.age_group, p.training_goals, p.preferences,
         p.physical_restrictions, p.guardian_name, p.guardian_consent, p.telemetry_consent
  FROM users u
  LEFT JOIN player_profiles p ON p.user_id = u.id
`;

export async function register(req: Request, res: Response): Promise<void> {
  const body: RegisterDto = req.body || {};
  const ip = req.ip || req.socket.remoteAddress || 'unknown';

  const validation = validateRegistrationPayload(body, { allowPrivilegedRoles: false });
  if (!validation.valid) {
    if (validation.privilegeEscalationAttempt) {
      await logAuditEvent(
        'PRIVILEGE_ESCALATION_BLOCKED',
        null,
        typeof body.email === 'string' ? body.email.trim().toLowerCase() : 'unknown',
        ip,
        `Tentativa bloqueada de auto-cadastro com perfil privilegiado: ${String(body.role)}`
      );
      res.status(403).json({ error: validation.error });
      return;
    }
    res.status(400).json({ error: validation.error });
    return;
  }

  const emailClean = body.email.trim().toLowerCase();
  const cleanName = sanitizeOptionalText(body.name, 150) || body.name.trim();

  try {
    // Verificar duplicidade de e-mail
    const [existing] = await pool.query<any[]>(
      'SELECT id FROM users WHERE email = ?',
      [emailClean]
    );

    if (existing.length > 0) {
      res.status(409).json({ error: 'Este e-mail já está cadastrado' });
      return;
    }

    const passwordHash = await bcrypt.hash(body.password, 10);
    // Princípio do menor privilégio (RF01 / RNF Segurança): auto-cadastro público cria estritamente JOGADOR
    const role: UserRole = 'JOGADOR';
    const skillLevel = body.skillLevel || 'INICIANTE';
    const ageGroup = body.ageGroup || 'ADULTO';
    const isMinor = ageGroup === 'KIDS';

    const cleanGoals = sanitizeOptionalText(body.trainingGoals, 500) ?? null;
    const cleanPrefs = sanitizeOptionalText(body.preferences, 500) ?? null;
    // Coleta mínima para crianças e adolescentes (Seção 3 - LGPD)
    const cleanRestrictions = isMinor
      ? sanitizeOptionalText(body.physicalRestrictions, 200) ?? null
      : sanitizeOptionalText(body.physicalRestrictions, 500) ?? null;
    const cleanGuardian = isMinor ? sanitizeOptionalText(body.guardianName, 150) ?? null : null;
    const guardianConsent = isMinor ? (body.guardianConsent ? 1 : 0) : 0;
    const telemetryConsent =
      body.telemetryConsent !== undefined ? (body.telemetryConsent ? 1 : 0) : isMinor ? 0 : 1;

    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      const [userRes] = await conn.query<any>(
        'INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)',
        [cleanName, emailClean, passwordHash, role]
      );

      const userId = userRes.insertId;

      const [profRes] = await conn.query<any>(
        `INSERT INTO player_profiles (
          user_id, skill_level, age_group, training_goals, preferences,
          physical_restrictions, guardian_name, guardian_consent, telemetry_consent
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          userId,
          skillLevel,
          ageGroup,
          cleanGoals,
          cleanPrefs,
          cleanRestrictions,
          cleanGuardian,
          guardianConsent,
          telemetryConsent,
        ]
      );

      await conn.commit();

      await logAuditEvent(
        'REGISTER',
        userId,
        cleanName,
        ip,
        `Novo praticante registrado (${ageGroup}${isMinor ? ' - consentimento parental LGPD validado' : ''})`
      );

      const token = jwt.sign(
        { id: userId, email: emailClean, role },
        config.jwtSecret,
        { expiresIn: config.jwtExpiresIn as any }
      );

      const responseData: AuthResponse = {
        token,
        user: {
          id: userId,
          name: cleanName,
          email: emailClean,
          role,
          isActive: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          profile: {
            id: profRes.insertId || 0,
            userId,
            skillLevel,
            ageGroup,
            trainingGoals: cleanGoals,
            preferences: cleanPrefs,
            physicalRestrictions: cleanRestrictions,
            guardianName: cleanGuardian,
            guardianConsent: Boolean(guardianConsent),
            telemetryConsent: Boolean(telemetryConsent),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        },
      };

      res.status(201).json(responseData);
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  } catch (err: any) {
    console.error('Erro no cadastro:', err);
    res.status(500).json({ error: 'Erro interno ao realizar cadastro' });
  }
}

export async function login(req: Request, res: Response): Promise<void> {
  const body: LoginDto = req.body || {};
  const ip = req.ip || req.socket.remoteAddress || 'unknown';

  if (!isValidEmail(body.email) || typeof body.password !== 'string' || !body.password) {
    res.status(400).json({ error: 'E-mail válido e senha são obrigatórios' });
    return;
  }

  const emailClean = body.email.trim().toLowerCase();

  try {
    const [rows] = await pool.query<any[]>(
      `${USER_WITH_PROFILE_SELECT} WHERE u.email = ?`,
      [emailClean]
    );

    const userRow = rows[0];

    if (!userRow) {
      await logAuditEvent('LOGIN_FAIL', null, emailClean, ip, 'Tentativa com e-mail inexistente');
      res.status(401).json({ error: 'Credenciais inválidas' });
      return;
    }

    if (!userRow.is_active) {
      await logAuditEvent('LOGIN_BLOCKED', userRow.id, userRow.name, ip, 'Tentativa em conta desativada');
      res.status(403).json({ error: 'Esta conta foi desativada pelo administrador' });
      return;
    }

    const isMatch = await bcrypt.compare(body.password, userRow.password_hash);
    if (!isMatch) {
      await logAuditEvent('LOGIN_FAIL', userRow.id, userRow.name, ip, 'Senha incorreta');
      res.status(401).json({ error: 'Credenciais inválidas' });
      return;
    }

    await logAuditEvent('LOGIN_SUCCESS', userRow.id, userRow.name, ip, 'Autenticação bem-sucedida');

    const token = jwt.sign(
      { id: userRow.id, email: userRow.email, role: userRow.role },
      config.jwtSecret,
      { expiresIn: config.jwtExpiresIn as any }
    );

    res.json({ token, user: mapUserRowToUserWithProfile(userRow) });
  } catch (err: any) {
    console.error('Erro no login:', err);
    res.status(500).json({ error: 'Erro interno ao realizar login' });
  }
}

export async function logout(req: Request, res: Response): Promise<void> {
  const ip = req.ip || req.socket.remoteAddress || 'unknown';

  if (req.rawToken) {
    revokeJwtToken(req.rawToken, req.tokenExp);
  }

  if (req.user) {
    await logAuditEvent('LOGOUT', req.user.id, req.user.name, ip, 'Sessão encerrada pelo usuário');
  }

  res.json({ message: 'Sessão encerrada com sucesso' });
}

export async function getMe(req: Request, res: Response): Promise<void> {
  if (!req.user) {
    res.status(401).json({ error: 'Não autenticado' });
    return;
  }

  try {
    const [rows] = await pool.query<any[]>(
      `${USER_WITH_PROFILE_SELECT} WHERE u.id = ?`,
      [req.user.id]
    );

    const userRow = rows[0];
    if (!userRow) {
      res.status(404).json({ error: 'Usuário não encontrado' });
      return;
    }

    res.json(mapUserRowToUserWithProfile(userRow));
  } catch (err: any) {
    console.error('Erro ao buscar perfil atual:', err);
    res.status(500).json({ error: 'Erro ao buscar perfil' });
  }
}

export async function updateProfile(req: Request, res: Response): Promise<void> {
  if (!req.user) {
    res.status(401).json({ error: 'Não autenticado' });
    return;
  }

  const body: UpdateProfileDto = req.body || {};
  const ip = req.ip || req.socket.remoteAddress || 'unknown';

  if (body.skillLevel !== undefined && !isValidSkillLevel(body.skillLevel)) {
    res.status(400).json({ error: 'Nível técnico inválido' });
    return;
  }
  if (body.ageGroup !== undefined && !isValidAgeGroup(body.ageGroup)) {
    res.status(400).json({ error: 'Faixa etária inválida' });
    return;
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    if (body.name !== undefined) {
      const sanitizedName = sanitizeOptionalText(body.name, 150);
      if (!sanitizedName || sanitizedName.length < 2) {
        await conn.rollback();
        res.status(400).json({ error: 'O nome deve ter no mínimo 2 caracteres' });
        return;
      }
      await conn.query('UPDATE users SET name = ? WHERE id = ?', [sanitizedName, req.user.id]);
    }

    const [currentRows] = await conn.query<any[]>(
      'SELECT * FROM player_profiles WHERE user_id = ?',
      [req.user.id]
    );
    const current = currentRows[0];

    const nextSkill = body.skillLevel ?? current?.skill_level ?? 'INICIANTE';
    const nextAge = body.ageGroup ?? current?.age_group ?? 'ADULTO';

    // Permite limpar explicitamente campos opcionais enviando string vazia "" ou null (corrige bug COALESCE)
    const nextGoals =
      body.trainingGoals !== undefined
        ? sanitizeOptionalText(body.trainingGoals, 500) ?? null
        : current?.training_goals ?? null;
    const nextPrefs =
      body.preferences !== undefined
        ? sanitizeOptionalText(body.preferences, 500) ?? null
        : current?.preferences ?? null;
    const nextRestrictions =
      body.physicalRestrictions !== undefined
        ? sanitizeOptionalText(body.physicalRestrictions, nextAge === 'KIDS' ? 200 : 500) ?? null
        : current?.physical_restrictions ?? null;

    const nextGuardianName =
      body.guardianName !== undefined
        ? sanitizeOptionalText(body.guardianName, 150) ?? null
        : current?.guardian_name ?? null;
    const nextGuardianConsent =
      body.guardianConsent !== undefined
        ? body.guardianConsent
          ? 1
          : 0
        : current?.guardian_consent ?? 0;
    const nextTelemetryConsent =
      body.telemetryConsent !== undefined
        ? body.telemetryConsent
          ? 1
          : 0
        : current?.telemetry_consent ?? (nextAge === 'KIDS' ? 0 : 1);

    if (nextAge === 'KIDS') {
      if (!nextGuardianConsent || !nextGuardianName || nextGuardianName.length < 3) {
        await conn.rollback();
        res.status(400).json({
          error:
            'Perfil infantil (Modo Kids) requer nome e consentimento explícito do responsável legal (LGPD)',
        });
        return;
      }
    }

    await conn.query(
      `INSERT INTO player_profiles (
        user_id, skill_level, age_group, training_goals, preferences,
        physical_restrictions, guardian_name, guardian_consent, telemetry_consent
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        skill_level = VALUES(skill_level),
        age_group = VALUES(age_group),
        training_goals = VALUES(training_goals),
        preferences = VALUES(preferences),
        physical_restrictions = VALUES(physical_restrictions),
        guardian_name = VALUES(guardian_name),
        guardian_consent = VALUES(guardian_consent),
        telemetry_consent = VALUES(telemetry_consent)`,
      [
        req.user.id,
        nextSkill,
        nextAge,
        nextGoals,
        nextPrefs,
        nextRestrictions,
        nextAge === 'KIDS' ? nextGuardianName : null,
        nextAge === 'KIDS' ? nextGuardianConsent : 0,
        nextTelemetryConsent,
      ]
    );

    await conn.commit();

    await logAuditEvent('UPDATE_PROFILE', req.user.id, req.user.name, ip, 'Perfil esportivo e preferências LGPD atualizados');

    const [rows] = await pool.query<any[]>(
      `${USER_WITH_PROFILE_SELECT} WHERE u.id = ?`,
      [req.user.id]
    );

    res.json(mapUserRowToUserWithProfile(rows[0]));
  } catch (err: any) {
    await conn.rollback();
    console.error('Erro ao atualizar perfil:', err);
    res.status(500).json({ error: 'Erro interno ao atualizar perfil' });
  } finally {
    conn.release();
  }
}

/**
 * Direito de eliminação dos dados pessoais pelo titular (LGPD - Seção 5)
 */
export async function deleteMyAccount(req: Request, res: Response): Promise<void> {
  if (!req.user) {
    res.status(401).json({ error: 'Não autenticado' });
    return;
  }

  const ip = req.ip || req.socket.remoteAddress || 'unknown';

  if (PROTECTED_DEMO_EMAILS.has(req.user.email.toLowerCase())) {
    res.status(400).json({
      error:
        'Contas institucionais de demonstração são protegidas. Cadastre uma conta própria para testar a exclusão definitiva (LGPD).',
    });
    return;
  }

  try {
    if (req.user.role === 'ADMIN') {
      const [admins] = await pool.query<any[]>(
        "SELECT COUNT(*) as total FROM users WHERE role = 'ADMIN' AND is_active = 1"
      );
      if ((admins[0]?.total || 0) <= 1) {
        res.status(400).json({
          error: 'Não é possível excluir o único administrador ativo do sistema.',
        });
        return;
      }
    }

    const deletedId = req.user.id;
    await pool.query('DELETE FROM users WHERE id = ?', [deletedId]);

    if (req.rawToken) {
      revokeJwtToken(req.rawToken, req.tokenExp);
    }

    // Registro sem dados pessoais identificáveis em conformidade com a minimização LGPD
    await logAuditEvent(
      'LGPD_SELF_DELETE',
      null,
      'Titular Removido (LGPD)',
      ip,
      `Conta ID #${deletedId} e perfil associado eliminados por solicitação do próprio titular`
    );

    res.json({ message: 'Conta e dados pessoais removidos com sucesso conforme a LGPD.' });
  } catch (err: any) {
    console.error('Erro ao excluir própria conta (LGPD):', err);
    res.status(500).json({ error: 'Erro interno ao excluir conta' });
  }
}
