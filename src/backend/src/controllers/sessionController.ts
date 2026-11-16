import { Request, Response } from 'express';
import mysql from 'mysql2/promise';
import { pool, logAuditEvent } from '../db';
import {
  computeSessionAnalyticalIndicators,
  CreateSessionDto as V1CreateSessionDto,
  SessionAnalyticsSummary,
  SessionRecord,
  SessionSubmissionResponse,
  SessionTelemetryEvent,
} from '../../../packages/shared/src/contracts/sessions';
import {
  CreateSessionDto as LegacyCreateSessionDto,
  SessionStatsSummary,
  TrainingSessionRecord,
} from '../../../packages/shared/src/contracts/user';
import { TARGET_TACTICAL_NAMES } from '../../../packages/shared/src/contracts/drills';
import type { TargetId } from '../../../packages/shared/src/protocol/serial';
import {
  anonymizeDisplayName,
  sanitizeOptionalText,
} from '../../../packages/shared/src/security/validation';
import { forwardSessionToMotherPlatform } from '../services/motherPlatformService';

function safeJsonParse<T>(raw: any, fallback: T): T {
  if (!raw) return fallback;
  if (typeof raw === 'object') return raw as T;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function buildRecommendations(params: {
  accuracyPct: number;
  avgReactionMs: number;
  wrongHits: number;
  hitsByTarget: Record<TargetId, number>;
  isKids: boolean;
}): string[] {
  const { accuracyPct, avgReactionMs, wrongHits, hitsByTarget, isKids } = params;
  const recs: string[] = [];

  if (isKids) {
    if (accuracyPct >= 70) {
      recs.push(
        'Excelente coordenação! Na próxima sessão, experimente avançar para um desafio de ritmo um pouquinho mais rápido.'
      );
    } else {
      recs.push('Ótimo esforço! Continue praticando Alvos Mágicos olhando para a luz antes da batida.');
    }
    return recs;
  }

  if (accuracyPct < 65) {
    recs.push(
      'Priorize treinos da categoria Precisão (janela >= 2800ms) para estabilizar controle direcional antes de elevar a velocidade.'
    );
  } else if (accuracyPct >= 85) {
    recs.push(
      'Precisão consistente acima de 85% — recomendado avançar um nível de dificuldade ou reduzir janela de tempo.'
    );
  }

  if (avgReactionMs > 1250) {
    recs.push(
      'Tempo médio de reação elevado: trabalhe o split-step no centro da linha de base antes de cada disparo.'
    );
  } else if (avgReactionMs > 0 && avgReactionMs <= 900) {
    recs.push('Excelente tempo de reação sub-900ms — apto para protocolos Reflexo Rápido e Resistência Pro.');
  }

  if (wrongHits > 0) {
    recs.push(
      `Foram registrados ${wrongHits} acionamento(s) em alvo incorreto: reforce a leitura periférica antes da preparação do golpe.`
    );
  }

  const entries = ([1, 2, 3, 4, 5] as TargetId[]).map((id) => ({
    id,
    count: Number(hitsByTarget?.[id] ?? 0),
  }));
  const totalHits = entries.reduce((s, e) => s + e.count, 0);
  if (totalHits >= 4) {
    const weakest = entries.sort((a, b) => a.count - b.count)[0];
    recs.push(
      `Foco técnico sugerido: Zona ${weakest.id} (${TARGET_TACTICAL_NAMES[weakest.id]}) apresentou menor volume de conversões.`
    );
  }

  return recs.slice(0, 4);
}

export function mapRowToUnifiedSession(
  r: any,
  requester?: { id: number; role: string } | null,
  anonymizeDemo: boolean = false
): SessionRecord & TrainingSessionRecord {
  const isMinor = r.user_age_group === 'KIDS' || r.audience_mode === 'KIDS';
  const isSelf = requester ? requester.id === r.user_id : false;
  const isAdmin = requester?.role === 'ADMIN';

  let displayName = r.user_name || `Atleta #${r.user_id}`;
  if (anonymizeDemo || (isMinor && !isSelf && !isAdmin)) {
    displayName = anonymizeDisplayName(displayName, isMinor);
  }

  const parsedMetrics = safeJsonParse<any>(r.metrics_json, {
    score: Number(r.score || 0),
    streak: 0,
    maxStreak: Number(r.max_streak || 0),
    hits: Number(r.hits || 0),
    misses: Number(r.misses || 0),
    wrongHits: Number(r.wrong_hits || 0),
    reactionTimes: [],
    averageReactionTimeMs: Number(r.avg_reaction_ms || 0),
    hitsByTarget: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
  });

  const hitsByTarget = parsedMetrics?.hitsByTarget || { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  const zoneAnalytics = parsedMetrics?.zoneAnalytics || {
    attempts: hitsByTarget,
    hits: hitsByTarget,
    avgReactionMs: {
      1: Number(r.avg_reaction_ms || 0),
      2: Number(r.avg_reaction_ms || 0),
      3: Number(r.avg_reaction_ms || 0),
      4: Number(r.avg_reaction_ms || 0),
      5: Number(r.avg_reaction_ms || 0),
    },
  };

  const startedIso = r.started_at ? new Date(r.started_at).toISOString() : new Date().toISOString();
  const endedIso = r.ended_at ? new Date(r.ended_at).toISOString() : startedIso;
  const createdIso = r.created_at ? new Date(r.created_at).toISOString() : endedIso;
  const hwMode =
    r.device_code?.includes('UNO') || parsedMetrics?.hardwareMode === 'WEB_SERIAL'
      ? 'WEB_SERIAL'
      : parsedMetrics?.hardwareMode === 'REMOTE_GATEWAY'
        ? 'REMOTE_GATEWAY'
        : 'MOCK';

  return {
    id: r.id,
    idempotencyKey: r.idempotency_key,
    sessionUuid: r.idempotency_key,
    correlationId: r.correlation_id || null,
    userId: r.user_id,
    userName: displayName,
    athleteName: displayName,
    drillId: r.drill_id,
    drillTitle: r.drill_title || r.drill_id,
    drillVersion: r.drill_version || '1.0.0',
    deviceCode: r.device_code || null,
    audienceMode: r.audience_mode || 'ADULTO',
    isKidsMode: r.audience_mode === 'KIDS',
    status: r.status || 'COMPLETED',
    startedAt: startedIso,
    endedAt: endedIso,
    completedAt: endedIso,
    durationSec: Number(r.duration_sec || 0),
    score: Number(r.score || 0),
    maxStreak: Number(r.max_streak || 0),
    hits: Number(r.hits || 0),
    misses: Number(r.misses || 0),
    wrongHits: Number(r.wrong_hits || 0),
    accuracyPct: Math.round(Number(r.accuracy_pct || 0)),
    avgReactionMs: Number(r.avg_reaction_ms || 0),
    averageReactionTimeMs: Number(r.avg_reaction_ms || 0),
    consistencyMs: Number(r.consistency_ms || 0),
    goalsMet: Boolean(r.goals_met),
    stopReason: r.stop_reason || null,
    hardwareMode: hwMode,
    zoneAnalytics,
    metrics: parsedMetrics,
    telemetryIncluded: Boolean(r.telemetry_included),
    telemetryAuthorized: Boolean(r.telemetry_included),
    syncedFromOffline: Boolean(parsedMetrics?.syncedFromOffline),
    motherSyncStatus: r.mother_sync_status || 'SYNCED_MOCK',
    motherSyncId: r.mother_sync_id || null,
    createdAt: createdIso,
  };
}

async function resolveSessionUserId(
  conn: mysql.PoolConnection,
  reqUser?: { id: number; name: string; role: string },
  isKidsMode?: boolean
): Promise<{ id: number; name: string; role: string }> {
  if (reqUser?.id) {
    return reqUser;
  }
  const targetEmail = isKidsMode ? 'kids@smarttennis.com' : 'jogador@smarttennis.com';
  const [rows] = await conn.query<any[]>(
    'SELECT id, name, role FROM users WHERE email = ? OR role = \'JOGADOR\' ORDER BY (email = ?) DESC, id ASC LIMIT 1',
    [targetEmail, targetEmail]
  );
  if (rows[0]) {
    return { id: rows[0].id, name: rows[0].name, role: rows[0].role };
  }
  return { id: 1, name: 'Praticante Arena', role: 'JOGADOR' };
}

/**
 * POST /sessions
 * Recebe resumo e telemetria com chave de idempotência (idempotencyKey ou sessionUuid),
 * aplica LGPD e encaminha à Plataforma Mãe (RF19, RF21, RF22)
 */
export async function submitSession(req: Request, res: Response): Promise<void> {
  const body = req.body as Partial<V1CreateSessionDto & LegacyCreateSessionDto> & {
    athleteName?: string;
    syncedFromOffline?: boolean;
  };

  const rawKey = body?.idempotencyKey || body?.sessionUuid;
  if (!rawKey || typeof rawKey !== 'string' || rawKey.trim().length < 4) {
    res.status(400).json({
      error: 'Chave de idempotência (idempotencyKey ou sessionUuid) válida é obrigatória',
    });
    return;
  }

  if (!body.drillId || typeof body.drillId !== 'string') {
    res.status(400).json({ error: 'Identificador do treino (drillId) é obrigatório' });
    return;
  }

  const normalizedMetrics = body.metrics || {
    score: Number(body.score ?? 0),
    streak: Number(body.maxStreak ?? 0),
    maxStreak: Number(body.maxStreak ?? 0),
    hits: Number(body.hits ?? 0),
    misses: Number(body.misses ?? 0),
    wrongHits: Number(body.wrongHits ?? 0),
    reactionTimes: [],
    averageReactionTimeMs: Number(body.averageReactionTimeMs ?? 0),
    hitsByTarget: body.zoneAnalytics?.hits || { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
  };

  const idempotencyKey = rawKey.trim().slice(0, 120);
  const correlationId = req.correlationId || body.correlationId || null;

  const conn = await pool.getConnection();
  try {
    const resolvedUser = await resolveSessionUserId(
      conn,
      req.user,
      body.audienceMode === 'KIDS' || Boolean(body.isKidsMode)
    );
    const userId = resolvedUser.id;

    // 1. Verificar reenvio idempotente (RF21 / Seção 5 Disponibilidade e Resiliência)
    const [existingRows] = await conn.query<any[]>(
      `SELECT s.*, u.name AS user_name, p.age_group AS user_age_group, d.title AS drill_title
       FROM training_sessions s
       JOIN users u ON u.id = s.user_id
       LEFT JOIN player_profiles p ON p.user_id = s.user_id
       LEFT JOIN drills d ON d.id = s.drill_id
       WHERE s.idempotency_key = ?`,
      [idempotencyKey]
    );

    if (existingRows.length > 0) {
      const existing = existingRows[0];
      const sessionRec = mapRowToUnifiedSession(existing, resolvedUser, false);
      const recs = buildRecommendations({
        accuracyPct: sessionRec.accuracyPct,
        avgReactionMs: sessionRec.avgReactionMs,
        wrongHits: sessionRec.wrongHits,
        hitsByTarget: sessionRec.metrics.hitsByTarget,
        isKids: sessionRec.audienceMode === 'KIDS',
      });

      const replayResponse: SessionSubmissionResponse & TrainingSessionRecord = {
        ...sessionRec,
        session: sessionRec,
        idempotentReplay: true,
        telemetryPersisted: sessionRec.telemetryIncluded,
        motherPlatformReceipt: {
          receiptId: sessionRec.motherSyncId || 'mp-idempotent-replay',
          status: sessionRec.motherSyncStatus,
          syncedAt: sessionRec.createdAt,
          telemetryForwarded: sessionRec.telemetryIncluded,
          endpoint: '/api/v1/mother-platform/ingest',
        },
        evolutionDeltaScore: null,
        recommendations: recs,
      };
      res.status(200).json(replayResponse);
      return;
    }

    await conn.beginTransaction();

    // 2. Consultar consentimento LGPD do titular / responsável e regras do treino
    const [profileRows] = await conn.query<any[]>(
      'SELECT age_group, guardian_consent, telemetry_consent FROM player_profiles WHERE user_id = ?',
      [userId]
    );
    const profile = profileRows[0];
    const isMinor =
      profile?.age_group === 'KIDS' ||
      body.audienceMode === 'KIDS' ||
      Boolean(body.isKidsMode);
    const telemetryAllowed = Boolean(
      (profile?.telemetry_consent ?? body.telemetryAuthorized ?? !isMinor) &&
        (!isMinor || profile?.guardian_consent || body.telemetryAuthorized === true)
    );

    const [drillRows] = await conn.query<any[]>(
      'SELECT title, current_version, scoring_rules_json FROM drills WHERE id = ?',
      [body.drillId]
    );
    const drillRow = drillRows[0];
    const scoringRules = safeJsonParse<any>(drillRow?.scoring_rules_json, null);

    // Consultar última sessão concluída no mesmo treino para indicador de evolução (RF12)
    const [prevRows] = await conn.query<any[]>(
      `SELECT score FROM training_sessions
       WHERE user_id = ? AND drill_id = ? AND status = 'COMPLETED'
       ORDER BY ended_at DESC LIMIT 1`,
      [userId, body.drillId]
    );
    const previousScore: number | null = prevRows.length > 0 ? Number(prevRows[0].score) : null;

    const computedIndicators = computeSessionAnalyticalIndicators(normalizedMetrics);
    const accuracyPct =
      computedIndicators.totalAttempts > 0
        ? computedIndicators.accuracyPct
        : Number(body.accuracyPct ?? 0);
    const consistencyMs = computedIndicators.consistencyMs;
    const avgReactionMs = Math.max(
      0,
      Math.round(normalizedMetrics.averageReactionTimeMs || body.averageReactionTimeMs || 0)
    );

    const computedGoalsMet =
      typeof body.goalsMet === 'boolean'
        ? body.goalsMet
        : scoringRules
          ? normalizedMetrics.score >= (scoringRules.targetScoreGoal || 0) &&
            accuracyPct >= (scoringRules.minAccuracyPercent || 0)
          : body.status === 'COMPLETED' && accuracyPct >= 60;

    const startedAt = body.startedAt ? new Date(body.startedAt) : new Date();
    const endedIsoInput = body.endedAt || body.completedAt;
    const endedAt = endedIsoInput ? new Date(endedIsoInput) : new Date();
    const durationSec =
      typeof body.durationSec === 'number' && body.durationSec >= 0
        ? Math.round(body.durationSec)
        : Math.max(1, Math.round((endedAt.getTime() - startedAt.getTime()) / 1000));

    const stopReason = sanitizeOptionalText(body.stopReason, 255) ?? null;

    let incomingEvents: SessionTelemetryEvent[] = [];
    if (Array.isArray(body.events)) {
      incomingEvents = body.events;
    } else if (Array.isArray(body.eventsTelemetry)) {
      incomingEvents = body.eventsTelemetry.map((ev, idx) => ({
        eventIndex: idx + 1,
        eventType: ev.result === 'ESTOP' ? 'ESTOP' : ev.result,
        stepNumber: ev.stepNumber,
        targetId: ev.targetId,
        adcValue: ev.adcForce ?? null,
        reactionTimeMs: ev.reactionTimeMs ?? null,
        pointsAwarded: ev.pointsDelta,
        occurredAt: ev.timestamp || endedAt.toISOString(),
      }));
    }

    const persistEvents = telemetryAllowed && incomingEvents.length > 0;

    const validStatuses = ['COMPLETED', 'ABORTED', 'EMERGENCY_STOP', 'ERROR'];
    const finalStatus = validStatuses.includes(body.status as string)
      ? (body.status as any)
      : 'COMPLETED';
    const audienceMode =
      body.audienceMode === 'KIDS' || Boolean(body.isKidsMode) ? 'KIDS' : 'ADULTO';

    const storedMetricsPayload = {
      ...normalizedMetrics,
      zoneAnalytics: body.zoneAnalytics || undefined,
      hardwareMode: body.hardwareMode || 'MOCK',
      syncedFromOffline: Boolean(body.syncedFromOffline),
    };

    const deviceCode =
      body.deviceCode ||
      (body.hardwareMode === 'WEB_SERIAL'
        ? 'STA-UNO-R3-01'
        : body.hardwareMode === 'REMOTE_GATEWAY'
          ? 'STA-WIFI-BRIDGE-01'
          : 'STA-SIM-VIRTUAL-01');

    const [insertRes] = await conn.query<mysql.ResultSetHeader>(
      `INSERT INTO training_sessions (
        idempotency_key, correlation_id, user_id, drill_id, drill_version, device_code,
        audience_mode, status, started_at, ended_at, duration_sec, score, max_streak,
        hits, misses, wrong_hits, accuracy_pct, avg_reaction_ms, consistency_ms,
        goals_met, stop_reason, metrics_json, telemetry_included, mother_sync_status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'PENDING')`,
      [
        idempotencyKey,
        correlationId,
        userId,
        body.drillId,
        body.drillVersion || drillRow?.current_version || '1.0.0',
        deviceCode,
        audienceMode,
        finalStatus,
        startedAt,
        endedAt,
        durationSec,
        Math.round(normalizedMetrics.score),
        Math.round(normalizedMetrics.maxStreak || 0),
        Math.round(normalizedMetrics.hits || 0),
        Math.round(normalizedMetrics.misses || 0),
        Math.round(normalizedMetrics.wrongHits || 0),
        accuracyPct,
        avgReactionMs,
        consistencyMs,
        computedGoalsMet ? 1 : 0,
        stopReason,
        JSON.stringify(storedMetricsPayload),
        persistEvents ? 1 : 0,
      ]
    );

    const sessionId = insertRes.insertId;

    // 3. Persistir eventos brutos SOMENTE quando consentido pelo titular/responsável (RF19 + LGPD)
    if (persistEvents) {
      for (let i = 0; i < Math.min(incomingEvents.length, 500); i++) {
        const ev = incomingEvents[i];
        await conn.query(
          `INSERT INTO session_events (
            session_id, event_index, event_type, step_number, target_id,
            expected_target_id, adc_value, reaction_time_ms, points_awarded,
            occurred_at, device_timestamp_ms, metadata_json
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            sessionId,
            ev.eventIndex ?? i + 1,
            String(ev.eventType || 'HIT').slice(0, 40),
            ev.stepNumber ?? null,
            ev.targetId ?? null,
            ev.expectedTargetId ?? null,
            ev.adcValue ?? null,
            ev.reactionTimeMs ?? null,
            ev.pointsAwarded ?? null,
            ev.occurredAt ? new Date(ev.occurredAt) : endedAt,
            ev.deviceTimestampMs ?? null,
            ev.metadata ? JSON.stringify(ev.metadata) : null,
          ]
        );
      }
    }

    // 4. Registrar incidente automaticamente caso a sessão tenha sofrido Parada de Emergência ou Falha (RF22)
    if (finalStatus === 'EMERGENCY_STOP' || finalStatus === 'ERROR') {
      await conn.query(
        `INSERT INTO safety_incidents (
          session_id, user_id, user_name, device_code, incident_type, source, reason, correlation_id
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          sessionId,
          userId,
          resolvedUser.name,
          deviceCode,
          finalStatus === 'EMERGENCY_STOP' ? 'EMERGENCY_STOP' : 'COMMUNICATION_LOSS',
          'SESSION_SYNC',
          stopReason ||
            (finalStatus === 'EMERGENCY_STOP'
              ? 'Parada segura acionada durante a sessão'
              : 'Falha técnica reportada na sessão'),
          correlationId,
        ]
      );
    }

    await conn.commit();

    const [createdRows] = await pool.query<any[]>(
      `SELECT s.*, u.name AS user_name, p.age_group AS user_age_group, d.title AS drill_title
       FROM training_sessions s
       JOIN users u ON u.id = s.user_id
       LEFT JOIN player_profiles p ON p.user_id = s.user_id
       LEFT JOIN drills d ON d.id = s.drill_id
       WHERE s.id = ?`,
      [sessionId]
    );

    const sessionRecord = mapRowToUnifiedSession(createdRows[0], resolvedUser, false);

    // 5. Encaminhar resumo (e telemetria autorizada) à Plataforma Mãe SmartTennis / Mock (RF19)
    const receipt = await forwardSessionToMotherPlatform({
      session: sessionRecord,
      events: incomingEvents,
      telemetryAllowed,
      correlationId,
    });

    await pool.query(
      'UPDATE training_sessions SET mother_sync_status = ?, mother_sync_id = ? WHERE id = ?',
      [receipt.status, receipt.receiptId, sessionId]
    );
    sessionRecord.motherSyncStatus = receipt.status;
    sessionRecord.motherSyncId = receipt.receiptId;

    await logAuditEvent(
      finalStatus === 'EMERGENCY_STOP' ? 'SESSION_EMERGENCY_STOP' : 'SESSION_SYNC',
      userId,
      resolvedUser.name,
      req.ip,
      `Sessão #${sessionId} (${body.drillId}) sincronizada — Status: ${finalStatus}, Score: ${sessionRecord.score}, Telemetria LGPD: ${persistEvents ? 'SIM' : 'NÃO'}`,
      {
        severity: finalStatus === 'EMERGENCY_STOP' || finalStatus === 'ERROR' ? 'CRITICAL' : 'INFO',
        entityType: 'SESSION',
        entityId: sessionId,
        correlationId,
      }
    );

    const evolutionDeltaScore =
      previousScore !== null ? sessionRecord.score - previousScore : null;

    const recommendations = buildRecommendations({
      accuracyPct,
      avgReactionMs,
      wrongHits: sessionRecord.wrongHits,
      hitsByTarget: normalizedMetrics.hitsByTarget,
      isKids: audienceMode === 'KIDS',
    });

    const response: SessionSubmissionResponse & TrainingSessionRecord = {
      ...sessionRecord,
      session: sessionRecord,
      idempotentReplay: false,
      telemetryPersisted: persistEvents,
      motherPlatformReceipt: receipt,
      evolutionDeltaScore,
      recommendations,
    };

    res.status(201).json(response);
  } catch (err) {
    await conn.rollback();
    console.error('Erro ao registrar sessão de treino:', err);
    res.status(500).json({ error: 'Erro interno ao sincronizar resultados da sessão' });
  } finally {
    conn.release();
  }
}

/**
 * GET /sessions
 * Consulta histórico de sessões com filtros por período, treino, status e atleta (RF13, RF17)
 */
export async function listSessions(req: Request, res: Response): Promise<void> {
  try {
    const { from, to, periodDays, drillId, status, userId, anonymize, limit } = req.query;
    const anonymizeDemo = anonymize === 'true' || anonymize === '1';

    const conditions: string[] = [];
    const params: any[] = [];

    if (req.user?.role === 'JOGADOR') {
      conditions.push('s.user_id = ?');
      params.push(req.user.id);
    } else if (userId !== undefined && userId !== '') {
      conditions.push('s.user_id = ?');
      params.push(Number(userId));
    }

    if (drillId && typeof drillId === 'string' && drillId !== 'ALL') {
      conditions.push('s.drill_id = ?');
      params.push(drillId);
    }

    if (status && typeof status === 'string') {
      conditions.push('s.status = ?');
      params.push(status);
    }

    if (periodDays && Number(periodDays) > 0) {
      conditions.push('s.started_at >= DATE_SUB(NOW(), INTERVAL ? DAY)');
      params.push(Number(periodDays));
    }

    if (from && typeof from === 'string') {
      conditions.push('s.started_at >= ?');
      params.push(new Date(from));
    }

    if (to && typeof to === 'string') {
      conditions.push('s.started_at <= ?');
      params.push(new Date(to));
    }

    const rowLimit = Math.min(200, Math.max(1, parseInt(limit as string, 10) || 50));
    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const [rows] = await pool.query<any[]>(
      `SELECT s.*, u.name AS user_name, p.age_group AS user_age_group, d.title AS drill_title
       FROM training_sessions s
       JOIN users u ON u.id = s.user_id
       LEFT JOIN player_profiles p ON p.user_id = s.user_id
       LEFT JOIN drills d ON d.id = s.drill_id
       ${whereClause}
       ORDER BY s.started_at DESC
       LIMIT ?`,
      [...params, rowLimit]
    );

    res.json(rows.map((r) => mapRowToUnifiedSession(r, req.user, anonymizeDemo)));
  } catch (err) {
    console.error('Erro ao consultar sessões:', err);
    res.status(500).json({ error: 'Erro interno ao consultar histórico de sessões' });
  }
}

/**
 * GET /sessions/stats
 * Indicadores resumidos de precisão, consistência, volume e progressão (RF13)
 */
export async function getSessionStats(req: Request, res: Response): Promise<void> {
  try {
    const { drillId, periodDays, userId } = req.query;

    const conditions: string[] = [];
    const params: any[] = [];

    if (req.user?.role === 'JOGADOR') {
      conditions.push('s.user_id = ?');
      params.push(req.user.id);
    } else if (userId !== undefined && userId !== '') {
      conditions.push('s.user_id = ?');
      params.push(Number(userId));
    }

    if (drillId && typeof drillId === 'string' && drillId !== 'ALL') {
      conditions.push('s.drill_id = ?');
      params.push(drillId);
    }

    if (periodDays && Number(periodDays) > 0) {
      conditions.push('s.started_at >= DATE_SUB(NOW(), INTERVAL ? DAY)');
      params.push(Number(periodDays));
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const [rows] = await pool.query<any[]>(
      `SELECT s.*, u.name AS user_name, p.age_group AS user_age_group, d.title AS drill_title
       FROM training_sessions s
       JOIN users u ON u.id = s.user_id
       LEFT JOIN player_profiles p ON p.user_id = s.user_id
       LEFT JOIN drills d ON d.id = s.drill_id
       ${whereClause}
       ORDER BY s.started_at ASC`,
      params
    );

    const sessions = rows.map((r) => mapRowToUnifiedSession(r, req.user, false));

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

    const avgDeviation =
      sessions.reduce((acc, s) => acc + Math.abs(s.accuracyPct - averageAccuracyPct), 0) /
      sessions.length;
    const consistencyIndexPct = Math.max(0, Math.min(100, Math.round(100 - avgDeviation)));

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
  } catch (err) {
    console.error('Erro ao calcular estatísticas de sessões:', err);
    res.status(500).json({ error: 'Erro interno ao calcular indicadores de desempenho' });
  }
}

/**
 * GET /sessions/analytics
 * Indicadores analíticos consolidados por período e treino: precisão, consistência, tempo, volume e progressão (RF13)
 */
export async function getSessionAnalytics(req: Request, res: Response): Promise<void> {
  try {
    const { from, to, drillId, userId } = req.query;

    const targetUserId =
      req.user?.role === 'JOGADOR'
        ? req.user.id
        : userId
          ? Number(userId)
          : req.user?.id || 3;

    const conditions: string[] = ['s.user_id = ?'];
    const params: any[] = [targetUserId];

    if (drillId && typeof drillId === 'string' && drillId !== 'ALL') {
      conditions.push('s.drill_id = ?');
      params.push(drillId);
    }

    if (from && typeof from === 'string') {
      conditions.push('s.started_at >= ?');
      params.push(new Date(from));
    }

    if (to && typeof to === 'string') {
      conditions.push('s.started_at <= ?');
      params.push(new Date(to));
    }

    const [rows] = await pool.query<any[]>(
      `SELECT s.*, d.title AS drill_title
       FROM training_sessions s
       LEFT JOIN drills d ON d.id = s.drill_id
       WHERE ${conditions.join(' AND ')}
       ORDER BY s.started_at ASC`,
      params
    );

    const hitsByTarget: Record<TargetId, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    let totalDurationSec = 0;
    let totalHits = 0;
    let totalShots = 0;
    let scoreSum = 0;
    let bestScore = 0;
    let accSum = 0;
    let reactionSum = 0;
    let reactionCount = 0;
    let consistencySum = 0;
    let completedSessions = 0;

    const progression = rows.map((r) => {
      const score = Number(r.score || 0);
      const hits = Number(r.hits || 0);
      const misses = Number(r.misses || 0);
      const wrongHits = Number(r.wrong_hits || 0);
      const acc = Number(r.accuracy_pct || 0);
      const avgRt = Number(r.avg_reaction_ms || 0);

      if (r.status === 'COMPLETED') completedSessions += 1;
      totalDurationSec += Number(r.duration_sec || 0);
      totalHits += hits;
      totalShots += hits + misses + wrongHits;
      scoreSum += score;
      if (score > bestScore) bestScore = score;
      accSum += acc;
      consistencySum += Number(r.consistency_ms || 0);

      if (avgRt > 0) {
        reactionSum += avgRt;
        reactionCount += 1;
      }

      const parsedMetrics = safeJsonParse<any>(r.metrics_json, null);
      if (parsedMetrics?.hitsByTarget) {
        ([1, 2, 3, 4, 5] as TargetId[]).forEach((t) => {
          hitsByTarget[t] += Number(parsedMetrics.hitsByTarget[t] || 0);
        });
      }

      return {
        sessionId: r.id,
        date: new Date(r.started_at).toISOString(),
        drillId: r.drill_id,
        drillTitle: r.drill_title || r.drill_id,
        score,
        accuracyPct: acc,
        avgReactionMs: avgRt,
      };
    });

    const totalSessions = rows.length;
    const averageAccuracyPct =
      totalSessions > 0 ? Math.round((accSum / totalSessions) * 10) / 10 : 0;
    const averageReactionMs =
      reactionCount > 0 ? Math.round(reactionSum / reactionCount) : 0;
    const consistencyStdDevMs =
      totalSessions > 0 ? Math.round(consistencySum / totalSessions) : 0;

    const isKids = rows.some((r) => r.audience_mode === 'KIDS');
    const recommendations = buildRecommendations({
      accuracyPct: averageAccuracyPct,
      avgReactionMs: averageReactionMs,
      wrongHits: rows.reduce((s, r) => s + Number(r.wrong_hits || 0), 0),
      hitsByTarget,
      isKids,
    });

    const summary: SessionAnalyticsSummary = {
      userId: targetUserId,
      totalSessions,
      completedSessions,
      totalShots,
      totalHits,
      totalDurationSec,
      averageScore: totalSessions > 0 ? Math.round(scoreSum / totalSessions) : 0,
      bestScore,
      averageAccuracyPct,
      averageReactionMs,
      consistencyStdDevMs,
      hitsByTarget,
      progression,
      recommendations,
    };

    res.json(summary);
  } catch (err) {
    console.error('Erro ao calcular analytics das sessões:', err);
    res.status(500).json({ error: 'Erro interno ao gerar indicadores analíticos' });
  }
}

/**
 * GET /sessions/:id
 * Detalhes completos de uma sessão específica com linha do tempo de eventos (RF12, RF19)
 */
export async function getSessionById(req: Request, res: Response): Promise<void> {
  try {
    const sessionId = parseInt(req.params.id, 10);
    if (Number.isNaN(sessionId)) {
      res.status(400).json({ error: 'ID de sessão inválido' });
      return;
    }

    const [rows] = await pool.query<any[]>(
      `SELECT s.*, u.name AS user_name, p.age_group AS user_age_group, d.title AS drill_title
       FROM training_sessions s
       JOIN users u ON u.id = s.user_id
       LEFT JOIN player_profiles p ON p.user_id = s.user_id
       LEFT JOIN drills d ON d.id = s.drill_id
       WHERE s.id = ?`,
      [sessionId]
    );

    if (rows.length === 0) {
      res.status(404).json({ error: 'Sessão não encontrada' });
      return;
    }

    const row = rows[0];
    if (req.user?.role === 'JOGADOR' && row.user_id !== req.user.id) {
      res.status(403).json({ error: 'Acesso negado a sessões de outros praticantes' });
      return;
    }

    const anonymizeDemo = req.query.anonymize === 'true' || req.query.anonymize === '1';
    const session = mapRowToUnifiedSession(row, req.user, anonymizeDemo);

    const [eventRows] = await pool.query<any[]>(
      `SELECT event_index, event_type, step_number, target_id, expected_target_id,
              adc_value, reaction_time_ms, points_awarded, occurred_at,
              device_timestamp_ms, metadata_json
       FROM session_events
       WHERE session_id = ?
       ORDER BY event_index ASC`,
      [sessionId]
    );

    session.events = eventRows.map((ev) => ({
      eventIndex: ev.event_index,
      eventType: ev.event_type,
      stepNumber: ev.step_number,
      targetId: ev.target_id,
      expectedTargetId: ev.expected_target_id,
      adcValue: ev.adc_value,
      reactionTimeMs: ev.reaction_time_ms,
      pointsAwarded: ev.points_awarded,
      occurredAt: new Date(ev.occurred_at).toISOString(),
      deviceTimestampMs: ev.device_timestamp_ms !== null ? Number(ev.device_timestamp_ms) : null,
      metadata: safeJsonParse(ev.metadata_json, null),
    }));

    res.json(session);
  } catch (err) {
    console.error('Erro ao buscar detalhes da sessão:', err);
    res.status(500).json({ error: 'Erro interno ao buscar detalhes da sessão' });
  }
}
