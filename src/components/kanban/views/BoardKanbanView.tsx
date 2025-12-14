import {
  DndContext,
  DragOverlay,
  PointerSensor,
  KeyboardSensor,
  pointerWithin,
  useDroppable,
  useSensor,
  useSensors,
  MeasuringStrategy,
  closestCenter,
  closestCorners,
  rectIntersection,
  type Announcements,
  type DragCancelEvent,
  type DragEndEvent,
  type DragStartEvent,
  type CollisionDetection,
  type DropAnimation,
} from '@dnd-kit/core'
import { snapCenterToCursor, restrictToWindowEdges } from '@dnd-kit/modifiers'
import {
  SortableContext,
  horizontalListSortingStrategy,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { cn } from '@/lib/utils'
import type { KanbanCard, KanbanColumn } from '@/types/common'
import { Plus } from 'lucide-react'
import { PaperclipIcon, CalendarIcon } from '@/components/ui/icons'
import { Badge } from '@/components/ui/badge'
import { useMemo, useState, useCallback, useEffect } from 'react'
import '../../../styles/kanban.css'
import { KanbanCardItem } from '../card/KanbanCardItem'
import { CARD_DUE_STATUS_STYLES, getCardDueMetadata } from './card-date'
import { getTagBadgeStyle } from '../tags/utils'
import { AddTaskDialog } from '../AddTaskDialog'
import { getColumnIconComponent } from '@/components/kanban/column-icon-options'
import {
  DEFAULT_COLUMN_ICON,
  FALLBACK_COLUMN_COLORS,
} from '@/constants/kanban-columns'
import { PRIORITY_VARIANTS } from './priority-variants'

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
  onDuplicateTask?: (card: KanbanCard) => void
  showSubtasksSummary?: boolean
  onMoveCardToNextColumn?: (card: KanbanCard) => void
  onMarkCardDone?: (card: KanbanCard) => void
  rowGrouping?: 'none' | 'priority'
  onChangeCardPriority?: (
    card: KanbanCard,
    priority: KanbanCard['priority']
  ) => void
  onMoveCardToColumn?: (card: KanbanCard, targetColumnId: string) => void
}

// Colisão composta: pointer → rectIntersection → cards/ends com closestCenter → colunas com closestCorners
const collisionDetection: CollisionDetection = args => {
  const { active, droppableContainers } = args
  const activeId = String(active.id)

  // 1) Precisão por ponteiro
  const pointer = pointerWithin(args)
  if (pointer.length > 0) return pointer

  // 2) Tolerância por interseção de retângulos (útil p/ teclado e sem ponteiro)
  const rects = rectIntersection(args)
  if (rects.length > 0) return rects

  // 3) Cards priorizam alvos relevantes (itens, área de cards e fim da coluna)
  if (activeId.startsWith('card-')) {
    const filtered = droppableContainers.filter(c => {
      const cid = String(c.id)
      return (
        cid.includes('-cards') ||
        cid.endsWith('-end') ||
        cid.startsWith('card-')
      )
    })
    return closestCenter({ ...args, droppableContainers: filtered })
  }

  // 4) Colunas funcionam melhor com cantos mais próximos
  return closestCorners(args)
}

