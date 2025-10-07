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
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { KanbanCard, KanbanColumn } from '@/types/common'
import { Plus, Circle, Play, CheckCircle } from 'lucide-react'
import { useMemo } from 'react'
import { CardContent } from './board-shared'

interface BoardKanbanViewProps {
  columns: KanbanColumn[]
  columnOrder: string[]
  cardsByColumn: Map<string, KanbanCard[]>
  isCreatingCard: boolean
  onAddCard: (column: KanbanColumn) => void
  onDragEnd: (event: DragEndEvent) => void
  onDragStart: (event: DragStartEvent) => void
  onDragCancel: (event: DragCancelEvent) => void
  activeCard: KanbanCard | null
}

const accentThemes = [
  {
    dot: 'bg-gray-400',
    count: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
    accentBorder: 'border-gray-200 dark:border-gray-700',
    icon: Circle,
  },
  {
    dot: 'bg-gray-500',
    count: 'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
    accentBorder: 'border-gray-200 dark:border-gray-700',
    icon: Play,
  },
  {
    dot: 'bg-gray-600',
    count: 'bg-gray-300 text-gray-700 dark:bg-gray-600 dark:text-gray-300',
    accentBorder: 'border-gray-200 dark:border-gray-700',
    icon: CheckCircle,
  },
] as const

export function BoardKanbanView({
  columns,
  columnOrder,
  cardsByColumn,
  isCreatingCard,
  onAddCard,
  onDragEnd,
  onDragStart,
  onDragCancel,
  activeCard,
}: BoardKanbanViewProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    })
  )

  const columnsMap = useMemo(
    () => new Map(columns.map(column => [column.id, column])),
    [columns]
  )

  return (
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
        <div className="flex flex-1 items-stretch gap-4 overflow-x-auto pb-4">
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
                onAddCard={() => onAddCard(column)}
              />
            )
          })}
        </div>
      </SortableContext>
      <DragOverlay dropAnimation={null}>
        {activeCard ? <CardOverlay card={activeCard} /> : null}
      </DragOverlay>
    </DndContext>
  )
}

function CardOverlay({ card }: { card: KanbanCard }) {
  return (
    <div className="pointer-events-none flex w-[300px] max-w-full flex-col rounded-[1.75rem] border border-border bg-card p-5">
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
}: {
  column: KanbanColumn
  columnCards: KanbanCard[]
  onAddCard: () => void
  isCreatingCard: boolean
  accentIndex: number
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

  const theme =
    accentThemes[accentIndex % accentThemes.length] ?? accentThemes[0]

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="group flex h-full w-[320px] flex-shrink-0 flex-col gap-5 rounded-[2rem] border border-border bg-muted p-5 transition-all duration-200 active:cursor-grabbing"
    >
      <div
        className={cn(
          'flex items-center justify-between gap-3 rounded-3xl border bg-card px-5 py-4',
          theme.accentBorder
        )}
      >
        <div className="flex items-center gap-3" {...attributes} {...listeners}>
          <div className="flex items-center gap-2">
            <theme.icon className="h-4 w-4 text-gray-600 dark:text-gray-400" />
          </div>
          <h2 className="text-lg font-semibold text-foreground">
            {column.title}
          </h2>
        </div>
        <span
          className={cn(
            'rounded-full px-3 py-1 text-xs font-semibold',
            theme.count
          )}
        >
          {columnCards.length}
        </span>
      </div>
      <div
        ref={setDroppableRef}
        className="flex flex-1 flex-col gap-4 overflow-y-auto overflow-x-visible p-1"
      >
        <SortableContext
          items={columnCards.map(c => `card-${c.id}`)}
          strategy={verticalListSortingStrategy}
        >
          {columnCards.length > 0 ? (
            columnCards.map(card => <DraggableCard key={card.id} card={card} />)
          ) : (
            <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-border bg-card/70 p-6 text-center text-sm text-muted-foreground">
              No cards yet. Add the first one to get started.
            </div>
          )}
        </SortableContext>
      </div>
      <Button
        variant="ghost"
        onClick={onAddCard}
        disabled={isCreatingCard}
        className="flex items-center justify-center gap-2 rounded-2xl bg-card py-3 text-sm font-medium text-card-foreground transition disabled:cursor-not-allowed disabled:opacity-60"
      >
        <Plus className="h-4 w-4" />
        Add card
      </Button>
    </div>
  )
}

function DraggableCard({ card }: { card: KanbanCard }) {
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
    opacity: isDragging ? 0.85 : undefined,
    cursor: isDragging ? 'grabbing' : 'grab',
    willChange: 'transform',
    zIndex: isDragging ? 30 : undefined,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={cn(
        'flex flex-col rounded-[1.75rem] border border-border bg-card p-5 transition-all duration-200 active:cursor-grabbing'
      )}
    >
      <CardContent card={card} />
    </div>
  )
}

export type { DragEndEvent, DragStartEvent, DragCancelEvent }
