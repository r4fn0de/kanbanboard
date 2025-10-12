import {
  DndContext,
  DragOverlay,
  PointerSensor,
  closestCorners,
  useDroppable,
  useSensor,
  useSensors,
  type DragCancelEvent,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  horizontalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Button } from '@/components/ui/button'
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from '@/components/ui/context-menu'
import { cn } from '@/lib/utils'
import type { KanbanCard, KanbanColumn } from '@/types/common'
import { Plus, Trash2 } from 'lucide-react'
import { useMemo, useState, useCallback } from 'react'
import { CardContent } from './board-shared'
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
      activationConstraint: { distance: 3 },
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

  return (
    <>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={onDragStart}
        onDragCancel={onDragCancel}
        onDragEnd={onDragEnd}
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
          dropAnimation={null}
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
  return (
    <div className="pointer-events-none flex w-[300px] max-w-full flex-col rounded-[1.75rem] border border-border bg-card p-5 shadow-xl rotate-3 opacity-90">
      <CardContent card={card} />
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
    cursor: isDragging ? 'grabbing' : 'grab',
    willChange: 'transform',
  }

  const fallbackColor =
    FALLBACK_COLUMN_COLORS[accentIndex % FALLBACK_COLUMN_COLORS.length] ??
    FALLBACK_COLUMN_COLORS[0]
  const baseColor = column.color ?? fallbackColor
  const headerBackground = hexToRgba(baseColor, 0.14) ?? undefined
  const headerBorder = hexToRgba(baseColor, 0.35) ?? undefined
  const countBackground = hexToRgba(baseColor, 0.18) ?? undefined
  const countColor = baseColor
  const iconBackground = hexToRgba(baseColor, 0.18) ?? undefined
  const ColumnIcon = getColumnIconComponent(column.icon ?? DEFAULT_COLUMN_ICON)

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="group flex h-full w-[320px] flex-shrink-0 flex-col gap-5 rounded-[2rem] border border-border bg-muted p-5 transition-all duration-200 active:cursor-grabbing"
    >
      <div
        className={cn(
          'flex items-center justify-between gap-3 rounded-3xl border bg-card px-5 py-4'
        )}
        style={{
          borderColor: headerBorder,
          backgroundColor: headerBackground,
        }}
      >
        <div className="flex items-center gap-3" {...attributes} {...listeners}>
          <div className="flex items-center gap-2">
            <span
              className="flex h-8 w-8 items-center justify-center rounded-full border"
              style={{
                backgroundColor: iconBackground,
                borderColor: headerBorder,
                color: countColor,
              }}
            >
              <ColumnIcon className="h-4 w-4" />
            </span>
          </div>
          <h2 className="text-lg font-semibold text-foreground">
            {column.title}
          </h2>
        </div>
        <span
          className={cn('rounded-full px-3 py-1 text-xs font-semibold')}
          style={{
            backgroundColor: countBackground,
            color: countColor,
          }}
        >
          {columnCards.length}
        </span>
      </div>
      <div
        ref={setDroppableRef}
        className="flex flex-1 flex-col gap-4 overflow-y-auto overflow-x-visible p-3 min-h-0 rounded-xl border-2 border-transparent transition-all duration-200"
        style={{ borderColor: hexToRgba(baseColor, 0.08) ?? undefined }}
      >
        {columnCards.length > 0 ? (
          <>
            {columnCards.map(card => (
              <DraggableCard
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
        className="flex items-center justify-center gap-2 rounded-2xl bg-card py-3 text-sm font-medium text-card-foreground transition disabled:cursor-not-allowed disabled:opacity-60"
        style={{
          borderColor: headerBorder,
          color: countColor,
          backgroundColor: hexToRgba(baseColor, 0.12) ?? undefined,
        }}
      >
        <Plus className="h-4 w-4" />
        Add Task
      </Button>
    </div>
  )
}

function DraggableCard({
  card,
  onSelect,
  isSelected,
  onDelete,
}: {
  card: KanbanCard
  onSelect?: (card: KanbanCard) => void
  isSelected: boolean
  onDelete?: (card: KanbanCard) => void
}) {
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
            'flex flex-col rounded-[1.75rem] border border-border bg-card p-5 text-left transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 active:cursor-grabbing w-full',
            isSelected && 'bg-primary/10 dark:bg-primary/15',
            isDragging && 'shadow-lg'
          )}
        >
          <CardContent card={card} />
        </button>
      </ContextMenuTrigger>
      <ContextMenuContent>
        <ContextMenuItem
          variant="destructive"
          onSelect={event => {
            event.preventDefault()
            onDelete?.(card)
          }}
        >
          <Trash2 className="h-4 w-4" />
          Delete task
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
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
        'flex flex-col items-center justify-center rounded-3xl border border-dashed border-border bg-card/70 p-8 text-center text-sm text-muted-foreground transition-all duration-300 min-h-[160px] m-2',
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
          <span className="text-muted-foreground">No cards yet.</span>
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
        'mt-4 min-h-[20px] transition-all duration-300 rounded-2xl border-2 border-transparent',
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
