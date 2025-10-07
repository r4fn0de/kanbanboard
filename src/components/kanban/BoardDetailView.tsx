import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { toast } from 'sonner'

import { arrayMove } from '@dnd-kit/sortable'
import type {
  DragCancelEvent,
  DragEndEvent,
  DragStartEvent,
} from '@/components/kanban/views/BoardKanbanView'
import { useQueryClient } from '@tanstack/react-query'

import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import {
  BOARD_VIEW_OPTIONS,
  DEFAULT_BOARD_VIEW_MODE,
  isBoardViewMode,
  type BoardViewMode,
} from '@/components/kanban/board-view-modes'
import { BoardKanbanView } from '@/components/kanban/views/BoardKanbanView'
import { BoardListView } from '@/components/kanban/views/BoardListView'
import { BoardTimelineView } from '@/components/kanban/views/BoardTimelineView'
import { PriorityBadge } from '@/components/kanban/views/board-shared'
import { formatCardDueDate } from '@/components/kanban/views/card-date'
import type { KanbanBoard, KanbanCard, KanbanColumn } from '@/types/common'
import {
  useCards,
  useColumns,
  useCreateCard,
  useCreateColumn,
  kanbanQueryKeys,
  useMoveCard,
  useMoveColumn,
} from '@/services/kanban'
import { Plus, X } from 'lucide-react'
import { useUpdateCard, type UpdateCardInput } from '@/services/kanban'

const DEFAULT_COLUMN_TITLES = ['To-Do', 'In Progress', 'Done'] as const

interface BoardDetailViewProps {
  board: KanbanBoard
  onBack: () => void
  viewMode?: BoardViewMode
  onViewModeChange?: (mode: BoardViewMode) => void
}

