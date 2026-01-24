import { useAuthStore } from '@/stores/authStore'
import type { UserConfig, ProviderConfig } from './types'

const AUTH_WORKER_URL = import.meta.env.VITE_AUTH_WORKER_URL || ''

interface AuthResponse {
  success: boolean
  token: string
  refreshToken: string
  user: {
    userId: string
    email: string
    name: string
  }
}

// ========================================
// LOGIN & REGISTER
// ========================================

export async function login(email: string, password: string): Promise<void> {
  const response = await fetch(`${AUTH_WORKER_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })

  if (!response.ok) {
    const error = await response.json() as { error?: string }
    throw new Error(error.error || 'Login failed')
  }

  const data = await response.json() as AuthResponse
  const { setAuth } = useAuthStore.getState()
  
  setAuth(data.token, data.refreshToken, {
    userId: data.user.userId,
    email: data.user.email,
    name: data.user.name,
    picture: '',
  })
}

export async function register(email: string, password: string, name?: string): Promise<void> {
  const response = await fetch(`${AUTH_WORKER_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, name }),
  })

  if (!response.ok) {
    const error = await response.json() as { error?: string }
    throw new Error(error.error || 'Registration failed')
  }

  const data = await response.json() as AuthResponse
  const { setAuth } = useAuthStore.getState()
  
  setAuth(data.token, data.refreshToken, {
    userId: data.user.userId,
    email: data.user.email,
    name: data.user.name,
    picture: '',
  })
}

// ========================================
// AUTHENTICATED REQUESTS
// ========================================

async function fetchWithAuth(url: string, options: RequestInit = {}): Promise<Response> {
  const { token, refreshToken, setAuth, logout } = useAuthStore.getState()

  if (!token) {
    throw new Error('Not authenticated')
  }

  const headers = new Headers(options.headers)
  headers.set('Authorization', `Bearer ${token}`)

  let response = await fetch(url, { ...options, headers })

  if (response.status === 401 && refreshToken) {
    const refreshResponse = await fetch(`${AUTH_WORKER_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    })

    if (refreshResponse.ok) {
      const data = await refreshResponse.json() as { token: string; refreshToken: string }
      const { user } = useAuthStore.getState()
      setAuth(data.token, data.refreshToken, user)

      headers.set('Authorization', `Bearer ${data.token}`)
      response = await fetch(url, { ...options, headers })
    } else {
      logout()
      throw new Error('Session expired')
    }
  }

  return response
}

export async function handleAuthCallback(token: string, refreshToken: string): Promise<void> {
  const { setAuth } = useAuthStore.getState()

  const response = await fetch(`${AUTH_WORKER_URL}/config`, {
    headers: { Authorization: `Bearer ${token}` },
  })

  if (response.ok) {
    const config = await response.json() as Pick<UserConfig, 'providers' | 'settings'> & {
      userId?: string
      email?: string
      name?: string
      picture?: string
    }

    setAuth(token, refreshToken, {
      userId: config.userId || '',
      email: config.email || '',
      name: config.name || '',
      picture: config.picture || '',
    })
  }
}

export async function getConfig(): Promise<{ providers: ProviderConfig[]; settings: UserConfig['settings'] }> {
  const response = await fetchWithAuth(`${AUTH_WORKER_URL}/config`)

  if (!response.ok) {
    throw new Error('Failed to get config')
  }

  return response.json()
}

export async function updateConfig(
  updates: Partial<Pick<UserConfig, 'providers' | 'settings'>>
): Promise<void> {
  const response = await fetchWithAuth(`${AUTH_WORKER_URL}/config`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates),
  })

  if (!response.ok) {
    throw new Error('Failed to update config')
  }
}

export async function getProviders(): Promise<ProviderConfig[]> {
  const response = await fetchWithAuth(`${AUTH_WORKER_URL}/providers`)

  if (!response.ok) {
    throw new Error('Failed to get providers')
  }

  const data = await response.json() as { providers: ProviderConfig[] }
  return data.providers
}

export async function addProvider(
  provider: Pick<ProviderConfig, 'name' | 'workerUrl' | 'authToken'>
): Promise<ProviderConfig> {
  const response = await fetchWithAuth(`${AUTH_WORKER_URL}/providers`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(provider),
  })

  if (!response.ok) {
    throw new Error('Failed to add provider')
  }

  const data = await response.json() as { provider: ProviderConfig }
  return data.provider
}

export async function updateProvider(
  id: string,
  updates: Partial<ProviderConfig>
): Promise<ProviderConfig> {
  const response = await fetchWithAuth(`${AUTH_WORKER_URL}/providers/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates),
  })

  if (!response.ok) {
    throw new Error('Failed to update provider')
  }

  const data = await response.json() as { provider: ProviderConfig }
  return data.provider
}

export async function deleteProvider(id: string): Promise<void> {
  const response = await fetchWithAuth(`${AUTH_WORKER_URL}/providers/${id}`, {
    method: 'DELETE',
  })

  if (!response.ok) {
    throw new Error('Failed to delete provider')
  }
}

export async function testProviderConnection(id: string): Promise<boolean> {
  const response = await fetchWithAuth(`${AUTH_WORKER_URL}/providers/${id}/test`, {
    method: 'POST',
  })

  const data = await response.json() as { success: boolean }
  return data.success
}

export async function logout(): Promise<void> {
  const { token, logout: clearAuth } = useAuthStore.getState()

  if (token) {
    await fetch(`${AUTH_WORKER_URL}/auth/logout`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    }).catch(() => {})
  }

  clearAuth()
}