// Drop animation sem flicker, ocultando o nó ativo durante o drop
const dropAnimation: DropAnimation | null = null

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
  onDuplicateTask,
  showSubtasksSummary,
  onMoveCardToNextColumn,
  onMarkCardDone,
  rowGrouping = 'none',
  onChangeCardPriority,
  onMoveCardToColumn,
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

  // Accessibility announcements para leitores de tela
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

  useEffect(() => {
    if (typeof document === 'undefined') return

    if (!activeCard) return

    const previousCursor = document.body.style.cursor
    document.body.style.cursor = 'grabbing'

    return () => {
      document.body.style.cursor = previousCursor
    }
  }, [activeCard])

  return (
    <>
      <DndContext
        sensors={sensors}
        collisionDetection={collisionDetection}
        onDragStart={onDragStart}
        onDragCancel={onDragCancel}
        onDragEnd={onDragEnd}
        accessibility={{ announcements }}
        measuring={{ droppable: { strategy: MeasuringStrategy.WhileDragging } }}
      >
        <SortableContext
          items={columnOrder.map(id => `column-${id}`)}
          strategy={horizontalListSortingStrategy}
        >
          <div className="flex h-full items-stretch gap-4 overflow-x-auto pb-4 pt-4 min-h-0 px-6">
            {columnOrder.map((columnId, index) => {
              const column = columnsMap.get(columnId)
              if (!column) {
                return null
              }
              const columnCards = cardsByColumn.get(column.id) ?? []
              const moveColumnOptions = columns.filter(
                col => col.id !== column.id
              )
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
                  onDuplicateCard={onDuplicateTask}
                  showSubtasksSummary={showSubtasksSummary}
                  onMoveCardToNextColumn={onMoveCardToNextColumn}
                  onMarkCardDone={onMarkCardDone}
                  rowGrouping={rowGrouping}
                  moveColumnOptions={moveColumnOptions}
                  onChangeCardPriority={onChangeCardPriority}
                  onMoveCardToColumn={onMoveCardToColumn}
                />
              )
            })}
          </div>
        </SortableContext>

        <DragOverlay
          dropAnimation={dropAnimation}
          modifiers={[snapCenterToCursor, restrictToWindowEdges]}
        >
          {activeCard ? (
            <CardOverlay
              card={activeCard}
              showSubtasksSummary={showSubtasksSummary}
            />
          ) : null}
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

