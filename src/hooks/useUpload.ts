import { useCallback } from 'react'
import { useUploadStore } from '@/stores/uploadStore'
import * as storageApi from '@/api/storage'
import * as authApi from '@/api/auth'
import type { ProviderConfig, UploadTask } from '@/api/types'

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
      file: File,
      providers: ProviderConfig[],
      path: string = '/'
    ) => {
      const taskId = crypto.randomUUID()
      const task: UploadTask = {
        id: taskId,
        localPath: file.name,
        remotePath: path,
        targetProviders: providers.map((p) => p.id),
        status: 'pending',
        progress: Object.fromEntries(providers.map((p) => [p.id, 0])),
      }

      addTask(task)
      updateTask(taskId, { status: 'uploading' })

      const results = await storageApi.uploadToMultipleProviders(
        providers,
        file,
        path,
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
              name: file.name,
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
      files: File[],
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
