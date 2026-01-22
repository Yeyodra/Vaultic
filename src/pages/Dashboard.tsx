import { useAuthStore } from '@/stores/authStore'
import { useProviderStore } from '@/stores/providerStore'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Cloud, FolderOpen, Plus, Settings, LogOut } from 'lucide-react'
import { Link } from 'react-router-dom'

export function Dashboard() {
  const { user, logout } = useAuthStore()
  const { providers } = useProviderStore()

  const activeProviders = providers.filter((p) => p.isActive)

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <Cloud className="h-6 w-6 text-primary" />
            <span className="text-xl font-bold">Vaultic</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">
              {user?.email}
            </span>
            {user?.picture && (
              <img
                src={user.picture}
                alt={user.name}
                className="h-8 w-8 rounded-full"
              />
            )}
            <Button variant="ghost" size="icon" onClick={logout}>
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto p-4 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <div className="flex gap-2">
            <Button asChild variant="outline">
              <Link to="/settings">
                <Settings className="h-4 w-4 mr-2" />
                Settings
              </Link>
            </Button>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FolderOpen className="h-5 w-5" />
                File Browser
              </CardTitle>
              <CardDescription>
                Akses dan kelola file di semua storage provider
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild className="w-full">
                <Link to="/files">Buka File Browser</Link>
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Cloud className="h-5 w-5" />
                Storage Providers
              </CardTitle>
              <CardDescription>
                {activeProviders.length} provider aktif
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild variant="outline" className="w-full">
                <Link to="/settings">
                  <Plus className="h-4 w-4 mr-2" />
                  Kelola Provider
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>

        {activeProviders.length === 0 && (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-10">
              <Cloud className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">
                Belum ada storage provider
              </h3>
              <p className="text-sm text-muted-foreground mb-4 text-center">
                Tambahkan storage provider untuk mulai mengelola file
              </p>
              <Button asChild>
                <Link to="/settings">
                  <Plus className="h-4 w-4 mr-2" />
                  Tambah Provider
                </Link>
              </Button>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  )
}
