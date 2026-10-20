import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { pool, logAuditEvent } from '../db';
import { config } from '../config';
import {
  AuthResponse,
  LoginDto,
  RegisterDto,
  UpdateProfileDto,
  UserWithProfile,
} from '../../../packages/shared/src/contracts/user';

export async function register(req: Request, res: Response): Promise<void> {
  const body: RegisterDto = req.body;
  const ip = req.ip || req.socket.remoteAddress || 'unknown';

  if (!body.name || !body.email || !body.password) {
    res.status(400).json({ error: 'Nome, e-mail e senha são obrigatórios' });
    return;
  }

  if (body.password.length < 6) {
    res.status(400).json({ error: 'A senha deve conter no mínimo 6 caracteres' });
    return;
  }

  const emailClean = body.email.trim().toLowerCase();

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
    const role = body.role || 'JOGADOR';
    const skillLevel = body.skillLevel || 'INICIANTE';
    const ageGroup = body.ageGroup || 'ADULTO';

    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      const [userRes] = await conn.query<any>(
        'INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)',
        [body.name.trim(), emailClean, passwordHash, role]
      );

      const userId = userRes.insertId;

      await conn.query(
        `INSERT INTO player_profiles (
          user_id, skill_level, age_group, training_goals, preferences, physical_restrictions
        ) VALUES (?, ?, ?, ?, ?, ?)`,
        [
          userId,
          skillLevel,
          ageGroup,
          body.trainingGoals || null,
          body.preferences || null,
          body.physicalRestrictions || null,
        ]
      );

      await conn.commit();

      await logAuditEvent('REGISTER', userId, body.name, ip, `Novo usuário registrado como ${role}`);

      const token = jwt.sign(
        { id: userId, email: emailClean, role },
        config.jwtSecret,
        { expiresIn: config.jwtExpiresIn as any }
      );

      const responseData: AuthResponse = {
        token,
        user: {
          id: userId,
          name: body.name.trim(),
          email: emailClean,
          role,
          isActive: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          profile: {
            id: 0,
            userId,
            skillLevel,
            ageGroup,
            trainingGoals: body.trainingGoals || null,
            preferences: body.preferences || null,
            physicalRestrictions: body.physicalRestrictions || null,
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
  const body: LoginDto = req.body;
  const ip = req.ip || req.socket.remoteAddress || 'unknown';

  if (!body.email || !body.password) {
    res.status(400).json({ error: 'E-mail e senha são obrigatórios' });
    return;
  }

  const emailClean = body.email.trim().toLowerCase();

  try {
    const [rows] = await pool.query<any[]>(
      `SELECT u.id, u.name, u.email, u.password_hash, u.role, u.is_active, u.created_at, u.updated_at,
              p.id as profile_id, p.skill_level, p.age_group, p.training_goals, p.preferences, p.physical_restrictions
       FROM users u
       LEFT JOIN player_profiles p ON p.user_id = u.id
       WHERE u.email = ?`,
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

    const userWithProfile: UserWithProfile = {
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
            createdAt: userRow.created_at,
            updatedAt: userRow.updated_at,
          }
        : null,
    };

    res.json({ token, user: userWithProfile });
  } catch (err: any) {
    console.error('Erro no login:', err);
    res.status(500).json({ error: 'Erro interno ao realizar login' });
  }
}

export async function getMe(req: Request, res: Response): Promise<void> {
  if (!req.user) {
    res.status(401).json({ error: 'Não autenticado' });
    return;
  }

  try {
    const [rows] = await pool.query<any[]>(
      `SELECT u.id, u.name, u.email, u.role, u.is_active, u.created_at, u.updated_at,
              p.id as profile_id, p.skill_level, p.age_group, p.training_goals, p.preferences, p.physical_restrictions
       FROM users u
       LEFT JOIN player_profiles p ON p.user_id = u.id
       WHERE u.id = ?`,
      [req.user.id]
    );

    const userRow = rows[0];
    if (!userRow) {
      res.status(404).json({ error: 'Usuário não encontrado' });
      return;
    }

    const userWithProfile: UserWithProfile = {
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
            createdAt: userRow.created_at,
            updatedAt: userRow.updated_at,
          }
        : null,
    };

    res.json(userWithProfile);
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

  const body: UpdateProfileDto = req.body;
  const ip = req.ip || req.socket.remoteAddress || 'unknown';

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    if (body.name && body.name.trim().length > 0) {
      await conn.query('UPDATE users SET name = ? WHERE id = ?', [body.name.trim(), req.user.id]);
    }

    // Upsert em player_profiles
    await conn.query(
      `INSERT INTO player_profiles (
        user_id, skill_level, age_group, training_goals, preferences, physical_restrictions
      ) VALUES (?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        skill_level = COALESCE(?, skill_level),
        age_group = COALESCE(?, age_group),
        training_goals = COALESCE(?, training_goals),
        preferences = COALESCE(?, preferences),
        physical_restrictions = COALESCE(?, physical_restrictions)`,
      [
        req.user.id,
        body.skillLevel || 'INICIANTE',
        body.ageGroup || 'ADULTO',
        body.trainingGoals || null,
        body.preferences || null,
        body.physicalRestrictions || null,
        body.skillLevel || null,
        body.ageGroup || null,
        body.trainingGoals || null,
        body.preferences || null,
        body.physicalRestrictions || null,
      ]
    );

    await conn.commit();

    await logAuditEvent('UPDATE_PROFILE', req.user.id, req.user.name, ip, 'Perfil atualizado');

    // Retornar perfil atualizado
    const [rows] = await pool.query<any[]>(
      `SELECT u.id, u.name, u.email, u.role, u.is_active, u.created_at, u.updated_at,
              p.id as profile_id, p.skill_level, p.age_group, p.training_goals, p.preferences, p.physical_restrictions
       FROM users u
       LEFT JOIN player_profiles p ON p.user_id = u.id
       WHERE u.id = ?`,
      [req.user.id]
    );

    const userRow = rows[0];
    const userWithProfile: UserWithProfile = {
      id: userRow.id,
      name: userRow.name,
      email: userRow.email,
      role: userRow.role,
      isActive: Boolean(userRow.is_active),
      createdAt: userRow.created_at,
      updatedAt: userRow.updated_at,
      profile: {
        id: userRow.profile_id,
        userId: userRow.id,
        skillLevel: userRow.skill_level,
        ageGroup: userRow.age_group,
        trainingGoals: userRow.training_goals,
        preferences: userRow.preferences,
        physicalRestrictions: userRow.physical_restrictions,
        createdAt: userRow.created_at,
        updatedAt: userRow.updated_at,
      },
    };

    res.json(userWithProfile);
  } catch (err: any) {
    await conn.rollback();
    console.error('Erro ao atualizar perfil:', err);
    res.status(500).json({ error: 'Erro interno ao atualizar perfil' });
  } finally {
    conn.release();
  }
}
