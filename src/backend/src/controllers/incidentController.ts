import { Request, Response } from 'express';
import mysql from 'mysql2/promise';
import { pool, logAuditEvent } from '../db';
import {
  ReportSafetyIncidentDto,
  SafetyIncidentRecord,
  SafetyIncidentType,
} from '../../../packages/shared/src/contracts/admin';
import { sanitizeOptionalText } from '../../../packages/shared/src/security/validation';

const VALID_INCIDENT_TYPES: ReadonlySet<string> = new Set([
  'EMERGENCY_STOP',
  'SENSOR_INCONSISTENT',
  'COMMUNICATION_LOSS',
  'AREA_UNSAFE',
  'ACTUATOR_FAULT',
]);

function mapRowToIncident(r: any): SafetyIncidentRecord {
  return {
    id: r.id,
    sessionId: r.session_id ?? null,
    userId: r.user_id ?? null,
    userName: r.user_name ?? null,
    deviceCode: r.device_code ?? null,
    incidentType: r.incident_type,
    source: r.source,
    reason: r.reason,
    correlationId: r.correlation_id ?? null,
    resolved: Boolean(r.is_resolved),
    resolvedAt: r.resolved_at ? new Date(r.resolved_at).toISOString() : null,
    resolvedByUserId: r.resolved_by_user_id ?? null,
    createdAt: new Date(r.created_at).toISOString(),
  };
}

/**
 * POST /incidents
 * Registra acionamento de parada segura (!EMG) ou falha crítica de hardware/comunicação com motivo (RF22, RF23)
 */
export async function reportIncident(req: Request, res: Response): Promise<void> {
  const body = req.body as ReportSafetyIncidentDto;

  const incidentType: SafetyIncidentType = VALID_INCIDENT_TYPES.has(body?.incidentType)
    ? body.incidentType
    : 'EMERGENCY_STOP';

  const source = sanitizeOptionalText(body?.source, 80) || 'UI_ESTOP_BUTTON';
  const reason =
    sanitizeOptionalText(body?.reason, 255) ||
    'Acionamento preventivo de Parada Segura pelo operador.';
  const deviceCode = sanitizeOptionalText(body?.deviceCode, 80) ?? null;
  const correlationId = req.correlationId || sanitizeOptionalText(body?.correlationId, 100) || null;
  const sessionId = typeof body?.sessionId === 'number' ? body.sessionId : null;

  try {
    const [result] = await pool.query<mysql.ResultSetHeader>(
      `INSERT INTO safety_incidents (
        session_id, user_id, user_name, device_code, incident_type, source, reason, correlation_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        sessionId,
        req.user?.id ?? null,
        req.user?.name ?? 'Operador Local Arena',
        deviceCode,
        incidentType,
        source,
        reason,
        correlationId,
      ]
    );

    if (deviceCode && (incidentType === 'SENSOR_INCONSISTENT' || incidentType === 'ACTUATOR_FAULT')) {
      await pool.query(
        "UPDATE iot_devices SET status = 'FAULT', last_seen_at = NOW() WHERE device_code = ?",
        [deviceCode]
      );
    }

    await logAuditEvent(
      'SAFETY_INCIDENT_REPORTED',
      req.user?.id ?? null,
      req.user?.name ?? 'Operador Local Arena',
      req.ip,
      `[${incidentType}] Origem: ${source} — Motivo: ${reason}`,
      {
        severity: 'CRITICAL',
        entityType: 'SAFETY_INCIDENT',
        entityId: result.insertId,
        correlationId,
      }
    );

    const [rows] = await pool.query<any[]>('SELECT * FROM safety_incidents WHERE id = ?', [
      result.insertId,
    ]);
    res.status(201).json(mapRowToIncident(rows[0]));
  } catch (err) {
    console.error('Erro ao registrar incidente de segurança:', err);
    res.status(500).json({ error: 'Erro interno ao registrar parada segura / incidente' });
  }
}

/**
 * GET /incidents
 * Consulta histórico de paradas de emergência e falhas registradas na arena (RF17, RF22, RF23)
 */
export async function listIncidents(req: Request, res: Response): Promise<void> {
  try {
    const limit = Math.min(200, Math.max(1, parseInt(req.query.limit as string, 10) || 50));
    const unresolvedOnly = req.query.unresolved === 'true';

    const [rows] = await pool.query<any[]>(
      `SELECT * FROM safety_incidents
       ${unresolvedOnly ? 'WHERE is_resolved = 0' : ''}
       ORDER BY created_at DESC
       LIMIT ?`,
      [limit]
    );

    res.json(rows.map(mapRowToIncident));
  } catch (err) {
    console.error('Erro ao listar incidentes:', err);
    res.status(500).json({ error: 'Erro interno ao consultar incidentes de segurança' });
  }
}

/**
 * PATCH /incidents/:id/resolve
 * Confirma reinício explícito e resolução segura de um incidente (Seção 3 e RF22)
 */
export async function resolveIncident(req: Request, res: Response): Promise<void> {
  const incidentId = parseInt(req.params.id, 10);
  if (Number.isNaN(incidentId)) {
    res.status(400).json({ error: 'ID de incidente inválido' });
    return;
  }

  try {
    const [rows] = await pool.query<any[]>('SELECT * FROM safety_incidents WHERE id = ?', [
      incidentId,
    ]);
    if (rows.length === 0) {
      res.status(404).json({ error: 'Incidente não encontrado' });
      return;
    }

    await pool.query(
      `UPDATE safety_incidents
       SET is_resolved = 1, resolved_at = NOW(), resolved_by_user_id = ?
       WHERE id = ?`,
      [req.user!.id, incidentId]
    );

    if (rows[0].device_code) {
      await pool.query(
        "UPDATE iot_devices SET status = 'ONLINE', last_seen_at = NOW() WHERE device_code = ? AND status = 'FAULT'",
        [rows[0].device_code]
      );
    }

    await logAuditEvent(
      'SAFETY_INCIDENT_RESOLVED',
      req.user!.id,
      req.user!.name,
      req.ip,
      `Incidente #${incidentId} (${rows[0].incident_type}) verificado e reiniciado com segurança`,
      {
        severity: 'INFO',
        entityType: 'SAFETY_INCIDENT',
        entityId: incidentId,
        correlationId: req.correlationId,
      }
    );

    const [updated] = await pool.query<any[]>('SELECT * FROM safety_incidents WHERE id = ?', [
      incidentId,
    ]);
    res.json(mapRowToIncident(updated[0]));
  } catch (err) {
    console.error('Erro ao resolver incidente:', err);
    res.status(500).json({ error: 'Erro interno ao resolver incidente' });
  }
}

