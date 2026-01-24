import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Cloud, Loader2, AlertCircle } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import * as authApi from '@/api/auth'

const AUTH_WORKER_URL = import.meta.env.VITE_AUTH_WORKER_URL || ''

type AuthMode = 'login' | 'register'

export function Login() {
  const navigate = useNavigate()
  const [mode, setMode] = useState<AuthMode>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isConfigured = AUTH_WORKER_URL && !AUTH_WORKER_URL.includes('username.workers.dev')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!isConfigured) {
      setError('Auth Worker belum dikonfigurasi. Update VITE_AUTH_WORKER_URL di file .env')
      return
    }

    if (!email || !password) {
      setError('Email dan password harus diisi')
      return
    }

    if (mode === 'register' && password.length < 6) {
      setError('Password minimal 6 karakter')
      return
    }

    setIsLoading(true)

    try {
      if (mode === 'login') {
        await authApi.login(email, password)
      } else {
        await authApi.register(email, password, name)
      }
      navigate('/')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Terjadi kesalahan')
    } finally {
      setIsLoading(false)
    }
  }

  const toggleMode = () => {
    setMode(mode === 'login' ? 'register' : 'login')
    setError(null)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-900 dark:to-slate-800 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            <Cloud className="h-8 w-8 text-primary" />
          </div>
          <CardTitle className="text-2xl font-bold">Vaultic</CardTitle>
          <CardDescription>
            {mode === 'login' ? 'Login ke akun Anda' : 'Buat akun baru'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {!isConfigured && (
              <div className="flex items-center gap-2 p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg text-amber-600 dark:text-amber-400">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                <p className="text-xs">
                  Auth Worker belum dikonfigurasi. Update <code className="bg-muted px-1 rounded">VITE_AUTH_WORKER_URL</code> di file .env
                </p>
              </div>
            )}

            {error && (
              <div className="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                <p className="text-sm">{error}</p>
              </div>
            )}

            {mode === 'register' && (
              <div className="space-y-2">
                <Label htmlFor="name">Nama</Label>
                <Input
                  id="name"
                  type="text"
                  placeholder="Nama Anda"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={isLoading}
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="email@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isLoading}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder={mode === 'register' ? 'Minimal 6 karakter' : 'Password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
                required
              />
            </div>

            <Button 
              type="submit" 
              className="w-full" 
              size="lg" 
              disabled={isLoading || !isConfigured}
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {mode === 'login' ? 'Logging in...' : 'Registering...'}
                </>
              ) : (
                mode === 'login' ? 'Login' : 'Register'
              )}
            </Button>

            <div className="text-center text-sm text-muted-foreground">
              {mode === 'login' ? (
                <>
                  Belum punya akun?{' '}
                  <button
                    type="button"
                    onClick={toggleMode}
                    className="text-primary hover:underline"
                  >
                    Daftar di sini
                  </button>
                </>
              ) : (
                <>
                  Sudah punya akun?{' '}
                  <button
                    type="button"
                    onClick={toggleMode}
                    className="text-primary hover:underline"
                  >
                    Login di sini
                  </button>
                </>
              )}
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
