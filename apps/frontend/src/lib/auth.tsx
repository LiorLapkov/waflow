'use client';

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { AuthResultDto, LoginDto, UserDto } from '@waflow/shared';
import { api, ApiError } from './api';
import { disconnectSocket } from './socket';

interface AuthState {
  user: UserDto | null;
  loading: boolean;
  login: (dto: LoginDto) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserDto | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get<UserDto>('/auth/me')
      .then(setUser)
      .catch((err) => {
        if (!(err instanceof ApiError && err.status === 401)) {
          console.error(err);
        }
        setUser(null);
      })
      .finally(() => setLoading(false));
  }, []);

  const login = async (dto: LoginDto): Promise<void> => {
    const res = await api.post<AuthResultDto>('/auth/login', dto);
    setUser(res.user);
  };

  const logout = async (): Promise<void> => {
    await api.post('/auth/logout').catch(() => undefined);
    disconnectSocket();
    setUser(null);
  };

  return <AuthContext.Provider value={{ user, loading, login, logout }}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used inside AuthProvider');
  }
  return ctx;
}
