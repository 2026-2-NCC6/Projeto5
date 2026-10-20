import { Request, Response } from 'express';
import { pool, logAuditEvent } from '../db';
import { UpdateUserDto, UserWithProfile } from '../../../packages/shared/src/contracts/user';

export async function listUsers(req: Request, res: Response): Promise<void> {
  try {
    const roleFilter = req.query.role as string | undefined;
    const search = req.query.q as string | undefined;

    let query = `
      SELECT u.id, u.name, u.email, u.role, u.is_active, u.created_at, u.updated_at,
             p.id as profile_id, p.skill_level, p.age_group, p.training_goals, p.preferences, p.physical_restrictions
      FROM users u
      LEFT JOIN player_profiles p ON p.user_id = u.id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (roleFilter) {
      query += ' AND u.role = ?';
      params.push(roleFilter);
    }

    if (search) {
      query += ' AND (u.name LIKE ? OR u.email LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }

    query += ' ORDER BY u.created_at DESC';

    const [rows] = await pool.query<any[]>(query, params);

    const users: UserWithProfile[] = rows.map((r) => ({
      id: r.id,
      name: r.name,
      email: r.email,
      role: r.role,
      isActive: Boolean(r.is_active),
      createdAt: r.created_at,
      updatedAt: r.updated_at,
      profile: r.profile_id
        ? {
            id: r.profile_id,
            userId: r.id,
            skillLevel: r.skill_level,
            ageGroup: r.age_group,
            trainingGoals: r.training_goals,
            preferences: r.preferences,
            physicalRestrictions: r.physical_restrictions,
            createdAt: r.created_at,
            updatedAt: r.updated_at,
          }
        : null,
    }));

    res.json(users);
  } catch (err: any) {
    console.error('Erro ao listar usuários:', err);
    res.status(500).json({ error: 'Erro interno ao listar usuários' });
  }
}

export async function getUserById(req: Request, res: Response): Promise<void> {
  const userId = parseInt(req.params.id, 10);

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
      `SELECT u.id, u.name, u.email, u.role, u.is_active, u.created_at, u.updated_at,
              p.id as profile_id, p.skill_level, p.age_group, p.training_goals, p.preferences, p.physical_restrictions
       FROM users u
       LEFT JOIN player_profiles p ON p.user_id = u.id
       WHERE u.id = ?`,
      [userId]
    );

    const r = rows[0];
    if (!r) {
      res.status(404).json({ error: 'Usuário não encontrado' });
      return;
    }

    const user: UserWithProfile = {
      id: r.id,
      name: r.name,
      email: r.email,
      role: r.role,
      isActive: Boolean(r.is_active),
      createdAt: r.created_at,
      updatedAt: r.updated_at,
      profile: r.profile_id
        ? {
            id: r.profile_id,
            userId: r.id,
            skillLevel: r.skill_level,
            ageGroup: r.age_group,
            trainingGoals: r.training_goals,
            preferences: r.preferences,
            physicalRestrictions: r.physical_restrictions,
            createdAt: r.created_at,
            updatedAt: r.updated_at,
          }
        : null,
    };

    res.json(user);
  } catch (err: any) {
    console.error('Erro ao buscar usuário por ID:', err);
    res.status(500).json({ error: 'Erro ao buscar dados do usuário' });
  }
}

export async function updateUser(req: Request, res: Response): Promise<void> {
  const userId = parseInt(req.params.id, 10);
  const body: UpdateUserDto = req.body;
  const ip = req.ip || req.socket.remoteAddress || 'unknown';

  if (isNaN(userId)) {
    res.status(400).json({ error: 'ID de usuário inválido' });
    return;
  }

  try {
    const updates: string[] = [];
    const values: any[] = [];

    if (body.name !== undefined) {
      updates.push('name = ?');
      values.push(body.name.trim());
    }
    if (body.role !== undefined) {
      updates.push('role = ?');
      values.push(body.role);
    }
    if (body.isActive !== undefined) {
      updates.push('is_active = ?');
      values.push(body.isActive ? 1 : 0);
    }

    if (updates.length === 0) {
      res.status(400).json({ error: 'Nenhum campo fornecido para atualização' });
      return;
    }

    values.push(userId);
    await pool.query(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`, values);

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
