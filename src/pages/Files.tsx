import { useState } from 'react'
import { useProviderStore } from '@/stores/providerStore'
import { useFileStore } from '@/stores/fileStore'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import {
  Cloud,
  File,
  Folder,
  ChevronRight,
  Upload,
  Download,
  Trash2,
  ArrowLeft,
  Home,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { formatFileSize, formatDate } from '@/utils/format'

export function Files() {
  const { providers } = useProviderStore()
  const { files, currentPath, setCurrentPath, selectedFiles, toggleFileSelection, clearSelection } = useFileStore()
  const [selectedProvider, setSelectedProvider] = useState<string | null>(
    providers[0]?.id || null
  )

  const pathParts = currentPath.split('/').filter(Boolean)

  const navigateTo = (index: number) => {
    const parts = pathParts.slice(0, index + 1)
    setCurrentPath('/' + parts.join('/'))
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-4">
            <Button asChild variant="ghost" size="icon">
              <Link to="/">
                <ArrowLeft className="h-4 w-4" />
              </Link>
            </Button>
            <div className="flex items-center gap-2">
              <Cloud className="h-6 w-6 text-primary" />
              <span className="text-xl font-bold">File Browser</span>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm">
              <Upload className="h-4 w-4 mr-2" />
              Upload
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={selectedFiles.length === 0}
            >
              <Download className="h-4 w-4 mr-2" />
              Download
            </Button>
            <Button
              variant="destructive"
              size="sm"
              disabled={selectedFiles.length === 0}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </Button>
          </div>
        </div>
      </header>

      <div className="container mx-auto p-4">
        <div className="grid grid-cols-12 gap-4">
          <aside className="col-span-3">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Storage Providers</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <ScrollArea className="h-[calc(100vh-200px)]">
                  {providers.map((provider) => (
                    <button
                      key={provider.id}
                      onClick={() => setSelectedProvider(provider.id)}
                      className={`w-full flex items-center gap-2 px-4 py-2 text-left hover:bg-muted transition-colors ${
                        selectedProvider === provider.id ? 'bg-muted' : ''
                      }`}
                    >
                      <Cloud className="h-4 w-4" />
                      <span className="text-sm truncate">{provider.name}</span>
                    </button>
                  ))}
                  {providers.length === 0 && (
                    <p className="px-4 py-2 text-sm text-muted-foreground">
                      Belum ada provider
                    </p>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>
          </aside>

          <main className="col-span-9">
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setCurrentPath('/')}
                  >
                    <Home className="h-4 w-4" />
                  </Button>
                  {pathParts.map((part, index) => (
                    <div key={index} className="flex items-center">
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => navigateTo(index)}
                      >
                        {part}
                      </Button>
                    </div>
                  ))}
                </div>
              </CardHeader>
              <Separator />
              <CardContent className="p-0">
                <ScrollArea className="h-[calc(100vh-280px)]">
                  {files.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
                      <Folder className="h-12 w-12 mb-4" />
                      <p>Folder kosong</p>
                    </div>
                  ) : (
                    <table className="w-full">
                      <thead className="border-b">
                        <tr className="text-left text-sm text-muted-foreground">
                          <th className="p-3 w-8">
                            <input
                              type="checkbox"
                              onChange={(e) => {
                                if (e.target.checked) {
                                  files.forEach((f) => toggleFileSelection(f.key))
                                } else {
                                  clearSelection()
                                }
                              }}
                            />
                          </th>
                          <th className="p-3">Name</th>
                          <th className="p-3">Size</th>
                          <th className="p-3">Modified</th>
                        </tr>
                      </thead>
                      <tbody>
                        {files.map((file) => (
                          <tr
                            key={file.key}
                            className="border-b hover:bg-muted/50 cursor-pointer"
                            onClick={() => toggleFileSelection(file.key)}
                          >
                            <td className="p-3">
                              <input
                                type="checkbox"
                                checked={selectedFiles.includes(file.key)}
                                onChange={() => {}}
                              />
                            </td>
                            <td className="p-3 flex items-center gap-2">
                              {file.isDirectory ? (
                                <Folder className="h-4 w-4 text-blue-500" />
                              ) : (
                                <File className="h-4 w-4 text-gray-500" />
                              )}
                              <span>{file.name}</span>
                            </td>
                            <td className="p-3 text-sm text-muted-foreground">
                              {file.isDirectory ? '-' : formatFileSize(file.size)}
                            </td>
                            <td className="p-3 text-sm text-muted-foreground">
                              {formatDate(file.lastModified)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>
          </main>
        </div>
      </div>
    </div>
  )
}
