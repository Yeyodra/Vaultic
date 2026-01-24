import { create } from 'zustand'
import type { FileMetadata } from '@/api/types'

interface FileState {
  files: FileMetadata[]
  currentPath: string
  selectedFiles: string[]
  isLoading: boolean

  setFiles: (files: FileMetadata[]) => void
  setCurrentPath: (path: string) => void
  selectFile: (key: string) => void
  deselectFile: (key: string) => void
  toggleFileSelection: (key: string) => void
  selectAllFiles: () => void
  clearSelection: () => void
  setLoading: (loading: boolean) => void
}

export const useFileStore = create<FileState>((set, get) => ({
  files: [],
  currentPath: '/',
  selectedFiles: [],
  isLoading: false,

  setFiles: (files) => set({ files }),

  setCurrentPath: (currentPath) => set({ currentPath, selectedFiles: [] }),

  selectFile: (key) =>
    set((state) => ({
      selectedFiles: state.selectedFiles.includes(key)
        ? state.selectedFiles
        : [...state.selectedFiles, key],
    })),

  deselectFile: (key) =>
    set((state) => ({
      selectedFiles: state.selectedFiles.filter((k) => k !== key),
    })),

  toggleFileSelection: (key) => {
    const { selectedFiles } = get()
    if (selectedFiles.includes(key)) {
      set({ selectedFiles: selectedFiles.filter((k) => k !== key) })
    } else {
      set({ selectedFiles: [...selectedFiles, key] })
    }
  },

  selectAllFiles: () =>
    set((state) => ({
      selectedFiles: state.files.map((f) => f.key),
    })),

  clearSelection: () => set({ selectedFiles: [] }),

  setLoading: (isLoading) => set({ isLoading }),
}))
