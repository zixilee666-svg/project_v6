import React, { createContext, useContext, useReducer, useCallback } from 'react';
import type { User } from '@/types';
import { api } from '@/lib/api';

interface AuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: User | null;
  token: string | null;
}

type AuthAction =
  | { type: 'LOGIN'; payload: { user: User; token: string } }
  | { type: 'LOGOUT' }
  | { type: 'SET_LOADING'; payload: boolean };

interface AuthContextType extends AuthState {
  login: (username: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | null>(null);

function authReducer(state: AuthState, action: AuthAction): AuthState {
  switch (action.type) {
    case 'LOGIN':
      localStorage.setItem('joan_auth_token', action.payload.token);
      localStorage.setItem('joan_academic_user', JSON.stringify(action.payload.user));
      return {
        isAuthenticated: true,
        isLoading: false,
        user: action.payload.user,
        token: action.payload.token,
      };
    case 'LOGOUT':
      localStorage.removeItem('joan_auth_token');
      localStorage.removeItem('joan_academic_user');
      return { isAuthenticated: false, isLoading: false, user: null, token: null };
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
    default:
      return state;
  }
}

// 初始化：从 localStorage 恢复会话，无 token 时直接显示登录页
function getInitialState(): AuthState {
  const token = localStorage.getItem('joan_auth_token');
  const storedUser = localStorage.getItem('joan_academic_user');
  if (token && storedUser) {
    try {
      return {
        isAuthenticated: true,
        isLoading: false,
        user: JSON.parse(storedUser) as User,
        token,
      };
    } catch {
      localStorage.removeItem('joan_auth_token');
      localStorage.removeItem('joan_academic_user');
    }
  }
  return { isAuthenticated: false, isLoading: false, user: null, token: null };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(authReducer, undefined, getInitialState);

  // 登录：返回结果，不抛异常，让 LoginPage 处理跳转
  const login = useCallback(async (username: string, password: string): Promise<{ success: boolean; error?: string }> => {
    dispatch({ type: 'SET_LOADING', payload: true });
    try {
      const res = await api.login(username, password);
      if (res.success && res.data) {
        dispatch({ type: 'LOGIN', payload: res.data });
        return { success: true };
      }
      return { success: false, error: '登录失败' };
    } catch (err: any) {
      return { success: false, error: err.message || '登录失败，请重试' };
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, []);

  const logout = useCallback(async () => {
    try { await api.logout(); } catch { /* ignore */ }
    dispatch({ type: 'LOGOUT' });
  }, []);

  return (
    <AuthContext.Provider value={{ ...state, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthContext');
  }
  return context;
}
