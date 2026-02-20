import { create } from 'zustand'
import type { User, Tenant } from '@/types/auth'

interface AuthStore {
  user: User | null
  tenant: Tenant | null
  isAuthenticated: boolean
  login: (user: User, tenant: Tenant) => void
  logout: () => void
  setUser: (user: User) => void
}

export const useAuthStore = create<AuthStore>((set) => ({
  user: null,
  tenant: null,
  isAuthenticated: false,

  login: (user, tenant) =>
    set({
      user,
      tenant,
      isAuthenticated: true,
    }),

  logout: () =>
    set({
      user: null,
      tenant: null,
      isAuthenticated: false,
    }),

  setUser: (user) =>
    set({
      user,
    }),
}))
