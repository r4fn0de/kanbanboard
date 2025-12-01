import { Badge } from '@/components/ui/badge'
import type { KanbanCard, KanbanColumn } from '@/types/common'
import { Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useMemo, type CSSProperties } from 'react'
import { useTheme } from '@/hooks/use-theme'
import { PriorityBadge, CalendarIcon } from './board-shared'
import { CARD_DUE_STATUS_STYLES, getCardDueMetadata } from './card-date'
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from '@/components/ui/context-menu'
import { getTagBadgeStyle } from '../tags/utils'
import { getColumnIconComponent } from '@/components/kanban/column-icon-options'
import {
  DEFAULT_COLUMN_ICON,
  FALLBACK_COLUMN_COLORS,
} from '@/constants/kanban-columns'

function hexToRgba(hex: string | null | undefined, alpha: number) {
  if (!hex || !/^#([0-9a-fA-F]{6})$/.test(hex)) {
    return null
  }

  const value = hex.slice(1)
  const r = parseInt(value.slice(0, 2), 16)
  const g = parseInt(value.slice(2, 4), 16)
  const b = parseInt(value.slice(4, 6), 16)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

interface BoardTimelineViewProps {
  cards: KanbanCard[]
  columnsById: Map<string, KanbanColumn>
  onDeleteTask?: (card: KanbanCard) => void
}

export function BoardTimelineView({
  cards,
  columnsById,
  onDeleteTask,
}: BoardTimelineViewProps) {
  const { theme } = useTheme()
  const isDarkMode =
    theme === 'dark' ||
    (typeof window !== 'undefined' &&
      window.matchMedia('(prefers-color-scheme: dark)')?.matches &&
      theme === 'system')

  const dateFormatter = useMemo(
    () => new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }),
    []
  )

  const columnBaseColors = useMemo(() => {
    const values = Array.from(columnsById.values())
    return new Map(
      values.map((column, index) => [
        column.id,
        column.color ??
          FALLBACK_COLUMN_COLORS[index % FALLBACK_COLUMN_COLORS.length] ??
          FALLBACK_COLUMN_COLORS[0],
      ])
    )
  }, [columnsById])

  const groups = useMemo(() => {
    const map = new Map<
      string,
      { key: string; date: Date | null; cards: KanbanCard[] }
    >()

    for (const card of cards) {
      const dueDate = card.dueDate ? new Date(card.dueDate) : null
      const isValid = dueDate && !Number.isNaN(dueDate.getTime())

      let key = 'no-date'
      let normalizedDate: Date | null = null

      if (isValid) {
        normalizedDate = new Date(dueDate.getTime())
        key = normalizedDate.toISOString().slice(0, 10)
      }

      let group = map.get(key)
      if (!group) {
        group = { key, date: normalizedDate, cards: [] }
        map.set(key, group)
      }
      group.cards.push(card)
    }

    const entries = Array.from(map.values())
    entries.sort((a, b) => {
      if (a.date && b.date) {
        return a.date.getTime() - b.date.getTime()
      }
      if (a.date) return -1
      if (b.date) return 1
      return 0
    })
    return entries
  }, [cards])

  if (groups.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center rounded-[2rem] border border-dashed border-border bg-muted/50 p-10 text-center text-sm text-muted-foreground">
        No tasks have been added to this timeline yet.
      </div>
    )
  }

  return (
    <div className="relative flex-1">
      <div className="absolute left-[18px] top-4 bottom-4 hidden border-l border-border/60 sm:block" />
      <div className="space-y-8">
        {groups.map(group => (
          <div
            key={group.key}
            className="relative flex flex-col gap-4 rounded-3xl border border-border/40 p-4 shadow-none sm:flex-row sm:items-start sm:gap-6"
          >
            <div className="flex items-center gap-3 sm:w-64">
              <div className="flex h-9 w-9 items-center justify-center rounded-full border border-border/70 bg-muted/40 text-muted-foreground">
                <CalendarIcon className="h-4 w-4" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">
                  {group.date
                    ? dateFormatter.format(group.date)
                    : 'No due date'}
                </p>
                <p className="text-xs text-muted-foreground">
                  {group.cards.length}{' '}
                  {group.cards.length === 1 ? 'task' : 'tasks'}
                </p>
              </div>
            </div>
            <div className="flex-1 space-y-3">
              {group.cards.map(card => {
                const column = columnsById.get(card.columnId)
                const baseColor =
                  columnBaseColors.get(card.columnId) ??
                  FALLBACK_COLUMN_COLORS[0]
                const cardBackground = hexToRgba(baseColor, 0.08)
                const cardHoverBackground = hexToRgba(baseColor, 0.16)
                const cardBorder = hexToRgba(baseColor, 0.28)
                const cardStyle = cardBackground
                  ? ({
                      '--timeline-card-bg': cardBackground,
                      '--timeline-card-hover-bg':
                        cardHoverBackground ?? cardBackground,
                      '--timeline-card-border': cardBorder ?? undefined,
                    } as CSSProperties)
                  : undefined
                const cardClasses = cn(
                  'rounded-3xl border px-5 py-4 transition-all duration-300',
                  cardBackground
                    ? 'bg-[color:var(--timeline-card-bg)] hover:bg-[color:var(--timeline-card-hover-bg)] border-[color:var(--timeline-card-border)]'
                    : 'bg-card hover:bg-muted/60 border-border',
                  'focus-within:ring-2 focus-within:ring-primary/40'
                )
                const normalizedTitle = column?.title
                  ? column.title.trim().toLowerCase()
                  : ''
                let inferredStatusIcon: string | null = null
                if (normalizedTitle === 'backlog') {
                  inferredStatusIcon = 'BacklogStatus'
                } else if (
                  normalizedTitle === 'to do' ||
                  normalizedTitle === 'todo'
                ) {
                  inferredStatusIcon = 'TodoStatus'
                } else if (normalizedTitle === 'in progress') {
                  inferredStatusIcon = 'InProgressStatus'
                } else if (normalizedTitle === 'done') {
                  inferredStatusIcon = 'DoneStatus'
                }

                const resolvedIconKey =
                  !column?.icon || column.icon === DEFAULT_COLUMN_ICON
                    ? (inferredStatusIcon ?? DEFAULT_COLUMN_ICON)
                    : column.icon

                const IconComponent = getColumnIconComponent(resolvedIconKey)
                const dueMetadata = getCardDueMetadata(card.dueDate)
                const tagList = card.tags ?? []
                const displayTags = tagList.slice(0, 3)
                const remainingTags = tagList.length - displayTags.length
                return (
                  <ContextMenu key={card.id}>
                    <ContextMenuTrigger asChild>
                      <div className={cardClasses} style={cardStyle}>
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                          <div className="flex flex-col gap-1">
                            <span className="text-sm font-semibold text-foreground">
                              {card.title}
                            </span>
                            <span className="flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground">
                              <span
                                className="flex items-center justify-center"
                                style={{
                                  color: baseColor,
                                }}
                              >
                                <IconComponent className="h-3.5 w-3.5" />
                              </span>
                              {column?.title ?? 'Unassigned'}
                            </span>
                          </div>
                          <PriorityBadge priority={card.priority} />
                        </div>
                        {card.description ? (
                          <p className="mt-2 line-clamp-3 text-sm text-muted-foreground">
                            {card.description}
                          </p>
                        ) : null}
                        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                          {displayTags.map(tag => (
                            <Badge
                              key={tag.id}
                              variant="secondary"
                              className="rounded-lg px-2.5 py-0.5 text-xs font-semibold"
                              style={getTagBadgeStyle(tag, isDarkMode)}
                            >
                              {tag.label}
                            </Badge>
                          ))}
                          {remainingTags > 0 ? (
                            <Badge
                              variant="secondary"
                              className="rounded-lg px-2.5 py-0.5 text-xs font-semibold"
                            >
                              +{remainingTags}
                            </Badge>
                          ) : null}
                          {dueMetadata ? (
                            <Badge
                              className={cn(
                                'inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 font-semibold',
                                CARD_DUE_STATUS_STYLES[dueMetadata.status]
                              )}
                            >
                              <CalendarIcon className="h-3 w-3" />
                              <span>{dueMetadata.display}</span>
                            </Badge>
                          ) : null}
                        </div>
                      </div>
                    </ContextMenuTrigger>
                    <ContextMenuContent>
                      <ContextMenuItem
                        variant="destructive"
                        onSelect={event => {
                          event.preventDefault()
                          onDeleteTask?.(card)
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                        Delete task
                      </ContextMenuItem>
                    </ContextMenuContent>
                  </ContextMenu>
                )
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
