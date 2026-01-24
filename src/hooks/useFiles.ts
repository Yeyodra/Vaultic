import { useCallback, useState } from 'react'
import { useFileStore } from '@/stores/fileStore'
import { useProviderStore } from '@/stores/providerStore'
import { useDownloadStore } from '@/stores/downloadStore'
import * as storageApi from '@/api/storage'
import * as authApi from '@/api/auth'
import type { FileMetadata } from '@/api/types'

export function useFiles() {
  const {
    files,
    currentPath,
    selectedFiles,
    isLoading,
    setFiles,
    setCurrentPath,
    selectFile,
    deselectFile,
    toggleFileSelection,
    selectAllFiles,
    clearSelection,
    setLoading,
  } = useFileStore()

  const { providers } = useProviderStore()
  const { addTask, updateTask } = useDownloadStore()

  const [error, setError] = useState<string | null>(null)

  // Fetch files from Auth Worker (unified metadata)
  const fetchFiles = useCallback(
    async (path?: string) => {
      setLoading(true)
      setError(null)
      try {
        const targetPath = path ?? currentPath
        const data = await authApi.getFiles(targetPath)
        setFiles(data)
        if (path) setCurrentPath(path)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch files')
      } finally {
        setLoading(false)
      }
    },
    [currentPath, setFiles, setCurrentPath, setLoading]
  )

  // Delete file from all providers that have it, then update metadata
  const deleteFiles = useCallback(
    async (keys: string[]) => {
      setError(null)
      try {
        for (const key of keys) {
          const fileInfo = await authApi.getFileInfo(key)
          if (!fileInfo) continue

          // Delete from all providers that have this file
          for (const providerId of fileInfo.providers) {
            const provider = providers.find(p => p.id === providerId)
            if (provider) {
              try {
                await storageApi.deleteFile(provider, key)
              } catch (e) {
                console.warn(`Failed to delete from provider ${providerId}:`, e)
              }
            }
          }

          // Remove metadata
          await authApi.removeFileMetadata(key)
        }

        setFiles(files.filter((f) => !keys.includes(f.key)))
        clearSelection()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to delete files')
        throw err
      }
    },
    [files, providers, setFiles, clearSelection]
  )

  // Download file from first available provider (or specific provider)
  const downloadFile = useCallback(
    async (file: FileMetadata, preferredProviderId?: string) => {
      setError(null)
      try {
        // Find provider to download from
        let providerId = preferredProviderId
        if (!providerId && file.providers.length > 0) {
          providerId = file.providers[0]
        }

        if (!providerId) {
          throw new Error('No provider available for this file')
        }

        const provider = providers.find(p => p.id === providerId)
        if (!provider) {
          throw new Error('Provider not found')
        }

        // Add download task to store
        const taskId = addTask({
          fileName: file.name,
          fileKey: file.key,
          providerId: provider.id,
          providerName: provider.name,
          status: 'downloading',
          progress: 0,
          downloadedBytes: 0,
          totalBytes: file.size,
        })

        const blob = await storageApi.downloadFile(provider, file.key, (downloaded, total) => {
          const progress = Math.round((downloaded / total) * 100)
          updateTask(taskId, {
            progress,
            downloadedBytes: downloaded,
            totalBytes: total,
          })
        })

        // Mark as complete
        updateTask(taskId, { status: 'complete', progress: 100 })

        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = file.name
        a.style.display = 'none'
        document.body.appendChild(a)
        a.click()
        
        // Cleanup after a short delay to ensure download starts
        setTimeout(() => {
          document.body.removeChild(a)
          URL.revokeObjectURL(url)
        }, 100)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to download file')
        throw err
      }
    },
    [providers, addTask, updateTask]
  )

  // Navigate to folder
  const navigateToFolder = useCallback(
    (path: string) => {
      fetchFiles(path)
    },
    [fetchFiles]
  )

  // Get provider name by ID
  const getProviderName = useCallback(
    (providerId: string): string => {
      const provider = providers.find(p => p.id === providerId)
      return provider?.name || providerId
    },
    [providers]
  )

  return {
    files,
    currentPath,
    selectedFiles,
    isLoading,
    error,
    providers,
    fetchFiles,
    deleteFiles,
    downloadFile,
    navigateToFolder,
    getProviderName,
    setCurrentPath,
    selectFile,
    deselectFile,
    toggleFileSelection,
    selectAllFiles,
    clearSelection,
  }
}
