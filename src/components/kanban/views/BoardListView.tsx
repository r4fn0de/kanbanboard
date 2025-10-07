import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type { KanbanCard, KanbanColumn } from '@/types/common'
import { Plus, Circle, Play, CheckCircle } from 'lucide-react'
import { PriorityBadge } from './board-shared'
import { formatCardDueDate } from './card-date'

interface BoardListViewProps {
  columns: KanbanColumn[]
  cardsByColumn: Map<string, KanbanCard[]>
  onAddCard: (column: KanbanColumn) => void
  isCreatingCard: boolean
  onCardSelect?: (card: KanbanCard) => void
  selectedCardId?: string | null
}

const accentThemes = [
  {
    dot: 'bg-gray-400',
    icon: Circle,
  },
  {
    dot: 'bg-gray-500',
    icon: Play,
  },
  {
    dot: 'bg-gray-600',
    icon: CheckCircle,
  },
] as const

export function BoardListView({
  columns,
  cardsByColumn,
  onAddCard,
  isCreatingCard,
  onCardSelect,
  selectedCardId,
}: BoardListViewProps) {
  return (
    <div className="flex-1 space-y-6">
      {columns.map((column, columnIndex) => {
        const columnCards = cardsByColumn.get(column.id) ?? []
        const theme =
          accentThemes[columnIndex % accentThemes.length] ?? accentThemes[0]
        return (
          <div
            key={column.id}
            className="overflow-hidden rounded-[2rem] border border-border bg-muted"
          >
            <div className="flex flex-col gap-4 border-b border-border bg-card px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <theme.icon className="h-4 w-4 text-gray-600 dark:text-gray-400" />
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
                onClick={() => onAddCard(column)}
                disabled={isCreatingCard}
                className="flex items-center justify-center gap-2 rounded-2xl bg-card py-3 text-sm font-medium text-card-foreground transition disabled:cursor-not-allowed disabled:opacity-60"
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
                  const dueLabel = formatCardDueDate(card.dueDate)
                  const displayTags = card.tags.slice(0, 3)
                  const remainingTags = card.tags.length - displayTags.length
                  const isSelected = selectedCardId === card.id

                  return (
                    <button
                      type="button"
                      onClick={() => onCardSelect?.(card)}
                      key={card.id}
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
                                  key={tag}
                                  variant="secondary"
                                  className="rounded-full px-3 py-1 text-xs"
                                >
                                  {tag}
                                </Badge>
                              ))}
                              {remainingTags > 0 ? (
                                <Badge
                                  variant="secondary"
                                  className="rounded-full px-3 py-1 text-xs"
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
                        {dueLabel ? (
                          <span className="text-sm font-medium text-foreground">
                            {dueLabel}
                          </span>
                        ) : (
                          <span className="rounded-full border border-dashed border-border px-3 py-1 text-xs text-muted-foreground">
                            Add date
                          </span>
                        )}
                      </div>
                    </button>
                  )
                })
              ) : (
                <div className="flex flex-col items-center justify-center gap-2 px-6 py-12 text-center text-sm text-muted-foreground">
                  <span>No cards in this column</span>
                  <Button
                    variant="ghost"
                    onClick={() => onAddCard(column)}
                    disabled={isCreatingCard}
                    className="flex items-center justify-center gap-2 rounded-2xl bg-card py-3 text-sm font-medium text-card-foreground transition disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Add first card
                  </Button>
                </div>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
