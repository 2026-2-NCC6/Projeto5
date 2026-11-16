import { NativeModules, Platform } from 'react-native';
import {
  AdminCreateUserDto,
  AuthResponse,
  LoginDto,
  RegisterDto,
  ResetPasswordDto,
  UpdateProfileDto,
  UpdateUserDto,
  UserWithProfile,
  AuditLog,
  CreateSessionDto,
  TrainingSessionRecord,
  SessionStatsSummary,
} from '../../../packages/shared/src/contracts/user';
import {
<<<<<<< HEAD
  DrillDefinition,
  DrillStatus,
  DEFAULT_DRILLS,
  bumpDrillVersion,
} from '../../../packages/shared/src/contracts/drills';

// URL base da API REST
export const API_BASE_URL = 'http://localhost:3001/api';
=======
  CreateOrUpdateDrillDto,
  DrillDefinition,
  DrillLifecycleStatus,
  DrillValidationResult,
  DrillVersionRecord,
} from '../../../packages/shared/src/contracts/drills';
import {
  CreateSessionDto,
  SessionAnalyticsSummary,
  SessionRecord,
  SessionSubmissionResponse,
} from '../../../packages/shared/src/contracts/sessions';
import {
  CategoryRecord,
  IoTDeviceRecord,
  PairIoTDeviceDto,
  ReportSafetyIncidentDto,
  SafetyIncidentRecord,
  SystemSettingRecord,
} from '../../../packages/shared/src/contracts/admin';

/**
 * Resolve dinamicamente a URL da API REST:
 * 1. Prioriza `EXPO_PUBLIC_API_URL` quando definida no ambiente;
 * 2. Na Web, acompanha o hostname atual (ex.: localhost ou IP da rede local);
 * 3. No Expo Go / React Native nativo (Android/iOS), extrai automaticamente o IP da máquina host via `SourceCode.scriptURL`,
 *    com fallback para `10.0.2.2` (emulador Android) ou `localhost` (simulador iOS).
 */
let customHostIpOverride: string | null = null;

function detectMobileLanIp(): string | null {
  try {
    const sc = NativeModules?.SourceCode;
    const scriptURL: string | undefined =
      sc?.scriptURL || (typeof sc?.getConstants === 'function' ? sc.getConstants()?.scriptURL : undefined);
    if (scriptURL) {
      const match = scriptURL.match(/^https?:\/\/([^/:]+)(:\d+)?/);
      if (match && match[1] && match[1] !== 'localhost' && match[1] !== '127.0.0.1') {
        return match[1];
      }
    }
  } catch {}

  try {
    const stack = new Error().stack || '';
    const stackMatch = stack.match(/https?:\/\/(\d+\.\d+\.\d+\.\d+)(:\d+)?/);
    if (stackMatch && stackMatch[1] && stackMatch[1] !== '127.0.0.1') {
      return stackMatch[1];
    }
  } catch {}

  return null;
}

/**
 * Resolve dinamicamente a URL da API REST:
 * 1. Respeita override manual de IP configurado na aba IoT;
 * 2. Na Web, acompanha o hostname atual (ex.: localhost ou IP da rede local);
 * 3. No Expo Go / React Native nativo (Android/iOS), extrai automaticamente o IP LAN do PC via Metro/SourceCode
 *    ou utiliza `EXPO_PUBLIC_API_URL` (ignorando localhost no celular), com fallback para o IP da rede local.
 */
