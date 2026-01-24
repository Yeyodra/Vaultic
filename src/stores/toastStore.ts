import { create } from 'zustand'

interface Toast {
  id: string
  message: string
  type: 'success' | 'error' | 'info' | 'loading'
  duration?: number
}

interface ToastState {
  toasts: Toast[]
  addToast: (toast: Omit<Toast, 'id'>) => string
  removeToast: (id: string) => void
  updateToast: (id: string, updates: Partial<Toast>) => void
}

export const useToastStore = create<ToastState>((set) => ({
  toasts: [],
  
  addToast: (toast) => {
    const id = crypto.randomUUID()
    set((state) => ({
      toasts: [...state.toasts, { ...toast, id }],
    }))
    
    // Auto remove after duration
    if (toast.type !== 'loading') {
      setTimeout(() => {
        set((state) => ({
          toasts: state.toasts.filter((t) => t.id !== id),
        }))
      }, toast.duration || 3000)
    }
    
    return id
  },
  
  removeToast: (id) =>
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    })),
    
  updateToast: (id, updates) =>
    set((state) => ({
      toasts: state.toasts.map((t) =>
        t.id === id ? { ...t, ...updates } : t
      ),
    })),
}))

// Helper functions for easy usage
export const toast = {
  success: (message: string, duration?: number) =>
    useToastStore.getState().addToast({ message, type: 'success', duration }),
  
  error: (message: string, duration?: number) =>
    useToastStore.getState().addToast({ message, type: 'error', duration }),
  
  info: (message: string, duration?: number) =>
    useToastStore.getState().addToast({ message, type: 'info', duration }),
  
  loading: (message: string) =>
    useToastStore.getState().addToast({ message, type: 'loading' }),
  
  dismiss: (id: string) =>
    useToastStore.getState().removeToast(id),
  
  updateToast: (id: string, updates: Partial<Toast>) =>
    useToastStore.getState().updateToast(id, updates),
  
  promise: async <T,>(
    promise: Promise<T>,
    messages: {
      loading: string
      success: string
      error: string
    }
  ): Promise<T> => {
    const id = useToastStore.getState().addToast({
      message: messages.loading,
      type: 'loading',
    })
    
    try {
      const result = await promise
      useToastStore.getState().updateToast(id, {
        message: messages.success,
        type: 'success',
      })
      setTimeout(() => useToastStore.getState().removeToast(id), 3000)
      return result
    } catch (error) {
      useToastStore.getState().updateToast(id, {
        message: messages.error,
        type: 'error',
      })
      setTimeout(() => useToastStore.getState().removeToast(id), 3000)
      throw error
    }
  },
}
