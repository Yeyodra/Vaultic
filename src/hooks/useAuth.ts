import { useAuthStore } from '@/stores/authStore'
import { logout as apiLogout } from '@/api/auth'

export function useAuth() {
  const { user, isAuthenticated, isLoading, logout: clearAuth } = useAuthStore()

  const logout = async () => {
    await apiLogout()
    clearAuth()
  }

  return {
    user,
    isAuthenticated,
    isLoading,
    logout,
  }
}
