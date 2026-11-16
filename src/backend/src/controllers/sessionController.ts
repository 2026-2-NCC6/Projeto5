import { Request, Response } from 'express';
import { pool, logAuditEvent } from '../db';
import {
  CreateSessionDto,
  TrainingSessionRecord,
  SessionStatsSummary,
} from '../../../packages/shared/src/contracts/user';

function mapRowToSession(r: any): TrainingSessionRecord {
  let zoneAnalytics = {
    attempts: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
    hits: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
    avgReactionMs: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
  };
  let eventsTelemetry = undefined;

  try {
    if (r.zone_analytics_json) {
      zoneAnalytics =
        typeof r.zone_analytics_json === 'string'
          ? JSON.parse(r.zone_analytics_json)
          : r.zone_analytics_json;
    }
  } catch {}

  try {
    if (r.events_telemetry_json) {
      eventsTelemetry =
        typeof r.events_telemetry_json === 'string'
          ? JSON.parse(r.events_telemetry_json)
          : r.events_telemetry_json;
    }
  } catch {}

  return {
    id: r.id,
    sessionUuid: r.session_uuid,
    userId: r.user_id,
    athleteName: r.athlete_name || 'Praticante Arena',
    drillId: r.drill_id,
    drillTitle: r.drill_title,
    drillVersion: r.drill_version || '1.0.0',
    isKidsMode: Boolean(r.is_kids_mode),
    status: r.status || 'COMPLETED',
    score: Number(r.score || 0),
    maxStreak: Number(r.max_streak || 0),
    hits: Number(r.hits || 0),
    misses: Number(r.misses || 0),
    wrongHits: Number(r.wrong_hits || 0),
    accuracyPct: Number(r.accuracy_pct || 0),
    averageReactionTimeMs: Number(r.average_reaction_time_ms || 0),
    durationSec: Number(r.duration_sec || 0),
    hardwareMode: r.hardware_mode === 'WEB_SERIAL' ? 'WEB_SERIAL' : 'MOCK',
    zoneAnalytics,
    eventsTelemetry,
    telemetryAuthorized: Boolean(r.telemetry_authorized),
    syncedFromOffline: Boolean(r.synced_from_offline),
    startedAt: r.started_at ? new Date(r.started_at).toISOString() : new Date().toISOString(),
    completedAt: r.completed_at ? new Date(r.completed_at).toISOString() : new Date().toISOString(),
    createdAt: r.created_at ? new Date(r.created_at).toISOString() : new Date().toISOString(),
  };
}

/**
 * POST /api/sessions — Recebimento idempotente de resultados e telemetria (RF19, RF21, LGPD)
 */
