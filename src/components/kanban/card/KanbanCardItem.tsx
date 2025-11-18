import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Badge } from '@/components/ui/badge'
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from '@/components/ui/context-menu'
import { useTheme } from '@/hooks/use-theme'
import { cn } from '@/lib/utils'
import type { KanbanCard } from '@/types/common'
import {
  Trash2,
  Copy,
} from 'lucide-react'
import { PaperclipIcon, PriorityLowIcon, PriorityMediumIcon, PriorityHighIcon, CalendarIcon } from '@/components/ui/icons'
import type { ComponentType } from 'react'
import * as React from 'react'
import {
  CARD_DUE_STATUS_STYLES,
  getCardDueMetadata,
} from '../views/card-date'
import { getTagBadgeStyle } from '../tags/utils'

interface KanbanCardItemProps {
  card: KanbanCard
  onSelect?: (card: KanbanCard) => void
  isSelected: boolean
  onDelete?: (card: KanbanCard) => void
  onDuplicate?: (card: KanbanCard) => void
  maxVisibleTags?: number
  showSubtasksSummary?: boolean
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
    className:
      'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400',
    icon: PriorityLowIcon,
  },
  medium: {
    label: 'Medium',
    className:
      'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400',
    icon: PriorityMediumIcon,
  },
  high: {
    label: 'High',
    className:
      'bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-400',
    icon: PriorityHighIcon,
  },
}

export function KanbanCardItem({
  card,
  onSelect,
  isSelected,
  onDelete,
  onDuplicate,
  maxVisibleTags = 3,
  showSubtasksSummary = true,
}: KanbanCardItemProps) {
  const [isDeleting, setIsDeleting] = React.useState(false)
  const [isDuplicating, setIsDuplicating] = React.useState(false)
  const { theme } = useTheme()
  const isDarkMode =
    theme === 'dark' ||
    (typeof window !== 'undefined' &&
      window.matchMedia('(prefers-color-scheme: dark)')?.matches &&
      theme === 'system')

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    isDragging,
  } = useSortable({
    id: `card-${card.id}`,
    animateLayoutChanges: () => false,
  })

  const style: React.CSSProperties = {
    transform: transform ? CSS.Transform.toString(transform) : undefined,
    transition: 'none',
    opacity: isDragging ? 0 : undefined,
    cursor: isDragging ? 'grabbing' : 'grab',
    willChange: 'transform',
    zIndex: isDragging ? 30 : undefined,
  }

  const tagList = card.tags ?? []
  const displayTags = tagList.slice(0, maxVisibleTags)
  const remainingTags = tagList.length - displayTags.length
  const dueMetadata = getCardDueMetadata(card.dueDate)
  const hasAttachments = card.attachments && card.attachments.length > 0
  const priorityConfig = PRIORITY_CONFIG[card.priority]
  const PriorityIcon = priorityConfig.icon

  const subtasks = card.subtasks ?? []
  const totalSubtasks = subtasks.length
  const completedSubtasks = subtasks.filter(subtask => subtask.isCompleted).length

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
            'group/card relative w-full flex flex-col gap-4 rounded-2xl border border-border/60 bg-background/95 p-4 text-left',
            'transition-all duration-200',
            'hover:border-border',
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
                const badgeStyle = getTagBadgeStyle(tag, isDarkMode)
                return (
                  <Badge
                    key={tag.id}
                    variant="secondary"
                    className="rounded-lg px-2.5 py-0.5 text-xs font-semibold"
                    style={badgeStyle}
                  >
                    {tag.label}
                  </Badge>
                )
              })}
              {remainingTags > 0 && (
                <Badge
                  variant="secondary"
                  className="rounded-lg px-2.5 py-0.5 text-xs font-semibold"
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
                'inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold',
                priorityConfig.className
              )}
            >
              <PriorityIcon className="h-3 w-3" />
              <span>{priorityConfig.label}</span>
            </div>

            {/* Due Date */}
            {dueMetadata && (
              <Badge
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold',
                  CARD_DUE_STATUS_STYLES[dueMetadata.status]
                )}
              >
                <CalendarIcon className="h-3 w-3" />
                <span>{dueMetadata.display}</span>
              </Badge>
            )}

            {hasAttachments && (
              <div className="inline-flex items-center gap-1.5 rounded-lg bg-blue-100 px-2.5 py-1 text-xs font-semibold text-blue-700 dark:bg-blue-950/50 dark:text-blue-400">
                <PaperclipIcon className="h-3 w-3 scale-x-[-1]" />
                <span>{card.attachments?.length}</span>
              </div>
            )}

            {showSubtasksSummary && totalSubtasks > 0 && (
              <div className="inline-flex items-center gap-1.5 rounded-lg bg-muted px-2.5 py-1 text-xs font-semibold text-muted-foreground">
                <span>
                  {completedSubtasks}/{totalSubtasks} subtasks
                </span>
              </div>
            )}
          </div>
        </button>
      </ContextMenuTrigger>
      <ContextMenuContent>
        <ContextMenuItem
          disabled={isDuplicating}
          onSelect={async () => {
            if (isDuplicating) return
            setIsDuplicating(true)
            try {
              await onDuplicate?.(card)
            } finally {
              setTimeout(() => setIsDuplicating(false), 1000)
            }
          }}
        >
          <Copy className="h-4 w-4" />
          {isDuplicating ? 'Duplicating...' : 'Duplicate task'}
        </ContextMenuItem>
        <ContextMenuItem
          variant="destructive"
          disabled={isDeleting}
          onSelect={async () => {
            if (isDeleting) return
            setIsDeleting(true)
            try {
              await onDelete?.(card)
            } finally {
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
