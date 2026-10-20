import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import {
  AuthResponse,
  LoginDto,
  RegisterDto,
  UpdateProfileDto,
  UserWithProfile,
} from '../../../packages/shared/src/contracts/user';
import { api, storage } from '../services/api';

interface AuthContextType {
  user: UserWithProfile | null;
  token: string | null;
  isLoading: boolean;
  error: string | null;
  login: (credentials: LoginDto) => Promise<AuthResponse>;
  register: (payload: RegisterDto) => Promise<AuthResponse>;
  logout: () => Promise<void>;
  updateProfile: (data: UpdateProfileDto) => Promise<UserWithProfile>;
  refreshUser: () => Promise<void>;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserWithProfile | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadStoredAuth() {
      try {
        const storedToken = await storage.getToken();
        if (storedToken) {
          setToken(storedToken);
          const currentUser = await api.getMe();
          setUser(currentUser);
        }
      } catch (err) {
        console.warn('Sessão expirada ou indisponível:', err);
        await storage.setToken(null);
        setToken(null);
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    }

    loadStoredAuth();
  }, []);

  const login = async (credentials: LoginDto): Promise<AuthResponse> => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await api.login(credentials);
      setToken(res.token);
      setUser(res.user);
      return res;
    } catch (err: any) {
      setError(err.message || 'Falha ao realizar login');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (payload: RegisterDto): Promise<AuthResponse> => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await api.register(payload);
      setToken(res.token);
      setUser(res.user);
      return res;
    } catch (err: any) {
      setError(err.message || 'Falha ao cadastrar usuário');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async (): Promise<void> => {
    setIsLoading(true);
    try {
      await api.logout();
      setToken(null);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  const updateProfile = async (data: UpdateProfileDto): Promise<UserWithProfile> => {
    setIsLoading(true);
    setError(null);
    try {
      const updated = await api.updateProfile(data);
      setUser(updated);
      return updated;
    } catch (err: any) {
      setError(err.message || 'Falha ao atualizar perfil');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const refreshUser = async (): Promise<void> => {
    try {
      const updated = await api.getMe();
      setUser(updated);
    } catch (err) {
      console.warn('Erro ao atualizar dados do usuário:', err);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        error,
        login,
        register,
        logout,
        updateProfile,
        refreshUser,
        clearError: () => setError(null),
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth deve ser utilizado dentro de um AuthProvider');
  }
  return context;
}
