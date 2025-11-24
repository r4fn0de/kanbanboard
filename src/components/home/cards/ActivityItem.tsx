import { formatDistanceToNow } from 'date-fns'
import { Folder } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Activity } from '@/hooks/useRecentActivity'

interface ActivityItemProps {
  activity: Activity
  onClick?: () => void
}

export function ActivityItem({ activity, onClick }: ActivityItemProps) {
  const getActivityMessage = () => {
    switch (activity.activity_type) {
      case 'card_created':
        return 'created'
      case 'card_updated':
        return 'updated'
      case 'board_created':
        return 'created board'
      default:
        return activity.activity_type
    }
  }

  const getRelativeTime = () => {
    try {
      return formatDistanceToNow(new Date(activity.timestamp), {
        addSuffix: true,
      })
    } catch {
      return 'recently'
    }
  }

  return (
    <div
      onClick={onClick}
      className={cn(
        'flex items-start gap-3 p-3 rounded-lg cursor-pointer transition-all duration-200',
        'hover:bg-muted/50'
      )}
    >
      <div className="p-2 rounded-lg bg-primary/10 mt-0.5">
        <Folder className="h-4 w-4 text-primary" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm">
          <span className="font-medium">{activity.title}</span>{' '}
          <span className="text-muted-foreground">
            {getActivityMessage()} in {activity.board_name}
          </span>
        </p>
        <p className="text-xs text-muted-foreground mt-0.5">
          {getRelativeTime()}
        </p>
      </div>
    </div>
  )
}
