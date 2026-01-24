import { useCallback } from 'react'
import { useUploadStore } from '@/stores/uploadStore'
import * as storageApi from '@/api/storage'
import * as authApi from '@/api/auth'
import type { ProviderConfig, UploadTask } from '@/api/types'
import type { FileWithPath } from '@/components/UploadZone'

export function useUpload() {
  const {
    tasks,
    isUploading,
    addTask,
    updateTask,
    removeTask,
    updateProgress,
    clearCompleted,
  } = useUploadStore()

  const uploadFile = useCallback(
    async (
      file: FileWithPath,
      providers: ProviderConfig[],
      basePath: string = '/'
    ) => {
      // Calculate the full path including folder structure
      const relativePath = file.relativePath || file.name
      const fileName = relativePath.split('/').pop() || file.name
      
      // Build the upload path
      // If file has a folder structure (e.g., "folder1/folder2/file.txt")
      // and basePath is "/", the final path should be "/folder1/folder2"
      const folderPart = relativePath.includes('/') 
        ? relativePath.split('/').slice(0, -1).join('/')
        : ''
      
      const uploadPath = basePath === '/'
        ? (folderPart ? `/${folderPart}` : '/')
        : (folderPart ? `${basePath}/${folderPart}` : basePath)

      const taskId = crypto.randomUUID()
      const task: UploadTask = {
        id: taskId,
        localPath: relativePath, // Show full relative path in UI
        remotePath: uploadPath,
        targetProviders: providers.map((p) => p.id),
        status: 'pending',
        progress: Object.fromEntries(providers.map((p) => [p.id, 0])),
      }

      addTask(task)
      updateTask(taskId, { status: 'uploading' })

      const results = await storageApi.uploadToMultipleProviders(
        providers,
        file,
        uploadPath,
        (providerId, progress) => {
          updateProgress(taskId, providerId, progress)
        }
      )

      // Sync file metadata to Auth Worker for each successful upload
      for (const [providerId, result] of results.entries()) {
        if (result.success && result.key) {
          try {
            await authApi.addFileMetadata({
              key: result.key, // Use key from upload response
              name: fileName,
              size: file.size,
              isDirectory: false,
              providerId,
            })
          } catch (e) {
            console.warn(`Failed to sync metadata for provider ${providerId}:`, e)
          }
        }
      }

      const allSuccess = Array.from(results.values()).every((r) => r.success)
      const errors = Array.from(results.entries())
        .filter(([, r]) => !r.success)
        .map(([id, r]) => `${id}: ${r.error}`)
        .join(', ')

      updateTask(taskId, {
        status: allSuccess ? 'complete' : 'failed',
        error: errors || undefined,
      })

      return results
    },
    [addTask, updateTask, updateProgress]
  )

  const uploadFiles = useCallback(
    async (
      files: FileWithPath[],
      providers: ProviderConfig[],
      path: string = '/'
    ) => {
      const results = []
      for (const file of files) {
        const result = await uploadFile(file, providers, path)
        results.push(result)
      }
      return results
    },
    [uploadFile]
  )

  return {
    tasks,
    isUploading,
    uploadFile,
    uploadFiles,
    removeTask,
    clearCompleted,
  }
}
