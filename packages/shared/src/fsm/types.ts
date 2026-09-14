/**
 * Smart Tennis Arena — Máquina de Estados Finitos com Saída (Mealy FSM)
 * Alinhado com: docs/spec/03-state-machine-and-formal-model.md
 */

import { TargetId } from '../protocol/serial';

export enum GameState {
  IDLE = 'IDLE',
  CONNECTING = 'CONNECTING',
  READY = 'READY',
  COUNTDOWN = 'COUNTDOWN',
  RUNNING_TARGET_ACTIVE = 'RUNNING_TARGET_ACTIVE',
  TARGET_HIT = 'TARGET_HIT',
  TARGET_MISS_TIMEOUT = 'TARGET_MISS_TIMEOUT',
  PAUSED = 'PAUSED',
  EMERGENCY_STOP = 'EMERGENCY_STOP',
  COMPLETED = 'COMPLETED',
  SYNCING = 'SYNCING',
}

export type GameEvent =
  | { type: 'EV_CONNECT_REQ' }
  | { type: 'EV_CONN_ACK'; hw: string; fw: string }
  | { type: 'EV_CONN_FAIL'; reason: string }
  | { type: 'EV_DISCONNECT' }
  | { type: 'EV_START_SESSION' }
  | { type: 'EV_TIMER_TICK'; remainingMs: number }
  | { type: 'EV_COUNTDOWN_EXPIRED' }
  | { type: 'EV_PIEZO_TRIGGER'; target: TargetId; value: number; timestamp: number }
  | { type: 'EV_ROUND_TIMEOUT' }
  | { type: 'EV_NEXT_TARGET' }
  | { type: 'EV_PAUSE_REQ' }
  | { type: 'EV_RESUME_REQ' }
  | { type: 'EV_ABORT_SESSION' }
  | { type: 'EV_BEGIN_SYNC' }
  | { type: 'EV_SYNC_SUCCESS' }
  | { type: 'EV_SYNC_OFFLINE' }
  | { type: 'EV_EMERGENCY_STOP'; source: string }
  | { type: 'EV_SYSTEM_RESET' };

export interface SessionMetrics {
  score: number;
  streak: number;
  maxStreak: number;
  hits: number;
  misses: number;
  wrongHits: number;
  reactionTimes: number[];
  averageReactionTimeMs: number;
  hitsByTarget: Record<TargetId, number>;
}
