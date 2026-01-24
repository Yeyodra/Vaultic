import { useState, useCallback, useRef } from 'react'
import { Upload, X, FileIcon, Folder, Cloud } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { formatFileSize } from '@/utils/format'

// Extended File type with relative path
export interface FileWithPath extends File {
  relativePath?: string
}

interface UploadZoneProps {
  onFilesSelected: (files: FileWithPath[]) => void
  disabled?: boolean
  className?: string
}

// Recursively read directory entries
async function readDirectory(entry: FileSystemDirectoryEntry, path: string = ''): Promise<FileWithPath[]> {
  const files: FileWithPath[] = []
  const reader = entry.createReader()
  
  const readEntries = (): Promise<FileSystemEntry[]> => {
    return new Promise((resolve, reject) => {
      reader.readEntries(resolve, reject)
    })
  }

  let entries: FileSystemEntry[] = []
  let batch: FileSystemEntry[]
  
  // readEntries returns batches, need to call multiple times
  do {
    batch = await readEntries()
    entries = entries.concat(batch)
  } while (batch.length > 0)

  for (const childEntry of entries) {
    if (childEntry.isFile) {
      const fileEntry = childEntry as FileSystemFileEntry
      const file = await new Promise<File>((resolve, reject) => {
        fileEntry.file(resolve, reject)
      })
      
      // Create new file with relative path
      const fileWithPath = file as FileWithPath
      fileWithPath.relativePath = path ? `${path}/${file.name}` : file.name
      files.push(fileWithPath)
    } else if (childEntry.isDirectory) {
      const dirEntry = childEntry as FileSystemDirectoryEntry
      const subPath = path ? `${path}/${childEntry.name}` : childEntry.name
      const subFiles = await readDirectory(dirEntry, subPath)
      files.push(...subFiles)
    }
  }

  return files
}

// Process dropped items (files or folders)
async function processDroppedItems(items: DataTransferItemList): Promise<FileWithPath[]> {
  const files: FileWithPath[] = []
  const entries: FileSystemEntry[] = []

  // Get all entries first
  for (let i = 0; i < items.length; i++) {
    const item = items[i]
    const entry = item.webkitGetAsEntry?.()
    if (entry) {
      entries.push(entry)
    }
  }

  // Process each entry
  for (const entry of entries) {
    if (entry.isFile) {
      const fileEntry = entry as FileSystemFileEntry
      const file = await new Promise<File>((resolve, reject) => {
        fileEntry.file(resolve, reject)
      })
      const fileWithPath = file as FileWithPath
      fileWithPath.relativePath = file.name
      files.push(fileWithPath)
    } else if (entry.isDirectory) {
      const dirEntry = entry as FileSystemDirectoryEntry
      const dirFiles = await readDirectory(dirEntry, entry.name)
      files.push(...dirFiles)
    }
  }

  return files
}