function CardOverlay({
  card,
  showSubtasksSummary = true,
}: {
  card: KanbanCard
  showSubtasksSummary?: boolean
}) {
  const tagList = card.tags ?? []
  const displayTags = tagList.slice(0, 3)
  const remainingTags = tagList.length - displayTags.length
  const dueMetadata = getCardDueMetadata(card.dueDate)
  const hasAttachments = card.attachments && card.attachments.length > 0
  const subtasks = card.subtasks ?? []
  const totalSubtasks = subtasks.length
  const completedSubtasks = subtasks.filter(
    subtask => subtask.isCompleted
  ).length

  const priorityConfig =
    PRIORITY_VARIANTS[card.priority] ?? PRIORITY_VARIANTS.none
  const PriorityIcon = priorityConfig.icon

  return (
    <div className="group/card relative w-full flex flex-col gap-4 rounded-2xl border border-border/60 bg-background/95 p-4 text-left cursor-grabbing">
      {/* Header: Tags */}
      {tagList.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          {displayTags.map(tag => {
            const badgeStyle = getTagBadgeStyle(tag)
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
      <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-border/50">
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
            <span>{dueMetadata.formattedDate}</span>
          </Badge>
        )}

        {/* Attachments */}
        {hasAttachments && (
          <div className="inline-flex items-center gap-1.5 rounded-lg bg-blue-100 px-2.5 py-1 text-xs font-semibold text-blue-700 dark:bg-blue-950/50 dark:text-blue-400">
            <PaperclipIcon className="h-3 w-3 scale-x-[-1]" />
            <span>{card.attachments?.length}</span>
          </div>
        )}

        {/* Subtasks summary */}
        {showSubtasksSummary && totalSubtasks > 0 && (
          <div className="inline-flex items-center gap-1.5 rounded-lg bg-muted px-2.5 py-1 text-xs font-semibold text-muted-foreground">
            <span>
              {completedSubtasks}/{totalSubtasks}
            </span>
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
  onDuplicateCard,
  showSubtasksSummary,
  onMoveCardToNextColumn,
  onMarkCardDone,
  rowGrouping,
  moveColumnOptions,
  onChangeCardPriority,
  onMoveCardToColumn,
}: {
  column: KanbanColumn
  columnCards: KanbanCard[]
  onAddCard: () => void
  isCreatingCard: boolean
  accentIndex: number
  onCardSelect?: (card: KanbanCard) => void
  selectedCardId?: string | null
  onDeleteCard?: (card: KanbanCard) => void
  onDuplicateCard?: (card: KanbanCard) => void
  showSubtasksSummary?: boolean
  onMoveCardToNextColumn?: (card: KanbanCard) => void
  onMarkCardDone?: (card: KanbanCard) => void
  rowGrouping?: 'none' | 'priority'
  moveColumnOptions?: KanbanColumn[]
  onChangeCardPriority?: (
    card: KanbanCard,
    priority: KanbanCard['priority']
  ) => void
  onMoveCardToColumn?: (card: KanbanCard, targetColumnId: string) => void
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useSortable({
      id: `column-${column.id}`,
      animateLayoutChanges: () => false,
    })

  const { isOver: isColumnOver, setNodeRef: setDroppableRef } = useDroppable({
    id: `column-${column.id}-cards`,
  })

  const style: React.CSSProperties = {
    transform: transform ? CSS.Transform.toString(transform) : undefined,
    transition: 'none',
    // Optimize GPU acceleration para animações mais suaves
    willChange: 'transform',
  }

  const fallbackColor =
    FALLBACK_COLUMN_COLORS[accentIndex % FALLBACK_COLUMN_COLORS.length] ??
    FALLBACK_COLUMN_COLORS[0]
  const baseColor = column.color ?? fallbackColor
  const normalizedTitle = column.title.trim().toLowerCase()
  let inferredStatusIcon: string | null = null
  if (normalizedTitle === 'backlog') {
    inferredStatusIcon = 'BacklogStatus'
  } else if (normalizedTitle === 'to do' || normalizedTitle === 'todo') {
    inferredStatusIcon = 'TodoStatus'
  } else if (normalizedTitle === 'in progress') {
    inferredStatusIcon = 'InProgressStatus'
  } else if (normalizedTitle === 'done') {
    inferredStatusIcon = 'DoneStatus'
  }
  const resolvedIconKey =
    !column.icon || column.icon === DEFAULT_COLUMN_ICON
      ? (inferredStatusIcon ?? DEFAULT_COLUMN_ICON)
      : column.icon
  const ColumnIcon = getColumnIconComponent(resolvedIconKey)

  const priorityGroups = useMemo(() => {
    if (rowGrouping !== 'priority') {
      return [
        {
          key: 'all',
          label: null as string | null,
          cards: columnCards,
        },
      ]
    }

    const order: KanbanCard['priority'][] = ['high', 'medium', 'low']

    const groups: { key: string; label: string; cards: KanbanCard[] }[] = []

    for (const p of order) {
      const cards = columnCards.filter(card => card.priority === p)
      if (!cards.length) continue

      const label =
        p === 'high'
          ? 'High priority'
          : p === 'medium'
            ? 'Medium priority'
            : 'Low priority'

      groups.push({ key: p, label, cards })
    }

    const noPriority = columnCards.filter(
      card => !card.priority || !order.includes(card.priority)
    )
    if (noPriority.length) {
      groups.push({
        key: 'none',
        label: 'No priority',
        cards: noPriority,
      })
    }

    return groups
  }, [columnCards, rowGrouping])

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="group flex h-full w-[320px] flex-shrink-0 flex-col"
    >
      {/* Fixed Header */}
      <div
        className={cn(
          'sticky top-0 z-10 flex items-center justify-between gap-3 px-2 py-2 text-sm text-foreground',
          isDragging && 'opacity-70'
        )}
        {...attributes}
        {...listeners}
      >
        <div className="flex min-w-0 items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center">
            <ColumnIcon className="h-4 w-4" />
          </span>
          <div className="flex flex-col min-w-0">
            <h2 className="truncate font-medium leading-tight">
              {column.title}
            </h2>
            <p className="text-xs text-muted-foreground">
              {columnCards.length} tasks
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
          <button
            type="button"
            onClick={onAddCard}
            disabled={isCreatingCard}
            className="inline-flex items-center gap-1 rounded-full border border-dashed border-border/70 px-2 py-1 text-[0.72rem] font-semibold uppercase tracking-[0.1em] transition hover:border-primary/60 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
            aria-label={`Adicionar tarefa em ${column.title}`}
          >
            <Plus className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Add</span>
          </button>
        </div>
      </div>

      {/* Scrollable Content Area */}
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
        <div
          ref={setDroppableRef}
          className="flex-1 overflow-y-auto overflow-x-visible transition-all duration-200 kanban-column-cards"
        >
          <div className="flex flex-col gap-4 p-1 pt-4">
            <SortableContext
              id={`column-${column.id}-cards`}
              items={columnCards.map(card => `card-${card.id}`)}
              strategy={verticalListSortingStrategy}
            >
              {columnCards.length > 0 ? (
                <>
                  {priorityGroups.map(group => (
                    <div
                      key={group.key}
                      className={
                        rowGrouping === 'priority' ? 'space-y-1.5' : ''
                      }
                    >
                      {rowGrouping === 'priority' && group.label && (
                        <div className="flex items-center justify-between px-1 text-[11px] text-muted-foreground/80">
                          <span className="font-medium">{group.label}</span>
                          <span className="text-[10px]">
                            {group.cards.length}
                          </span>
                        </div>
                      )}
                      <div className="flex flex-col gap-2">
                        {group.cards.map(card => (
                          <KanbanCardItem
                            key={card.id}
                            card={card}
                            onSelect={onCardSelect}
                            isSelected={selectedCardId === card.id}
                            onDelete={onDeleteCard}
                            onDuplicate={onDuplicateCard}
                            showSubtasksSummary={showSubtasksSummary}
                            onQuickMoveToNext={
                              onMoveCardToNextColumn
                                ? () => onMoveCardToNextColumn(card)
                                : undefined
                            }
                            onQuickMarkDone={
                              onMarkCardDone
                                ? () => onMarkCardDone(card)
                                : undefined
                            }
                            onChangePriority={
                              onChangeCardPriority
                                ? priority =>
                                    onChangeCardPriority(card, priority)
                                : undefined
                            }
                            moveColumnOptions={moveColumnOptions?.map(col => {
                              const normalizedTitle = col.title
                                .trim()
                                .toLowerCase()
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

                              const resolvedKey =
                                !col.icon || col.icon === DEFAULT_COLUMN_ICON
                                  ? (inferredStatusIcon ?? DEFAULT_COLUMN_ICON)
                                  : col.icon

                              const StatusIcon =
                                getColumnIconComponent(resolvedKey)

                              return {
                                id: col.id,
                                title: col.title,
                                icon: StatusIcon,
                              }
                            })}
                            onMoveToColumn={
                              onMoveCardToColumn
                                ? columnId => onMoveCardToColumn(card, columnId)
                                : undefined
                            }
                          />
                        ))}
                      </div>
                    </div>
                  ))}
                  {/* Drop zone at the end of cards */}
                  <ColumnEndDropZone
                    columnId={column.id}
                    accentColor={baseColor}
                  />
                </>
              ) : (
                <EmptyColumnDropZone
                  accentColor={baseColor}
                  isOver={isColumnOver}
                />
              )}
            </SortableContext>
          </div>
        </div>
      </div>
    </div>
  )
}

function EmptyColumnDropZone({
  accentColor: _accentColor,
  isOver: _isOver,
}: {
  accentColor: string
  isOver: boolean
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card/70 p-8 text-center text-sm text-muted-foreground min-h-[160px] m-2">
      <div className="flex flex-col items-center gap-2">
        <span className="text-muted-foreground">No tasks yet.</span>
        <span className="text-muted-foreground text-xs">
          Add the first one to get started.
        </span>
      </div>
    </div>
  )
}

function ColumnEndDropZone({
  columnId,
  accentColor: _accentColor,
}: {
  columnId: string
  accentColor: string
}) {
  const { setNodeRef } = useDroppable({
    id: `column-${columnId}-end`,
  })

  return (
    <div
      ref={setNodeRef}
      className="mt-4 min-h-[20px] rounded-xl border-2 border-transparent"
    />
  )
}

export type { DragEndEvent, DragStartEvent, DragCancelEvent }
