import { useState, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from '@/components/ui/context-menu'
import { useTheme } from '@/hooks/use-theme'
import { cn } from '@/lib/utils'
import type { KanbanCard, KanbanColumn } from '@/types/common'
import { Calendar, Plus, Trash2 } from 'lucide-react'
import { PriorityBadge } from './board-shared'
import {
  CARD_DUE_STATUS_STYLES,
  getCardDueMetadata,
} from './card-date'
import { AddTaskDialog } from '../AddTaskDialog'
import { getTagBadgeStyle } from '../tags/utils'
import { getColumnIconComponent } from '@/components/kanban/column-icon-options'
import {
  DEFAULT_COLUMN_ICON,
  FALLBACK_COLUMN_COLORS,
} from '@/constants/kanban-columns'

interface BoardListViewProps {
  columns: KanbanColumn[]
  cardsByColumn: Map<string, KanbanCard[]>
  isCreatingCard: boolean
  onCardSelect?: (card: KanbanCard) => void
  selectedCardId?: string | null
  boardId: string
  onCreateTask: (
    task: Omit<KanbanCard, 'createdAt' | 'updatedAt' | 'archivedAt'> & {
      tagIds?: string[]
    }
  ) => Promise<void>
  onDeleteTask?: (card: KanbanCard) => void
}

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

export function BoardListView({
  columns,
  cardsByColumn,
  isCreatingCard,
  onCardSelect,
  selectedCardId,
  boardId,
  onCreateTask,
  onDeleteTask,
}: BoardListViewProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [selectedColumn, setSelectedColumn] = useState<KanbanColumn | null>(
    null
  )
  const { theme } = useTheme()
  const isDarkMode =
    theme === 'dark' ||
    (typeof window !== 'undefined' &&
      window.matchMedia('(prefers-color-scheme: dark)')?.matches &&
      theme === 'system')

  const handleAddCard = useCallback((column: KanbanColumn) => {
    setSelectedColumn(column)
    setIsDialogOpen(true)
  }, [])

  const handleCreateTask = useCallback(
    async (
      task: Omit<KanbanCard, 'createdAt' | 'updatedAt' | 'archivedAt'> & {
        tagIds?: string[]
      }
    ) => {
      await onCreateTask(task)
    },
    [onCreateTask]
  )

  return (
    <>
      <div className="flex-1 space-y-6 overflow-y-auto px-1 py-2 scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent h-full">
        {columns.map((column, columnIndex) => {
          const columnCards = cardsByColumn.get(column.id) ?? []
          const fallbackColor =
            FALLBACK_COLUMN_COLORS[
              columnIndex % FALLBACK_COLUMN_COLORS.length
            ] ?? FALLBACK_COLUMN_COLORS[0]
          const baseColor = column.color ?? fallbackColor
          const headerBorder = hexToRgba(baseColor, 0.35) ?? undefined
          const headerBackground = hexToRgba(baseColor, 0.14)
          const iconBackground = hexToRgba(baseColor, 0.18) ?? undefined
          const iconColor = baseColor
          const IconComponent = getColumnIconComponent(
            column.icon ?? DEFAULT_COLUMN_ICON
          )
          return (
            <div
              key={column.id}
              className="overflow-hidden rounded-[2rem] border border-border bg-muted"
            >
              <div
                className="flex flex-col gap-4 border-b border-border bg-card px-6 py-5 sm:flex-row sm:items-center sm:justify-between"
                style={{
                  borderColor: headerBorder,
                  backgroundColor: headerBackground ?? undefined,
                }}
              >
                <div className="flex items-center gap-3">
                  <span
                    className="flex h-9 w-9 items-center justify-center rounded-full border"
                    style={{
                      backgroundColor: iconBackground,
                      borderColor: headerBorder,
                      color: iconColor,
                    }}
                  >
                    <IconComponent className="h-4 w-4" />
                  </span>
                  <div className="flex flex-col">
                    <p className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                      {column.title}
                    </p>
                    <p className="text-xs text-muted-foreground/80">
                      {columnCards.length === 1
                        ? '1 card'
                        : `${columnCards.length} cards`}
                      {column.wipLimit ? ` · WIP ${column.wipLimit}` : ''}
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  onClick={() => handleAddCard(column)}
                  disabled={isCreatingCard}
                  className="flex items-center justify-center gap-2 rounded-2xl bg-card py-3 text-sm font-medium text-card-foreground transition disabled:cursor-not-allowed disabled:opacity-60"
                  style={{
                    borderColor: headerBorder,
                    color: iconColor,
                    backgroundColor: hexToRgba(baseColor, 0.12) ?? undefined,
                  }}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add Task
                </Button>
              </div>

              <div className="hidden px-6 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground/70 md:grid md:grid-cols-[minmax(0,2.2fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)] md:gap-4">
                <span>Name</span>
                <span>Priority</span>
                <span>Tags</span>
                <span>Due date</span>
              </div>

              <div className="divide-y divide-border/60">
                {columnCards.length > 0 ? (
                  columnCards.map((card, rowIndex) => {
                    const dueMetadata = getCardDueMetadata(card.dueDate)
                    const displayTags = card.tags.slice(0, 3)
                    const remainingTags = card.tags.length - displayTags.length
                    const isSelected = selectedCardId === card.id

                    return (
                      <ContextMenu key={card.id}>
                        <ContextMenuTrigger asChild>
                          <button
                            type="button"
                            onClick={() => onCardSelect?.(card)}
                            aria-pressed={isSelected}
                            aria-expanded={isSelected}
                            aria-controls="task-details-panel"
                            className={cn(
                              'grid grid-cols-1 gap-4 px-6 py-4 text-left text-sm text-foreground transition-all duration-200 md:grid-cols-[minmax(0,2.2fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)] md:items-center md:gap-4',
                              rowIndex % 2 === 1 && 'bg-muted/30',
                              isSelected && 'bg-primary/10 dark:bg-primary/15',
                              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 rounded-[1.5rem]'
                            )}
                          >
                            <div className="flex flex-col gap-1">
                              <span className="text-xs font-semibold uppercase text-muted-foreground md:hidden">
                                Name
                              </span>
                              <span className="text-sm font-semibold leading-snug text-foreground">
                                {card.title}
                              </span>
                              {card.description ? (
                                <span className="text-xs text-muted-foreground line-clamp-1">
                                  {card.description}
                                </span>
                              ) : null}
                            </div>
                            <div className="flex flex-col gap-2 md:items-start">
                              <span className="text-xs font-semibold uppercase text-muted-foreground md:hidden">
                                Priority
                              </span>
                              <PriorityBadge priority={card.priority} />
                            </div>
                            <div className="flex flex-col gap-2">
                              <span className="text-xs font-semibold uppercase text-muted-foreground md:hidden">
                                Tags
                              </span>
                              <div className="flex flex-wrap items-center gap-2">
                                {displayTags.length > 0 ? (
                                  <>
                                    {displayTags.map(tag => (
                                      <Badge
                                        key={tag.id}
                                        variant="secondary"
                                        className="rounded-lg px-2.5 py-0.5 text-xs font-semibold"
                                        style={getTagBadgeStyle(
                                          tag,
                                          isDarkMode
                                        )}
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
                                  </>
                                ) : (
                                  <span className="text-xs text-muted-foreground/70">
                                    No tags
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="flex flex-col gap-2 md:items-start">
                              <span className="text-xs font-semibold uppercase text-muted-foreground md:hidden">
                                Due date
                              </span>
                              {dueMetadata ? (
                                <Badge
                                  className={cn(
                                    'inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 font-semibold',
                                    CARD_DUE_STATUS_STYLES[dueMetadata.status]
                                  )}
                                >
                                  <Calendar className="h-3 w-3" />
                                  <span>{dueMetadata.display}</span>
                                </Badge>
                              ) : null}
                            </div>
                          </button>
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
                  })
                ) : (
                  <div className="flex flex-col items-center justify-center gap-2 px-6 py-12 text-center text-sm text-muted-foreground">
                    <span>No cards in this column</span>
                    <Button
                      variant="ghost"
                      onClick={() => handleAddCard(column)}
                      disabled={isCreatingCard}
                      className="flex items-center justify-center gap-2 rounded-2xl bg-card py-3 text-sm font-medium text-card-foreground transition disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Add first task
                    </Button>
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      <AddTaskDialog
        isOpen={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        column={selectedColumn}
        boardId={boardId}
        cardsInColumn={
          selectedColumn ? (cardsByColumn.get(selectedColumn.id) ?? []) : []
        }
        onCreateTask={handleCreateTask}
      />
    </>
  )
}
