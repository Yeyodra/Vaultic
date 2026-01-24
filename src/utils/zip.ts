import JSZip from 'jszip'
import type { ProviderConfig, FileMetadata } from '@/api/types'
import * as storageApi from '@/api/storage'

export interface ZipProgress {
  currentFile: string
  filesProcessed: number
  totalFiles: number
  phase: 'downloading' | 'compressing' | 'complete'
}

export async function downloadFilesAsZip(
  files: FileMetadata[],
  providers: ProviderConfig[],
  onProgress?: (progress: ZipProgress) => void
): Promise<Blob> {
  const zip = new JSZip()
  const totalFiles = files.filter(f => !f.isDirectory).length
  let filesProcessed = 0

  for (const file of files) {
    if (file.isDirectory) continue

    // Find provider for this file
    const providerId = file.providers[0]
    if (!providerId) continue

    const provider = providers.find(p => p.id === providerId)
    if (!provider) continue

    onProgress?.({
      currentFile: file.name,
      filesProcessed,
      totalFiles,
      phase: 'downloading',
    })

    try {
      // Download file
      const blob = await storageApi.downloadFile(provider, file.key)
      const arrayBuffer = await blob.arrayBuffer()
      
      // Add to ZIP (remove leading slash from key for ZIP path)
      const zipPath = file.key.startsWith('/') ? file.key.slice(1) : file.key
      zip.file(zipPath, arrayBuffer)
      
      filesProcessed++
    } catch (error) {
      console.warn(`Failed to add ${file.name} to ZIP:`, error)
    }
  }

  onProgress?.({
    currentFile: '',
    filesProcessed: totalFiles,
    totalFiles,
    phase: 'compressing',
  })

  // Generate ZIP blob
  const zipBlob = await zip.generateAsync({ 
    type: 'blob',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 }
  })

  onProgress?.({
    currentFile: '',
    filesProcessed: totalFiles,
    totalFiles,
    phase: 'complete',
  })

  return zipBlob
}

export function triggerDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.style.display = 'none'
  document.body.appendChild(a)
  a.click()
  
  setTimeout(() => {
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }, 100)
}
