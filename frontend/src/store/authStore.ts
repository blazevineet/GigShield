import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

// ADDED 'export' HERE
export interface User {
  id:         string;
  name:       string;
  phone:      string;
  role:       'WORKER' | 'ADMIN' | 'INSURER';
  hasProfile: boolean;
}

export interface AuthState {
  accessToken:  string | null;
  refreshToken: string | null;
  user:         User | null;
  isLoggedIn:   boolean;

  setTokens:  (access: string, refresh: string) => void;
  setUser:    (user: User) => void;
  logout:     () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      accessToken:  null,
      refreshToken: null,
      user:         null,
      isLoggedIn:   false,

      setTokens: (accessToken, refreshToken) =>
        set({ accessToken, refreshToken, isLoggedIn: true }),

      setUser: (user) =>
        set({ user }),

      logout: () =>
        set({ accessToken: null, refreshToken: null, user: null, isLoggedIn: false }),
    }),
    {
      name:    'gigshield-auth',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        refreshToken: state.refreshToken,
        user:          state.user,
        isLoggedIn:    state.isLoggedIn,
      }),
    },
  ),
);