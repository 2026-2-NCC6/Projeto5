import { Request, Response } from 'express';
import { pool } from '../db';
import { AuditLog } from '../../../packages/shared/src/contracts/user';

export async function getAuditLogs(req: Request, res: Response): Promise<void> {
  try {
    const limit = Math.min(250, Math.max(1, parseInt(req.query.limit as string, 10) || 60));
    const { action, severity } = req.query;

    const conditions: string[] = [];
    const params: any[] = [];

    if (action && typeof action === 'string') {
      conditions.push('action = ?');
      params.push(action);
    }

    if (severity && typeof severity === 'string') {
      conditions.push('severity = ?');
      params.push(severity);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const [rows] = await pool.query<any[]>(
      `SELECT id, user_id, user_name, action, severity, entity_type, entity_id,
              correlation_id, ip_address, details, created_at
       FROM audit_logs
       ${whereClause}
       ORDER BY created_at DESC
       LIMIT ?`,
      [...params, limit]
    );

    const logs: AuditLog[] = rows.map((r) => ({
      id: r.id,
      userId: r.user_id,
      userName: r.user_name,
      action: r.action,
      severity: r.severity || 'INFO',
      entityType: r.entity_type || null,
      entityId: r.entity_id || null,
      correlationId: r.correlation_id || null,
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
