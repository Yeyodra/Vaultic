import { useState, useCallback, useEffect } from 'react'
import { useProviderStore } from '@/stores/providerStore'
import { useFileStore } from '@/stores/fileStore'
import { useFiles } from '@/hooks/useFiles'
import { toast } from '@/stores/toastStore'
import { downloadFilesAsZip, triggerDownload } from '@/utils/zip'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
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
  Loader2,
  RefreshCw,
  Archive,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { formatFileSize, formatDate } from '@/utils/format'
import { UploadDialog } from '@/components/UploadDialog'
import { UploadProgress } from '@/components/UploadProgress'
import { DownloadProgress } from '@/components/DownloadProgress'
import { DeleteConfirmDialog } from '@/components/DeleteConfirmDialog'
import { FilePreviewDialog } from '@/components/FilePreviewDialog'
import type { FileMetadata } from '@/api/types'

export function Files() {
  const { providers } = useProviderStore()
  const { files, currentPath, setCurrentPath, selectedFiles, toggleFileSelection, clearSelection } = useFileStore()
  const { fetchFiles, downloadFile, deleteFiles, getProviderName, isLoading } = useFiles()
  
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [isDownloading, setIsDownloading] = useState(false)
  const [isZipping, setIsZipping] = useState(false)
  const [previewFile, setPreviewFile] = useState<FileMetadata | null>(null)
  const [previewOpen, setPreviewOpen] = useState(false)

  // Fetch files on mount and when path changes
  useEffect(() => {
    fetchFiles(currentPath)
  }, [currentPath])

  const pathParts = currentPath.split('/').filter(Boolean)

  const navigateTo = (index: number) => {
    const parts = pathParts.slice(0, index + 1)
    setCurrentPath('/' + parts.join('/'))
  }

  // Get selected file objects
  const selectedFileObjects = files.filter(f => selectedFiles.includes(f.key))

  // Handle download
  const handleDownload = useCallback(async () => {
    if (selectedFileObjects.length === 0) return

    setIsDownloading(true)
    const toastId = toast.loading(`Downloading ${selectedFileObjects.length} file${selectedFileObjects.length > 1 ? 's' : ''}...`)
    
    try {
      let successCount = 0
      for (const file of selectedFileObjects) {
        if (!file.isDirectory) {
          await downloadFile(file)
          successCount++
        }
      }
      
      toast.updateToast(toastId, {
        message: `Successfully downloaded ${successCount} file${successCount > 1 ? 's' : ''}`,
        type: 'success'
      })
      setTimeout(() => toast.dismiss(toastId), 3000)
    } catch (error) {
      toast.updateToast(toastId, {
        message: 'Download failed',
        type: 'error'
      })
      setTimeout(() => toast.dismiss(toastId), 3000)
      console.error('Download failed:', error)
    } finally {
      setIsDownloading(false)
    }
  }, [selectedFileObjects, downloadFile])

  // Handle download as ZIP
  const handleDownloadAsZip = useCallback(async () => {
    const filesToZip = selectedFileObjects.filter(f => !f.isDirectory)
    if (filesToZip.length === 0) return

    setIsZipping(true)
    const toastId = toast.loading(`Preparing ${filesToZip.length} files for ZIP...`)

    try {
      const zipBlob = await downloadFilesAsZip(filesToZip, providers, (progress) => {
        if (progress.phase === 'downloading') {
          toast.updateToast(toastId, {
            message: `Downloading ${progress.filesProcessed + 1}/${progress.totalFiles}: ${progress.currentFile}`,
            type: 'loading'
          })
        } else if (progress.phase === 'compressing') {
          toast.updateToast(toastId, {
            message: 'Compressing files...',
            type: 'loading'
          })
        }
      })

      // Generate filename with date
      const date = new Date().toISOString().split('T')[0]
      const filename = `vaultic-files-${date}.zip`
      
      triggerDownload(zipBlob, filename)

      toast.updateToast(toastId, {
        message: `Successfully created ${filename}`,
        type: 'success'
      })
      setTimeout(() => toast.dismiss(toastId), 3000)
    } catch (error) {
      toast.updateToast(toastId, {
        message: 'Failed to create ZIP file',
        type: 'error'
      })
      setTimeout(() => toast.dismiss(toastId), 3000)
      console.error('ZIP creation failed:', error)
    } finally {
      setIsZipping(false)
    }
  }, [selectedFileObjects, providers])

  // Handle delete
  const handleDelete = useCallback(async () => {
    if (selectedFiles.length === 0) return
    
    const toastId = toast.loading(`Deleting ${selectedFiles.length} file${selectedFiles.length > 1 ? 's' : ''}...`)
    
    try {
      await deleteFiles(selectedFiles)
      toast.updateToast(toastId, {
        message: `Successfully deleted ${selectedFiles.length} file${selectedFiles.length > 1 ? 's' : ''}`,
        type: 'success'
      })
      setTimeout(() => toast.dismiss(toastId), 3000)
      setDeleteDialogOpen(false)
    } catch (error) {
      toast.updateToast(toastId, {
        message: 'Delete failed',
        type: 'error'
      })
      setTimeout(() => toast.dismiss(toastId), 3000)
    }
  }, [selectedFiles, deleteFiles])

  // Handle refresh
  const handleRefresh = useCallback(() => {
    fetchFiles(currentPath)
  }, [currentPath, fetchFiles])

  // Get file names for delete confirmation
  const selectedFileNames = selectedFileObjects.map(f => f.name)

  // Check if any non-directory files are selected for download
  const hasDownloadableFiles = selectedFileObjects.some(f => !f.isDirectory)

  // Handle file double click
  const handleFileDoubleClick = useCallback((file: FileMetadata) => {
    if (file.isDirectory) {
      setCurrentPath(file.key)
    } else {
      setPreviewFile(file)
      setPreviewOpen(true)
    }
  }, [setCurrentPath])

  // Handle preview download
  const handlePreviewDownload = useCallback(async (providerId: string) => {
    if (!previewFile) return
    
    const toastId = toast.loading(`Downloading ${previewFile.name}...`)
    
    try {
      await downloadFile(previewFile, providerId)
      toast.updateToast(toastId, {
        message: `Successfully downloaded ${previewFile.name}`,
        type: 'success'
      })
      setTimeout(() => toast.dismiss(toastId), 3000)
    } catch (error) {
      toast.updateToast(toastId, {
        message: `Failed to download ${previewFile.name}`,
        type: 'error'
      })
      setTimeout(() => toast.dismiss(toastId), 3000)
    }
  }, [previewFile, downloadFile])

  // Get providers that have the preview file
  const getPreviewProviders = () => {
    if (!previewFile || previewFile.providers.length === 0) return []
    return providers.filter(p => previewFile.providers.includes(p.id))
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
              <span className="text-xl font-bold">My Files</span>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isLoading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button variant="outline" size="sm" onClick={() => setUploadDialogOpen(true)}>
              <Upload className="h-4 w-4 mr-2" />
              Upload
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={!hasDownloadableFiles || isDownloading}
              onClick={handleDownload}
            >
              {isDownloading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Download className="h-4 w-4 mr-2" />
              )}
              Download
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={!hasDownloadableFiles || isZipping || selectedFileObjects.filter(f => !f.isDirectory).length < 2}
              onClick={handleDownloadAsZip}
            >
              {isZipping ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Archive className="h-4 w-4 mr-2" />
              )}
              ZIP
            </Button>
            <Button
              variant="destructive"
              size="sm"
              disabled={selectedFiles.length === 0}
              onClick={() => setDeleteDialogOpen(true)}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </Button>
          </div>
        </div>
      </header>

      <div className="container mx-auto p-4">
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
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
              <CardTitle className="text-sm text-muted-foreground">
                {files.length} items
              </CardTitle>
            </div>
          </CardHeader>
          <Separator />
          <CardContent className="p-0">
            <ScrollArea className="h-[calc(100vh-240px)]">
              {isLoading ? (
                <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
                  <Loader2 className="h-8 w-8 mb-4 animate-spin" />
                  <p>Loading files...</p>
                </div>
              ) : files.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
                  <Folder className="h-12 w-12 mb-4" />
                  <p>Folder kosong</p>
                  <p className="text-sm mt-2">Upload file untuk memulai</p>
                </div>
              ) : (
                <table className="w-full">
                  <thead className="border-b bg-muted/50">
                    <tr className="text-left text-sm text-muted-foreground">
                      <th className="p-3 w-8">
                        <input
                          type="checkbox"
                          checked={selectedFiles.length === files.length && files.length > 0}
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
                      <th className="p-3">Providers</th>
                      <th className="p-3">Modified</th>
                    </tr>
                  </thead>
                  <tbody>
                    {files.map((file) => (
                      <tr
                        key={file.key}
                        className={`border-b hover:bg-muted/50 cursor-pointer ${
                          selectedFiles.includes(file.key) ? 'bg-muted/30' : ''
                        }`}
                        onClick={() => toggleFileSelection(file.key)}
                        onDoubleClick={() => handleFileDoubleClick(file)}
                      >
                        <td className="p-3">
                          <input
                            type="checkbox"
                            checked={selectedFiles.includes(file.key)}
                            onChange={() => {}}
                            onClick={(e) => e.stopPropagation()}
                          />
                        </td>
                        <td className="p-3">
                          <div className="flex items-center gap-2">
                            {file.isDirectory ? (
                              <Folder className="h-4 w-4 text-blue-500" />
                            ) : (
                              <File className="h-4 w-4 text-gray-500" />
                            )}
                            <span>{file.name}</span>
                          </div>
                        </td>
                        <td className="p-3 text-sm text-muted-foreground">
                          {file.isDirectory ? '-' : formatFileSize(file.size)}
                        </td>
                        <td className="p-3">
                          <div className="flex gap-1 flex-wrap">
                            {file.providers.map((providerId) => (
                              <Badge 
                                key={providerId} 
                                variant="secondary"
                                className="text-xs"
                              >
                                {getProviderName(providerId)}
                              </Badge>
                            ))}
                          </div>
                        </td>
                        <td className="p-3 text-sm text-muted-foreground">
                          {formatDate(file.updatedAt)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      </div>

      {/* Upload Dialog */}
      <UploadDialog 
        open={uploadDialogOpen} 
        onOpenChange={setUploadDialogOpen}
        currentPath={currentPath}
      />

      {/* Delete Confirmation Dialog */}
      <DeleteConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        fileNames={selectedFileNames}
        onConfirm={handleDelete}
      />

      {/* File Preview Dialog */}
      <FilePreviewDialog
        open={previewOpen}
        onOpenChange={setPreviewOpen}
        file={previewFile ? {
          key: previewFile.key,
          name: previewFile.name,
          size: previewFile.size,
          lastModified: previewFile.updatedAt,
          isDirectory: previewFile.isDirectory,
          providerId: previewFile.providers[0] || '',
        } : null}
        providers={getPreviewProviders()}
        onDownload={handlePreviewDownload}
      />

      {/* Upload Progress Widget */}
      <UploadProgress />

      {/* Download Progress Widget */}
      <DownloadProgress />
    </div>
  )
}
