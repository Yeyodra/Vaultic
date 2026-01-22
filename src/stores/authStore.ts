import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { UserConfig } from '@/api/types'

interface AuthState {
  token: string | null
  refreshToken: string | null
  user: Pick<UserConfig, 'userId' | 'email' | 'name' | 'picture'> | null
  isAuthenticated: boolean
  isLoading: boolean

  setAuth: (token: string, refreshToken: string, user: AuthState['user']) => void
  setLoading: (loading: boolean) => void
  logout: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      refreshToken: null,
      user: null,
      isAuthenticated: false,
      isLoading: true,

      setAuth: (token, refreshToken, user) =>
        set({
          token,
          refreshToken,
          user,
          isAuthenticated: true,
          isLoading: false,
        }),

      setLoading: (isLoading) => set({ isLoading }),

      logout: () =>
        set({
          token: null,
          refreshToken: null,
          user: null,
          isAuthenticated: false,
          isLoading: false,
        }),
    }),
    {
      name: 'vaultic-auth',
      partialize: (state) => ({
        token: state.token,
        refreshToken: state.refreshToken,
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
)
