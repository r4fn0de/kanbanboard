import { useRecentActivity } from '@/hooks/useRecentActivity'
import { ActivityItem } from '../cards/ActivityItem'

export function ActivitySection() {
  const { data: activities, isLoading, error } = useRecentActivity(5)

  if (error) {
    return (
      <div className="text-sm text-red-500">
        Failed to load recent activity. Please try again.
      </div>
    )
  }

  if (!isLoading && (!activities || activities.length === 0)) {
    return (
      <div className="text-sm text-muted-foreground">
        No recent activity. Start creating tasks to see activity here!
      </div>
    )
  }

  return (
    <div className="rounded-lg border bg-card">
      {isLoading ? (
        // Skeleton loaders
        <div className="space-y-1">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-start gap-3 p-3 animate-pulse">
              <div className="h-8 w-8 bg-muted rounded-lg mt-0.5" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-3/4 bg-muted rounded" />
                <div className="h-3 w-1/4 bg-muted rounded" />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="divide-y">
          {activities?.map(activity => (
            <ActivityItem key={activity.id} activity={activity} />
          ))}
        </div>
      )}
    </div>
  )
}
