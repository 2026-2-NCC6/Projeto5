import { NativeModules, Platform } from 'react-native';
import {
  AdminCreateUserDto,
  AuthResponse,
  LoginDto,
  RegisterDto,
  UpdateProfileDto,
  UpdateUserDto,
  UserWithProfile,
  AuditLog,
} from '../../../packages/shared/src/contracts/user';
import {
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
function resolveApiBaseUrl(): string {
  const envUrl =
    typeof process !== 'undefined' && process.env?.EXPO_PUBLIC_API_URL
      ? process.env.EXPO_PUBLIC_API_URL.trim().replace(/\/+$/, '')
      : '';

  if (envUrl) {
    return envUrl;
  }

  if (Platform.OS === 'web' && typeof window !== 'undefined' && window.location?.hostname) {
    const host = window.location.hostname;
    return `http://${host}:3001/api/v1`;
  }

  try {
    const scriptURL: string | undefined = NativeModules?.SourceCode?.scriptURL;
    if (scriptURL) {
      const match = scriptURL.match(/^https?:\/\/([^/:]+)(:\d+)?/);
      if (match && match[1] && match[1] !== 'localhost' && match[1] !== '127.0.0.1') {
        return `http://${match[1]}:3001/api/v1`;
      }
    }
  } catch {
    // Ignora falha de introspecção de módulo nativo
  }

  if (Platform.OS === 'android') {
    return 'http://10.0.2.2:3001/api/v1';
  }

  return 'http://localhost:3001/api/v1';
}

export const API_BASE_URL = resolveApiBaseUrl();

const TOKEN_STORAGE_KEY = '@smart_tennis_token';

export function generateCorrelationId(prefix: string = 'mob'): string {
  const rand = Math.random().toString(36).slice(2, 10);
  return `${prefix}-${Date.now().toString(36)}-${rand}`;
}

class StorageHelper {
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

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.error || `Erro ${response.status}: Falha na requisição`);
  }

  return data as T;
}

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
  },

  updateDrillStatus: async (
    id: string,
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
  getAuditLogs: async (limit: number = 30): Promise<AuditLog[]> => {
    return request<AuditLog[]>(`/audit-logs?limit=${limit}`);
  },

  getMotherPlatformSyncLogs: async (limit: number = 30): Promise<any[]> => {
    return request<any[]>(`/mother-platform/sync-logs?limit=${limit}`);
  },

  checkHealth: async (): Promise<{ status: string; database: { status: string } }> => {
    return request<{ status: string; database: { status: string } }>('/health');
  },
};
