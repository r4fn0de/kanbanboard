import { formatDistanceToNow } from 'date-fns'
import { Link } from 'react-router-dom'
import { AlertCircle } from 'lucide-react'
import { useUpcomingDeadlines } from '@/hooks/useUpcomingDeadlines'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export function DeadlinesSection() {
  const { data: deadlines, isLoading, error } = useUpcomingDeadlines(7)

  if (error) {
    return (
      <div className="text-sm text-red-500">
        Failed to load upcoming deadlines. Please try again.
      </div>
    )
  }

  if (!isLoading && (!deadlines || deadlines.length === 0)) {
    return (
      <div className="text-sm text-muted-foreground">
        No upcoming deadlines in the next 7 days.
      </div>
    )
  }

  return (
    <div className="rounded-lg border bg-card divide-y">
      {isLoading ? (
        // Skeleton loaders
        <div className="space-y-1 p-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex items-start gap-3 animate-pulse">
              <div className="h-10 w-10 bg-muted rounded-full mt-0.5" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-3/4 bg-muted rounded" />
                <div className="h-3 w-1/2 bg-muted rounded" />
              </div>
            </div>
          ))}
        </div>
      ) : (
        deadlines?.map((task) => (
          <div
            key={task.id}
            className={cn(
              'flex items-start gap-3 p-4 transition-colors',
              task.is_overdue
                ? 'bg-red-50 dark:bg-red-950/20'
                : task.days_until <= 1
                ? 'bg-yellow-50 dark:bg-yellow-950/20'
                : 'hover:bg-muted/50'
            )}
          >
            <div
              className={cn(
                'p-2 rounded-full mt-0.5',
                task.is_overdue
                  ? 'bg-red-100 dark:bg-red-900'
                  : task.days_until <= 1
                  ? 'bg-yellow-100 dark:bg-yellow-900'
                  : 'bg-blue-100 dark:bg-blue-900'
              )}
            >
              <AlertCircle
                className={cn(
                  'h-4 w-4',
                  task.is_overdue
                    ? 'text-red-600 dark:text-red-400'
                    : task.days_until <= 1
                    ? 'text-yellow-600 dark:text-yellow-400'
                    : 'text-blue-600 dark:text-blue-400'
                )}
              />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm">{task.title}</p>
              <p className="text-xs text-muted-foreground">
                {task.board_name}
              </p>
              <p className="text-xs mt-1">
                {task.is_overdue ? (
                  <span className="text-red-600 dark:text-red-400 font-medium">
                    OVERDUE by{' '}
                    {formatDistanceToNow(new Date(task.deadline), {
                      addSuffix: true,
                    })}
                  </span>
                ) : (
                  <span>
                    Due{' '}
                    {task.days_until === 0
                      ? 'today'
                      : task.days_until === 1
                      ? 'tomorrow'
                      : `in ${task.days_until} days`}
                  </span>
                )}
              </p>
            </div>
          </div>
        ))
      )}
    </div>
  )
}