export function BoardDetailView({
  board,
  onBack,
  viewMode,
  onViewModeChange,
}: BoardDetailViewProps) {
  const queryClient = useQueryClient()
  const {
    data: columns = [],
    isLoading: isLoadingColumns,
    isError: isColumnsError,
    error: columnsError,
    refetch: refetchColumns,
  } = useColumns(board.id)

  const {
    data: cards = [],
    isLoading: isLoadingCards,
    isError: isCardsError,
    error: cardsError,
    refetch: refetchCards,
  } = useCards(board.id)

  const { mutateAsync: createColumn, isPending: isCreatingColumn } =
    useCreateColumn(board.id)
  const { mutateAsync: createCard, isPending: isCreatingCard } = useCreateCard(
    board.id
  )
  const { mutate: moveColumnMutate } = useMoveColumn(board.id)
  const { mutate: moveCardMutate } = useMoveCard(board.id)
  const { mutateAsync: updateCard, isPending: isUpdatingCard } = useUpdateCard(
    board.id
  )

  const [internalViewMode, setInternalViewMode] = useState<BoardViewMode>(
    DEFAULT_BOARD_VIEW_MODE
  )

  useEffect(() => {
    if (viewMode && isBoardViewMode(viewMode)) {
      setInternalViewMode(viewMode)
    }
  }, [viewMode])

  const resolvedViewMode =
    viewMode && isBoardViewMode(viewMode) ? viewMode : internalViewMode

  const handleViewModeSelect = useCallback(
    (nextMode: BoardViewMode) => {
      if (!viewMode) {
        setInternalViewMode(nextMode)
      }
      onViewModeChange?.(nextMode)
    },
    [onViewModeChange, viewMode]
  )

  const isKanbanView = resolvedViewMode === 'kanban'

  const handleToggleViewChange = useCallback(
    (value: string) => {
      if (isBoardViewMode(value)) {
        handleViewModeSelect(value)
      }
    },
    [handleViewModeSelect]
  )

  const [isColumnDialogOpen, setIsColumnDialogOpen] = useState(false)
  const [columnTitle, setColumnTitle] = useState('')
  const [columnWipLimit, setColumnWipLimit] = useState('')
  const [columnFormError, setColumnFormError] = useState<string | null>(null)
  const columnTitleId = useId()
  const columnWipId = useId()

  const [cardDialogColumn, setCardDialogColumn] = useState<KanbanColumn | null>(
    null
  )
  const [cardTitle, setCardTitle] = useState('')
  const [cardDescription, setCardDescription] = useState('')
  const [cardPriority, setCardPriority] =
    useState<KanbanCard['priority']>('low')
  const [cardDueDate, setCardDueDate] = useState('')
  const [cardFormError, setCardFormError] = useState<string | null>(null)
  const cardTitleId = useId()
  const cardDescriptionId = useId()
  const cardDueDateId = useId()
  const [activeCardId, setActiveCardId] = useState<string | null>(null)
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null)
  const hasSeededDefaultColumns = useRef(false)

  const [columnOrder, setColumnOrder] = useState<string[]>([])

  useEffect(() => {
    const orderedIds = [...columns]
      .sort((a, b) => a.position - b.position)
      .map(column => column.id)

    setColumnOrder(prev => {
      if (
        prev.length === orderedIds.length &&
        prev.every((id, index) => orderedIds[index] === id)
      ) {
        return prev
      }
      return orderedIds
    })
  }, [columns])

  const cardsByColumn = useMemo(() => {
    const map = new Map<string, KanbanCard[]>()
    for (const column of columns) {
      map.set(column.id, [])
    }

    for (const card of cards) {
      const list = map.get(card.columnId)
      if (list) {
        list.push(card)
      }
    }

    for (const list of map.values()) {
      list.sort((a, b) => a.position - b.position)
    }

    return map
  }, [columns, cards])

  const sortedColumns = useMemo(
    () => [...columns].sort((a, b) => a.position - b.position),
    [columns]
  )

  const columnsById = useMemo(
    () => new Map(columns.map(column => [column.id, column])),
    [columns]
  )

  const hasColumns = sortedColumns.length > 0

  const activeCard = useMemo(
    () => cards.find(card => card.id === activeCardId) ?? null,
    [activeCardId, cards]
  )
  const selectedCard = useMemo(
    () => cards.find(card => card.id === selectedCardId) ?? null,
    [cards, selectedCardId]
  )

  useEffect(() => {
    if (!selectedCardId) return
    if (!cards.some(card => card.id === selectedCardId)) {
      setSelectedCardId(null)
    }
  }, [cards, selectedCardId])

  const resetColumnForm = useCallback(() => {
    setColumnTitle('')
    setColumnWipLimit('')
    setColumnFormError(null)
  }, [])

  useEffect(() => {
    if (
      isLoadingColumns ||
      columns.length > 0 ||
      hasSeededDefaultColumns.current
    ) {
      return
    }

    hasSeededDefaultColumns.current = true
    ;(async () => {
      try {
        for (const [index, title] of DEFAULT_COLUMN_TITLES.entries()) {
          // Execute sequentially to avoid SQLite write lock errors
          await createColumn({
            id: crypto.randomUUID(),
            boardId: board.id,
            title,
            position: index,
            wipLimit: null,
          })
        }
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : typeof error === 'string'
              ? error
              : 'Could not create default columns'
        toast.error(message)
      }
    })()
  }, [board.id, columns.length, createColumn, isLoadingColumns])

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event
      setActiveCardId(null)
      if (!over) return

      const activeId = String(active.id)
      const overId = String(over.id)

      const getColumnIdFromSortableId = (id: string) =>
        id.replace(/^column-/, '').replace(/-cards$/, '')

      // Columns reordering
      if (activeId.startsWith('column-') && overId.startsWith('column-')) {
        const columnId = getColumnIdFromSortableId(activeId)
        const overColumnId = getColumnIdFromSortableId(overId)
        const fromIndex = columnOrder.indexOf(columnId)
        const toIndex = columnOrder.indexOf(overColumnId)
        if (fromIndex !== -1 && toIndex !== -1 && fromIndex !== toIndex) {
          setColumnOrder(current => arrayMove(current, fromIndex, toIndex))
          queryClient.setQueryData<KanbanColumn[]>(
            kanbanQueryKeys.columns(board.id),
            current => {
              if (!current) return current
              const reordered = arrayMove(current, fromIndex, toIndex).map(
                (col, idx) => ({
                  ...col,
                  position: idx,
                })
              )
              return reordered
            }
          )
          moveColumnMutate({
            boardId: board.id,
            columnId,
            targetIndex: toIndex,
          })
        }
        return
      }

      // Cards move (within or across columns)
      if (activeId.startsWith('card-')) {
        const cardId = activeId.replace('card-', '')
        const card = cards.find(c => c.id === cardId)
        if (!card) return

        let toColumnId: string | null = null
        let targetIndex = 0

        if (overId.startsWith('card-')) {
          const overCardId = overId.replace('card-', '')
          const overCard = cards.find(c => c.id === overCardId)
          if (!overCard) return
          toColumnId = overCard.columnId
          const list = cardsByColumn.get(toColumnId) ?? []
          targetIndex = list.findIndex(c => c.id === overCardId)
        } else if (overId.startsWith('column-') && overId.endsWith('-cards')) {
          toColumnId = overId.slice('column-'.length, -'-cards'.length)
          const list = cardsByColumn.get(toColumnId) ?? []
          targetIndex = list.length
        } else {
          return
        }

        if (toColumnId) {
          moveCardMutate({
            boardId: board.id,
            cardId,
            fromColumnId: card.columnId,
            toColumnId,
            targetIndex,
          })
        }
      }
    },
    [
      board.id,
      cards,
      cardsByColumn,
      moveCardMutate,
      moveColumnMutate,
      columnOrder,
      queryClient,
    ]
  )

  const handleDragStart = useCallback((event: DragStartEvent) => {
    const { active } = event
    const activeId = String(active.id)
    if (activeId.startsWith('card-')) {
      setActiveCardId(activeId.replace('card-', ''))
    }
  }, [])

  const handleDragCancel = useCallback((_: DragCancelEvent) => {
    setActiveCardId(null)
  }, [])

  const handleCardSelect = useCallback((card: KanbanCard) => {
    setSelectedCardId(card.id)
  }, [])

  const handleCloseDetails = useCallback(() => {
    setSelectedCardId(null)
  }, [])

  const handleUpdateCard = useCallback(
    async (
      cardId: string,
      updates: Omit<UpdateCardInput, 'id' | 'boardId'>
    ) => {
      await updateCard({ id: cardId, boardId: board.id, ...updates })
    },
    [board.id, updateCard]
  )

  const resetCardForm = useCallback(() => {
    setCardTitle('')
    setCardDescription('')
    setCardPriority('low')
    setCardDueDate('')
    setCardFormError(null)
  }, [])

  const handleCreateColumn = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault()
      setColumnFormError(null)

      const trimmedTitle = columnTitle.trim()
      if (!trimmedTitle) {
        setColumnFormError('Inform a name for the column.')
        return
      }

      const wipLimit = columnWipLimit.trim()
      const parsedWip = wipLimit ? Number.parseInt(wipLimit, 10) : undefined
      if (wipLimit && Number.isNaN(parsedWip)) {
        setColumnFormError('WIP limit must be an integer.')
        return
      }

      try {
        await createColumn({
          id: crypto.randomUUID(),
          boardId: board.id,
          title: trimmedTitle,
          position: columns.length,
          wipLimit: parsedWip ?? null,
        })
        toast.success('Column created successfully')
        resetColumnForm()
        setIsColumnDialogOpen(false)
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Could not create the column'
        setColumnFormError(message)
        toast.error(message)
      }
    },
    [
      board.id,
      columnTitle,
      columnWipLimit,
      columns.length,
      createColumn,
      resetColumnForm,
    ]
  )

  const handleCreateCard = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault()
      if (!cardDialogColumn) {
        setCardFormError('Select a valid column.')
        return
      }

      const trimmedTitle = cardTitle.trim()
      if (!trimmedTitle) {
        setCardFormError('Inform a title for the card.')
        return
      }

      try {
        await createCard({
          id: crypto.randomUUID(),
          boardId: board.id,
          columnId: cardDialogColumn.id,
          title: trimmedTitle,
          description: cardDescription.trim() || undefined,
          position: (cardsByColumn.get(cardDialogColumn.id)?.length ?? 0) + 1,
          priority: cardPriority,
          dueDate: cardDueDate ? new Date(cardDueDate).toISOString() : null,
        })
        toast.success('Card created successfully')
        resetCardForm()
        setCardDialogColumn(null)
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Could not create the card'
        setCardFormError(message)
        toast.error(message)
      }
    },
    [
      board.id,
      cardDescription,
      cardDialogColumn,
      cardDueDate,
      cardPriority,
      cardTitle,
      cardsByColumn,
      createCard,
      resetCardForm,
    ]
  )

  const handleRetry = useCallback(() => {
    refetchColumns()
    refetchCards()
  }, [refetchCards, refetchColumns])

  if (isLoadingColumns || isLoadingCards) {
    return (
      <div className="flex h-full flex-col gap-6 p-6">
        <div className="flex items-center gap-3">
          <Skeleton className="h-6 w-24" />
          <Skeleton className="h-6 w-40" />
        </div>
        <div className="flex items-center gap-3">
          <Skeleton className="h-10 w-24" />
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {['a', 'b', 'c'].map(key => (
            <Skeleton key={key} className="h-64" />
          ))}
        </div>
      </div>
    )
  }

  if (isColumnsError || isCardsError) {
    const message =
      columnsError instanceof Error
        ? columnsError.message
        : cardsError instanceof Error
          ? cardsError.message
          : 'Could not load the board data.'

    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 p-6 text-center">
        <p className="text-lg font-semibold text-foreground">{board.title}</p>
        <p className="max-w-md text-sm text-muted-foreground">{message}</p>
        <Button onClick={handleRetry}>Try again</Button>
        <Button variant="outline" onClick={onBack}>
          Back
        </Button>
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col gap-6 p-4">
      <div className="flex flex-col gap-2 -mt-2">
        <Button
          variant="ghost"
          className="w-max px-3 py-2 h-auto text-muted-foreground hover:text-foreground hover:bg-accent/60 dark:text-muted-foreground dark:hover:text-foreground dark:hover:bg-accent/60 transition-all duration-200 rounded-xl"
          onClick={onBack}
        >
          <svg
            className="w-4 h-4 mr-2"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 19l-7-7 7-7"
            />
          </svg>
          <span className="font-medium">Back</span>
        </Button>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {board.title}
          </h1>
          {board.description ? (
            <p className="text-sm text-muted-foreground">{board.description}</p>
          ) : null}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <ToggleGroup
            type="single"
            variant="outline"
            size="sm"
            value={resolvedViewMode}
            onValueChange={handleToggleViewChange}
            className="rounded-2xl border border-border bg-card"
          >
            {BOARD_VIEW_OPTIONS.map(option => {
              const Icon = option.icon
              return (
                <ToggleGroupItem
                  key={option.value}
                  value={option.value}
                  className="flex items-center gap-2 px-3 py-2 text-sm font-medium"
                >
                  <Icon className="h-4 w-4" />
                  <span>{option.label}</span>
                </ToggleGroupItem>
              )
            })}
          </ToggleGroup>
          <Dialog
            open={isColumnDialogOpen}
            onOpenChange={setIsColumnDialogOpen}
          >
            <DialogTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                className="flex items-center justify-center gap-2 rounded-2xl bg-card py-3 text-sm font-medium text-card-foreground transition disabled:cursor-not-allowed disabled:opacity-60"
                disabled={isCreatingColumn}
              >
                <Plus className="h-4 w-4" />
                New column
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>New column</DialogTitle>
                <DialogDescription>
                  Define a name and optionally a WIP limit for the column.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleCreateColumn} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor={columnTitleId}>Column name</Label>
                  <Input
                    id={columnTitleId}
                    value={columnTitle}
                    onChange={event => setColumnTitle(event.target.value)}
                    placeholder="Ex.: In progress"
                    autoFocus
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor={columnWipId}>WIP limit (optional)</Label>
                  <Input
                    id={columnWipId}
                    inputMode="numeric"
                    pattern="[0-9]*"
                    value={columnWipLimit}
                    onChange={event => setColumnWipLimit(event.target.value)}
                    placeholder="Ex.: 5 (optional)"
                  />
                </div>
                {columnFormError ? (
                  <p className="text-sm text-destructive">{columnFormError}</p>
                ) : null}
                <DialogFooter>
                  <DialogClose asChild>
                    <Button
                      type="button"
                      variant="outline"
                      disabled={isCreatingColumn}
                    >
                      Cancel
                    </Button>
                  </DialogClose>
                  <Button type="submit" disabled={isCreatingColumn}>
                    {isCreatingColumn ? 'Creating...' : 'Create column'}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {!hasColumns ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
          <p className="text-lg font-semibold text-foreground">
            No columns created
          </p>
          <p className="max-w-sm text-sm text-muted-foreground">
            Create the first column to start organizing the tasks in this board.
          </p>
          <Button
            onClick={() => setIsColumnDialogOpen(true)}
            disabled={isCreatingColumn}
          >
            Create first column
          </Button>
        </div>
      ) : isKanbanView ? (
        <div className="flex flex-1 flex-col gap-6 lg:flex-row lg:items-start lg:gap-8">
          <div className="flex-1 overflow-hidden h-full">
            <BoardKanbanView
              columns={columns}
              columnOrder={columnOrder}
              cardsByColumn={cardsByColumn}
              isCreatingCard={isCreatingCard}
              onAddCard={column => {
                setCardDialogColumn(column)
                resetCardForm()
              }}
              onDragStart={handleDragStart}
              onDragCancel={handleDragCancel}
              onDragEnd={handleDragEnd}
              activeCard={activeCard}
              onCardSelect={handleCardSelect}
              selectedCardId={selectedCardId}
            />
          </div>
          {selectedCard ? (
            <TaskDetailsPanel
              card={selectedCard}
              column={columnsById.get(selectedCard.columnId) ?? null}
              onClose={handleCloseDetails}
              onUpdate={updates => handleUpdateCard(selectedCard.id, updates)}
              isUpdating={isUpdatingCard}
            />
          ) : null}
        </div>
      ) : resolvedViewMode === 'list' ? (
        <div className="flex flex-1 flex-col gap-6 lg:flex-row lg:items-start lg:gap-8">
          <div className="flex-1">
            <BoardListView
              columns={sortedColumns}
              cardsByColumn={cardsByColumn}
              onAddCard={column => {
                setCardDialogColumn(column)
                resetCardForm()
              }}
              isCreatingCard={isCreatingCard}
              onCardSelect={handleCardSelect}
              selectedCardId={selectedCardId}
            />
          </div>
          {selectedCard ? (
            <TaskDetailsPanel
              card={selectedCard}
              column={columnsById.get(selectedCard.columnId) ?? null}
              onClose={handleCloseDetails}
              onUpdate={updates => handleUpdateCard(selectedCard.id, updates)}
              isUpdating={isUpdatingCard}
            />
          ) : null}
        </div>
      ) : (
        <BoardTimelineView cards={cards} columnsById={columnsById} />
      )}

      <Dialog
        open={Boolean(cardDialogColumn)}
        onOpenChange={open => {
          if (!open) {
            setCardDialogColumn(null)
          }
        }}
      >
        {cardDialogColumn ? (
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                New card in &quot;{cardDialogColumn.title}&quot;
              </DialogTitle>
              <DialogDescription>
                Detail the card to add it to the selected column.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreateCard} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor={cardTitleId}>Title</Label>
                <Input
                  id={cardTitleId}
                  value={cardTitle}
                  onChange={event => setCardTitle(event.target.value)}
                  placeholder="Ex.: Adjust page layout"
                  autoFocus
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor={cardDescriptionId}>
                  Description (optional)
                </Label>
                <Textarea
                  id={cardDescriptionId}
                  value={cardDescription}
                  onChange={event => setCardDescription(event.target.value)}
                  placeholder="Add relevant details"
                  rows={3}
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Priority</Label>
                  <Select
                    value={cardPriority}
                    onValueChange={value =>
                      setCardPriority(value as KanbanCard['priority'])
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select the priority" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor={cardDueDateId}>Due date</Label>
                  <Input
                    id={cardDueDateId}
                    type="date"
                    value={cardDueDate}
                    onChange={event => setCardDueDate(event.target.value)}
                  />
                </div>
              </div>
              {cardFormError ? (
                <p className="text-sm text-destructive">{cardFormError}</p>
              ) : null}
              <DialogFooter>
                <DialogClose asChild>
                  <Button
                    type="button"
                    variant="outline"
                    disabled={isCreatingCard}
                  >
                    Cancel
                  </Button>
                </DialogClose>
                <Button type="submit" disabled={isCreatingCard}>
                  {isCreatingCard ? 'Creating...' : 'Create card'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        ) : null}
      </Dialog>
    </div>
  )
}

