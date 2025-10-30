import {
  DndContext,
  DragOverlay,
  PointerSensor,
  KeyboardSensor,
  pointerWithin,
  useDroppable,
  useSensor,
  useSensors,
  type Announcements,
  type DragCancelEvent,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core'
import { snapCenterToCursor } from '@dnd-kit/modifiers'
import {
  SortableContext,
  horizontalListSortingStrategy,
  sortableKeyboardCoordinates,
  useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { KanbanCard, KanbanColumn } from '@/types/common'
import {
  Plus,
  ArrowDown,
  ArrowUp,
  Minus,
  Paperclip,
  Calendar,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { useMemo, useState, useCallback } from 'react'
import '../../../styles/kanban.css'
import { KanbanCardItem } from '../card/KanbanCardItem'
import {
  CARD_DUE_STATUS_STYLES,
  getCardDueMetadata,
} from './card-date'
import { getTagBadgeStyle } from '../tags/utils'
import { AddTaskDialog } from '../AddTaskDialog'
import { getColumnIconComponent } from '@/components/kanban/column-icon-options'
import {
  DEFAULT_COLUMN_ICON,
  FALLBACK_COLUMN_COLORS,
} from '@/constants/kanban-columns'

interface BoardKanbanViewProps {
  columns: KanbanColumn[]
  columnOrder: string[]
  cardsByColumn: Map<string, KanbanCard[]>
  isCreatingCard: boolean
  onDragEnd: (event: DragEndEvent) => void
  onDragStart: (event: DragStartEvent) => void
  onDragCancel: (event: DragCancelEvent) => void
  activeCard: KanbanCard | null
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

export function BoardKanbanView({
  columns,
  columnOrder,
  cardsByColumn,
  isCreatingCard,
  onDragEnd,
  onDragStart,
  onDragCancel,
  activeCard,
  onCardSelect,
  selectedCardId,
  boardId,
  onCreateTask,
  onDeleteTask,
}: BoardKanbanViewProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [selectedColumn, setSelectedColumn] = useState<KanbanColumn | null>(
    null
  )

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  const columnsMap = useMemo(
    () => new Map(columns.map(column => [column.id, column])),
    [columns]
  )

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

  // Accessibility announcements for screen readers
  const announcements: Announcements = useMemo<Announcements>(
    () => ({
      onDragStart() {
        const card = activeCard
        if (!card) return ''
        return `Picked up draggable card ${card.title}.`
      },
      onDragOver({ over }) {
        const card = activeCard
        if (!card || !over) return ''

        const overId = over.id.toString()
        if (overId.includes('column')) {
          const columnId = overId
            .replace('column-', '')
            .replace('-cards', '')
            .replace('-end', '')
          const column = columnsMap.get(columnId)
          if (column) {
            return `Dragging card ${card.title} over column ${column.title}.`
          }
        }
        return `Dragging card ${card.title}.`
      },
      onDragEnd({ over }) {
        const card = activeCard
        if (!card) return ''

        if (!over) {
          return `Dragging cancelled. Card ${card.title} was not moved.`
        }

        const overId = over.id.toString()
        if (overId.includes('column')) {
          const columnId = overId
            .replace('column-', '')
            .replace('-cards', '')
            .replace('-end', '')
          const column = columnsMap.get(columnId)
          if (column) {
            return `Card ${card.title} was moved to column ${column.title}.`
          }
        }
        return `Card ${card.title} was moved.`
      },
      onDragCancel() {
        const card = activeCard
        if (!card) return ''
        return `Dragging cancelled. Card ${card.title} was dropped.`
      },
    }),
    [activeCard, columnsMap]
  )

  return (
    <>
      <DndContext
        sensors={sensors}
        collisionDetection={pointerWithin}
        onDragStart={onDragStart}
        onDragCancel={onDragCancel}
        onDragEnd={onDragEnd}
        accessibility={{ announcements }}
      >
        <SortableContext
          items={columnOrder.map(id => `column-${id}`)}
          strategy={horizontalListSortingStrategy}
        >
          <div className="flex h-full items-stretch gap-4 overflow-x-auto pb-4 min-h-0 p-2">
            {columnOrder.map((columnId, index) => {
              const column = columnsMap.get(columnId)
              if (!column) {
                return null
              }
              const columnCards = cardsByColumn.get(column.id) ?? []
              return (
                <DraggableColumn
                  key={column.id}
                  column={column}
                  columnCards={columnCards}
                  isCreatingCard={isCreatingCard}
                  accentIndex={index}
                  onAddCard={() => handleAddCard(column)}
                  onCardSelect={onCardSelect}
                  selectedCardId={selectedCardId}
                  onDeleteCard={onDeleteTask}
                />
              )
            })}
          </div>
        </SortableContext>
        <DragOverlay
          // Disable drop animation to avoid the overlay "jumping" back to the
          // previous column before settling in the destination column.
          // The card itself moves optimistically, so animating the overlay on drop
          // causes a visual bounce. Removing the animation fixes the flicker.
          dropAnimation={null}
          modifiers={[snapCenterToCursor]}
        >
          {activeCard ? <CardOverlay card={activeCard} /> : null}
        </DragOverlay>
      </DndContext>

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

function CardOverlay({ card }: { card: KanbanCard }) {
  const tagList = card.tags ?? []
  const displayTags = tagList.slice(0, 3)
  const remainingTags = tagList.length - displayTags.length
  const dueMetadata = getCardDueMetadata(card.dueDate)
  const hasAttachments = card.attachments && card.attachments.length > 0

  const priorityConfig = {
    low: {
      label: 'Low',
      className:
        'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-400 dark:border-emerald-800',
      icon: ArrowDown,
    },
    medium: {
      label: 'Medium',
      className:
        'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/50 dark:text-amber-400 dark:border-amber-800',
      icon: Minus,
    },
    high: {
      label: 'High',
      className:
        'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/50 dark:text-rose-400 dark:border-rose-800',
      icon: ArrowUp,
    },
  }[card.priority]

  const PriorityIcon = priorityConfig.icon

  return (
    <div
      className="pointer-events-none w-full flex flex-col gap-4 rounded-2xl border-2 border-primary/40 bg-card p-4 shadow-2xl ring-2 ring-primary/20"
      style={{
        transform: 'rotate(2deg) scale(1.05)',
        transition: 'transform 200ms cubic-bezier(0.18, 0.67, 0.6, 1.22)',
      }}
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
                className="rounded-lg px-2.5 py-0.5 text-xs font-medium border"
                style={
                  tag.color
                    ? {
                        backgroundColor: `${tag.color}15`,
                        color: badgeStyle?.color,
                        borderColor: `${tag.color}40`,
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
              variant="outline"
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
            'inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium border',
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
              'inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium',
              CARD_DUE_STATUS_STYLES[dueMetadata.status]
            )}
          >
            <Calendar className="h-3 w-3" />
            <span>{dueMetadata.display}</span>
          </Badge>
        )}

        {/* Attachments */}
        {hasAttachments && (
          <div className="inline-flex items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700 dark:border-blue-800 dark:bg-blue-950/50 dark:text-blue-400">
            <Paperclip className="h-3 w-3" />
            <span>{card.attachments?.length}</span>
          </div>
        )}
      </div>
    </div>
  )
}

function DraggableColumn({
  column,
  columnCards,
  onAddCard,
  isCreatingCard,
  accentIndex,
  onCardSelect,
  selectedCardId,
  onDeleteCard,
}: {
  column: KanbanColumn
  columnCards: KanbanCard[]
  onAddCard: () => void
  isCreatingCard: boolean
  accentIndex: number
  onCardSelect?: (card: KanbanCard) => void
  selectedCardId?: string | null
  onDeleteCard?: (card: KanbanCard) => void
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: `column-${column.id}`,
  })

  const { setNodeRef: setDroppableRef } = useDroppable({
    id: `column-${column.id}-cards`,
  })

  const style: React.CSSProperties = {
    transform: transform ? CSS.Transform.toString(transform) : undefined,
    transition: isDragging
      ? 'none'
      : (transition ?? 'transform 240ms cubic-bezier(0.22, 1, 0.36, 1)'),
    willChange: 'transform',
  }

  const fallbackColor =
    FALLBACK_COLUMN_COLORS[accentIndex % FALLBACK_COLUMN_COLORS.length] ??
    FALLBACK_COLUMN_COLORS[0]
  const baseColor = column.color ?? fallbackColor
  const iconBackground = hexToRgba(baseColor, 0.12) ?? 'rgba(148, 163, 184, 0.12)'
  const iconRing = hexToRgba(baseColor, 0.55) ?? 'rgba(148, 163, 184, 0.45)'
  const countBackground = hexToRgba(baseColor, 0.14) ?? 'rgba(148, 163, 184, 0.18)'
  const countColor = baseColor
  const ColumnIcon = getColumnIconComponent(column.icon ?? DEFAULT_COLUMN_ICON)

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="group flex h-full w-[320px] flex-shrink-0 flex-col gap-4"
    >
      <div
        className={cn(
          'flex items-center justify-between gap-3 px-1',
          isDragging && 'opacity-80'
        )}
        {...attributes}
        {...listeners}
      >
        <div className="flex min-w-0 items-center gap-3">
          <span
            className="flex h-8 w-8 items-center justify-center rounded-full border-2"
            style={{
              backgroundColor: iconBackground,
              borderColor: iconRing,
              color: countColor,
            }}
          >
            <ColumnIcon className="h-4 w-4" />
          </span>
          <h2 className="truncate text-sm font-semibold text-foreground md:text-base">
            {column.title}
          </h2>
        </div>
        <div className="flex items-center gap-2">
          <span
            className="rounded-full px-3 py-1 text-xs font-semibold"
            style={{
              backgroundColor: countBackground,
              color: countColor,
            }}
          >
            {columnCards.length}
          </span>
          <button
            type="button"
            onClick={onAddCard}
            disabled={isCreatingCard}
            className="flex h-8 w-8 items-center justify-center rounded-full border border-dashed border-border/70 text-muted-foreground transition hover:border-transparent hover:bg-primary hover:text-primary-foreground disabled:cursor-not-allowed disabled:opacity-60"
            aria-label={`Adicionar tarefa em ${column.title}`}
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>
      </div>
      <div className="flex flex-1 flex-col gap-4 px-1 transition-all duration-200">
        <div
          ref={setDroppableRef}
          className="flex flex-1 flex-col gap-4 overflow-y-auto overflow-x-visible min-h-0 transition-all duration-200 kanban-column-cards"
          style={{
            scrollbarWidth: 'none',
            msOverflowStyle: 'none',
          }}
        >
          {columnCards.length > 0 ? (
            <>
              {columnCards.map(card => (
                <KanbanCardItem
                  key={card.id}
                  card={card}
                  onSelect={onCardSelect}
                  isSelected={selectedCardId === card.id}
                  onDelete={onDeleteCard}
                />
              ))}
              {/* Drop zone at the end of cards */}
              <ColumnEndDropZone columnId={column.id} accentColor={baseColor} />
            </>
          ) : (
            <EmptyColumnDropZone columnId={column.id} accentColor={baseColor} />
          )}
        </div>
        <Button
          variant="ghost"
          onClick={onAddCard}
          disabled={isCreatingCard}
          className="flex items-center justify-center gap-2 rounded-xl border border-dashed border-border/70 bg-transparent py-3 text-sm font-medium text-muted-foreground transition hover:border-transparent hover:bg-primary hover:text-primary-foreground disabled:cursor-not-allowed disabled:opacity-60"
          style={{
            color: countColor,
            backgroundColor: hexToRgba(baseColor, 0.12) ?? undefined,
          }}
        >
          <Plus className="h-4 w-4" />
          Add Task
        </Button>
      </div>
    </div>
  )
}

function EmptyColumnDropZone({
  columnId,
  accentColor,
}: {
  columnId: string
  accentColor: string
}) {
  const { isOver, setNodeRef } = useDroppable({
    id: `column-${columnId}-cards`,
  })

  const highlightBg = hexToRgba(accentColor, 0.18)
  const highlightBorder = hexToRgba(accentColor, 0.4)
  const highlightText = accentColor

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card/70 p-8 text-center text-sm text-muted-foreground transition-all duration-300 min-h-[160px] m-2',
        isOver && 'border-solid scale-[1.02] shadow-lg'
      )}
      style={
        isOver
          ? {
              backgroundColor: highlightBg ?? undefined,
              borderColor: highlightBorder ?? undefined,
              color: highlightText,
            }
          : undefined
      }
    >
      {isOver ? (
        <div className="flex flex-col items-center gap-4">
          <div
            className="h-0.5 w-16 rounded-full"
            style={{ backgroundColor: highlightText }}
          />
          <span
            className="font-semibold text-base rounded-full px-4 py-2"
            style={{
              backgroundColor: hexToRgba(accentColor, 0.12) ?? undefined,
              color: highlightText,
            }}
          >
            Drop card here
          </span>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-2">
          <span className="text-muted-foreground">No tasks yet.</span>
          <span className="text-muted-foreground text-xs">
            Add the first one to get started.
          </span>
        </div>
      )}
    </div>
  )
}

