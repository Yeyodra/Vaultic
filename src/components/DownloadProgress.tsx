import { useDownloadStore } from '@/stores/downloadStore'
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
  Download,
} from 'lucide-react'
import { useState } from 'react'
import { cn } from '@/lib/utils'
import { formatFileSize } from '@/utils/format'

export function DownloadProgress() {
  const { tasks, removeTask, clearCompleted } = useDownloadStore()
  const [isExpanded, setIsExpanded] = useState(true)

  const activeTasks = tasks.filter(
    (t) => t.status === 'pending' || t.status === 'downloading'
  )
  const completedTasks = tasks.filter((t) => t.status === 'complete')
  const failedTasks = tasks.filter((t) => t.status === 'failed')

  if (tasks.length === 0) {
    return null
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="h-4 w-4 text-muted-foreground" />
      case 'downloading':
        return <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />
      case 'complete':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />
      case 'failed':
        return <XCircle className="h-4 w-4 text-destructive" />
      default:
        return null
    }
  }

  const getSpeed = (task: typeof tasks[0]) => {
    if (task.status !== 'downloading' || task.downloadedBytes === 0) return null
    const elapsed = (Date.now() - task.startTime) / 1000 // seconds
    if (elapsed === 0) return null
    const speed = task.downloadedBytes / elapsed
    return `${formatFileSize(speed)}/s`
  }

  return (
    <Card className="fixed bottom-4 left-4 w-96 shadow-lg z-50 border-blue-200 dark:border-blue-800">
      <CardHeader className="py-3 cursor-pointer" onClick={() => setIsExpanded(!isExpanded)}>
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            {activeTasks.length > 0 && (
              <Download className="h-4 w-4 text-blue-500" />
            )}
            Download Progress
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
                    task.status === 'complete' && "border-green-500/50 bg-green-500/5",
                    task.status === 'downloading' && "border-blue-500/50 bg-blue-500/5"
                  )}
                >
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2 min-w-0">
                      {getStatusIcon(task.status)}
                      <FileIcon className="h-3 w-3 text-muted-foreground" />
                      <span className="text-sm truncate">{task.fileName}</span>
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

                  {/* Progress Bar */}
                  {(task.status === 'downloading' || task.status === 'pending') && (
                    <div className="mb-1">
                      <div className="flex justify-between text-xs text-muted-foreground mb-1">
                        <span>{task.providerName}</span>
                        <div className="flex gap-2">
                          {getSpeed(task) && (
                            <span className="text-blue-500">{getSpeed(task)}</span>
                          )}
                          <span>{task.progress}%</span>
                        </div>
                      </div>
                      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-blue-500 transition-all duration-300"
                          style={{ width: `${task.progress}%` }}
                        />
                      </div>
                      <div className="flex justify-between text-xs text-muted-foreground mt-1">
                        <span>{formatFileSize(task.downloadedBytes)}</span>
                        <span>{formatFileSize(task.totalBytes)}</span>
                      </div>
                    </div>
                  )}

                  {/* Completed info */}
                  {task.status === 'complete' && (
                    <div className="text-xs text-muted-foreground">
                      {formatFileSize(task.totalBytes)} from {task.providerName}
                    </div>
                  )}

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