export function UploadZone({ onFilesSelected, disabled, className }: UploadZoneProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [selectedFiles, setSelectedFiles] = useState<FileWithPath[]>([])
  const [isProcessing, setIsProcessing] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const folderInputRef = useRef<HTMLInputElement>(null)

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (!disabled) {
      setIsDragging(true)
    }
  }, [disabled])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)

    if (disabled) return

    setIsProcessing(true)
    try {
      const files = await processDroppedItems(e.dataTransfer.items)
      if (files.length > 0) {
        setSelectedFiles(prev => [...prev, ...files])
      }
    } catch (error) {
      console.error('Error processing dropped items:', error)
    } finally {
      setIsProcessing(false)
    }
  }, [disabled])

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files
    if (!fileList || fileList.length === 0) return

    const files: FileWithPath[] = []
    for (let i = 0; i < fileList.length; i++) {
      const file = fileList[i] as FileWithPath
      // For folder selection, webkitRelativePath contains the path
      file.relativePath = (file as any).webkitRelativePath || file.name
      files.push(file)
    }

    setSelectedFiles(prev => [...prev, ...files])

    // Reset input
    if (fileInputRef.current) fileInputRef.current.value = ''
    if (folderInputRef.current) folderInputRef.current.value = ''
  }, [])

  const removeFile = useCallback((index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index))
  }, [])

  const clearFiles = useCallback(() => {
    setSelectedFiles([])
  }, [])

  const handleUpload = useCallback(() => {
    if (selectedFiles.length > 0) {
      onFilesSelected(selectedFiles)
      setSelectedFiles([])
    }
  }, [selectedFiles, onFilesSelected])

  // Group files by folder for display
  const folderCount = new Set(
    selectedFiles
      .map(f => f.relativePath?.split('/').slice(0, -1).join('/'))
      .filter(Boolean)
  ).size

  return (
    <div className={cn("space-y-4", className)}>
      {/* Hidden file inputs */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        onChange={handleFileSelect}
        className="hidden"
        disabled={disabled}
      />
      <input
        ref={folderInputRef}
        type="file"
        // @ts-ignore - webkitdirectory is not in types but works in browsers
        webkitdirectory=""
        directory=""
        multiple
        onChange={handleFileSelect}
        className="hidden"
        disabled={disabled}
      />

      {/* Drop Zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={cn(
          "relative border-2 border-dashed rounded-lg p-8 text-center transition-all",
          isDragging && "border-primary bg-primary/5",
          !isDragging && "border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/50",
          disabled && "opacity-50 cursor-not-allowed",
          isProcessing && "opacity-50"
        )}
      >
        <div className="flex flex-col items-center gap-3">
          <div className={cn(
            "p-4 rounded-full transition-colors",
            isDragging ? "bg-primary/10" : "bg-muted"
          )}>
            <Upload className={cn(
              "h-8 w-8",
              isDragging ? "text-primary" : "text-muted-foreground"
            )} />
          </div>
          <div>
            <p className="font-medium">
              {isProcessing ? "Processing..." : isDragging ? "Drop files or folders here" : "Drag & drop files or folders"}
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              or use the buttons below
            </p>
          </div>
          
          {/* Buttons for file/folder selection */}
          <div className="flex gap-2 mt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={(e) => {
                e.stopPropagation()
                fileInputRef.current?.click()
              }}
              disabled={disabled || isProcessing}
            >
              <FileIcon className="h-4 w-4 mr-2" />
              Select Files
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={(e) => {
                e.stopPropagation()
                folderInputRef.current?.click()
              }}
              disabled={disabled || isProcessing}
            >
              <Folder className="h-4 w-4 mr-2" />
              Select Folder
            </Button>
          </div>
        </div>
      </div>

      {/* Selected Files List */}
      {selectedFiles.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium">
              {selectedFiles.length} file(s) selected
              {folderCount > 0 && (
                <span className="text-muted-foreground ml-1">
                  from {folderCount} folder(s)
                </span>
              )}
            </p>
            <Button variant="ghost" size="sm" onClick={clearFiles}>
              Clear all
            </Button>
          </div>
          
          <div className="max-h-48 overflow-y-auto space-y-1">
            {selectedFiles.map((file, index) => (
              <div
                key={`${file.relativePath || file.name}-${index}`}
                className="flex items-center justify-between p-2 bg-muted rounded-lg"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <FileIcon className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
                  <span className="text-sm truncate" title={file.relativePath || file.name}>
                    {file.relativePath || file.name}
                  </span>
                  <span className="text-xs text-muted-foreground flex-shrink-0">
                    ({formatFileSize(file.size)})
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 flex-shrink-0"
                  onClick={(e) => {
                    e.stopPropagation()
                    removeFile(index)
                  }}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            ))}
          </div>

          <Button onClick={handleUpload} className="w-full">
            <Cloud className="h-4 w-4 mr-2" />
            Upload {selectedFiles.length} file(s)
          </Button>
        </div>
      )}
    </div>
  )
}
