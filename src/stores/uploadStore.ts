import { create } from 'zustand'
import type { UploadTask } from '@/api/types'

interface UploadState {
  tasks: UploadTask[]
  isUploading: boolean

  addTask: (task: UploadTask) => void
  updateTask: (id: string, updates: Partial<UploadTask>) => void
  removeTask: (id: string) => void
  updateProgress: (taskId: string, providerId: string, progress: number) => void
  clearCompleted: () => void
  setUploading: (uploading: boolean) => void
}

export const useUploadStore = create<UploadState>((set) => ({
  tasks: [],
  isUploading: false,

  addTask: (task) =>
    set((state) => ({ tasks: [...state.tasks, task], isUploading: true })),

  updateTask: (id, updates) =>
    set((state) => ({
      tasks: state.tasks.map((t) => (t.id === id ? { ...t, ...updates } : t)),
    })),

  removeTask: (id) =>
    set((state) => ({
      tasks: state.tasks.filter((t) => t.id !== id),
    })),

  updateProgress: (taskId, providerId, progress) =>
    set((state) => ({
      tasks: state.tasks.map((t) =>
        t.id === taskId
          ? { ...t, progress: { ...t.progress, [providerId]: progress } }
          : t
      ),
    })),

  clearCompleted: () =>
    set((state) => ({
      tasks: state.tasks.filter((t) => t.status !== 'complete'),
      isUploading: state.tasks.some(
        (t) => t.status === 'pending' || t.status === 'uploading'
      ),
    })),

  setUploading: (isUploading) => set({ isUploading }),
}))
