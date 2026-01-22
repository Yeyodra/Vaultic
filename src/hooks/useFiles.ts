import { useCallback, useState } from 'react'
import { useFileStore } from '@/stores/fileStore'
import { useProviderStore } from '@/stores/providerStore'
import * as storageApi from '@/api/storage'
import type { FileEntry, ProviderConfig } from '@/api/types'

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

  const [error, setError] = useState<string | null>(null)

  const fetchFiles = useCallback(
    async (provider: ProviderConfig, path?: string) => {
      setLoading(true)
      setError(null)
      try {
        const targetPath = path ?? currentPath
        const data = await storageApi.listFiles(provider, targetPath)
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

  const deleteFiles = useCallback(
    async (provider: ProviderConfig, keys: string[]) => {
      setError(null)
      try {
        await Promise.all(keys.map((key) => storageApi.deleteFile(provider, key)))
        setFiles(files.filter((f) => !keys.includes(f.key)))
        clearSelection()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to delete files')
        throw err
      }
    },
    [files, setFiles, clearSelection]
  )

  const downloadFile = useCallback(
    async (provider: ProviderConfig, file: FileEntry) => {
      setError(null)
      try {
        const blob = await storageApi.downloadFile(provider, file.key)
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = file.name
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to download file')
        throw err
      }
    },
    []
  )

  const navigateToFolder = useCallback(
    (provider: ProviderConfig, path: string) => {
      fetchFiles(provider, path)
    },
    [fetchFiles]
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
    setCurrentPath,
    selectFile,
    deselectFile,
    toggleFileSelection,
    selectAllFiles,
    clearSelection,
  }
}
