import type { FileEntry, StorageStats, ShareLink, ProviderConfig } from './types'

async function fetchStorage(
  provider: ProviderConfig,
  path: string,
  options: RequestInit = {}
): Promise<Response> {
  const headers = new Headers(options.headers)
  headers.set('Authorization', `Bearer ${provider.authToken}`)

  return fetch(`${provider.workerUrl}${path}`, { ...options, headers })
}

export async function listFiles(
  provider: ProviderConfig,
  prefix: string = '/'
): Promise<FileEntry[]> {
  const response = await fetchStorage(
    provider,
    `/api/files?prefix=${encodeURIComponent(prefix)}`
  )

  if (!response.ok) {
    throw new Error('Failed to list files')
  }

  const data = await response.json() as { files: FileEntry[] }
  return data.files.map((f) => ({ ...f, providerId: provider.id }))
}

export async function uploadFile(
  provider: ProviderConfig,
  file: File,
  path: string = '/',
  onProgress?: (progress: number) => void
): Promise<{ key: string; size: number; etag: string }> {
  const formData = new FormData()
  formData.append('file', file)
  formData.append('path', path)

  const response = await fetchStorage(provider, '/api/upload', {
    method: 'POST',
    body: formData,
  })

  if (onProgress) {
    onProgress(100)
  }

  if (!response.ok) {
    throw new Error('Failed to upload file')
  }

  return response.json()
}

export async function downloadFile(
  provider: ProviderConfig,
  key: string,
  onProgress?: (downloaded: number, total: number) => void
): Promise<Blob> {
  const response = await fetchStorage(
    provider,
    `/api/download?key=${encodeURIComponent(key)}`
  )

  if (!response.ok) {
    const errorText = await response.text()
    console.error('Download error:', response.status, errorText)
    throw new Error(`Failed to download file: ${response.status} - ${errorText}`)
  }

  // If no progress callback or no content-length, just return blob directly
  const contentLength = response.headers.get('Content-Length')
  if (!onProgress || !contentLength) {
    return response.blob()
  }

  // Stream the response to track progress
  const total = parseInt(contentLength, 10)
  const reader = response.body?.getReader()
  
  if (!reader) {
    return response.blob()
  }

  const chunks: Uint8Array[] = []
  let downloaded = 0

  while (true) {
    const { done, value } = await reader.read()
    
    if (done) break
    
    chunks.push(value)
    downloaded += value.length
    onProgress(downloaded, total)
  }

  // Combine chunks into a single blob
  const blob = new Blob(chunks as BlobPart[])
  return blob
}

export async function deleteFile(
  provider: ProviderConfig,
  key: string
): Promise<void> {
  const response = await fetchStorage(
    provider,
    `/api/files?key=${encodeURIComponent(key)}`,
    { method: 'DELETE' }
  )

  if (!response.ok) {
    throw new Error('Failed to delete file')
  }
}

export async function getStorageStats(
  provider: ProviderConfig
): Promise<StorageStats> {
  const response = await fetchStorage(provider, '/api/stats')

  if (!response.ok) {
    throw new Error('Failed to get storage stats')
  }

  return response.json()
}

export async function createShareLink(
  provider: ProviderConfig,
  key: string,
  options: {
    expiresIn?: number
    downloadLimit?: number
    password?: string
  } = {}
): Promise<ShareLink> {
  const response = await fetchStorage(provider, '/api/share', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ key, ...options }),
  })

  if (!response.ok) {
    throw new Error('Failed to create share link')
  }

  return response.json()
}

export async function uploadToMultipleProviders(
  providers: ProviderConfig[],
  file: File,
  path: string = '/',
  onProgress?: (providerId: string, progress: number) => void
): Promise<Map<string, { success: boolean; error?: string; key?: string }>> {
  const results = new Map<string, { success: boolean; error?: string; key?: string }>()

  const uploads = providers.map(async (provider) => {
    try {
      const uploadResult = await uploadFile(provider, file, path, (progress) => {
        onProgress?.(provider.id, progress)
      })
      results.set(provider.id, { success: true, key: uploadResult.key })
    } catch (error) {
      results.set(provider.id, {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      })
    }
  })

  await Promise.all(uploads)
  return results
}
