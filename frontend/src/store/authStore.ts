import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export interface User {
  id:          string;
  name:        string;
  phone:       string;
  role:        'WORKER' | 'ADMIN' | 'INSURER';
  hasProfile:  boolean;
  upiId?:      string; 
}

export interface AuthState {
  accessToken:  string | null;
  refreshToken: string | null;
  user:         User | null;
  isLoggedIn:   boolean;

  setTokens:    (access: string, refresh: string) => void;
  setUser:      (user: User) => void;
  logout:       () => void;
  clearSession: () => void; 
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

      logout: () => {
        // Clear storage manually for safety
        sessionStorage.removeItem('gigshield-auth');
        set({ accessToken: null, refreshToken: null, user: null, isLoggedIn: false });
      },

      clearSession: () => {
        set({ accessToken: null, refreshToken: null, user: null, isLoggedIn: false });
      }
    }),
    {
      name: 'gigshield-auth',
      // CRITICAL: Switched to sessionStorage for automatic tab isolation
      storage: createJSONStorage(() => sessionStorage),
      
      // We removed the window.addEventListener('storage') because 
      // sessionStorage does not trigger storage events between tabs.
      // This is the cleanest way to prevent "Cross-Tab Suicide."
      
      partialize: (state) => ({
        accessToken:  state.accessToken,
        refreshToken: state.refreshToken,
        user:         state.user,
        isLoggedIn:   state.isLoggedIn,
      }),
    },
  ),
);