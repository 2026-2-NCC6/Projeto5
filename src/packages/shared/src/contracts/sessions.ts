/**
 * Smart Tennis Arena — Contratos de Sessões, Telemetria, Sincronização Idempotente e Analytics
 * Alinhado com: RF07, RF12, RF13, RF19, RF21, RF22 e LGPD (Seções 3 e 5)
 */

import type { TargetId } from '../protocol/serial';
import type { SessionMetrics } from '../fsm/types';
import type { AgeGroup } from './user';

export type SessionFinishStatus =
  | 'COMPLETED'
  | 'ABORTED'
  | 'EMERGENCY_STOP'
  | 'ERROR';

export type SessionEventType =
  | 'SESSION_START'
  | 'STEP_START'
  | 'HIT'
  | 'WRONG_HIT'
  | 'MISS'
  | 'PAUSE'
  | 'RESUME'
  | 'MACHINE_SHOT'
  | 'ESTOP'
  | 'SENSOR_FAULT'
  | 'SESSION_END';

export type MotherPlatformSyncStatus =
  | 'SYNCED_MOCK'
  | 'SYNCED_EXTERNAL'
  | 'PENDING'
  | 'FAILED';

/**
 * Evento mensurável de sensor/atuador/máquina registrado com data e hora ISO 8601 (RF07, RF19)
 */
export interface SessionTelemetryEvent {
  eventIndex: number;
  eventType: SessionEventType;
  stepNumber?: number | null;
  targetId?: TargetId | null;
  expectedTargetId?: TargetId | null;
  adcValue?: number | null;
  reactionTimeMs?: number | null;
  pointsAwarded?: number | null;
  occurredAt: string;
  deviceTimestampMs?: number | null;
  metadata?: Record<string, unknown> | null;
}

/**
 * Payload de submissão de sessão concluída ou sincronizada offline (RF19, RF21)
 */
export interface CreateSessionDto {
  idempotencyKey: string;
  correlationId?: string;
  drillId: string;
  drillVersion: string;
  deviceCode?: string | null;
  audienceMode: AgeGroup;
  status: SessionFinishStatus;
  startedAt: string;
  endedAt: string;
  durationSec: number;
  metrics: SessionMetrics;
  goalsMet?: boolean;
  stopReason?: string | null;
  events?: SessionTelemetryEvent[];
}

export interface MotherPlatformSyncReceipt {
  receiptId: string;
  status: MotherPlatformSyncStatus;
  syncedAt: string;
  telemetryForwarded: boolean;
  endpoint: string;
}

export interface SessionRecord {
  id: number;
  idempotencyKey: string;
  correlationId: string | null;
  userId: number;
  userName: string;
  drillId: string;
  drillTitle?: string;
  drillVersion: string;
  deviceCode: string | null;
  audienceMode: AgeGroup;
  status: SessionFinishStatus;
  startedAt: string;
  endedAt: string;
  durationSec: number;
  score: number;
  maxStreak: number;
  hits: number;
  misses: number;
  wrongHits: number;
  accuracyPct: number;
  avgReactionMs: number;
  consistencyMs: number;
  goalsMet: boolean;
  stopReason: string | null;
  metrics: SessionMetrics;
  telemetryIncluded: boolean;
  motherSyncStatus: MotherPlatformSyncStatus;
  motherSyncId: string | null;
  events?: SessionTelemetryEvent[];
  createdAt: string;
}

export interface SessionSubmissionResponse {
  session: SessionRecord;
  idempotentReplay: boolean;
  telemetryPersisted: boolean;
  motherPlatformReceipt: MotherPlatformSyncReceipt;
  evolutionDeltaScore: number | null;
  recommendations: string[];
}

export interface SessionProgressionPoint {
  sessionId: number;
  date: string;
  drillId: string;
  drillTitle: string;
  score: number;
  accuracyPct: number;
  avgReactionMs: number;
}

/**
 * Indicadores analíticos consolidados por período e treino (RF12, RF13)
 */
export interface SessionAnalyticsSummary {
  userId: number;
  totalSessions: number;
  completedSessions: number;
  totalShots: number;
  totalHits: number;
  totalDurationSec: number;
  averageScore: number;
  bestScore: number;
  averageAccuracyPct: number;
  averageReactionMs: number;
  consistencyStdDevMs: number;
  hitsByTarget: Record<TargetId, number>;
  progression: SessionProgressionPoint[];
  recommendations: string[];
}

/**
 * Calcula precisão (%) e consistência (desvio-padrão em ms dos tempos de reação) de forma determinística
 */
export function computeSessionAnalyticalIndicators(metrics: SessionMetrics): {
  accuracyPct: number;
  consistencyMs: number;
  totalAttempts: number;
} {
  const totalAttempts = Math.max(0, metrics.hits + metrics.misses + metrics.wrongHits);
  const accuracyPct =
    totalAttempts > 0 ? Math.round((metrics.hits / totalAttempts) * 1000) / 10 : 0;

  const rts = Array.isArray(metrics.reactionTimes)
    ? metrics.reactionTimes.filter((n) => typeof n === 'number' && Number.isFinite(n) && n >= 0)
    : [];

  if (rts.length <= 1) {
    return { accuracyPct, consistencyMs: 0, totalAttempts };
  }

  const mean = rts.reduce((acc, v) => acc + v, 0) / rts.length;
  const variance = rts.reduce((acc, v) => acc + (v - mean) ** 2, 0) / rts.length;
  const consistencyMs = Math.round(Math.sqrt(variance));

  return { accuracyPct, consistencyMs, totalAttempts };
}

