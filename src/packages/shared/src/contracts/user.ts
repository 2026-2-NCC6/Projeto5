/**
 * Contratos de Usuários, Autenticação, Perfis, Sessões de Treino e Auditoria
 * (RF01, RF02, RF12, RF13, RF17, RF19, RF21, RF23)
 * Smart Tennis Arena - 6º CCOMP 2026
 */

import type { TargetId } from '../protocol/serial';

export type UserRole = 'JOGADOR' | 'TREINADOR' | 'ADMIN';

export type SkillLevel = 'INICIANTE' | 'INTERMEDIARIO' | 'AVANCADO';

export type AgeGroup = 'KIDS' | 'ADULTO';

export interface User {
  id: number;
  name: string;
  email: string;
  role: UserRole;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PlayerProfile {
  id: number;
  userId: number;
  skillLevel: SkillLevel;
  ageGroup: AgeGroup;
  trainingGoals?: string | null;
  preferences?: string | null;
  physicalRestrictions?: string | null;
  guardianName?: string | null;
  guardianConsent?: boolean;
  telemetryConsent?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface UserWithProfile extends User {
  profile?: PlayerProfile | null;
}

export interface LoginDto {
  email: string;
  password: string;
}

export interface ResetPasswordDto {
  email: string;
  newPassword: string;
}

export interface RegisterDto {
  name: string;
  email: string;
  password: string;
  role?: UserRole;
  skillLevel?: SkillLevel;
  ageGroup?: AgeGroup;
  trainingGoals?: string | null;
  preferences?: string | null;
  physicalRestrictions?: string | null;
  guardianName?: string | null;
  guardianConsent?: boolean;
  telemetryConsent?: boolean;
}

export interface AdminCreateUserDto {
  name: string;
  email: string;
  password?: string;
  role: UserRole;
  skillLevel?: SkillLevel;
  ageGroup?: AgeGroup;
  trainingGoals?: string | null;
  preferences?: string | null;
  physicalRestrictions?: string | null;
  guardianName?: string | null;
  guardianConsent?: boolean;
  telemetryConsent?: boolean;
}

export interface UpdateUserDto {
  name?: string;
  role?: UserRole;
  isActive?: boolean;
}

export interface UpdateProfileDto {
  name?: string;
  skillLevel?: SkillLevel;
  ageGroup?: AgeGroup;
  trainingGoals?: string | null;
  preferences?: string | null;
  physicalRestrictions?: string | null;
  guardianName?: string | null;
  guardianConsent?: boolean;
  telemetryConsent?: boolean;
}

export interface AuthResponse {
  token: string;
  user: UserWithProfile;
}

export interface AuditLog {
  id: number;
  userId?: number | null;
  userName?: string | null;
  action: string;
  severity?: 'INFO' | 'WARN' | 'CRITICAL';
  entityType?: string | null;
  entityId?: string | null;
  correlationId?: string | null;
  ipAddress?: string | null;
  details?: string | null;
  createdAt: string;
}

// ==========================================
// Contratos de Sessão, Telemetria e Histórico (RF12, RF13, RF19, RF21)
// ==========================================

export type SessionCompletionStatus = 'COMPLETED' | 'ABORTED' | 'EMERGENCY_STOP';

export interface SessionEventLogItem {
  stepNumber: number;
  targetId: TargetId;
  result: 'HIT' | 'WRONG_HIT' | 'MISS' | 'ESTOP';
  reactionTimeMs?: number;
  adcForce?: number;
  pointsDelta: number;
  ballSpeedKmh?: number;
  spinType?: string;
  timestamp: string;
}

export interface SessionZoneStat {
  attempts: Record<TargetId, number>;
  hits: Record<TargetId, number>;
  avgReactionMs: Record<TargetId, number>;
}

export interface CreateSessionDto {
  sessionUuid: string; // Idempotência para operação offline (RF21)
  drillId: string;
  drillTitle: string;
  drillVersion: string;
  isKidsMode: boolean;
  status: SessionCompletionStatus;
  score: number;
  maxStreak: number;
  hits: number;
  misses: number;
  wrongHits: number;
  accuracyPct: number;
  averageReactionTimeMs: number;
  durationSec: number;
  hardwareMode: 'WEB_SERIAL' | 'REMOTE_GATEWAY' | 'MOCK';
  zoneAnalytics: SessionZoneStat;
  eventsTelemetry?: SessionEventLogItem[];
  telemetryAuthorized?: boolean; // Proteção LGPD / Coleta mínima para menores
  startedAt: string;
  completedAt: string;
}

export interface TrainingSessionRecord extends CreateSessionDto {
  id: number;
  userId?: number | null;
  athleteName: string;
  syncedFromOffline?: boolean;
  createdAt: string;
}

export interface SessionStatsSummary {
  totalSessions: number;
  totalShotsVolume: number;
  totalHits: number;
  averageAccuracyPct: number;
  averageReactionTimeMs: number;
  bestScore: number;
  bestStreak: number;
  consistencyIndexPct: number; // Estabilidade de acerto entre sessões
  progressionDeltaPct: number; // Evolução recente vs média histórica
}
