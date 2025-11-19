import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Badge } from '@/components/ui/badge'
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
  ContextMenuSeparator,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
} from '@/components/ui/context-menu'
import { useTheme } from '@/hooks/use-theme'
import { cn } from '@/lib/utils'
import type { KanbanCard } from '@/types/common'
import { Trash2, Copy, Eye, Circle, Check, Tag, Plus } from 'lucide-react'
import { PaperclipIcon, PriorityIcon, PriorityLowIcon, PriorityMediumIcon, PriorityHighIcon, CalendarIcon } from '@/components/ui/icons'
import { useTags, useUpdateCardTags, useCreateTag, useUpdateCard } from '@/services/kanban'
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
  onQuickMoveToNext?: () => void
  onQuickMarkDone?: () => void
  onChangePriority?: (priority: KanbanCard['priority']) => void
  moveColumnOptions?: {
    id: string
    title: string
    icon?: ComponentType<{ className?: string }>
  }[]
  onMoveToColumn?: (columnId: string) => void
}

const PRIORITY_CONFIG: Record<
  KanbanCard['priority'],
  {
    label: string
    className: string
    icon: ComponentType<{ className?: string }>
  }
> = {
  none: {
    label: 'No priority',
    className:
      'bg-muted text-muted-foreground dark:bg-muted/40 dark:text-muted-foreground',
    icon: PriorityIcon,
  },
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

const TAG_COLOR_MENU: { value: string | null; label: string }[] = [
  { value: null, label: 'No color' },
  { value: '#f97316', label: 'Orange' },
  { value: '#ef4444', label: 'Red' },
  { value: '#f59e0b', label: 'Amber' },
  { value: '#10b981', label: 'Green' },
  { value: '#0ea5e9', label: 'Sky' },
  { value: '#6366f1', label: 'Indigo' },
  { value: '#8b5cf6', label: 'Violet' },
  { value: '#ec4899', label: 'Pink' },
  { value: '#64748b', label: 'Slate' },
]

export function KanbanCardItem({
  card,
  onSelect,
  isSelected,
  onDelete,
  onDuplicate,
  maxVisibleTags = 3,
  showSubtasksSummary = true,
  onQuickMoveToNext,
  onQuickMarkDone,
  onChangePriority,
  moveColumnOptions,
  onMoveToColumn,
}: KanbanCardItemProps) {
  const [isDeleting, setIsDeleting] = React.useState(false)
  const [isDuplicating, setIsDuplicating] = React.useState(false)
  const [tagQuery, setTagQuery] = React.useState('')
  const [dueQuery, setDueQuery] = React.useState('')
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

  const { data: boardTags = [] } = useTags(card.boardId)
  const updateCardTagsMutation = useUpdateCardTags(card.boardId)
  const createTagMutation = useCreateTag()
  const updateCard = useUpdateCard(card.boardId)

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

  const cardTagIds = React.useMemo(
    () => (card.tags ?? []).map(tag => tag.id),
    [card.tags]
  )

  const trimmedTagQuery = tagQuery.trim()

  const showCreateTagOption = React.useMemo(() => {
    if (!trimmedTagQuery) return false
    const q = trimmedTagQuery.toLowerCase()
    return !boardTags.some(tag => tag.label.toLowerCase() === q)
  }, [boardTags, trimmedTagQuery])

  const filteredTags = React.useMemo(() => {
    const q = tagQuery.trim().toLowerCase()
    if (!q) return boardTags
    return boardTags.filter(tag =>
      tag.label.toLowerCase().includes(q)
    )
  }, [boardTags, tagQuery])

  const handleToggleTag = React.useCallback(
    (tagId: string) => {
      if (!card.boardId) return

      const isSelected = cardTagIds.includes(tagId)
      const nextTagIds = isSelected
        ? cardTagIds.filter(id => id !== tagId)
        : [...cardTagIds, tagId]

      updateCardTagsMutation.mutate({
        cardId: card.id,
        boardId: card.boardId,
        tagIds: nextTagIds,
      })
    },
    [card.boardId, card.id, cardTagIds, updateCardTagsMutation]
  )

  const handleCreateTagFromMenu = React.useCallback(
    async (label: string, color: string | null) => {
      const trimmed = label.trim()
      if (!trimmed || !card.boardId) return

      try {
        const id =
          globalThis.crypto?.randomUUID?.() ?? `tag-${Date.now().toString(36)}`

        const newTag = await createTagMutation.mutateAsync({
          id,
          boardId: card.boardId,
          label: trimmed,
          color,
        })

        const nextTagIds = cardTagIds.includes(newTag.id)
          ? cardTagIds
          : [...cardTagIds, newTag.id]

        updateCardTagsMutation.mutate({
          cardId: card.id,
          boardId: card.boardId,
          tagIds: nextTagIds,
        })

        setTagQuery('')
      } catch (error) {
        console.error('Failed to create tag from context menu', error)
      }
    },
    [card.boardId, card.id, cardTagIds, createTagMutation, updateCardTagsMutation]
  )

  const parseDueDateInput = React.useCallback((raw: string): string | null | undefined => {
    const input = raw.trim()
    if (!input) return null

    const now = new Date()
    const base = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const lower = input.toLowerCase()

    const toIsoDate = (date: Date) => date.toISOString().split('T')[0]

    // keywords
    if (lower === 'today' || lower === 'hoje') {
      return toIsoDate(base)
    }
    if (lower === 'tomorrow' || lower === 'amanha' || lower === 'amanhã') {
      const d = new Date(base)
      d.setDate(d.getDate() + 1)
      return toIsoDate(d)
    }

    if (
      lower === 'next week' ||
      lower === 'nextweek' ||
      lower === 'próxima semana' ||
      lower === 'proxima semana'
    ) {
      const d = new Date(base)
      d.setDate(d.getDate() + 7)
      return toIsoDate(d)
    }

    const hoursMatch = lower.match(/^(\d+)\s*(h|hour|hours|hora|horas)$/)
    if (hoursMatch) {
      const hours = Number(hoursMatch[1])
      if (!Number.isNaN(hours) && hours > 0) {
        const d = new Date(now.getTime() + hours * 60 * 60 * 1000)
        const rounded = new Date(d.getFullYear(), d.getMonth(), d.getDate())
        return toIsoDate(rounded)
      }
    }

    const daysMatch = lower.match(/^(\d+)\s*(d|day|days|dia|dias)$/)
    if (daysMatch) {
      const days = Number(daysMatch[1])
      if (!Number.isNaN(days) && days > 0) {
        const d = new Date(base)
        d.setDate(d.getDate() + days)
        return toIsoDate(d)
      }
    }

    const weeksMatch = lower.match(/^(\d+)\s*(w|week|weeks|semana|semanas)$/)
    if (weeksMatch) {
      const weeks = Number(weeksMatch[1])
      if (!Number.isNaN(weeks) && weeks > 0) {
        const d = new Date(base)
        d.setDate(d.getDate() + weeks * 7)
        return toIsoDate(d)
      }
    }

    if (
      lower === 'next month' ||
      lower === 'nextmonth' ||
      lower === 'proximo mes' ||
      lower === 'proximo mês' ||
      lower === 'próximo mes' ||
      lower === 'próximo mês'
    ) {
      const d = new Date(base)
      d.setMonth(d.getMonth() + 1)
      return toIsoDate(d)
    }

    // "in 2 days", "in 3 weeks", "in 5 months" (en)
    const inMatch = lower.match(/^in\s+(\d+)\s+(day|days|week|weeks|month|months)$/)
    if (inMatch) {
      const amount = Number(inMatch[1])
      const unit = inMatch[2]
      if (!Number.isNaN(amount) && amount > 0) {
        const d = new Date(base)
        if (unit === 'day' || unit === 'days') {
          d.setDate(d.getDate() + amount)
        } else if (unit === 'week' || unit === 'weeks') {
          d.setDate(d.getDate() + amount * 7)
        } else if (unit === 'month' || unit === 'months') {
          d.setMonth(d.getMonth() + amount)
        }
        return toIsoDate(d)
      }
    }

    // "day after tomorrow"
    if (lower === 'day after tomorrow') {
      const d = new Date(base)
      d.setDate(d.getDate() + 2)
      return toIsoDate(d)
    }

    // direct ISO date
    if (/^\d{4}-\d{2}-\d{2}$/.test(input)) {
      const d = new Date(input)
      if (!Number.isNaN(d.getTime())) {
        return toIsoDate(d)
      }
    }

    // fallback: let Date parse things like "Feb 9", "9 Feb"
    const parsed = new Date(input)
    if (!Number.isNaN(parsed.getTime())) {
      return toIsoDate(parsed)
    }

    return null
  }, [])

  const applyDueDate = React.useCallback(
    (date: Date | null | undefined) => {
      if (!card.boardId) return

      if (!date) {
        // Clear due date explicitly
        updateCard.mutate({
          id: card.id,
          boardId: card.boardId,
          clearDueDate: true,
        })
        return
      }

      const dueDateString = date.toISOString().split('T')[0]

      updateCard.mutate({
        id: card.id,
        boardId: card.boardId,
        dueDate: dueDateString,
      })
    },
    [card.boardId, card.id, updateCard]
  )

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
          className="flex items-center gap-2"
          onSelect={() => {
            onSelect?.(card)
          }}
        >
          <Eye className="h-4 w-4" />
          Open details
        </ContextMenuItem>

        {(onChangePriority || (onMoveToColumn && moveColumnOptions && moveColumnOptions.length > 0)) && (
          <ContextMenuSeparator />
        )}

        {onChangePriority && (
          <ContextMenuSub>
            <ContextMenuSubTrigger className="flex items-center gap-2">
              <PriorityIcon className="h-4 w-4" />
              Change priority
            </ContextMenuSubTrigger>
            <ContextMenuSubContent>
              <ContextMenuItem
                className="flex items-center gap-2"
                onSelect={() => {
                  onChangePriority('high')
                }}
              >
                <PriorityHighIcon className="h-4 w-4 text-rose-500" />
                <span>High</span>
                {card.priority === 'high' && (
                  <Check className="ml-auto h-3.5 w-3.5 text-foreground" />
                )}
              </ContextMenuItem>
              <ContextMenuItem
                className="flex items-center gap-2"
                onSelect={() => {
                  onChangePriority('medium')
                }}
              >
                <PriorityMediumIcon className="h-4 w-4 text-amber-500" />
                <span>Medium</span>
                {card.priority === 'medium' && (
                  <Check className="ml-auto h-3.5 w-3.5 text-foreground" />
                )}
              </ContextMenuItem>
              <ContextMenuItem
                className="flex items-center gap-2"
                onSelect={() => {
                  onChangePriority('low')
                }}
              >
                <PriorityLowIcon className="h-4 w-4 text-emerald-500" />
                <span>Low</span>
                {card.priority === 'low' && (
                  <Check className="ml-auto h-3.5 w-3.5 text-foreground" />
                )}
              </ContextMenuItem>
              <ContextMenuItem
                className="flex items-center gap-2"
                onSelect={() => {
                  onChangePriority('none')
                }}
              >
                <PriorityIcon className="h-4 w-4 text-muted-foreground" />
                <span>No priority</span>
                {card.priority === 'none' && (
                  <Check className="ml-auto h-3.5 w-3.5 text-foreground" />
                )}
              </ContextMenuItem>
            </ContextMenuSubContent>
          </ContextMenuSub>
        )}

        <ContextMenuSub>
          <ContextMenuSubTrigger className="flex items-center gap-2">
            <Tag className="h-4 w-4" />
            Tags
          </ContextMenuSubTrigger>
          <ContextMenuSubContent className="w-72">
            <div className="px-1.5 py-1">
              <input
                value={tagQuery}
                onChange={event => setTagQuery(event.target.value)}
                placeholder="Search or create tag..."
                className="w-full rounded-md px-1.5 py-0.5 text-[11px] outline-none"
              />
            </div>
            <ContextMenuSeparator />
            {showCreateTagOption && (
              <>
                <ContextMenuSub>
                  <ContextMenuSubTrigger className="flex items-center gap-2">
                    <Plus className="h-4 w-4" />
                    <span className="truncate text-xs">
                      Create tag <span className="text-muted-foreground">"{trimmedTagQuery}"</span>
                    </span>
                  </ContextMenuSubTrigger>
                  <ContextMenuSubContent className="w-56">
                    {TAG_COLOR_MENU.map(option => (
                      <ContextMenuItem
                        key={option.label}
                        className="flex items-center gap-2"
                        onSelect={() =>
                          handleCreateTagFromMenu(trimmedTagQuery, option.value)
                        }
                      >
                        <span
                          className="h-3 w-3 rounded-full border"
                          style={
                            option.value
                              ? {
                                  backgroundColor: option.value,
                                  borderColor: option.value,
                                }
                              : undefined
                          }
                        />
                        <span className="text-xs">{option.label}</span>
                      </ContextMenuItem>
                    ))}
                  </ContextMenuSubContent>
                </ContextMenuSub>
                <ContextMenuSeparator />
              </>
            )}
            {filteredTags.length === 0 && !showCreateTagOption ? (
              <ContextMenuItem
                disabled
                className="text-xs text-muted-foreground"
              >
                No tags yet
              </ContextMenuItem>
            ) : (
              filteredTags.map(tag => {
                const selected = cardTagIds.includes(tag.id)
                const badgeStyle = getTagBadgeStyle(tag, isDarkMode)

                return (
                  <ContextMenuItem
                    key={tag.id}
                    className="flex items-center gap-2"
                    onSelect={() => handleToggleTag(tag.id)}
                  >
                    <span
                      className="h-3 w-3 rounded-full border"
                      style={
                        tag.color
                          ? { backgroundColor: tag.color, borderColor: tag.color }
                          : undefined
                      }
                    />
                    <span
                      className="rounded-lg px-2 py-0.5 text-xs font-semibold"
                      style={badgeStyle}
                    >
                      {tag.label}
                    </span>
                    {selected && (
                      <Check className="ml-auto h-3.5 w-3.5 text-foreground" />
                    )}
                  </ContextMenuItem>
                )
              })
            )}
          </ContextMenuSubContent>
        </ContextMenuSub>

        <ContextMenuSub>
          <ContextMenuSubTrigger className="flex items-center gap-2">
            <CalendarIcon className="h-4 w-4" />
            Set due date
          </ContextMenuSubTrigger>
          <ContextMenuSubContent className="w-72">
            <div className="px-1.5 py-1">
              <input
                value={dueQuery}
                onChange={event => setDueQuery(event.target.value)}
                placeholder="Try: tomorrow, 24h, next week"
                className="w-full rounded-md px-1.5 py-0.5 text-[11px] outline-none"
                onKeyDown={event => {
                  if (event.key === 'Enter') {
                    event.preventDefault()
                    const trimmed = dueQuery.trim()
                    if (!trimmed) {
                      applyDueDate(null)
                      setDueQuery('')
                      return
                    }
                    const parsed = parseDueDateInput(trimmed)
                    if (parsed) {
                      const d = new Date(parsed)
                      if (!Number.isNaN(d.getTime())) {
                        applyDueDate(d)
                        setDueQuery('')
                      }
                    }
                  }
                  if (event.key === 'Escape') {
                    setDueQuery('')
                  }
                }}
              />
            </div>
            <ContextMenuSeparator />
            <ContextMenuItem
              className="flex items-center gap-2"
              onSelect={() => {
                const base = new Date()
                const d = new Date(base.getFullYear(), base.getMonth(), base.getDate() + 1)
                applyDueDate(d)
              }}
            >
              <span className="text-xs">Tomorrow</span>
            </ContextMenuItem>
            <ContextMenuItem
              className="flex items-center gap-2"
              onSelect={() => {
                const now = new Date()
                const day = now.getDay() || 7
                const daysUntilEndOfWeek = 7 - day
                const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + daysUntilEndOfWeek)
                applyDueDate(d)
              }}
            >
              <span className="text-xs">End of this week</span>
            </ContextMenuItem>
            <ContextMenuItem
              className="flex items-center gap-2"
              onSelect={() => {
                const base = new Date()
                const d = new Date(base.getFullYear(), base.getMonth(), base.getDate() + 7)
                applyDueDate(d)
              }}
            >
              <span className="text-xs">In one week</span>
            </ContextMenuItem>
            <ContextMenuItem
              className="flex items-center gap-2"
              onSelect={() => applyDueDate(null)}
            >
              <span className="text-xs text-muted-foreground">Clear due date</span>
            </ContextMenuItem>
          </ContextMenuSubContent>
        </ContextMenuSub>

        {onMoveToColumn && moveColumnOptions && moveColumnOptions.length > 0 && (
          <ContextMenuSub>
            <ContextMenuSubTrigger className="flex items-center gap-2">
              <Circle className="h-4 w-4" />
              Change status
            </ContextMenuSubTrigger>
            <ContextMenuSubContent>
              {moveColumnOptions.map((col) => (
                <ContextMenuItem
                  key={col.id}
                  className="flex items-center gap-2"
                  onSelect={() => {
                    onMoveToColumn(col.id)
                  }}
                >
                  {(() => {
                    const StatusIcon = col.icon ?? Circle
                    return <StatusIcon className="h-4 w-4" />
                  })()}
                  {col.title}
                </ContextMenuItem>
              ))}
            </ContextMenuSubContent>
          </ContextMenuSub>
        )}

        <ContextMenuSeparator />
        <ContextMenuItem
          className="flex items-center gap-2"
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
          className="flex items-center gap-2"
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
