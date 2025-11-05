import { cn } from '@/lib/utils'

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'text' | 'circular' | 'card' | 'rectangular'
  width?: string | number
  height?: string | number
  lines?: number
}

export function Skeleton({
  className,
  variant = 'default',
  width,
  height,
  lines = 1,
  ...props
}: SkeletonProps) {
  const baseClasses = 'animate-pulse bg-muted'

  const variantClasses = {
    default: 'rounded',
    text: 'rounded h-4',
    circular: 'rounded-full',
    card: 'rounded-lg',
    rectangular: 'rounded-sm',
  }

  const style: React.CSSProperties = {}
  if (width) style.width = typeof width === 'number' ? `${width}px` : width
  if (height) style.height = typeof height === 'number' ? `${height}px` : height

  if (variant === 'text' && lines > 1) {
    return (
      <div className="space-y-2">
        {Array.from({ length: lines }).map((_, i) => (
          <div
            key={i}
            className={cn(baseClasses, variantClasses[variant], className)}
            style={style}
            {...props}
          />
        ))}
      </div>
    )
  }

  return (
    <div
      className={cn(baseClasses, variantClasses[variant], className)}
      style={style}
      {...props}
    />
  )
}

// Specialized skeleton components
export function StatsCardSkeleton() {
  return (
    <div className="rounded-lg border bg-card p-4 space-y-2">
      <div className="flex items-center justify-between">
        <Skeleton variant="circular" width={20} height={20} />
        <Skeleton variant="text" width={40} height={16} />
      </div>
      <Skeleton variant="text" width={60} height={32} />
      <Skeleton variant="text" width={100} height={16} />
      <Skeleton width="100%" height={4} />
    </div>
  )
}

export function ProjectCardSkeleton() {
  return (
    <div className="rounded-lg border bg-card p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Skeleton variant="circular" width={40} height={40} />
        <div className="space-y-2 flex-1">
          <Skeleton width="60%" height={16} />
          <Skeleton width="40%" height={12} />
        </div>
      </div>
      <div className="space-y-1">
        <div className="flex justify-between">
          <Skeleton variant="text" width={60} height={12} />
          <Skeleton variant="text" width={40} height={12} />
        </div>
        <Skeleton width="100%" height={6} />
      </div>
    </div>
  )
}

export function ActivityItemSkeleton() {
  return (
    <div className="flex items-start gap-3 p-3">
      <Skeleton variant="circular" width={32} height={32} />
      <div className="flex-1 space-y-2">
        <Skeleton width="80%" height={16} />
        <Skeleton width="30%" height={12} />
      </div>
    </div>
  )
}

export function DashboardSkeleton() {
  return (
    <div className="space-y-8">
      {/* Overview Section Skeleton */}
      <div className="space-y-4">
        <Skeleton width={120} height={24} />
        <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <StatsCardSkeleton key={i} />
          ))}
        </div>
      </div>

      {/* Quick Actions Skeleton */}
      <div className="space-y-4">
        <Skeleton width={140} height={24} />
        <div className="grid gap-3 grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="rounded-lg border bg-card p-4 space-y-2">
              <Skeleton width={24} height={24} />
              <Skeleton width="80%" height={16} />
              <Skeleton width="60%" height={12} />
            </div>
          ))}
        </div>
      </div>

      {/* Favorites Section Skeleton */}
      <div className="space-y-4">
        <div className="flex justify-between">
          <Skeleton width={180} height={24} />
          <Skeleton width={80} height={32} />
        </div>
        <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <ProjectCardSkeleton key={i} />
          ))}
        </div>
      </div>

      {/* Activity Section Skeleton */}
      <div className="space-y-4">
        <div className="flex justify-between">
          <Skeleton width={150} height={24} />
          <Skeleton width={80} height={32} />
        </div>
        <div className="rounded-lg border bg-card divide-y">
          {Array.from({ length: 5 }).map((_, i) => (
            <ActivityItemSkeleton key={i} />
          ))}
        </div>
      </div>
    </div>
  )
}
