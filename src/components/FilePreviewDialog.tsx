import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Download,
  X,
  FileText,
  Image as ImageIcon,
  Film,
  Music,
  FileIcon,
  Loader2,
} from 'lucide-react'
import type { FileEntry, ProviderConfig } from '@/api/types'
import * as storageApi from '@/api/storage'

interface FilePreviewDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  file: FileEntry | null
  provider: ProviderConfig | null
  onDownload: () => void
}

type PreviewType = 'image' | 'video' | 'audio' | 'pdf' | 'text' | 'unsupported'

const IMAGE_EXTENSIONS = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'ico']
const VIDEO_EXTENSIONS = ['mp4', 'webm', 'ogg', 'mov', 'avi']
const AUDIO_EXTENSIONS = ['mp3', 'wav', 'ogg', 'flac', 'aac', 'm4a']
const PDF_EXTENSIONS = ['pdf']
const TEXT_EXTENSIONS = [
  'txt', 'md', 'json', 'js', 'ts', 'tsx', 'jsx', 'css', 'html', 'xml',
  'yaml', 'yml', 'toml', 'ini', 'cfg', 'conf', 'sh', 'bash', 'zsh',
  'py', 'rb', 'go', 'rs', 'java', 'c', 'cpp', 'h', 'hpp', 'cs',
  'php', 'sql', 'graphql', 'env', 'gitignore', 'dockerfile', 'log'
]

function getFileExtension(filename: string): string {
  const parts = filename.toLowerCase().split('.')
  return parts.length > 1 ? parts[parts.length - 1] : ''
}

function getPreviewType(filename: string): PreviewType {
  const ext = getFileExtension(filename)
  
  if (IMAGE_EXTENSIONS.includes(ext)) return 'image'
  if (VIDEO_EXTENSIONS.includes(ext)) return 'video'
  if (AUDIO_EXTENSIONS.includes(ext)) return 'audio'
  if (PDF_EXTENSIONS.includes(ext)) return 'pdf'
  if (TEXT_EXTENSIONS.includes(ext)) return 'text'
  
  return 'unsupported'
}

function getPreviewIcon(type: PreviewType) {
  switch (type) {
    case 'image': return <ImageIcon className="h-12 w-12 text-blue-500" />
    case 'video': return <Film className="h-12 w-12 text-purple-500" />
    case 'audio': return <Music className="h-12 w-12 text-green-500" />
    case 'pdf': return <FileText className="h-12 w-12 text-red-500" />
    case 'text': return <FileText className="h-12 w-12 text-gray-500" />
    default: return <FileIcon className="h-12 w-12 text-gray-400" />
  }
}

export function FilePreviewDialog({
  open,
  onOpenChange,
  file,
  provider,
  onDownload,
}: FilePreviewDialogProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [blobUrl, setBlobUrl] = useState<string | null>(null)
  const [textContent, setTextContent] = useState<string | null>(null)

  const previewType = file ? getPreviewType(file.name) : 'unsupported'

  // Load file content when dialog opens
  useEffect(() => {
    if (!open || !file || !provider) {
      setBlobUrl(null)
      setTextContent(null)
      setError(null)
      return
    }

    if (previewType === 'unsupported') {
      return
    }

    const loadFile = async () => {
      setIsLoading(true)
      setError(null)

      try {
        const blob = await storageApi.downloadFile(provider, file.key)

        if (previewType === 'text') {
          const text = await blob.text()
          setTextContent(text)
        } else {
          const url = URL.createObjectURL(blob)
          setBlobUrl(url)
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load file')
      } finally {
        setIsLoading(false)
      }
    }

    loadFile()

    // Cleanup blob URL on unmount
    return () => {
      if (blobUrl) {
        URL.revokeObjectURL(blobUrl)
      }
    }
  }, [open, file, provider, previewType])

  const handleClose = () => {
    if (blobUrl) {
      URL.revokeObjectURL(blobUrl)
    }
    setBlobUrl(null)
    setTextContent(null)
    onOpenChange(false)
  }

  if (!file) return null

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <div className="flex items-center justify-between pr-8">
            <DialogTitle className="flex items-center gap-2 truncate">
              {getPreviewIcon(previewType)}
              <span className="truncate">{file.name}</span>
            </DialogTitle>
            <Button variant="outline" size="sm" onClick={onDownload}>
              <Download className="h-4 w-4 mr-2" />
              Download
            </Button>
          </div>
        </DialogHeader>

        <div className="flex-1 min-h-0 overflow-hidden">
          {isLoading && (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              <span className="ml-2 text-muted-foreground">Loading preview...</span>
            </div>
          )}

          {error && (
            <div className="flex flex-col items-center justify-center h-64 text-destructive">
              <X className="h-12 w-12 mb-2" />
              <p>{error}</p>
            </div>
          )}

          {!isLoading && !error && (
            <>
              {/* Image Preview */}
              {previewType === 'image' && blobUrl && (
                <div className="flex items-center justify-center h-full bg-muted/30 rounded-lg p-4">
                  <img
                    src={blobUrl}
                    alt={file.name}
                    className="max-w-full max-h-[60vh] object-contain rounded"
                  />
                </div>
              )}

              {/* Video Preview */}
              {previewType === 'video' && blobUrl && (
                <div className="flex items-center justify-center h-full bg-black rounded-lg">
                  <video
                    src={blobUrl}
                    controls
                    className="max-w-full max-h-[60vh]"
                  >
                    Your browser does not support video playback.
                  </video>
                </div>
              )}

              {/* Audio Preview */}
              {previewType === 'audio' && blobUrl && (
                <div className="flex flex-col items-center justify-center h-64 bg-muted/30 rounded-lg p-8">
                  <Music className="h-16 w-16 text-green-500 mb-4" />
                  <p className="text-lg font-medium mb-4">{file.name}</p>
                  <audio src={blobUrl} controls className="w-full max-w-md">
                    Your browser does not support audio playback.
                  </audio>
                </div>
              )}

              {/* PDF Preview */}
              {previewType === 'pdf' && blobUrl && (
                <iframe
                  src={blobUrl}
                  className="w-full h-[60vh] rounded-lg border"
                  title={file.name}
                />
              )}

              {/* Text Preview */}
              {previewType === 'text' && textContent !== null && (
                <ScrollArea className="h-[60vh] w-full">
                  <pre className="p-4 bg-muted/30 rounded-lg text-sm font-mono whitespace-pre-wrap break-words">
                    {textContent}
                  </pre>
                </ScrollArea>
              )}

              {/* Unsupported Preview */}
              {previewType === 'unsupported' && (
                <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
                  <FileIcon className="h-16 w-16 mb-4" />
                  <p className="text-lg font-medium">Preview not available</p>
                  <p className="text-sm">This file type cannot be previewed</p>
                  <Button variant="outline" className="mt-4" onClick={onDownload}>
                    <Download className="h-4 w-4 mr-2" />
                    Download to view
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
