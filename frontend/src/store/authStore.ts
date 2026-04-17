import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export interface User {
  id:          string;
  name:        string;
  phone:       string;
  role:        'WORKER' | 'ADMIN' | 'INSURER';
  hasProfile:  boolean;
  upiId?:      string;
  zone?:       string; // Added for zone-based logic support
}

export interface AuthState {
  accessToken:  string | null;
  refreshToken: string | null;
  user:         User | null;
  isLoggedIn:   boolean;

  setTokens:    (access: string, refresh: string) => void;
  setUser:      (user: User) => void;
  // NEW: Helper to update just the role/profile status without clearing tokens
  updateUser:   (data: Partial<User>) => void; 
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

      // This allows us to "Promote" a user to ADMIN in real-time
      updateUser: (data) =>
        set((state) => ({
          user: state.user ? { ...state.user, ...data } : null,
        })),

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
      // CRITICAL: Keeps Admin and Worker tabs completely separate
      storage: createJSONStorage(() => sessionStorage),
      
      partialize: (state) => ({
        accessToken:  state.accessToken,
        refreshToken: state.refreshToken,
        user:         state.user,
        isLoggedIn:   state.isLoggedIn,
      }),
    },
  ),
);