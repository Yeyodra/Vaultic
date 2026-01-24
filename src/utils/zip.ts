import JSZip from 'jszip'
import type { ProviderConfig, FileMetadata } from '@/api/types'

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
  const filesToProcess = files.filter(f => !f.isDirectory)
  const totalFiles = filesToProcess.length
  let filesProcessed = 0
  let filesAdded = 0

  console.log('Starting ZIP creation for', totalFiles, 'files')

  for (const file of filesToProcess) {
    // Find provider for this file
    const providerId = file.providers[0]
    if (!providerId) {
      console.warn(`No provider for file: ${file.name}`)
      continue
    }

    const provider = providers.find(p => p.id === providerId)
    if (!provider) {
      console.warn(`Provider not found: ${providerId}`)
      continue
    }

    onProgress?.({
      currentFile: file.name,
      filesProcessed,
      totalFiles,
      phase: 'downloading',
    })

    try {
      console.log(`Downloading: ${file.name} from ${provider.name}`)
      
      // Download file (without progress tracking for ZIP to avoid issues)
      const response = await fetch(
        `${provider.workerUrl}/api/download?key=${encodeURIComponent(file.key)}`,
        {
          headers: {
            'Authorization': `Bearer ${provider.authToken}`
          }
        }
      )
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }
      
      const arrayBuffer = await response.arrayBuffer()
      console.log(`Downloaded ${file.name}: ${arrayBuffer.byteLength} bytes`)
      
      // Add to ZIP using just the filename (not full path)
      zip.file(file.name, arrayBuffer)
      filesAdded++
      filesProcessed++
      
      console.log(`Added to ZIP: ${file.name}`)
    } catch (error) {
      console.error(`Failed to add ${file.name} to ZIP:`, error)
      filesProcessed++
    }
  }

  console.log(`Files added to ZIP: ${filesAdded}/${totalFiles}`)

  if (filesAdded === 0) {
    throw new Error('No files could be added to ZIP')
  }

  onProgress?.({
    currentFile: '',
    filesProcessed: totalFiles,
    totalFiles,
    phase: 'compressing',
  })

  // Generate ZIP blob
  console.log('Generating ZIP blob...')
  const zipBlob = await zip.generateAsync({ 
    type: 'blob',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 }
  })

  console.log(`ZIP created: ${zipBlob.size} bytes`)

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
