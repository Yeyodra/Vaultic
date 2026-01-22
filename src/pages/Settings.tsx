import { useState } from 'react'
import { useAuthStore } from '@/stores/authStore'
import { useProviderStore } from '@/stores/providerStore'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Cloud, Plus, Trash2, Edit, ArrowLeft, Check } from 'lucide-react'
import { Link } from 'react-router-dom'
import type { ProviderConfig } from '@/api/types'

export function Settings() {
  const { user } = useAuthStore()
  const { providers, addProvider, removeProvider, updateProvider } = useProviderStore()
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [editingProvider, setEditingProvider] = useState<ProviderConfig | null>(null)

  const [newProvider, setNewProvider] = useState({
    name: '',
    workerUrl: '',
    authToken: '',
  })

  const handleAddProvider = () => {
    const provider: ProviderConfig = {
      id: crypto.randomUUID(),
      name: newProvider.name,
      type: 'r2_worker',
      workerUrl: newProvider.workerUrl,
      authToken: newProvider.authToken,
      isActive: true,
      addedAt: Date.now(),
    }
    addProvider(provider)
    setNewProvider({ name: '', workerUrl: '', authToken: '' })
    setIsAddDialogOpen(false)
  }

  const handleUpdateProvider = () => {
    if (editingProvider) {
      updateProvider(editingProvider.id, editingProvider)
      setEditingProvider(null)
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container mx-auto flex h-16 items-center px-4 gap-4">
          <Button asChild variant="ghost" size="icon">
            <Link to="/">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <h1 className="text-xl font-bold">Settings</h1>
        </div>
      </header>

      <main className="container mx-auto p-4 max-w-4xl">
        <Tabs defaultValue="providers">
          <TabsList className="mb-4">
            <TabsTrigger value="providers">Storage Providers</TabsTrigger>
            <TabsTrigger value="account">Account</TabsTrigger>
            <TabsTrigger value="preferences">Preferences</TabsTrigger>
          </TabsList>

          <TabsContent value="providers">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Storage Providers</CardTitle>
                    <CardDescription>
                      Kelola akun penyimpanan cloud Anda
                    </CardDescription>
                  </div>
                  <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                    <DialogTrigger asChild>
                      <Button>
                        <Plus className="h-4 w-4 mr-2" />
                        Add Provider
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Add Storage Provider</DialogTitle>
                        <DialogDescription>
                          Tambahkan R2 Worker sebagai storage provider
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        <div className="space-y-2">
                          <Label htmlFor="name">Name</Label>
                          <Input
                            id="name"
                            placeholder="e.g. Akun R2 Utama"
                            value={newProvider.name}
                            onChange={(e) =>
                              setNewProvider({ ...newProvider, name: e.target.value })
                            }
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="workerUrl">Worker URL</Label>
                          <Input
                            id="workerUrl"
                            placeholder="https://storage.username.workers.dev"
                            value={newProvider.workerUrl}
                            onChange={(e) =>
                              setNewProvider({ ...newProvider, workerUrl: e.target.value })
                            }
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="authToken">Auth Token</Label>
                          <Input
                            id="authToken"
                            type="password"
                            placeholder="Bearer token for this worker"
                            value={newProvider.authToken}
                            onChange={(e) =>
                              setNewProvider({ ...newProvider, authToken: e.target.value })
                            }
                          />
                        </div>
                      </div>
                      <DialogFooter>
                        <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                          Cancel
                        </Button>
                        <Button onClick={handleAddProvider}>Add Provider</Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
              <Separator />
              <CardContent className="p-0">
                {providers.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
                    <Cloud className="h-12 w-12 mb-4" />
                    <p>Belum ada storage provider</p>
                  </div>
                ) : (
                  <div className="divide-y">
                    {providers.map((provider) => (
                      <div
                        key={provider.id}
                        className="flex items-center justify-between p-4"
                      >
                        <div className="flex items-center gap-3">
                          <Cloud className="h-8 w-8 text-primary" />
                          <div>
                            <p className="font-medium">{provider.name}</p>
                            <p className="text-sm text-muted-foreground">
                              {provider.workerUrl}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {provider.isActive && (
                            <span className="flex items-center gap-1 text-sm text-green-600">
                              <Check className="h-3 w-3" />
                              Active
                            </span>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setEditingProvider(provider)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => removeProvider(provider.id)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="account">
            <Card>
              <CardHeader>
                <CardTitle>Account</CardTitle>
                <CardDescription>Informasi akun Anda</CardDescription>
              </CardHeader>
              <Separator />
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  {user?.picture && (
                    <img
                      src={user.picture}
                      alt={user.name}
                      className="h-16 w-16 rounded-full"
                    />
                  )}
                  <div>
                    <p className="font-medium text-lg">{user?.name}</p>
                    <p className="text-muted-foreground">{user?.email}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="preferences">
            <Card>
              <CardHeader>
                <CardTitle>Preferences</CardTitle>
                <CardDescription>Pengaturan aplikasi</CardDescription>
              </CardHeader>
              <Separator />
              <CardContent className="pt-6 space-y-4">
                <div className="space-y-2">
                  <Label>Theme</Label>
                  <p className="text-sm text-muted-foreground">
                    Coming soon...
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <Dialog
          open={editingProvider !== null}
          onOpenChange={(open) => !open && setEditingProvider(null)}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Provider</DialogTitle>
            </DialogHeader>
            {editingProvider && (
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Name</Label>
                  <Input
                    value={editingProvider.name}
                    onChange={(e) =>
                      setEditingProvider({ ...editingProvider, name: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Worker URL</Label>
                  <Input
                    value={editingProvider.workerUrl}
                    onChange={(e) =>
                      setEditingProvider({
                        ...editingProvider,
                        workerUrl: e.target.value,
                      })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Auth Token</Label>
                  <Input
                    type="password"
                    value={editingProvider.authToken}
                    onChange={(e) =>
                      setEditingProvider({
                        ...editingProvider,
                        authToken: e.target.value,
                      })
                    }
                  />
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditingProvider(null)}>
                Cancel
              </Button>
              <Button onClick={handleUpdateProvider}>Save Changes</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  )
}
