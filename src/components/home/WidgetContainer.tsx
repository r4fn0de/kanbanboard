import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical } from 'lucide-react'
import { cn } from '@/lib/utils'

interface WidgetContainerProps {
  id: string
  title: string
  children: React.ReactNode
  className?: string
  onToggle?: () => void
  actionButton?: React.ReactNode
}

export function WidgetContainer({
  id,
  title,
  children,
  className,
  onToggle,
  actionButton,
}: WidgetContainerProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <section
      ref={setNodeRef}
      style={style}
      className={cn(
        'space-y-4 transition-all duration-200',
        isDragging && 'opacity-50',
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
          <button
            className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-muted cursor-grab active:cursor-grabbing"
            {...attributes}
            {...listeners}
            title="Drag to reorder"
          >
            <GripVertical className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>
      </div>
      {children}
    </section>
  )
}
