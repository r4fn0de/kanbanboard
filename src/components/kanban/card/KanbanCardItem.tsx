import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Badge } from '@/components/ui/badge'
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from '@/components/ui/context-menu'
import { cn } from '@/lib/utils'
import type { KanbanCard } from '@/types/common'
import {
  ArrowDown,
  ArrowUp,
  Minus,
  Paperclip,
  Trash2,
  Calendar,
} from 'lucide-react'
import type { ComponentType } from 'react'
import * as React from 'react'
import { formatCardDueDate } from '../views/card-date'
import { getTagBadgeStyle } from '../tags/utils'

interface KanbanCardItemProps {
  card: KanbanCard
  onSelect?: (card: KanbanCard) => void
  isSelected: boolean
  onDelete?: (card: KanbanCard) => void
  maxVisibleTags?: number
}

const PRIORITY_CONFIG: Record<
  KanbanCard['priority'],
  {
    label: string
    className: string
    icon: ComponentType<{ className?: string }>
  }
> = {
  low: {
    label: 'Low',
    className: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400',
    icon: ArrowDown,
  },
  medium: {
    label: 'Medium',
    className: 'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400',
    icon: Minus,
  },
  high: {
    label: 'High',
    className: 'bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-400',
    icon: ArrowUp,
  },
}

export function KanbanCardItem({
  card,
  onSelect,
  isSelected,
  onDelete,
  maxVisibleTags = 3,
}: KanbanCardItemProps) {
  const [isDeleting, setIsDeleting] = React.useState(false)
  
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: `card-${card.id}` })

  const style: React.CSSProperties = {
    transform: transform ? CSS.Transform.toString(transform) : undefined,
    transition: isDragging
      ? 'none'
      : (transition ?? 'transform 220ms cubic-bezier(0.2, 0, 0, 1)'),
    opacity: isDragging ? 0.4 : undefined,
    cursor: isDragging ? 'grabbing' : 'grab',
    willChange: 'transform',
    zIndex: isDragging ? 30 : undefined,
  }

  const tagList = card.tags ?? []
  const displayTags = tagList.slice(0, maxVisibleTags)
  const remainingTags = tagList.length - displayTags.length
  const dueDateLabel = formatCardDueDate(card.dueDate)
  const hasAttachments = card.attachments && card.attachments.length > 0
  const priorityConfig = PRIORITY_CONFIG[card.priority]
  const PriorityIcon = priorityConfig.icon

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <button
          type="button"
          ref={setNodeRef}
          style={style}
          {...attributes}
          {...listeners}
          onClick={() => onSelect?.(card)}
          aria-pressed={isSelected}
          aria-expanded={isSelected}
          aria-controls="task-details-panel"
          className={cn(
            'group/card relative w-full flex flex-col gap-4 rounded-2xl border bg-card p-4 text-left',
            'transition-all duration-200',
            'hover:shadow-md hover:border-border/80',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
            'active:cursor-grabbing',
            isSelected && 'bg-accent/50 border-accent-foreground/20 shadow-sm',
            isDragging && 'shadow-xl border-primary/30'
          )}
        >
          {/* Header: Tags */}
          {tagList.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5">
              {displayTags.map(tag => {
                const badgeStyle = getTagBadgeStyle(tag)
                return (
                  <Badge
                    key={tag.id}
                    variant="secondary"
                    className="rounded-lg px-2.5 py-0.5 text-xs font-medium"
                    style={
                      tag.color
                        ? {
                            backgroundColor: `${tag.color}30`,
                            color: badgeStyle?.color,
                          }
                        : undefined
                    }
                  >
                    {tag.label}
                  </Badge>
                )
              })}
              {remainingTags > 0 && (
                <Badge
                  variant="secondary"
                  className="rounded-lg px-2.5 py-0.5 text-xs font-medium"
                >
                  +{remainingTags}
                </Badge>
              )}
            </div>
          )}

          {/* Content: Title & Description */}
          <div className="flex flex-col gap-2">
            <h3 className="text-base font-semibold leading-tight text-foreground line-clamp-2">
              {card.title}
            </h3>
            {card.description && (
              <p className="text-sm leading-relaxed text-muted-foreground line-clamp-2">
                {card.description}
              </p>
            )}
          </div>

          {/* Footer: Metadata */}
          <div className="flex items-center gap-2 flex-wrap pt-1 border-t border-border/50">
            {/* Priority Badge */}
            <div
              className={cn(
                'inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium',
                priorityConfig.className
              )}
            >
              <PriorityIcon className="h-3 w-3" />
              <span>{priorityConfig.label}</span>
            </div>

            {/* Due Date */}
            {dueDateLabel && (
              <div className="inline-flex items-center gap-1.5 rounded-lg bg-muted/50 px-2.5 py-1 text-xs font-medium text-foreground">
                <Calendar className="h-3 w-3" />
                <span>{dueDateLabel}</span>
              </div>
            )}

            {/* Attachments */}
            {hasAttachments && (
              <div className="inline-flex items-center gap-1.5 rounded-lg bg-blue-100 px-2.5 py-1 text-xs font-medium text-blue-700 dark:bg-blue-950/50 dark:text-blue-400">
                <Paperclip className="h-3 w-3" />
                <span>{card.attachments?.length}</span>
              </div>
            )}
          </div>
        </button>
      </ContextMenuTrigger>
      <ContextMenuContent>
        <ContextMenuItem
          variant="destructive"
          disabled={isDeleting}
          onSelect={async () => {
            if (isDeleting) return
            setIsDeleting(true)
            try {
              await onDelete?.(card)
            } finally {
              // Reset after a delay to prevent rapid clicks
              setTimeout(() => setIsDeleting(false), 1000)
            }
          }}
        >
          <Trash2 className="h-4 w-4" />
          {isDeleting ? 'Deleting...' : 'Delete task'}
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  )
}
