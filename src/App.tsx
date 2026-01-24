import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'
import { useProviderStore } from '@/stores/providerStore'
import { Login } from '@/pages/Login'
import { AuthCallback } from '@/pages/AuthCallback'
import { Dashboard } from '@/pages/Dashboard'
import { Files } from '@/pages/Files'
import { Settings } from '@/pages/Settings'
import { Toaster } from '@/components/Toaster'
import { useEffect } from 'react'
import * as authApi from '@/api/auth'

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuthStore()

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  return <>{children}</>
}

function AppContent() {
  const { isAuthenticated } = useAuthStore()
  const { setProviders } = useProviderStore()

  // Fetch providers from cloud when authenticated
  useEffect(() => {
    if (isAuthenticated) {
      authApi.getConfig()
        .then((config) => {
          setProviders(config.providers || [])
        })
        .catch((error) => {
          console.error('Failed to fetch config:', error)
        })
    }
  }, [isAuthenticated, setProviders])

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/auth/callback" element={<AuthCallback />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/files"
        element={
          <ProtectedRoute>
            <Files />
          </ProtectedRoute>
        }
      />
      <Route
        path="/settings"
        element={
          <ProtectedRoute>
            <Settings />
          </ProtectedRoute>
        }
      />
    </Routes>
  )
}

function App() {
  const { setLoading, token } = useAuthStore()

  useEffect(() => {
    // Check if we have a stored token
    if (token) {
      setLoading(false)
    } else {
      setLoading(false)
    }
  }, [token, setLoading])

  return (
    <BrowserRouter>
      <AppContent />
      <Toaster />
    </BrowserRouter>
  )
}

export default App
