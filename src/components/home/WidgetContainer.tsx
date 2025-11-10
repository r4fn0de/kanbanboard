import { GripVertical } from 'lucide-react'
import { cn } from '@/lib/utils'

interface WidgetContainerProps {
  title: string
  children: React.ReactNode
  className?: string
  onToggle?: () => void
  actionButton?: React.ReactNode
}

export function WidgetContainer({
  title,
  children,
  className,
  onToggle,
  actionButton,
}: WidgetContainerProps) {
  return (
    <section
      className={cn(
        'space-y-4 transition-all duration-200',
        className
      )}
    >
      <div className="flex items-center justify-between group">
        <h2 className="text-lg font-semibold">{title}</h2>
        <div className="flex items-center gap-2">
          {actionButton}
          {onToggle && (
            <button
              onClick={onToggle}
              className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-muted"
              title="Toggle widget visibility"
            >
              <GripVertical className="h-4 w-4 text-muted-foreground" />
            </button>
          )}
        </div>
      </div>
      {children}
    </section>
  )
}
