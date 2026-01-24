import { useToastStore } from '@/stores/toastStore'
import { CheckCircle2, XCircle, Info, Loader2, X } from 'lucide-react'
import { cn } from '@/lib/utils'

export function Toaster() {
  const { toasts, removeToast } = useToastStore()

  if (toasts.length === 0) return null

  return (
    <div className="fixed bottom-6 right-6 z-[100] flex flex-col gap-2 w-full max-w-[356px]">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={cn(
            "group flex items-center gap-3 p-4 rounded-xl shadow-lg border transition-all duration-300 ease-out",
            "bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800",
            "animate-in slide-in-from-right-full fade-in duration-300",
            "hover:shadow-md"
          )}
        >
          {/* Icon Section */}
          <div className="flex-shrink-0">
            {toast.type === 'success' && (
              <div className="h-8 w-8 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-500" />
              </div>
            )}
            {toast.type === 'error' && (
              <div className="h-8 w-8 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                <XCircle className="h-5 w-5 text-red-600 dark:text-red-500" />
              </div>
            )}
            {toast.type === 'info' && (
              <div className="h-8 w-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                <Info className="h-5 w-5 text-blue-600 dark:text-blue-500" />
              </div>
            )}
            {toast.type === 'loading' && (
              <div className="h-8 w-8 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center">
                <Loader2 className="h-5 w-5 text-zinc-600 dark:text-zinc-400 animate-spin" />
              </div>
            )}
          </div>

          {/* Content Section */}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 leading-tight">
              {toast.type === 'loading' ? 'Working on it...' : 
               toast.type === 'success' ? 'Success' : 
               toast.type === 'error' ? 'Error' : 'Info'}
            </p>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-0.5 truncate leading-tight">
              {toast.message}
            </p>
          </div>

          {/* Close Button */}
          {toast.type !== 'loading' && (
            <button
              onClick={() => removeToast(toast.id)}
              className="flex-shrink-0 p-1 rounded-md text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      ))}
    </div>
  )
}
