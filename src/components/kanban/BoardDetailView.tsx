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
import { Plus } from 'lucide-react'

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
          className="w-max px-3 py-2 h-auto text-gray-600 hover:text-gray-900 hover:bg-gray-100/60 dark:text-gray-400 dark:hover:text-gray-200 dark:hover:bg-gray-800/60 transition-all duration-200 rounded-xl"
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
            className="rounded-xl border border-border/60 bg-background/60 backdrop-blur"
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
                variant="outline"
                className="flex items-center gap-2 rounded-xl"
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
        />
      ) : resolvedViewMode === 'list' ? (
        <BoardListView
          columns={sortedColumns}
          cardsByColumn={cardsByColumn}
          onAddCard={column => {
            setCardDialogColumn(column)
            resetCardForm()
          }}
          isCreatingCard={isCreatingCard}
        />
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
