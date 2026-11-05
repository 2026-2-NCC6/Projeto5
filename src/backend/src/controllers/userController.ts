import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { pool, logAuditEvent } from '../db';
import {
  mapUserRowToUserWithProfile,
  USER_WITH_PROFILE_SELECT,
} from './authController';
import {
  AdminCreateUserDto,
  UpdateUserDto,
  UserWithProfile,
} from '../../../packages/shared/src/contracts/user';
import {
  applyPrivacyPolicyToUser,
  isValidUserRole,
  sanitizeOptionalText,
  validateRegistrationPayload,
} from '../../../packages/shared/src/security/validation';

export async function listUsers(req: Request, res: Response): Promise<void> {
  try {
    const roleFilter = req.query.role as string | undefined;
    const search = req.query.q as string | undefined;
    const anonymizeDemo =
      req.query.anonymize === 'true' || req.query.anonymize === '1';

    let query = `${USER_WITH_PROFILE_SELECT} WHERE 1=1`;
    const params: any[] = [];

    if (roleFilter && isValidUserRole(roleFilter)) {
      query += ' AND u.role = ?';
      params.push(roleFilter);
    }

    if (search) {
      const cleanSearch = search.trim().slice(0, 100);
      query += ' AND (u.name LIKE ? OR u.email LIKE ?)';
      params.push(`%${cleanSearch}%`, `%${cleanSearch}%`);
    }

    query += ' ORDER BY u.created_at DESC';

    const [rows] = await pool.query<any[]>(query, params);
    const requester = req.user!;

    const users: UserWithProfile[] = rows.map((r) =>
      applyPrivacyPolicyToUser(mapUserRowToUserWithProfile(r), requester, {
        anonymizeDemo,
      })
    );

    res.json(users);
  } catch (err: any) {
    console.error('Erro ao listar usuários:', err);
    res.status(500).json({ error: 'Erro interno ao listar usuários' });
  }
}

