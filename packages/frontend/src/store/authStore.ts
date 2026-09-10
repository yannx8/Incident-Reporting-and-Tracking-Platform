import { create } from 'zustand';
import { AuthUser } from '../types';
import { apiLogin, apiRegister, apiVerify, apiGetMe, bootstrap, setAccessToken } from '../api/client';

export interface AuthState {
  user: AuthUser | null;
  isLoading: boolean;
  isInitialized: boolean;
  error: string | null;
  pendingVerification: { code: string } | null;
  login: (email: string, password: string, rememberMe?: boolean) => Promise<void>;
  register: (name: string, email: string, password: string, orgSlug?: string) => Promise<void>;
  verify: (code: string) => Promise<void>;
  logout: () => Promise<void>;
  restoreSession: () => Promise<void>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isLoading: false,
  isInitialized: false,
  error: null,
  pendingVerification: null,

  login: async (email: string, password: string, rememberMe = false) => {
    set({ isLoading: true, error: null });
    try {
      const user = await apiLogin(email, password, rememberMe);
      set({ user, isLoading: false, error: null });
    } catch (err: any) {
      set({ error: err.message || 'Erreur de connexion', isLoading: false });
      throw err;
    }
  },

  register: async (name: string, email: string, password: string, orgSlug?: string) => {
    set({ isLoading: true, error: null });
    try {
      const res = await apiRegister(name, email, password, orgSlug);
      set({
        pendingVerification: { code: res.verificationCode || '' },
        isLoading: false,
        error: null
      });
    } catch (err: any) {
      set({ error: err.message || "Erreur lors de l'inscription", isLoading: false });
      throw err;
    }
  },

  verify: async (code: string) => {
    set({ isLoading: true, error: null });
    try {
      await apiVerify(code);
      const user = await apiGetMe();
      set({
        user,
        pendingVerification: null,
        isLoading: false,
        error: null
      });
    } catch (err: any) {
      set({ error: err.message || 'Code de vérification invalide', isLoading: false });
      throw err;
    }
  },

  logout: async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
    } catch {}
    setAccessToken(null);
    set({ user: null, pendingVerification: null, error: null });
  },

  restoreSession: async () => {
    try {
      const token = await bootstrap();
      if (token) {
        const user = await apiGetMe();
        set({ user, isInitialized: true });
        return;
      }
    } catch {}
    setAccessToken(null);
    set({ user: null, isInitialized: true });
  },

  clearError: () => set({ error: null })
}));

export const useAuth = useAuthStore;
