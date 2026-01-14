import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { auth } from '@/lib/api';

export type UserRole = 'provider' | 'borrower';

interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  avatarUrl?: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isProvider: () => boolean;
  isBorrower: () => boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string, role?: UserRole) => Promise<void>;
  logout: () => void;
  fetchUser: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isLoading: false,

      isProvider: () => get().user?.role === 'provider',
      isBorrower: () => get().user?.role === 'borrower',

      login: async (email: string, password: string) => {
        set({ isLoading: true });
        try {
          const response = await auth.login({ email, password });
          const { user, accessToken } = response.data;
          localStorage.setItem('token', accessToken);
          set({ user, token: accessToken, isLoading: false });
        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },

      register: async (email: string, password: string, name: string, role?: UserRole) => {
        set({ isLoading: true });
        try {
          const response = await auth.register({ email, password, name, role });
          const { user, accessToken } = response.data;
          localStorage.setItem('token', accessToken);
          set({ user, token: accessToken, isLoading: false });
        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },

      logout: () => {
        localStorage.removeItem('token');
        set({ user: null, token: null });
      },

      fetchUser: async () => {
        const token = get().token || localStorage.getItem('token');
        if (!token) return;

        set({ isLoading: true });
        try {
          const response = await auth.me();
          set({ user: response.data, token, isLoading: false });
        } catch {
          set({ user: null, token: null, isLoading: false });
          localStorage.removeItem('token');
        }
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({ token: state.token }),
    }
  )
);
