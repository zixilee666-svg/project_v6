import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User } from '@/types';

interface AuthState {
  token: string | null;
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  setToken: (token: string | null) => void;
  setUser: (user: User | null) => void;
  logout: () => void;
  updateUser: (partial: Partial<User>) => void;
  setLoading: (loading: boolean) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      isAuthenticated: false,
      isLoading: true,

      setToken: (token) =>
        set((state) => ({
          token,
          isAuthenticated: !!token,
        })),

      setUser: (user) =>
        set((state) => ({
          user,
          isAuthenticated: !!user,
        })),

      logout: () =>
        set({
          token: null,
          user: null,
          isAuthenticated: false,
          isLoading: false,
        }),

      updateUser: (partial) =>
        set((state) => ({
          user: state.user ? { ...state.user, ...partial } : null,
        })),

      setLoading: (loading) =>
        set({ isLoading: loading }),
    }),
    {
      name: 'joan_auth_token',
      partialize: (state) => ({ token: state.token }),
    }
  )
);

// Separate persist for user data
export const useUserStore = create<{ user: User | null; setUser: (user: User | null) => void }>()(
  persist(
    (set) => ({
      user: null,
      setUser: (user) => set({ user }),
    }),
    {
      name: 'joan_academic_user',
      partialize: (state) => ({ user: state.user }),
    }
  )
);
