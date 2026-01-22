import { useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'

export function AuthCallback() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { setAuth } = useAuthStore()

  useEffect(() => {
    const token = searchParams.get('token')
    const refreshToken = searchParams.get('refreshToken')
    const error = searchParams.get('error')

    if (error) {
      navigate('/login?error=' + error)
      return
    }

    if (token && refreshToken) {
      // Decode JWT to get user info
      try {
        const payload = JSON.parse(atob(token.split('.')[1]))
        setAuth(token, refreshToken, {
          userId: payload.userId,
          email: payload.email,
          name: payload.email.split('@')[0],
          picture: '',
        })
        navigate('/')
      } catch {
        navigate('/login?error=invalid_token')
      }
    } else {
      navigate('/login?error=missing_token')
    }
  }, [searchParams, navigate, setAuth])

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
    </div>
  )
}