function ColumnEndDropZone({
  columnId,
  accentColor,
}: {
  columnId: string
  accentColor: string
}) {
  const { isOver, setNodeRef } = useDroppable({
    id: `column-${columnId}-end`,
  })

  const highlightBg = hexToRgba(accentColor, 0.12)
  const highlightBorder = hexToRgba(accentColor, 0.4)
  const highlightText = accentColor

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'mt-4 min-h-[20px] transition-all duration-300 rounded-xl border-2 border-transparent',
        isOver && 'min-h-[60px] shadow-lg scale-[1.02]'
      )}
      style={
        isOver
          ? {
              backgroundColor: highlightBg ?? undefined,
              borderColor: highlightBorder ?? undefined,
            }
          : undefined
      }
    >
      {isOver && (
        <div className="flex items-center justify-center h-full py-3">
          <div className="flex flex-col items-center gap-2">
            <div
              className="h-0.5 w-16 rounded-full"
              style={{ backgroundColor: highlightText }}
            />
            <span
              className="font-medium text-sm rounded-full px-3 py-1"
              style={{
                backgroundColor: hexToRgba(accentColor, 0.12) ?? undefined,
                color: highlightText,
              }}
            >
              Drop here
            </span>
          </div>
        </div>
      )}
    </div>
  )
}

export type { DragEndEvent, DragStartEvent, DragCancelEvent }
