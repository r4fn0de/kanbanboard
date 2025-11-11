import { useState, useCallback } from 'react'
import type { CSSProperties } from 'react'
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
import { Plus, Trash2, ArrowRight } from 'lucide-react'
import { PriorityBadge, CalendarIcon } from './board-shared'
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
import '../../../styles/kanban.css'

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
      <div className="flex-1 overflow-y-auto h-full">
        <div className="grid gap-6 p-6">
          {columns.map((column, columnIndex) => {
            const columnCards = cardsByColumn.get(column.id) ?? []
            const fallbackColor =
              FALLBACK_COLUMN_COLORS[
                columnIndex % FALLBACK_COLUMN_COLORS.length
              ] ?? FALLBACK_COLUMN_COLORS[0]
            const baseColor = column.color ?? fallbackColor
            const headerBorder = hexToRgba(baseColor, 0.35) ?? undefined
            const headerBackground = hexToRgba(baseColor, 0.08)
            const iconBackground = hexToRgba(baseColor, 0.12) ?? undefined
            const iconColor = baseColor
            const buttonBackground = hexToRgba(baseColor, 0.08)
            const buttonHoverBackground = hexToRgba(baseColor, 0.16)
            const buttonStyle = buttonBackground
              ? ({
                  '--column-button-bg': buttonBackground,
                  '--column-button-bg-hover':
                    buttonHoverBackground ?? buttonBackground,
                  borderColor: headerBorder,
                  color: iconColor,
                } as CSSProperties)
              : ({
                  borderColor: headerBorder,
                  color: iconColor,
                } as CSSProperties)
            const buttonClasses = cn(
              'flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-60',
              buttonBackground
                ? 'bg-[color:var(--column-button-bg)] hover:bg-[color:var(--column-button-bg-hover)] text-muted-foreground'
                : 'bg-muted/50 text-muted-foreground hover:bg-primary hover:text-primary-foreground'
            )
            const IconComponent = getColumnIconComponent(
              column.icon ?? DEFAULT_COLUMN_ICON
            )

            return (
              <div
                key={column.id}
                className="group overflow-hidden rounded-2xl border border-border/50 bg-card transition-all duration-300 hover:border-border"
              >
                {/* Enhanced Column Header */}
                <div
                  className="flex flex-col gap-4 border-b border-border/30 bg-gradient-to-r from-background to-muted/20 px-6 py-5 transition-all duration-300 sm:flex-row sm:items-center sm:justify-between"
                  style={{
                    borderColor: headerBorder,
                    backgroundColor: headerBackground ?? undefined,
                  }}
                >
                  <div className="flex items-center gap-4">
                    <div
                      className="flex h-10 w-10 items-center justify-center rounded-full border-2 transition-all duration-300 group-hover:scale-105"
                      style={{
                        backgroundColor: iconBackground,
                        borderColor: headerBorder,
                        color: iconColor,
                      }}
                    >
                      <IconComponent className="h-5 w-5" />
                    </div>
                    <div className="flex flex-col">
                      <h3 className="text-base font-bold leading-tight text-foreground">
                        {column.title}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {columnCards.length === 1
                          ? '1 task'
                          : `${columnCards.length} tasks`}
                        {column.wipLimit ? ` · WIP ${column.wipLimit}` : ''}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    onClick={() => handleAddCard(column)}
                    disabled={isCreatingCard}
                    className={buttonClasses}
                    style={buttonStyle}
                  >
                    <Plus className="h-4 w-4" />
                    Add Task
                  </Button>
                </div>

                {/* Desktop Table Header */}
                <div className="hidden px-6 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground/80 md:grid md:grid-cols-[minmax(0,2.2fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)] md:gap-4">
                  <span className="flex items-center gap-2">
                    <span>Task Name</span>
                    <ArrowRight className="h-3 w-3 opacity-50" />
                  </span>
                  <span>Priority</span>
                  <span>Tags</span>
                  <span>Due Date</span>
                </div>

                {/* Tasks List */}
                <div>
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
                                'group/row grid w-full grid-cols-1 gap-4 px-6 py-4 text-left text-sm text-foreground transition-all duration-300 hover:bg-muted/50 md:grid-cols-[minmax(0,2.2fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)] md:items-center md:gap-4',
                                isSelected && 'bg-primary/5 border-l-4 border-l-primary',
                                rowIndex % 2 === 1 && 'bg-muted/20',
                                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2'
                              )}
                            >
                              {/* Mobile Label */}
                              <div className="flex flex-col gap-3">
                                <div className="flex flex-col gap-1">
                                  <div className="flex items-center justify-between">
                                    <span className="text-xs font-semibold uppercase text-muted-foreground md:hidden">
                                      Task Name
                                    </span>
                                    <div className="flex items-center gap-2 md:hidden">
                                      <PriorityBadge priority={card.priority} />
                                      {dueMetadata && (
                                        <Badge
                                          className={cn(
                                            'inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-medium',
                                            CARD_DUE_STATUS_STYLES[dueMetadata.status]
                                          )}
                                        >
                                          <CalendarIcon className="h-3 w-3" />
                                          <span>{dueMetadata.display}</span>
                                        </Badge>
                                      )}
                                    </div>
                                  </div>
                                  <span className="text-sm font-semibold leading-snug text-foreground">
                                    {card.title}
                                  </span>
                                  {card.description ? (
                                    <span className="text-xs text-muted-foreground line-clamp-1">
                                      {card.description}
                                    </span>
                                  ) : null}
                                </div>

                                {/* Mobile Tags */}
                                <div className="flex flex-col gap-2 md:hidden">
                                  <span className="text-xs font-semibold uppercase text-muted-foreground">
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
                              </div>

                              {/* Desktop Content */}
                              <div className="hidden flex-col gap-2 md:flex">
                                <PriorityBadge priority={card.priority} />
                              </div>
                              <div className="hidden flex-col gap-2 md:flex">
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
                              <div className="hidden flex-col gap-2 md:flex">
                                {dueMetadata ? (
                                  <Badge
                                    className={cn(
                                      'inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium',
                                      CARD_DUE_STATUS_STYLES[dueMetadata.status]
                                    )}
                                  >
                                    <CalendarIcon className="h-3 w-3" />
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
                              className="flex items-center gap-2"
                            >
                              <Trash2 className="h-4 w-4" />
                              Delete task
                            </ContextMenuItem>
                          </ContextMenuContent>
                        </ContextMenu>
                      )
                    })
                  ) : (
                    <div className="flex flex-col items-center justify-center gap-4 px-6 py-16 text-center">
                      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted/50">
                        <CalendarIcon className="h-8 w-8 text-muted-foreground" />
                      </div>
                      <div className="flex flex-col gap-2">
                        <span className="text-sm font-medium text-muted-foreground">
                          No tasks in this column
                        </span>
                        <span className="text-xs text-muted-foreground/70">
                          Get started by adding your first task
                        </span>
                      </div>
                      <Button
                        variant="ghost"
                        onClick={() => handleAddCard(column)}
                        disabled={isCreatingCard}
                        className={buttonClasses}
                        style={buttonStyle}
                      >
                        <Plus className="h-4 w-4" />
                        Add first task
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
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
