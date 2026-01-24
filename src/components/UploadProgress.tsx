import { useUploadStore } from '@/stores/uploadStore'
import { useProviderStore } from '@/stores/providerStore'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  X,
  CheckCircle2,
  XCircle,
  Loader2,
  Clock,
  FileIcon,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'
import { useState } from 'react'
import { cn } from '@/lib/utils'

export function UploadProgress() {
  const { tasks, removeTask, clearCompleted } = useUploadStore()
  const { providers } = useProviderStore()
  const [isExpanded, setIsExpanded] = useState(true)

  const activeTasks = tasks.filter(
    (t) => t.status === 'pending' || t.status === 'uploading'
  )
  const completedTasks = tasks.filter((t) => t.status === 'complete')
  const failedTasks = tasks.filter((t) => t.status === 'failed')

  if (tasks.length === 0) {
    return null
  }

  const getProviderName = (providerId: string) => {
    return providers.find((p) => p.id === providerId)?.name || providerId
  }

  const getOverallProgress = (progress: Record<string, number>) => {
    const values = Object.values(progress)
    if (values.length === 0) return 0
    return Math.round(values.reduce((a, b) => a + b, 0) / values.length)
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="h-4 w-4 text-muted-foreground" />
      case 'uploading':
        return <Loader2 className="h-4 w-4 text-primary animate-spin" />
      case 'complete':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />
      case 'failed':
        return <XCircle className="h-4 w-4 text-destructive" />
      default:
        return null
    }
  }

  return (
    <Card className="fixed bottom-4 right-4 w-96 shadow-lg z-50">
      <CardHeader className="py-3 cursor-pointer" onClick={() => setIsExpanded(!isExpanded)}>
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            {activeTasks.length > 0 && (
              <Loader2 className="h-4 w-4 animate-spin" />
            )}
            Upload Progress
            <span className="text-muted-foreground font-normal">
              ({activeTasks.length} active, {completedTasks.length} done, {failedTasks.length} failed)
            </span>
          </CardTitle>
          <Button variant="ghost" size="icon" className="h-6 w-6">
            {isExpanded ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronUp className="h-4 w-4" />
            )}
          </Button>
        </div>
      </CardHeader>

      {isExpanded && (
        <CardContent className="py-0 pb-3">
          <ScrollArea className="max-h-64">
            <div className="space-y-2">
              {tasks.map((task) => (
                <div
                  key={task.id}
                  className={cn(
                    "p-2 rounded-lg border",
                    task.status === 'failed' && "border-destructive/50 bg-destructive/5",
                    task.status === 'complete' && "border-green-500/50 bg-green-500/5"
                  )}
                >
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2 min-w-0">
                      {getStatusIcon(task.status)}
                      <FileIcon className="h-3 w-3 text-muted-foreground" />
                      <span className="text-sm truncate">{task.localPath}</span>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-5 w-5 flex-shrink-0"
                      onClick={() => removeTask(task.id)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>

                  {/* Overall Progress Bar */}
                  {(task.status === 'uploading' || task.status === 'pending') && (
                    <div className="mb-2">
                      <div className="flex justify-between text-xs text-muted-foreground mb-1">
                        <span>Overall</span>
                        <span>{getOverallProgress(task.progress)}%</span>
                      </div>
                      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary transition-all duration-300"
                          style={{ width: `${getOverallProgress(task.progress)}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Per-Provider Progress */}
                  <div className="space-y-1">
                    {task.targetProviders.map((providerId) => (
                      <div key={providerId} className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground w-24 truncate">
                          {getProviderName(providerId)}
                        </span>
                        <div className="flex-1 h-1 bg-muted rounded-full overflow-hidden">
                          <div
                            className={cn(
                              "h-full transition-all duration-300",
                              task.progress[providerId] === 100
                                ? "bg-green-500"
                                : "bg-primary"
                            )}
                            style={{ width: `${task.progress[providerId] || 0}%` }}
                          />
                        </div>
                        <span className="text-xs w-8 text-right">
                          {task.progress[providerId] || 0}%
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Error Message */}
                  {task.error && (
                    <p className="text-xs text-destructive mt-1">{task.error}</p>
                  )}
                </div>
              ))}
            </div>
          </ScrollArea>

          {/* Actions */}
          {completedTasks.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              className="w-full mt-2"
              onClick={clearCompleted}
            >
              Clear completed
            </Button>
          )}
        </CardContent>
      )}
    </Card>
  )
}