export default BoardDetailView
interface TaskDetailsPanelProps {
  card: KanbanCard
  column: KanbanColumn | null
  onClose: () => void
  onUpdate: (updates: Omit<UpdateCardInput, 'id' | 'boardId'>) => Promise<void>
  isUpdating?: boolean
}

type TaskDetailsSavingField = 'title' | 'description' | 'priority' | 'dueDate'

function formatDateForInputValue(dueDate?: string | null): string {
  if (!dueDate) return ''
  const date = new Date(dueDate)
  if (Number.isNaN(date.getTime())) return ''
  const year = date.getUTCFullYear()
  const month = String(date.getUTCMonth() + 1).padStart(2, '0')
  const day = String(date.getUTCDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function toIsoFromDateInput(value: string): string {
  return new Date(`${value}T00:00:00Z`).toISOString()
}

function taskDetailsErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message) return error.message
  if (typeof error === 'string' && error.length > 0) return error
  return fallback
}

function TaskDetailsPanel({
  card,
  column,
  onClose,
  onUpdate,
  isUpdating,
}: TaskDetailsPanelProps) {
  const dueDateLabel = formatCardDueDate(card.dueDate)
  const [isEditingTitle, setIsEditingTitle] = useState(false)
  const [titleDraft, setTitleDraft] = useState(card.title)
  const [titleError, setTitleError] = useState<string | null>(null)
  const [isEditingDescription, setIsEditingDescription] = useState(false)
  const [descriptionDraft, setDescriptionDraft] = useState(
    card.description ?? ''
  )
  const [dueDateDraft, setDueDateDraft] = useState(
    formatDateForInputValue(card.dueDate)
  )
  const [savingField, setSavingField] = useState<TaskDetailsSavingField | null>(
    null
  )

  useEffect(() => {
    setTitleDraft(card.title)
    setDescriptionDraft(card.description ?? '')
    setDueDateDraft(formatDateForInputValue(card.dueDate))
    setIsEditingTitle(false)
    setIsEditingDescription(false)
    setTitleError(null)
    setSavingField(null)
  }, [card.id, card.title, card.description, card.dueDate])

  const handleTitleSubmit = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault()
      if (savingField && savingField !== 'title') return
      const nextTitle = titleDraft.trim()
      if (!nextTitle) {
        setTitleError('Inform a title for the card.')
        return
      }
      if (nextTitle === card.title) {
        setTitleError(null)
        setIsEditingTitle(false)
        return
      }
      setSavingField('title')
      setTitleError(null)
      try {
        await onUpdate({ title: nextTitle })
        setIsEditingTitle(false)
      } catch (error) {
        const message = taskDetailsErrorMessage(
          error,
          'Could not update the title.'
        )
        setTitleError(message)
      } finally {
        setSavingField(null)
      }
    },
    [card.title, onUpdate, savingField, titleDraft]
  )

  const handleCancelTitle = useCallback(() => {
    if (savingField === 'title') return
    setIsEditingTitle(false)
    setTitleDraft(card.title)
    setTitleError(null)
  }, [card.title, savingField])

  const handleDescriptionSubmit = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault()
      if (savingField && savingField !== 'description') return
      const trimmed = descriptionDraft.trim()
      const nextDescription = trimmed.length === 0 ? null : descriptionDraft
      const previousDescription = card.description ?? null
      if (nextDescription === previousDescription) {
        setIsEditingDescription(false)
        return
      }
      setSavingField('description')
      try {
        await onUpdate({ description: nextDescription })
        setIsEditingDescription(false)
      } catch (error) {
        const message = taskDetailsErrorMessage(
          error,
          'Could not update the description.'
        )
        toast.error(message)
      } finally {
        setSavingField(null)
      }
    },
    [card.description, descriptionDraft, onUpdate, savingField]
  )

  const handleCancelDescription = useCallback(() => {
    if (savingField === 'description') return
    setIsEditingDescription(false)
    setDescriptionDraft(card.description ?? '')
  }, [card.description, savingField])

  const handleDueDateChange = useCallback(
    async (value: string) => {
      if (savingField && savingField !== 'dueDate') return
      const nextDueDate = value ? toIsoFromDateInput(value) : null
      const previousDueDate = card.dueDate ?? null
      if (nextDueDate === previousDueDate) return
      setSavingField('dueDate')
      try {
        await onUpdate({ dueDate: nextDueDate })
      } catch {
        setDueDateDraft(formatDateForInputValue(card.dueDate))
      } finally {
        setSavingField(null)
      }
    },
    [card.dueDate, onUpdate, savingField]
  )

  const handlePriorityChange = useCallback(
    async (value: string) => {
      if (savingField && savingField !== 'priority') return
      const nextPriority = value as KanbanCard['priority']
      if (nextPriority === card.priority) return
      setSavingField('priority')
      try {
        await onUpdate({ priority: nextPriority })
      } finally {
        setSavingField(null)
      }
    },
    [card.priority, onUpdate, savingField]
  )

  const handleDueDateInputChange = useCallback(
    (value: string) => {
      setDueDateDraft(value)
      if (value.length === 10 || value === '') void handleDueDateChange(value)
    },
    [handleDueDateChange]
  )

  const handleClearDueDate = useCallback(() => {
    void handleDueDateChange('')
  }, [handleDueDateChange])

  const isBusy = savingField !== null || Boolean(isUpdating)

  return (
    <aside
      id="task-details-panel"
      className="w-full shrink-0 rounded-[2rem] border border-border bg-card p-6 shadow-sm lg:sticky lg:top-6 lg:w-[420px] xl:w-[480px] lg:min-h-[640px] xl:min-h-[720px] lg:max-h-[calc(100vh-48px)]"
      aria-busy={isBusy}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-2">
          <span className="text-xs font-semibold uppercase text-muted-foreground">
            Task details
          </span>
          {isEditingTitle ? (
            <form onSubmit={handleTitleSubmit} className="flex flex-col gap-3">
              <Input
                value={titleDraft}
                onChange={event => setTitleDraft(event.target.value)}
                autoFocus
                disabled={savingField === 'title'}
              />
              {titleError ? (
                <span className="text-xs text-destructive">{titleError}</span>
              ) : null}
              <div className="flex items-center gap-2">
                <Button
                  type="submit"
                  size="sm"
                  disabled={savingField === 'title'}
                >
                  Save
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleCancelTitle}
                  disabled={savingField === 'title'}
                >
                  Cancel
                </Button>
              </div>
            </form>
          ) : (
            <div className="flex items-center gap-3">
              <h2 className="text-lg font-semibold leading-snug text-foreground">
                {card.title}
              </h2>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="rounded-full px-3 py-1 text-xs font-semibold"
                onClick={() => setIsEditingTitle(true)}
                disabled={isBusy}
              >
                Edit
              </Button>
            </div>
          )}
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={onClose}
          className="h-8 w-8 rounded-full"
          aria-label="Close task details"
          disabled={isBusy}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="mt-6 space-y-6 text-sm">
        <div className="flex flex-col gap-2">
          <span className="text-xs font-semibold uppercase text-muted-foreground">
            Description
          </span>
          {isEditingDescription ? (
            <form
              onSubmit={handleDescriptionSubmit}
              className="flex flex-col gap-3"
            >
              <Textarea
                value={descriptionDraft}
                onChange={event => setDescriptionDraft(event.target.value)}
                rows={4}
                autoFocus
                disabled={savingField === 'description'}
              />
              <div className="flex items-center gap-2">
                <Button
                  type="submit"
                  size="sm"
                  disabled={savingField === 'description'}
                >
                  Save
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleCancelDescription}
                  disabled={savingField === 'description'}
                >
                  Cancel
                </Button>
              </div>
            </form>
          ) : card.description ? (
            <div className="flex flex-col gap-3">
              <div className="rounded-2xl border border-border bg-muted/60 p-4 text-muted-foreground">
                {card.description}
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="w-fit rounded-full px-3 py-1 text-xs font-semibold"
                onClick={() => setIsEditingDescription(true)}
                disabled={isBusy}
              >
                Edit description
              </Button>
            </div>
          ) : (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-fit rounded-full px-3 py-1 text-xs font-semibold"
              onClick={() => setIsEditingDescription(true)}
              disabled={isBusy}
            >
              Add description
            </Button>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <span className="text-xs font-semibold uppercase text-muted-foreground">
            Priority
          </span>
          <Select
            value={card.priority}
            onValueChange={handlePriorityChange}
            disabled={isBusy}
          >
            <SelectTrigger className="w-fit min-w-[160px] justify-start rounded-full px-4 py-2">
              <div className="flex items-center gap-2">
                <PriorityBadge priority={card.priority} />
              </div>
            </SelectTrigger>
            <SelectContent align="start">
              <SelectItem value="low">Low</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="high">High</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-2">
          <span className="text-xs font-semibold uppercase text-muted-foreground">
            Column
          </span>
          <div className="rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
            {column ? column.title : 'Unknown column'}
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <span className="text-xs font-semibold uppercase text-muted-foreground">
            Due date
          </span>
          <div className="flex flex-wrap items-center gap-2">
            <Input
              type="date"
              value={dueDateDraft}
              onChange={event => handleDueDateInputChange(event.target.value)}
              disabled={isBusy}
              className="w-full max-w-[200px]"
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="rounded-full px-3 py-1 text-xs font-semibold"
              onClick={handleClearDueDate}
              disabled={isBusy || dueDateDraft.length === 0}
            >
              Clear
            </Button>
          </div>
          {dueDateLabel ? (
            <div className="rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
              {dueDateLabel}
            </div>
          ) : (
            <span className="rounded-full border border-dashed border-border px-3 py-1 text-xs text-muted-foreground">
              No due date
            </span>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <span className="text-xs font-semibold uppercase text-muted-foreground">
            Tags
          </span>
          {card.tags.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {card.tags.map(tag => (
                <Badge
                  key={tag}
                  variant="secondary"
                  className="rounded-full px-3 py-1 text-xs"
                >
                  {tag}
                </Badge>
              ))}
            </div>
          ) : (
            <span className="rounded-full border border-dashed border-border px-3 py-1 text-xs text-muted-foreground">
              No tags
            </span>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <span className="text-xs font-semibold uppercase text-muted-foreground">
            Metadata
          </span>
          <div className="grid gap-2 text-xs text-muted-foreground">
            <span>
              Created:{' '}
              <time dateTime={card.createdAt}>
                {new Intl.DateTimeFormat(undefined, {
                  dateStyle: 'medium',
                  timeStyle: 'short',
                }).format(new Date(card.createdAt))}
              </time>
            </span>
            <span>
              Updated:{' '}
              <time dateTime={card.updatedAt}>
                {new Intl.DateTimeFormat(undefined, {
                  dateStyle: 'medium',
                  timeStyle: 'short',
                }).format(new Date(card.updatedAt))}
              </time>
            </span>
          </div>
        </div>
      </div>
    </aside>
  )
}
