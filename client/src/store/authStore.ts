import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface User {
  _id: string;
  employeeId: string;
  firstName: string;
  lastName: string;
  email: string;
  role: 'super_admin' | 'branch_admin' | 'store_manager' | 'security_guard' | 'staff';
  branchId?: {
    _id: string;
    name: string;
    code: string;
  };
  qrCode?: string;
  dutyStatus?: string;
  status: string;
}

interface AuthState {
  user: User | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  setAuth: (user: User, token: string) => void;
  logout: () => void;
  updateUser: (partialUser: Partial<User>) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      isAuthenticated: false,
      setAuth: (user, token) => set({ user, accessToken: token, isAuthenticated: true }),
      logout: () => set({ user: null, accessToken: null, isAuthenticated: false }),
      updateUser: (partialUser) =>
        set((state) => ({
          user: state.user ? { ...state.user, ...partialUser } : null
        }))
    }),
    {
      name: 'arshi-auth-storage',
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        isAuthenticated: state.isAuthenticated
      })
    }
  )
);
