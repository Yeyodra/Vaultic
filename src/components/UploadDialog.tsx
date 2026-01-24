import { useState, useCallback } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { ScrollArea } from '@/components/ui/scroll-area'
import { UploadZone, type FileWithPath } from '@/components/UploadZone'
import { useProviderStore } from '@/stores/providerStore'
import { useUpload } from '@/hooks/useUpload'
import { toast } from '@/stores/toastStore'
import { Cloud, Check, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface UploadDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  currentPath: string
}

export function UploadDialog({ open, onOpenChange, currentPath }: UploadDialogProps) {
  const { providers } = useProviderStore()
  const { uploadFiles, isUploading } = useUpload()
  const [selectedProviders, setSelectedProviders] = useState<string[]>(() => 
    providers.filter(p => p.isActive).map(p => p.id)
  )
  const [filesToUpload, setFilesToUpload] = useState<FileWithPath[]>([])

  const activeProviders = providers.filter(p => p.isActive)

  const toggleProvider = useCallback((providerId: string) => {
    setSelectedProviders(prev => 
      prev.includes(providerId)
        ? prev.filter(id => id !== providerId)
        : [...prev, providerId]
    )
  }, [])

  const selectAllProviders = useCallback(() => {
    setSelectedProviders(activeProviders.map(p => p.id))
  }, [activeProviders])

  const handleFilesSelected = useCallback((files: File[]) => {
    setFilesToUpload(files)
  }, [])

  const handleUpload = useCallback(async () => {
    if (filesToUpload.length === 0 || selectedProviders.length === 0) return

    const selectedProviderConfigs = providers.filter(p => 
      selectedProviders.includes(p.id)
    )

    try {
      await uploadFiles(filesToUpload, selectedProviderConfigs, currentPath)
      
      const fileCount = filesToUpload.length
      const providerCount = selectedProviders.length
      toast.success(
        `Successfully uploaded ${fileCount} file${fileCount > 1 ? 's' : ''} to ${providerCount} provider${providerCount > 1 ? 's' : ''}`
      )
      
      // Reset and close
      setFilesToUpload([])
      onOpenChange(false)
    } catch (error) {
      toast.error('Upload failed. Please try again.')
    }
  }, [filesToUpload, selectedProviders, providers, uploadFiles, currentPath, onOpenChange])

  const handleClose = useCallback(() => {
    if (!isUploading) {
      setFilesToUpload([])
      onOpenChange(false)
    }
  }, [isUploading, onOpenChange])

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Upload Files</DialogTitle>
          <DialogDescription>
            Upload files to: <code className="px-1 py-0.5 bg-muted rounded">{currentPath}</code>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Provider Selection */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Upload to providers:</Label>
              <Button variant="link" size="sm" onClick={selectAllProviders}>
                Select all
              </Button>
            </div>
            
            {activeProviders.length === 0 ? (
              <p className="text-sm text-muted-foreground p-4 text-center border rounded-lg">
                No active providers. Add providers in Settings.
              </p>
            ) : (
              <ScrollArea className="max-h-32">
                <div className="grid grid-cols-2 gap-2">
                  {activeProviders.map((provider) => (
                    <button
                      key={provider.id}
                      onClick={() => toggleProvider(provider.id)}
                      disabled={isUploading}
                      className={cn(
                        "flex items-center gap-2 p-3 rounded-lg border text-left transition-colors",
                        selectedProviders.includes(provider.id)
                          ? "border-primary bg-primary/5"
                          : "border-muted hover:border-primary/50",
                        isUploading && "opacity-50 cursor-not-allowed"
                      )}
                    >
                      <div className={cn(
                        "w-5 h-5 rounded-full border-2 flex items-center justify-center",
                        selectedProviders.includes(provider.id)
                          ? "border-primary bg-primary"
                          : "border-muted-foreground"
                      )}>
                        {selectedProviders.includes(provider.id) && (
                          <Check className="h-3 w-3 text-primary-foreground" />
                        )}
                      </div>
                      <Cloud className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm truncate">{provider.name}</span>
                    </button>
                  ))}
                </div>
              </ScrollArea>
            )}
          </div>

          {/* Upload Zone */}
          <UploadZone 
            onFilesSelected={handleFilesSelected}
            disabled={isUploading || activeProviders.length === 0}
          />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isUploading}>
            Cancel
          </Button>
          <Button 
            onClick={handleUpload} 
            disabled={
              isUploading || 
              filesToUpload.length === 0 || 
              selectedProviders.length === 0
            }
          >
            {isUploading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <Cloud className="h-4 w-4 mr-2" />
                Upload to {selectedProviders.length} provider(s)
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