export async function submitSession(req: Request, res: Response): Promise<void> {
  const body = req.body as CreateSessionDto & {
    athleteName?: string;
    syncedFromOffline?: boolean;
  };
  const ip = req.ip || req.socket.remoteAddress || 'unknown';

  if (!body.sessionUuid || !body.drillId || !body.drillTitle) {
    res.status(400).json({ error: 'sessionUuid, drillId e drillTitle são obrigatórios' });
    return;
  }

  try {
    // Idempotência: se sessionUuid já foi sincronizado anteriormente, retorna o registro existente (RF21)
    const [existing] = await pool.query<any[]>(
      'SELECT * FROM training_sessions WHERE session_uuid = ?',
      [body.sessionUuid]
    );
    if (existing[0]) {
      res.status(200).json(mapRowToSession(existing[0]));
      return;
    }

    // Proteção reforçada LGPD para crianças e adolescentes (Seção 3 do edital):
    // Se estiver em Modo Kids, aplica coleta mínima (anonimiza sobrenome e omite telemetria bruta a menos que explicitamente autorizado)
    const rawAthleteName = req.user?.name || body.athleteName || 'Praticante Convidado';
    const safeAthleteName = body.isKidsMode
      ? `${rawAthleteName.split(' ')[0]} (Perfil Kids Protegido LGPD)`
      : rawAthleteName;

    const allowDetailedTelemetry = body.isKidsMode
      ? Boolean(body.telemetryAuthorized === true)
      : body.telemetryAuthorized !== false;

    const telemetryJson =
      allowDetailedTelemetry && Array.isArray(body.eventsTelemetry)
        ? JSON.stringify(body.eventsTelemetry)
        : null;

    const startedDate = body.startedAt ? new Date(body.startedAt) : new Date();
    const completedDate = body.completedAt ? new Date(body.completedAt) : new Date();

    const [insertRes] = await pool.query<any>(
      `INSERT INTO training_sessions (
        session_uuid, user_id, athlete_name, drill_id, drill_title, drill_version,
        is_kids_mode, status, score, max_streak, hits, misses, wrong_hits,
        accuracy_pct, average_reaction_time_ms, duration_sec, hardware_mode,
        zone_analytics_json, events_telemetry_json, telemetry_authorized,
        synced_from_offline, started_at, completed_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        body.sessionUuid,
        req.user?.id || null,
        safeAthleteName,
        body.drillId,
        body.drillTitle,
        body.drillVersion || '1.0.0',
        body.isKidsMode ? 1 : 0,
        body.status || 'COMPLETED',
        body.score || 0,
        body.maxStreak || 0,
        body.hits || 0,
        body.misses || 0,
        body.wrongHits || 0,
        body.accuracyPct || 0,
        body.averageReactionTimeMs || 0,
        body.durationSec || 0,
        body.hardwareMode || 'MOCK',
        JSON.stringify(body.zoneAnalytics || {}),
        telemetryJson,
        allowDetailedTelemetry ? 1 : 0,
        body.syncedFromOffline ? 1 : 0,
        startedDate,
        completedDate,
      ]
    );

    await logAuditEvent(
      body.syncedFromOffline ? 'SESSION_SYNC_OFFLINE' : 'SESSION_COMPLETED',
      req.user?.id || null,
      safeAthleteName,
      ip,
      `Sessão "${body.drillTitle}" (${body.status || 'COMPLETED'}) • Score: ${body.score} pts • Precisão: ${body.accuracyPct}%`
    );

    const [createdRows] = await pool.query<any[]>(
      'SELECT * FROM training_sessions WHERE id = ?',
      [insertRes.insertId]
    );

    res.status(201).json(mapRowToSession(createdRows[0]));
  } catch (err: any) {
    console.error('Erro ao registrar sessão de treino:', err);
    res.status(500).json({ error: 'Erro interno ao salvar resultado da sessão' });
  }
}

/**
 * GET /api/sessions — Histórico de sessões por período, treino e atleta (RF13)
 */
export async function listSessions(req: Request, res: Response): Promise<void> {
  try {
    const { drillId, periodDays, userId, limit } = req.query;

    let sql = 'SELECT * FROM training_sessions WHERE 1=1';
    const params: any[] = [];

    if (drillId && drillId !== 'ALL') {
      sql += ' AND drill_id = ?';
      params.push(drillId);
    }

    if (userId) {
      sql += ' AND user_id = ?';
      params.push(Number(userId));
    }

    if (periodDays && Number(periodDays) > 0) {
      sql += ' AND completed_at >= DATE_SUB(NOW(), INTERVAL ? DAY)';
      params.push(Number(periodDays));
    }

    const maxRows = Math.min(100, Math.max(1, Number(limit) || 30));
    sql += ' ORDER BY completed_at DESC LIMIT ?';
    params.push(maxRows);

    const [rows] = await pool.query<any[]>(sql, params);
    res.json(rows.map(mapRowToSession));
  } catch (err: any) {
    console.error('Erro ao consultar histórico de sessões:', err);
    res.status(500).json({ error: 'Erro interno ao consultar histórico de sessões' });
  }
}

/**
 * GET /api/sessions/stats — Indicadores de precisão, consistência, volume e progressão (RF13)
 */
export async function getSessionStats(req: Request, res: Response): Promise<void> {
  try {
    const { drillId, periodDays } = req.query;

    let sql = 'SELECT * FROM training_sessions WHERE 1=1';
    const params: any[] = [];

    if (drillId && drillId !== 'ALL') {
      sql += ' AND drill_id = ?';
      params.push(drillId);
    }

    if (periodDays && Number(periodDays) > 0) {
      sql += ' AND completed_at >= DATE_SUB(NOW(), INTERVAL ? DAY)';
      params.push(Number(periodDays));
    }

    sql += ' ORDER BY completed_at ASC';

    const [rows] = await pool.query<any[]>(sql, params);
    const sessions = rows.map(mapRowToSession);

    if (sessions.length === 0) {
      const emptyStats: SessionStatsSummary = {
        totalSessions: 0,
        totalShotsVolume: 0,
        totalHits: 0,
        averageAccuracyPct: 0,
        averageReactionTimeMs: 0,
        bestScore: 0,
        bestStreak: 0,
        consistencyIndexPct: 0,
        progressionDeltaPct: 0,
      };
      res.json(emptyStats);
      return;
    }

    let totalShotsVolume = 0;
    let totalHits = 0;
    let sumAccuracy = 0;
    let sumReaction = 0;
    let reactionCount = 0;
    let bestScore = 0;
    let bestStreak = 0;

    for (const s of sessions) {
      const attempts = s.hits + s.misses + s.wrongHits;
      totalShotsVolume += attempts;
      totalHits += s.hits;
      sumAccuracy += s.accuracyPct;
      if (s.averageReactionTimeMs > 0) {
        sumReaction += s.averageReactionTimeMs;
        reactionCount += 1;
      }
      if (s.score > bestScore) bestScore = s.score;
      if (s.maxStreak > bestStreak) bestStreak = s.maxStreak;
    }

    const averageAccuracyPct = Math.round(sumAccuracy / sessions.length);
    const averageReactionTimeMs =
      reactionCount > 0 ? Math.round(sumReaction / reactionCount) : 0;

    // Índice de consistência: 100 - desvio médio absoluto da precisão entre sessões
    const avgDeviation =
      sessions.reduce((acc, s) => acc + Math.abs(s.accuracyPct - averageAccuracyPct), 0) /
      sessions.length;
    const consistencyIndexPct = Math.max(0, Math.min(100, Math.round(100 - avgDeviation)));

    // Progressão: diferença entre a média das últimas sessões e as primeiras
    const half = Math.max(1, Math.floor(sessions.length / 2));
    const firstHalfAvg =
      sessions.slice(0, half).reduce((a, b) => a + b.accuracyPct, 0) / half;
    const recentHalfAvg =
      sessions.slice(-half).reduce((a, b) => a + b.accuracyPct, 0) / half;
    const progressionDeltaPct = Math.round(recentHalfAvg - firstHalfAvg);

    const summary: SessionStatsSummary = {
      totalSessions: sessions.length,
      totalShotsVolume,
      totalHits,
      averageAccuracyPct,
      averageReactionTimeMs,
      bestScore,
      bestStreak,
      consistencyIndexPct,
      progressionDeltaPct,
    };

    res.json(summary);
  } catch (err: any) {
    console.error('Erro ao calcular estatísticas de sessões:', err);
    res.status(500).json({ error: 'Erro interno ao calcular indicadores de desempenho' });
  }
}