export async function createUserByAdmin(req: Request, res: Response): Promise<void> {
  const body: AdminCreateUserDto = req.body || {};
  const ip = req.ip || req.socket.remoteAddress || 'unknown';
  const effectivePassword = body.password && body.password.length > 0 ? body.password : 'arena123';

  const validation = validateRegistrationPayload(
    { ...body, password: effectivePassword },
    { allowPrivilegedRoles: true }
  );

  if (!validation.valid) {
    res.status(400).json({ error: validation.error });
    return;
  }

  const emailClean = body.email.trim().toLowerCase();
  const cleanName = sanitizeOptionalText(body.name, 150) || body.name.trim();
  const role = isValidUserRole(body.role) ? body.role : 'JOGADOR';
  const skillLevel = body.skillLevel || 'INTERMEDIARIO';
  const ageGroup = body.ageGroup || 'ADULTO';
  const isMinor = ageGroup === 'KIDS';

  try {
    const [existing] = await pool.query<any[]>(
      'SELECT id FROM users WHERE email = ?',
      [emailClean]
    );
    if (existing.length > 0) {
      res.status(409).json({ error: 'Este e-mail já está cadastrado' });
      return;
    }

    const passwordHash = await bcrypt.hash(effectivePassword, 10);
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      const [userRes] = await conn.query<any>(
        'INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)',
        [cleanName, emailClean, passwordHash, role]
      );
      const newUserId = userRes.insertId;

      await conn.query(
        `INSERT INTO player_profiles (
          user_id, skill_level, age_group, training_goals, preferences,
          physical_restrictions, guardian_name, guardian_consent, telemetry_consent
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          newUserId,
          skillLevel,
          ageGroup,
          sanitizeOptionalText(body.trainingGoals, 500) ?? null,
          sanitizeOptionalText(body.preferences, 500) ?? null,
          sanitizeOptionalText(body.physicalRestrictions, isMinor ? 200 : 500) ?? null,
          isMinor ? sanitizeOptionalText(body.guardianName, 150) ?? null : null,
          isMinor && body.guardianConsent ? 1 : 0,
          body.telemetryConsent !== undefined ? (body.telemetryConsent ? 1 : 0) : isMinor ? 0 : 1,
        ]
      );

      await conn.commit();

      await logAuditEvent(
        'CREATE_USER_ADMIN',
        req.user?.id,
        req.user?.name,
        ip,
        `Criou usuário ${emailClean} com perfil ${role}`
      );

      const [createdRows] = await pool.query<any[]>(
        `${USER_WITH_PROFILE_SELECT} WHERE u.id = ?`,
        [newUserId]
      );
      res.status(201).json(mapUserRowToUserWithProfile(createdRows[0]));
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  } catch (err: any) {
    console.error('Erro ao criar usuário via admin:', err);
    res.status(500).json({ error: 'Erro interno ao cadastrar usuário' });
  }
}

export async function getUserById(req: Request, res: Response): Promise<void> {
  const userId = parseInt(req.params.id, 10);
  const anonymizeDemo =
    req.query.anonymize === 'true' || req.query.anonymize === '1';

  if (isNaN(userId)) {
    res.status(400).json({ error: 'ID de usuário inválido' });
    return;
  }

  // Apenas Admin, Treinador ou o próprio usuário podem consultar
  if (req.user?.role !== 'ADMIN' && req.user?.role !== 'TREINADOR' && req.user?.id !== userId) {
    res.status(403).json({ error: 'Acesso negado aos detalhes deste usuário' });
    return;
  }

  try {
    const [rows] = await pool.query<any[]>(
      `${USER_WITH_PROFILE_SELECT} WHERE u.id = ?`,
      [userId]
    );

    const r = rows[0];
    if (!r) {
      res.status(404).json({ error: 'Usuário não encontrado' });
      return;
    }

    const user = applyPrivacyPolicyToUser(
      mapUserRowToUserWithProfile(r),
      req.user!,
      { anonymizeDemo }
    );

    res.json(user);
  } catch (err: any) {
    console.error('Erro ao buscar usuário por ID:', err);
    res.status(500).json({ error: 'Erro ao buscar dados do usuário' });
  }
}

export async function updateUser(req: Request, res: Response): Promise<void> {
  const userId = parseInt(req.params.id, 10);
  const body: UpdateUserDto = req.body || {};
  const ip = req.ip || req.socket.remoteAddress || 'unknown';

  if (isNaN(userId)) {
    res.status(400).json({ error: 'ID de usuário inválido' });
    return;
  }

  try {
    const updates: string[] = [];
    const values: any[] = [];

    if (body.name !== undefined) {
      const cleanName = sanitizeOptionalText(body.name, 150);
      if (!cleanName || cleanName.length < 2) {
        res.status(400).json({ error: 'Nome de usuário inválido' });
        return;
      }
      updates.push('name = ?');
      values.push(cleanName);
    }

    if (body.role !== undefined) {
      if (!isValidUserRole(body.role)) {
        res.status(400).json({ error: 'Perfil de acesso inválido' });
        return;
      }
      if (req.user?.id === userId && body.role !== 'ADMIN') {
        res.status(400).json({ error: 'Não é permitido remover o próprio privilégio de Administrador' });
        return;
      }
      updates.push('role = ?');
      values.push(body.role);
    }

    if (body.isActive !== undefined) {
      if (req.user?.id === userId && !body.isActive) {
        res.status(400).json({ error: 'Não é permitido desativar a própria conta logada' });
        return;
      }
      updates.push('is_active = ?');
      values.push(body.isActive ? 1 : 0);
    }

    if (updates.length === 0) {
      res.status(400).json({ error: 'Nenhum campo fornecido para atualização' });
      return;
    }

    values.push(userId);
    const [result] = await pool.query<any>(
      `UPDATE users SET ${updates.join(', ')} WHERE id = ?`,
      values
    );

    if (result.affectedRows === 0) {
      res.status(404).json({ error: 'Usuário não encontrado' });
      return;
    }

    await logAuditEvent(
      'UPDATE_USER_ADMIN',
      req.user?.id,
      req.user?.name,
      ip,
      `Atualizou dados do usuário ID ${userId}: ${JSON.stringify(body)}`
    );

    res.json({ message: 'Usuário atualizado com sucesso' });
  } catch (err: any) {
    console.error('Erro ao atualizar usuário:', err);
    res.status(500).json({ error: 'Erro interno ao atualizar usuário' });
  }
}

export async function deleteUser(req: Request, res: Response): Promise<void> {
  const userId = parseInt(req.params.id, 10);
  const ip = req.ip || req.socket.remoteAddress || 'unknown';

  if (isNaN(userId)) {
    res.status(400).json({ error: 'ID de usuário inválido' });
    return;
  }

  // Prevenir que o admin delete a si mesmo
  if (req.user?.id === userId) {
    res.status(400).json({ error: 'Não é permitido excluir o próprio usuário logado' });
    return;
  }

  try {
    const [result] = await pool.query<any>('DELETE FROM users WHERE id = ?', [userId]);

    if (result.affectedRows === 0) {
      res.status(404).json({ error: 'Usuário não encontrado' });
      return;
    }

    await logAuditEvent(
      'DELETE_USER_ADMIN',
      req.user?.id,
      req.user?.name,
      ip,
      `Usuário ID ${userId} removido do sistema`
    );

    res.json({ message: 'Usuário removido com sucesso' });
  } catch (err: any) {
    console.error('Erro ao excluir usuário:', err);
    res.status(500).json({ error: 'Erro interno ao excluir usuário' });
  }
}
