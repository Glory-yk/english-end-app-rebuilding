import { create } from 'zustand';

export interface AuthUser {
  id: string;
  email: string;
  name?: string;
  provider?: 'email' | 'google' | 'kakao' | 'apple';
  hasYouTubeAccess?: boolean;
}

interface AuthState {
  token: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  user: AuthUser | null;
  setTokens: (token: string, refreshToken: string) => void;
  setUser: (user: AuthUser) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  token: null,
  refreshToken: null,
  isAuthenticated: false,
  user: null,
  setTokens: (token, refreshToken) => set({ token, refreshToken, isAuthenticated: true }),
  setUser: (user) => set({ user }),
  logout: () => set({ token: null, refreshToken: null, isAuthenticated: false, user: null }),
}));
