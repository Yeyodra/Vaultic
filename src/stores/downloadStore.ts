import { create } from 'zustand'

export interface DownloadTask {
  id: string
  fileName: string
  fileKey: string
  providerId: string
  providerName: string
  status: 'pending' | 'downloading' | 'complete' | 'failed'
  progress: number // 0-100
  downloadedBytes: number
  totalBytes: number
  error?: string
  startTime: number
}

interface DownloadState {
  tasks: DownloadTask[]
  isDownloading: boolean

  addTask: (task: Omit<DownloadTask, 'id' | 'startTime'>) => string
  updateTask: (id: string, updates: Partial<DownloadTask>) => void
  removeTask: (id: string) => void
  clearCompleted: () => void
}

export const useDownloadStore = create<DownloadState>((set) => ({
  tasks: [],
  isDownloading: false,

  addTask: (task) => {
    const id = crypto.randomUUID()
    const newTask: DownloadTask = {
      ...task,
      id,
      startTime: Date.now(),
    }
    set((state) => ({
      tasks: [...state.tasks, newTask],
      isDownloading: true,
    }))
    return id
  },

  updateTask: (id, updates) =>
    set((state) => {
      const newTasks = state.tasks.map((t) =>
        t.id === id ? { ...t, ...updates } : t
      )
      const isDownloading = newTasks.some(
        (t) => t.status === 'pending' || t.status === 'downloading'
      )
      return { tasks: newTasks, isDownloading }
    }),

  removeTask: (id) =>
    set((state) => {
      const newTasks = state.tasks.filter((t) => t.id !== id)
      const isDownloading = newTasks.some(
        (t) => t.status === 'pending' || t.status === 'downloading'
      )
      return { tasks: newTasks, isDownloading }
    }),

  clearCompleted: () =>
    set((state) => ({
      tasks: state.tasks.filter(
        (t) => t.status === 'pending' || t.status === 'downloading'
      ),
    })),
}))
