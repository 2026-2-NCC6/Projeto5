import crypto from 'crypto';
import { config } from '../config';
import { pool } from '../db';
import type { DrillDefinition } from '../../../packages/shared/src/contracts/drills';
import type {
  MotherPlatformSyncReceipt,
  SessionRecord,
  SessionTelemetryEvent,
} from '../../../packages/shared/src/contracts/sessions';

/**
 * Adaptador de Integração com a Plataforma Mãe SmartTennis / Mock Compatível (RF18, RF19, Seção 9)
 */
export async function forwardSessionToMotherPlatform(params: {
  session: SessionRecord;
  events: SessionTelemetryEvent[];
  telemetryAllowed: boolean;
  correlationId?: string | null;
}): Promise<MotherPlatformSyncReceipt> {
  const { session, events, telemetryAllowed, correlationId } = params;
  const syncedAt = new Date().toISOString();
  const receiptId = `mp-sess-${crypto.randomUUID().slice(0, 12)}`;

  const outboundPayload = {
    sourceSystem: 'SMART_TENNIS_ARENA_FECAP_2026',
    schemaVersion: '1.0',
    idempotencyKey: session.idempotencyKey,
    correlationId: correlationId || session.correlationId,
    drillId: session.drillId,
    drillVersion: session.drillVersion,
    audienceMode: session.audienceMode,
    status: session.status,
    startedAt: session.startedAt,
    endedAt: session.endedAt,
    durationSec: session.durationSec,
    summary: {
      score: session.score,
      maxStreak: session.maxStreak,
      hits: session.hits,
      misses: session.misses,
      wrongHits: session.wrongHits,
      accuracyPct: session.accuracyPct,
      avgReactionMs: session.avgReactionMs,
      consistencyMs: session.consistencyMs,
      goalsMet: session.goalsMet,
      stopReason: session.stopReason,
    },
    telemetryAuthorized: telemetryAllowed,
    telemetryEvents: telemetryAllowed ? events : [],
  };

  if (config.motherPlatform.mode === 'external' && config.motherPlatform.baseUrl) {
    const endpoint = `${config.motherPlatform.baseUrl.replace(/\/+$/, '')}/ingest`;
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (config.motherPlatform.apiKey) {
        headers['Authorization'] = `Bearer ${config.motherPlatform.apiKey}`;
      }
      if (correlationId) {
        headers['X-Correlation-Id'] = correlationId;
      }

      const resp = await fetch(endpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify(outboundPayload),
      });

      const status = resp.ok ? 'SYNCED_EXTERNAL' : 'PENDING';
      await pool.query(
        `INSERT INTO mother_platform_sync_logs (
          receipt_id, direction, entity_id, mode, status, telemetry_forwarded, correlation_id, payload_summary_json
        ) VALUES (?, 'OUTBOUND_SESSION', ?, 'external', ?, ?, ?, ?)`,
        [
          receiptId,
          session.idempotencyKey,
          status,
          telemetryAllowed ? 1 : 0,
          correlationId || null,
          JSON.stringify(outboundPayload.summary),
        ]
      );

      return {
        receiptId,
        status,
        syncedAt,
        telemetryForwarded: telemetryAllowed && events.length > 0,
        endpoint,
      };
    } catch {
      await pool.query(
        `INSERT INTO mother_platform_sync_logs (
          receipt_id, direction, entity_id, mode, status, telemetry_forwarded, correlation_id, payload_summary_json
        ) VALUES (?, 'OUTBOUND_SESSION', ?, 'external', 'PENDING', ?, ?, ?)`,
        [
          receiptId,
          session.idempotencyKey,
          telemetryAllowed ? 1 : 0,
          correlationId || null,
          JSON.stringify(outboundPayload.summary),
        ]
      );

      return {
        receiptId,
        status: 'PENDING',
        syncedAt,
        telemetryForwarded: false,
        endpoint,
      };
    }
  }

  // Modo Mock Compatível integrado (padrão MVP acadêmico — Seção 9)
  const mockEndpoint = '/api/v1/mother-platform/ingest';
  await pool.query(
    `INSERT INTO mother_platform_sync_logs (
      receipt_id, direction, entity_id, mode, status, telemetry_forwarded, correlation_id, payload_summary_json
    ) VALUES (?, 'OUTBOUND_SESSION', ?, 'mock', 'ACCEPTED', ?, ?, ?)`,
    [
      receiptId,
      session.idempotencyKey,
      telemetryAllowed && events.length > 0 ? 1 : 0,
      correlationId || null,
      JSON.stringify({
        drillId: session.drillId,
        drillVersion: session.drillVersion,
        score: session.score,
        accuracyPct: session.accuracyPct,
        telemetryEventsCount: telemetryAllowed ? events.length : 0,
      }),
    ]
  );

  return {
    receiptId,
    status: 'SYNCED_MOCK',
    syncedAt,
    telemetryForwarded: telemetryAllowed && events.length > 0,
    endpoint: mockEndpoint,
  };
}

export async function recordDrillPublicationOnMotherPlatform(
  drill: DrillDefinition,
  correlationId?: string | null
): Promise<string> {
  const receiptId = `mp-drill-${crypto.randomUUID().slice(0, 12)}`;
  await pool.query(
    `INSERT INTO mother_platform_sync_logs (
      receipt_id, direction, entity_id, mode, status, telemetry_forwarded, correlation_id, payload_summary_json
    ) VALUES (?, 'OUTBOUND_DRILL', ?, ?, 'PUBLISHED', 0, ?, ?)`,
    [
      receiptId,
      `${drill.id}@${drill.version}`,
      config.motherPlatform.mode,
      correlationId || null,
      JSON.stringify({
        drillId: drill.id,
        title: drill.title,
        version: drill.version,
        marketplace: drill.marketplace || null,
      }),
    ]
  );
  return receiptId;
}