export function resolveApiBaseUrl(): string {
  if (customHostIpOverride) {
    const clean = customHostIpOverride.trim().replace(/^https?:\/\//, '').replace(/\/.*$/, '');
    const hostOnly = clean.includes(':') ? clean : `${clean}:3001`;
    return `http://${hostOnly}/api/v1`;
  }

  const envUrl =
    typeof process !== 'undefined' && process.env?.EXPO_PUBLIC_API_URL
      ? process.env.EXPO_PUBLIC_API_URL.trim().replace(/\/+$/, '')
      : '';

  if (Platform.OS === 'web' && typeof window !== 'undefined' && window.location?.hostname) {
    if (envUrl && envUrl.startsWith('https://')) {
      return envUrl;
    }
    const host = window.location.hostname;
    return `http://${host}:3001/api/v1`;
  }

  const lanIp = detectMobileLanIp();
  if (lanIp) {
    return `http://${lanIp}:3001/api/v1`;
  }

  if (envUrl && !envUrl.includes('localhost') && !envUrl.includes('127.0.0.1')) {
    return envUrl;
  }

  // Fallback para o IP da máquina host na rede local Wi-Fi
  return 'http://192.168.15.160:3001/api/v1';
}

export let API_BASE_URL = resolveApiBaseUrl();

export function getApiBaseUrl(): string {
  API_BASE_URL = resolveApiBaseUrl();
  return API_BASE_URL;
}

export function setCustomApiHost(hostOrIp: string | null): string {
  customHostIpOverride = hostOrIp && hostOrIp.trim() ? hostOrIp.trim() : null;
  API_BASE_URL = resolveApiBaseUrl();
  return API_BASE_URL;
}

export function getDetectedHostIp(): string {
  const base = getApiBaseUrl();
  const m = base.match(/^https?:\/\/([^/:]+)/);
  return m && m[1] ? m[1] : '192.168.15.160';
}

const TOKEN_STORAGE_KEY = '@smart_tennis_token';

export function generateCorrelationId(prefix: string = 'mob'): string {
  const rand = Math.random().toString(36).slice(2, 10);
  return `${prefix}-${Date.now().toString(36)}-${rand}`;
}
>>>>>>> 03e98db8d84f475b5e841e8cac192153a6d66d0c

const TOKEN_KEY = '@smart_tennis_token';
const DRILLS_CACHE_KEY = '@smart_tennis_drills_cache_v1';
const OFFLINE_SESSIONS_KEY = '@smart_tennis_offline_sessions_v1';
const SESSIONS_HISTORY_CACHE_KEY = '@smart_tennis_sessions_history_v1';

const FALLBACK_SEED_SESSIONS: TrainingSessionRecord[] = [
  {
    id: 1,
    sessionUuid: 'seed-session-001',
    userId: 3,
    athleteName: 'Lucas Praticante',
    drillId: 'drill-interm-cross-precision',
    drillTitle: 'Precisão Cruzada (Forehand & Backhand)',
    drillVersion: '1.0.0',
    isKidsMode: false,
    status: 'COMPLETED',
    score: 1240,
    maxStreak: 5,
    hits: 7,
    misses: 1,
    wrongHits: 0,
    accuracyPct: 88,
    averageReactionTimeMs: 790,
    durationSec: 25,
    hardwareMode: 'MOCK',
    zoneAnalytics: {
      attempts: { 1: 3, 2: 2, 3: 2, 4: 2, 5: 1 },
      hits: { 1: 3, 2: 2, 3: 1, 4: 2, 5: 1 },
      avgReactionMs: { 1: 680, 2: 720, 3: 890, 4: 740, 5: 650 },
    },
    telemetryAuthorized: true,
    syncedFromOffline: false,
    startedAt: new Date(Date.now() - 86400000 * 3).toISOString(),
    completedAt: new Date(Date.now() - 86400000 * 3).toISOString(),
    createdAt: new Date(Date.now() - 86400000 * 3).toISOString(),
  },
  {
    id: 2,
    sessionUuid: 'seed-session-002',
    userId: 3,
    athleteName: 'Lucas Praticante',
    drillId: 'drill-pro-rapid-reflex',
    drillTitle: 'Reflexo Rápido (Fundo de Quadra)',
    drillVersion: '1.0.0',
    isKidsMode: false,
    status: 'COMPLETED',
    score: 1680,
    maxStreak: 7,
    hits: 9,
    misses: 1,
    wrongHits: 0,
    accuracyPct: 90,
    averageReactionTimeMs: 710,
    durationSec: 26,
    hardwareMode: 'WEB_SERIAL',
    zoneAnalytics: {
      attempts: { 1: 3, 2: 2, 3: 2, 4: 2, 5: 1 },
      hits: { 1: 3, 2: 2, 3: 2, 4: 1, 5: 1 },
      avgReactionMs: { 1: 640, 2: 700, 3: 750, 4: 720, 5: 620 },
    },
    telemetryAuthorized: true,
    syncedFromOffline: false,
    startedAt: new Date(Date.now() - 86400000 * 1).toISOString(),
    completedAt: new Date(Date.now() - 86400000 * 1).toISOString(),
    createdAt: new Date(Date.now() - 86400000 * 1).toISOString(),
  },
  {
    id: 3,
    sessionUuid: 'seed-session-003',
    userId: 4,
    athleteName: 'Theo (Perfil Kids Protegido LGPD)',
    drillId: 'drill-kids-magic-targets',
    drillTitle: 'Alvos Mágicos do Tênis',
    drillVersion: '1.0.0',
    isKidsMode: true,
    status: 'COMPLETED',
    score: 1120,
    maxStreak: 6,
    hits: 6,
    misses: 0,
    wrongHits: 0,
    accuracyPct: 100,
    averageReactionTimeMs: 1240,
    durationSec: 24,
    hardwareMode: 'MOCK',
    zoneAnalytics: {
      attempts: { 1: 1, 2: 1, 3: 1, 4: 1, 5: 2 },
      hits: { 1: 1, 2: 1, 3: 1, 4: 1, 5: 2 },
      avgReactionMs: { 1: 1250, 2: 1320, 3: 1410, 4: 1180, 5: 1100 },
    },
    telemetryAuthorized: false,
    syncedFromOffline: false,
    startedAt: new Date(Date.now() - 7200000).toISOString(),
    completedAt: new Date(Date.now() - 7200000).toISOString(),
    createdAt: new Date(Date.now() - 7200000).toISOString(),
  },
];

class StorageHelper {
<<<<<<< HEAD
  private inMemoryToken: string | null = null;
  private inMemoryMap: Record<string, string> = {};

  async getToken(): Promise<string | null> {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        return window.localStorage.getItem(TOKEN_KEY);
=======
  private memoryStore = new Map<string, string>();

  async getToken(): Promise<string | null> {
    try {
      if (typeof window !== 'undefined') {
        if (window.sessionStorage) {
          const sessionTok = window.sessionStorage.getItem(TOKEN_STORAGE_KEY);
          if (sessionTok) return sessionTok;
        }
        if (window.localStorage) {
          const legacyTok = window.localStorage.getItem(TOKEN_STORAGE_KEY);
          if (legacyTok) {
            window.sessionStorage?.setItem(TOKEN_STORAGE_KEY, legacyTok);
            window.localStorage.removeItem(TOKEN_STORAGE_KEY);
            return legacyTok;
          }
        }
>>>>>>> 03e98db8d84f475b5e841e8cac192153a6d66d0c
      }
    } catch {}
    return this.memoryStore.get(TOKEN_STORAGE_KEY) ?? null;
  }

  async setToken(token: string | null): Promise<void> {
    if (token) {
      this.memoryStore.set(TOKEN_STORAGE_KEY, token);
    } else {
      this.memoryStore.delete(TOKEN_STORAGE_KEY);
    }

    try {
      if (typeof window !== 'undefined') {
        if (token) {
          window.sessionStorage?.setItem(TOKEN_STORAGE_KEY, token);
        } else {
          window.sessionStorage?.removeItem(TOKEN_STORAGE_KEY);
        }
        window.localStorage?.removeItem(TOKEN_STORAGE_KEY);
      }
    } catch {}
  }

  async getItem(key: string): Promise<string | null> {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
<<<<<<< HEAD
        if (token) {
          window.localStorage.setItem(TOKEN_KEY, token);
        } else {
          window.localStorage.removeItem(TOKEN_KEY);
        }
=======
        const val = window.localStorage.getItem(key);
        if (val !== null) return val;
      }
    } catch {}
    return this.memoryStore.get(key) ?? null;
  }

  async setItem(key: string, value: string): Promise<void> {
    this.memoryStore.set(key, value);
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(key, value);
      }
    } catch {}
  }

  async removeItem(key: string): Promise<void> {
    this.memoryStore.delete(key);
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.removeItem(key);
>>>>>>> 03e98db8d84f475b5e841e8cac192153a6d66d0c
      }
    } catch {}
  }

  getJson<T>(key: string, fallback: T): T {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const raw = window.localStorage.getItem(key);
        if (raw) return JSON.parse(raw) as T;
      } else if (this.inMemoryMap[key]) {
        return JSON.parse(this.inMemoryMap[key]) as T;
      }
    } catch {}
    return fallback;
  }

  setJson<T>(key: string, value: T): void {
    try {
      const serialized = JSON.stringify(value);
      this.inMemoryMap[key] = serialized;
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(key, serialized);
      }
    } catch {}
  }
}

