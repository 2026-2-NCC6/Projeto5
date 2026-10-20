import {
  AuthResponse,
  LoginDto,
  RegisterDto,
  UpdateProfileDto,
  UpdateUserDto,
  UserWithProfile,
  AuditLog,
} from '../../../packages/shared/src/contracts/user';

// URL base da API REST
// Em ambiente Web é localhost:3001. Para testes com celular físico, pode ser configurado o IP da rede local.
export const API_BASE_URL = 'http://localhost:3001/api';

class StorageHelper {
  private inMemoryToken: string | null = null;

  async getToken(): Promise<string | null> {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        return window.localStorage.getItem('@smart_tennis_token');
      }
    } catch {}
    return this.inMemoryToken;
  }

  async setToken(token: string | null): Promise<void> {
    this.inMemoryToken = token;
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        if (token) {
          window.localStorage.setItem('@smart_tennis_token', token);
        } else {
          window.localStorage.removeItem('@smart_tennis_token');
        }
      }
    } catch {}
  }
}

export const storage = new StorageHelper();

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = await storage.getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
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

export const api = {
  // Autenticação (RF01)
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
    await storage.setToken(null);
  },

  getMe: async (): Promise<UserWithProfile> => {
    return request<UserWithProfile>('/auth/me');
  },

  // Perfil do praticante (RF02)
  updateProfile: async (data: UpdateProfileDto): Promise<UserWithProfile> => {
    return request<UserWithProfile>('/auth/profile', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  // Gestão Administrativa / CRUD de Usuários (RF17)
  listUsers: async (role?: string, query?: string): Promise<UserWithProfile[]> => {
    const params = new URLSearchParams();
    if (role) params.append('role', role);
    if (query) params.append('q', query);
    const queryString = params.toString() ? `?${params.toString()}` : '';
    return request<UserWithProfile[]>(`/users${queryString}`);
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

  // Auditoria e Logs (RF23)
  getAuditLogs: async (limit: number = 30): Promise<AuditLog[]> => {
    return request<AuditLog[]>(`/audit-logs?limit=${limit}`);
  },

  // Health check
  checkHealth: async (): Promise<{ status: string; database: { status: string } }> => {
    return request<{ status: string; database: { status: string } }>('/health');
  },
};
