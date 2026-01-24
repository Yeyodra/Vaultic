import { useToastStore } from '@/stores/toastStore'
import { CheckCircle2, XCircle, Info, Loader2, X } from 'lucide-react'
import { cn } from '@/lib/utils'

export function Toaster() {
  const { toasts, removeToast } = useToastStore()

  if (toasts.length === 0) return null

  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 max-w-md">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={cn(
            "flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg border",
            "bg-background text-foreground",
            "animate-in slide-in-from-top-2 duration-300",
            toast.type === 'success' && "border-green-500/50",
            toast.type === 'error' && "border-red-500/50",
            toast.type === 'info' && "border-blue-500/50",
            toast.type === 'loading' && "border-muted"
          )}
        >
          {/* Icon */}
          {toast.type === 'success' && (
            <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0" />
          )}
          {toast.type === 'error' && (
            <XCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
          )}
          {toast.type === 'info' && (
            <Info className="h-5 w-5 text-blue-500 flex-shrink-0" />
          )}
          {toast.type === 'loading' && (
            <Loader2 className="h-5 w-5 text-muted-foreground animate-spin flex-shrink-0" />
          )}

          {/* Message */}
          <p className="flex-1 text-sm font-medium">{toast.message}</p>

          {/* Close button */}
          {toast.type !== 'loading' && (
            <button
              onClick={() => removeToast(toast.id)}
              className="flex-shrink-0 rounded-sm opacity-70 hover:opacity-100 transition-opacity"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      ))}
    </div>
  )
}