export const storage = new StorageHelper();

async function request<T>(
  endpoint: string,
  options: RequestInit = {},
  correlationId?: string
): Promise<T> {
  const token = await storage.getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-Correlation-Id': correlationId || generateCorrelationId(),
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const baseUrl = getApiBaseUrl();
  const response = await fetch(`${baseUrl}${endpoint}`, {
    ...options,
    headers,
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.error || `Erro ${response.status}: Falha na requisição`);
  }

  return data as T;
}

<<<<<<< HEAD
function computeStatsFromList(sessions: TrainingSessionRecord[]): SessionStatsSummary {
  if (sessions.length === 0) {
    return {
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
  }

  let totalShotsVolume = 0;
  let totalHits = 0;
  let sumAccuracy = 0;
  let sumReaction = 0;
  let reactionCount = 0;
  let bestScore = 0;
  let bestStreak = 0;

  for (const s of sessions) {
    totalShotsVolume += s.hits + s.misses + s.wrongHits;
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

  const orderedAsc = [...sessions].sort(
    (a, b) => new Date(a.completedAt).getTime() - new Date(b.completedAt).getTime()
  );
  const half = Math.max(1, Math.floor(orderedAsc.length / 2));
  const firstHalfAvg =
    orderedAsc.slice(0, half).reduce((a, b) => a + b.accuracyPct, 0) / half;
  const recentHalfAvg =
    orderedAsc.slice(-half).reduce((a, b) => a + b.accuracyPct, 0) / half;
  const progressionDeltaPct = Math.round(recentHalfAvg - firstHalfAvg);

  return {
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
=======
export interface DrillListQuery {
  category?: string;
  difficulty?: number;
  targetAudience?: string;
  isKidsAdapted?: boolean;
  maxDurationSec?: number;
  sensor?: string;
  status?: DrillLifecycleStatus;
  search?: string;
}

export interface SessionListQuery {
  from?: string;
  to?: string;
  drillId?: string;
  status?: string;
  userId?: number;
  anonymize?: boolean;
  limit?: number;
>>>>>>> 03e98db8d84f475b5e841e8cac192153a6d66d0c
}

export const api = {
  // Autenticação e Ciclo de Sessão (RF01, RF23)
  login: async (credentials: LoginDto): Promise<AuthResponse> => {
    const res = await request<AuthResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });
    await storage.setToken(res.token);
    return res;
  },

  register: async (payload: RegisterDto): Promise<AuthResponse> => {
    const res = await request<AuthResponse>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    await storage.setToken(res.token);
    return res;
  },

  resetPassword: async (payload: ResetPasswordDto): Promise<{ message: string }> => {
    return request<{ message: string }>('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  logout: async (): Promise<void> => {
    try {
      const token = await storage.getToken();
      if (token) {
        await request<{ message: string }>('/auth/logout', { method: 'POST' });
      }
    } catch {
      // Limpeza local garantida mesmo offline
    } finally {
      await storage.setToken(null);
    }
  },

  getMe: async (): Promise<UserWithProfile> => {
    return request<UserWithProfile>('/auth/me');
  },

  deleteMyAccount: async (): Promise<{ message: string }> => {
    const res = await request<{ message: string }>('/auth/me', {
      method: 'DELETE',
    });
    await storage.setToken(null);
    return res;
  },

  updateProfile: async (data: UpdateProfileDto): Promise<UserWithProfile> => {
    return request<UserWithProfile>('/auth/profile', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  // Gestão Administrativa / CRUD de Usuários (RF01, RF17)
  listUsers: async (
    role?: string,
    query?: string,
    anonymize?: boolean
  ): Promise<UserWithProfile[]> => {
    const params = new URLSearchParams();
    if (role) params.append('role', role);
    if (query) params.append('q', query);
    if (anonymize) params.append('anonymize', 'true');
    const queryString = params.toString() ? `?${params.toString()}` : '';
    return request<UserWithProfile[]>(`/users${queryString}`);
  },

  createUserByAdmin: async (payload: AdminCreateUserDto): Promise<UserWithProfile> => {
    return request<UserWithProfile>('/users', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  updateUser: async (id: number, data: UpdateUserDto): Promise<{ message: string }> => {
    return request<{ message: string }>(`/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  deleteUser: async (id: number): Promise<{ message: string }> => {
    return request<{ message: string }>(`/users/${id}`, {
      method: 'DELETE',
    });
  },

<<<<<<< HEAD
  // Catálogo, Criação, Versionamento e Publicação de Treinos (RF03, RF04, RF14, RF15, RF16, RF18, RF20, RF21)
  listDrills: async (): Promise<{ drills: DrillDefinition[]; source: 'API' | 'CACHE_OFFLINE' }> => {
    try {
      const remoteDrills = await request<DrillDefinition[]>('/drills');
      if (Array.isArray(remoteDrills) && remoteDrills.length > 0) {
        storage.setJson(DRILLS_CACHE_KEY, remoteDrills);
        return { drills: remoteDrills, source: 'API' };
      }
    } catch {
      // Fallback silencioso para cache local / DEFAULT_DRILLS (RF21)
    }

    const cached = storage.getJson<DrillDefinition[]>(DRILLS_CACHE_KEY, DEFAULT_DRILLS);
    return { drills: cached, source: 'CACHE_OFFLINE' };
  },

  saveDrill: async (
    drill: Partial<DrillDefinition> & {
      bumpType?: 'PATCH' | 'MINOR' | 'MAJOR';
      changelogNote?: string;
    }
  ): Promise<{ drill: DrillDefinition; syncedWithApi: boolean }> => {
    try {
      const saved = await request<DrillDefinition>('/drills', {
        method: 'POST',
        body: JSON.stringify(drill),
      });
      const currentCache = storage.getJson<DrillDefinition[]>(DRILLS_CACHE_KEY, DEFAULT_DRILLS);
      const updatedCache = [
        saved,
        ...currentCache.filter((d) => d.id !== saved.id),
      ];
      storage.setJson(DRILLS_CACHE_KEY, updatedCache);
      return { drill: saved, syncedWithApi: true };
    } catch {
      // Salva localmente no cache offline (RF21)
      const currentCache = storage.getJson<DrillDefinition[]>(DRILLS_CACHE_KEY, DEFAULT_DRILLS);
      const id = drill.id || `drill-local-${Date.now().toString(36)}`;
      const existing = currentCache.find((d) => d.id === id);
      const nextVersion =
        existing && drill.bumpType
          ? bumpDrillVersion(existing.version, drill.bumpType)
          : drill.version || existing?.version || '1.0.0';

      const localSaved: DrillDefinition = {
        id,
        title: drill.title || 'Novo Treino Personalizado',
        description: drill.description || 'Treino criado no Editor da Arena.',
        category: drill.category || DEFAULT_DRILLS[0].category,
        difficulty: drill.difficulty || DEFAULT_DRILLS[0].difficulty,
        recommendedAgeMin: drill.recommendedAgeMin,
        recommendedAgeMax: drill.recommendedAgeMax,
        isKidsAdapted: Boolean(drill.isKidsAdapted),
        version: nextVersion,
        authorName: drill.authorName || 'Treinador Arena',
        status: drill.status || 'DRAFT',
        publishedAt:
          drill.status === 'PUBLISHED' ? new Date().toISOString() : existing?.publishedAt,
        updatedAt: new Date().toISOString(),
        steps: drill.steps || DEFAULT_DRILLS[0].steps,
        preparation: drill.preparation,
        marketplace: drill.marketplace,
        changelog: [
          {
            version: nextVersion,
            date: new Date().toISOString().split('T')[0],
            author: drill.authorName || 'Treinador Arena',
            notes: drill.changelogNote || 'Salvo em cache local (Modo Offline RF21)',
          },
          ...(existing?.changelog || []),
        ],
      };

      const updatedCache = [
        localSaved,
        ...currentCache.filter((d) => d.id !== localSaved.id),
      ];
      storage.setJson(DRILLS_CACHE_KEY, updatedCache);
      return { drill: localSaved, syncedWithApi: false };
    }
=======
  // Treinos, Versionamento, Simulação e Marketplace (RF03, RF14, RF15, RF16, RF18, RF20)
  listDrills: async (filters?: DrillListQuery): Promise<DrillDefinition[]> => {
    const params = new URLSearchParams();
    if (filters?.category) params.append('category', filters.category);
    if (filters?.difficulty !== undefined) params.append('difficulty', String(filters.difficulty));
    if (filters?.targetAudience) params.append('targetAudience', filters.targetAudience);
    if (filters?.isKidsAdapted !== undefined) {
      params.append('isKidsAdapted', String(filters.isKidsAdapted));
    }
    if (filters?.maxDurationSec) params.append('maxDurationSec', String(filters.maxDurationSec));
    if (filters?.sensor) params.append('sensor', filters.sensor);
    if (filters?.status) params.append('status', filters.status);
    if (filters?.search) params.append('search', filters.search);
    const qs = params.toString() ? `?${params.toString()}` : '';
    return request<DrillDefinition[]>(`/drills${qs}`);
  },

  getDrillById: async (id: string): Promise<DrillDefinition> => {
    return request<DrillDefinition>(`/drills/${encodeURIComponent(id)}`);
  },

  getDrillVersions: async (id: string): Promise<DrillVersionRecord[]> => {
    return request<DrillVersionRecord[]>(`/drills/${encodeURIComponent(id)}/versions`);
  },

  validateDrill: async (payload: Partial<CreateOrUpdateDrillDto>): Promise<DrillValidationResult> => {
    return request<DrillValidationResult>('/drills/validate', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  createDrill: async (payload: CreateOrUpdateDrillDto): Promise<DrillDefinition> => {
    return request<DrillDefinition>('/drills', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  updateDrill: async (id: string, payload: CreateOrUpdateDrillDto): Promise<DrillDefinition> => {
    return request<DrillDefinition>(`/drills/${encodeURIComponent(id)}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
>>>>>>> 03e98db8d84f475b5e841e8cac192153a6d66d0c
  },

  updateDrillStatus: async (
    id: string,
<<<<<<< HEAD
    status: DrillStatus,
    versionBump?: 'PATCH' | 'MINOR' | 'MAJOR',
    notes?: string
  ): Promise<{ drill: DrillDefinition; syncedWithApi: boolean }> => {
    try {
      const updated = await request<DrillDefinition>(`/drills/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status, versionBump, notes }),
      });
      const currentCache = storage.getJson<DrillDefinition[]>(DRILLS_CACHE_KEY, DEFAULT_DRILLS);
      storage.setJson(
        DRILLS_CACHE_KEY,
        currentCache.map((d) => (d.id === id ? updated : d))
      );
      return { drill: updated, syncedWithApi: true };
    } catch {
      const currentCache = storage.getJson<DrillDefinition[]>(DRILLS_CACHE_KEY, DEFAULT_DRILLS);
      const target = currentCache.find((d) => d.id === id) || DEFAULT_DRILLS[0];
      const nextVer = versionBump
        ? bumpDrillVersion(target.version, versionBump)
        : target.version;
      const updatedLocal: DrillDefinition = {
        ...target,
        status,
        version: nextVer,
        publishedAt: status === 'PUBLISHED' ? new Date().toISOString() : target.publishedAt,
        changelog: [
          {
            version: nextVer,
            date: new Date().toISOString().split('T')[0],
            author: target.authorName,
            notes: notes || `Status alterado para ${status}`,
          },
          ...(target.changelog || []),
        ],
      };
      storage.setJson(
        DRILLS_CACHE_KEY,
        currentCache.map((d) => (d.id === id ? updatedLocal : d))
      );
      return { drill: updatedLocal, syncedWithApi: false };
    }
  },

  // Envio de Resultados e Operação Offline com Reenvio Idempotente (RF19, RF21)
  getOfflinePendingSessions: (): Array<CreateSessionDto & { athleteName?: string }> => {
    return storage.getJson<Array<CreateSessionDto & { athleteName?: string }>>(
      OFFLINE_SESSIONS_KEY,
      []
    );
  },

  submitSession: async (
    payload: CreateSessionDto & { athleteName?: string }
  ): Promise<{ record: TrainingSessionRecord; syncState: 'SYNCED' | 'OFFLINE_QUEUED' }> => {
    try {
      const saved = await request<TrainingSessionRecord>('/sessions', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      const history = storage.getJson<TrainingSessionRecord[]>(
        SESSIONS_HISTORY_CACHE_KEY,
        FALLBACK_SEED_SESSIONS
      );
      storage.setJson(SESSIONS_HISTORY_CACHE_KEY, [
        saved,
        ...history.filter((h) => h.sessionUuid !== saved.sessionUuid),
      ]);

      // Tenta descarregar eventuais sessões pendentes na fila offline
      api.flushOfflineSessions().catch(() => {});

      return { record: saved, syncState: 'SYNCED' };
    } catch {
      // Armazena na fila persistente offline para envio posterior quando a conexão voltar (RF21)
      const queue = api.getOfflinePendingSessions();
      if (!queue.some((q) => q.sessionUuid === payload.sessionUuid)) {
        storage.setJson(OFFLINE_SESSIONS_KEY, [...queue, payload]);
      }

      const localRecord: TrainingSessionRecord = {
        ...payload,
        id: Date.now(),
        athleteName: payload.isKidsMode
          ? `${(payload.athleteName || 'Praticante').split(' ')[0]} (Perfil Kids Protegido LGPD)`
          : payload.athleteName || 'Praticante Convidado',
        syncedFromOffline: true,
        createdAt: new Date().toISOString(),
      };

      const history = storage.getJson<TrainingSessionRecord[]>(
        SESSIONS_HISTORY_CACHE_KEY,
        FALLBACK_SEED_SESSIONS
      );
      storage.setJson(SESSIONS_HISTORY_CACHE_KEY, [
        localRecord,
        ...history.filter((h) => h.sessionUuid !== localRecord.sessionUuid),
      ]);

      return { record: localRecord, syncState: 'OFFLINE_QUEUED' };
    }
  },

  flushOfflineSessions: async (): Promise<{ flushedCount: number; remainingCount: number }> => {
    const queue = api.getOfflinePendingSessions();
    if (queue.length === 0) {
      return { flushedCount: 0, remainingCount: 0 };
    }

    const remaining: Array<CreateSessionDto & { athleteName?: string }> = [];
    let flushedCount = 0;

    for (const item of queue) {
      try {
        await request<TrainingSessionRecord>('/sessions', {
          method: 'POST',
          body: JSON.stringify({ ...item, syncedFromOffline: true }),
        });
        flushedCount += 1;
      } catch {
        remaining.push(item);
      }
    }

    storage.setJson(OFFLINE_SESSIONS_KEY, remaining);
    return { flushedCount, remainingCount: remaining.length };
  },

  // Histórico e Indicadores (RF13)
  listSessions: async (filters?: {
    drillId?: string;
    periodDays?: number;
  }): Promise<{
    sessions: TrainingSessionRecord[];
    stats: SessionStatsSummary;
    source: 'API' | 'CACHE_OFFLINE';
  }> => {
    const params = new URLSearchParams();
    if (filters?.drillId && filters.drillId !== 'ALL') {
      params.append('drillId', filters.drillId);
    }
    if (filters?.periodDays && filters.periodDays > 0) {
      params.append('periodDays', String(filters.periodDays));
    }
    const qs = params.toString() ? `?${params.toString()}` : '';

    try {
      const [remoteSessions, remoteStats] = await Promise.all([
        request<TrainingSessionRecord[]>(`/sessions${qs}`),
        request<SessionStatsSummary>(`/sessions/stats${qs}`),
      ]);
      if (!qs) {
        storage.setJson(SESSIONS_HISTORY_CACHE_KEY, remoteSessions);
      }
      return { sessions: remoteSessions, stats: remoteStats, source: 'API' };
    } catch {
      let cached = storage.getJson<TrainingSessionRecord[]>(
        SESSIONS_HISTORY_CACHE_KEY,
        FALLBACK_SEED_SESSIONS
      );
      if (filters?.drillId && filters.drillId !== 'ALL') {
        cached = cached.filter((s) => s.drillId === filters.drillId);
      }
      if (filters?.periodDays && filters.periodDays > 0) {
        const cutoff = Date.now() - filters.periodDays * 86400000;
        cached = cached.filter((s) => new Date(s.completedAt).getTime() >= cutoff);
      }
      return {
        sessions: cached,
        stats: computeStatsFromList(cached),
        source: 'CACHE_OFFLINE',
      };
    }
  },

  // Auditoria e Logs (RF22, RF23)
=======
    status: DrillLifecycleStatus,
    changelog?: string
  ): Promise<{ drill: DrillDefinition; motherPlatformReceiptId: string | null }> => {
    return request(`/drills/${encodeURIComponent(id)}/status`, {
      method: 'POST',
      body: JSON.stringify({ status, changelog }),
    });
  },

  // Sessões, Telemetria LGPD, Sincronização Idempotente e Analytics (RF12, RF13, RF19, RF21)
  submitSession: async (payload: CreateSessionDto): Promise<SessionSubmissionResponse> => {
    return request<SessionSubmissionResponse>(
      '/sessions',
      {
        method: 'POST',
        body: JSON.stringify(payload),
      },
      payload.correlationId
    );
  },

  listSessions: async (query?: SessionListQuery): Promise<SessionRecord[]> => {
    const params = new URLSearchParams();
    if (query?.from) params.append('from', query.from);
    if (query?.to) params.append('to', query.to);
    if (query?.drillId) params.append('drillId', query.drillId);
    if (query?.status) params.append('status', query.status);
    if (query?.userId !== undefined) params.append('userId', String(query.userId));
    if (query?.anonymize) params.append('anonymize', 'true');
    if (query?.limit) params.append('limit', String(query.limit));
    const qs = params.toString() ? `?${params.toString()}` : '';
    return request<SessionRecord[]>(`/sessions${qs}`);
  },

  getSessionAnalytics: async (query?: {
    from?: string;
    to?: string;
    drillId?: string;
    userId?: number;
  }): Promise<SessionAnalyticsSummary> => {
    const params = new URLSearchParams();
    if (query?.from) params.append('from', query.from);
    if (query?.to) params.append('to', query.to);
    if (query?.drillId) params.append('drillId', query.drillId);
    if (query?.userId !== undefined) params.append('userId', String(query.userId));
    const qs = params.toString() ? `?${params.toString()}` : '';
    return request<SessionAnalyticsSummary>(`/sessions/analytics${qs}`);
  },

  getSessionById: async (id: number): Promise<SessionRecord> => {
    return request<SessionRecord>(`/sessions/${id}`);
  },

  // Incidentes de Segurança e Parada de Emergência !EMG (RF22, RF23)
  reportSafetyIncident: async (payload: ReportSafetyIncidentDto): Promise<SafetyIncidentRecord> => {
    return request<SafetyIncidentRecord>(
      '/incidents',
      {
        method: 'POST',
        body: JSON.stringify(payload),
      },
      payload.correlationId || undefined
    );
  },

  listSafetyIncidents: async (unresolvedOnly?: boolean): Promise<SafetyIncidentRecord[]> => {
    const qs = unresolvedOnly ? '?unresolved=true' : '';
    return request<SafetyIncidentRecord[]>(`/incidents${qs}`);
  },

  resolveSafetyIncident: async (id: number): Promise<SafetyIncidentRecord> => {
    return request<SafetyIncidentRecord>(`/incidents/${id}/resolve`, {
      method: 'PATCH',
    });
  },

  // Dispositivos IoT, Categorias e Parâmetros Gerais (RF05, RF17)
  listDevices: async (): Promise<IoTDeviceRecord[]> => {
    return request<IoTDeviceRecord[]>('/devices');
  },

  pairDevice: async (
    payload: PairIoTDeviceDto
  ): Promise<{ authorized: boolean; device: IoTDeviceRecord }> => {
    return request('/devices/pair', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  registerDevice: async (payload: {
    deviceCode: string;
    name: string;
    hardwareModel: string;
    firmwareVersion?: string;
    transportType?: string;
    pairingToken?: string;
  }): Promise<{ device: IoTDeviceRecord; pairingTokenOnce: string }> => {
    return request('/devices', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  updateDevice: async (
    id: number,
    payload: Partial<{
      name: string;
      status: string;
      piezoThresholds: number[];
      active: boolean;
      firmwareVersion: string;
    }>
  ): Promise<IoTDeviceRecord> => {
    return request<IoTDeviceRecord>(`/devices/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  },

  listCategories: async (): Promise<CategoryRecord[]> => {
    return request<CategoryRecord[]>('/categories');
  },

  createCategory: async (payload: Partial<CategoryRecord>): Promise<CategoryRecord> => {
    return request<CategoryRecord>('/categories', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  updateCategory: async (id: number, payload: Partial<CategoryRecord>): Promise<CategoryRecord> => {
    return request<CategoryRecord>(`/categories/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  },

  listSystemSettings: async (): Promise<SystemSettingRecord[]> => {
    return request<SystemSettingRecord[]>('/settings');
  },

  updateSystemSetting: async (key: string, value: string): Promise<SystemSettingRecord> => {
    return request<SystemSettingRecord>(`/settings/${encodeURIComponent(key)}`, {
      method: 'PUT',
      body: JSON.stringify({ value }),
    });
  },

  // Auditoria, Evidências da Plataforma Mãe e Health Check (RF18, RF19, RF23)
>>>>>>> 03e98db8d84f475b5e841e8cac192153a6d66d0c
  getAuditLogs: async (limit: number = 30): Promise<AuditLog[]> => {
    return request<AuditLog[]>(`/audit-logs?limit=${limit}`);
  },

<<<<<<< HEAD
  logCriticalEvent: async (
    action: string,
    details: string,
    userName?: string
  ): Promise<void> => {
    try {
      await request('/audit-logs/event', {
        method: 'POST',
        body: JSON.stringify({ action, details, userName }),
      });
    } catch {
      // Silencioso caso offline
    }
  },

  // Health check
=======
  getMotherPlatformSyncLogs: async (limit: number = 30): Promise<any[]> => {
    return request<any[]>(`/mother-platform/sync-logs?limit=${limit}`);
  },

>>>>>>> 03e98db8d84f475b5e841e8cac192153a6d66d0c
  checkHealth: async (): Promise<{ status: string; database: { status: string } }> => {
    return request<{ status: string; database: { status: string } }>('/health');
  },
};
