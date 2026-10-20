import { Request, Response } from 'express';
import { pool } from '../db';
import { AuditLog } from '../../../packages/shared/src/contracts/user';

export async function getAuditLogs(req: Request, res: Response): Promise<void> {
  try {
    const limit = parseInt(req.query.limit as string, 10) || 50;

    const [rows] = await pool.query<any[]>(
      `SELECT id, user_id, user_name, action, ip_address, details, created_at
       FROM audit_logs
       ORDER BY created_at DESC
       LIMIT ?`,
      [limit]
    );

    const logs: AuditLog[] = rows.map((r) => ({
      id: r.id,
      userId: r.user_id,
      userName: r.user_name,
      action: r.action,
      ipAddress: r.ip_address,
      details: r.details,
      createdAt: r.created_at,
    }));

    res.json(logs);
  } catch (err: any) {
    console.error('Erro ao listar logs de auditoria:', err);
    res.status(500).json({ error: 'Erro interno ao consultar auditoria' });
  }
}
