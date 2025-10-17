import { useCallback, useEffect, useId, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
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
import { BoardKanbanView } from './views/BoardKanbanView'
import { BoardListView } from './views/BoardListView'
import { BoardTimelineView } from './views/BoardTimelineView'
import { getCardDueMetadata } from './views/card-date'
import { TaskDetailsPanel } from '@/components/kanban/TaskDetailsPanel'
import { ColumnManagerDialog } from '@/components/kanban/ColumnManagerDialog'
import { BoardNavbar } from '@/components/kanban/BoardNavbar'
import type {
  KanbanBoard,
  KanbanCard,
  KanbanColumn,
  KanbanPriority,
} from '@/types/common'
import { useWorkspaces } from '@/services/workspaces'
import {
  useCards,
  useColumns,
  useCreateCard,
  useMoveCard,
  useDeleteCard,
} from '@/services/kanban'
import { Plus, Settings2 } from 'lucide-react'
import type {
  DragEndEvent,
  DragStartEvent,
  DragCancelEvent,
} from '@dnd-kit/core'

interface BoardDetailViewProps {
  board: KanbanBoard
  viewMode?: BoardViewMode
  onViewModeChange?: (mode: BoardViewMode) => void
}

export function BoardDetailView({
  board,
  viewMode = DEFAULT_BOARD_VIEW_MODE,
  onViewModeChange,
}: BoardDetailViewProps) {
  const navigate = useNavigate()
  const { data: workspaces = [] } = useWorkspaces()
  const [isColumnManagerOpen, setIsColumnManagerOpen] = useState(false)
  const [isCardDialogOpen, setIsCardDialogOpen] = useState(false)

  const [cardTitle, setCardTitle] = useState('')
  const [cardDescription, setCardDescription] = useState('')
  const [cardPriority, setCardPriority] = useState<KanbanPriority>('medium')
  const [cardDueDate, setCardDueDate] = useState('')
  const [cardDialogColumn, setCardDialogColumn] = useState<KanbanColumn | null>(
    null
  )
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null)
  const [activeDragCard, setActiveDragCard] = useState<KanbanCard | null>(null)
  const [activeNavTab, setActiveNavTab] = useState('tasks')

  const handleTabChange = useCallback(
    (tab: string) => {
      if (tab === 'notes') {
        navigate(`/projects/${board.id}/notes`)
        return
      }

      if (tab === 'draws') {
        navigate(`/projects/${board.id}/draws`)
        return
      }

      setActiveNavTab(tab)
    },
    [board.id, navigate]
  )

  const cardTitleId = useId()
  const cardDescriptionId = useId()
  const cardDueDateId = useId()

  const {
    data: columns = [],
    isLoading: isLoadingColumns,
    error: columnsError,
    refetch: refetchColumns,
  } = useColumns(board.id)

  const {
    data: allCards = [],
    isLoading: isLoadingCards,
    error: cardsError,
    refetch: refetchCards,
  } = useCards(board.id)

  const createCardMutation = useCreateCard(board.id)
  const moveCardMutation = useMoveCard(board.id)
  const deleteCardMutation = useDeleteCard(board.id)

  const parseCardId = useCallback((id: string | number) => {
    const raw = id.toString()
    return raw.startsWith('card-') ? raw.slice(5) : raw
  }, [])

  const parseColumnId = useCallback((id?: string | number | null) => {
    if (!id) return null
    let raw = id.toString()

    // Remove 'column-' prefix if present
    if (raw.startsWith('column-')) {
      raw = raw.slice(7)
    }

    // Remove '-cards' suffix if present
    if (raw.endsWith('-cards')) {
      raw = raw.slice(0, -6)
    }

    // Remove '-end' suffix if present (for end drop zones)
    if (raw.endsWith('-end')) {
      raw = raw.slice(0, -4)
    }

    // Also handle case where the ID is just the column ID without any prefix/suffix
    return raw || null
  }, [])

  const columnsById = useMemo(
    () => new Map(columns.map(column => [column.id, column])),
    [columns]
  )

  const columnsWithCounts = useMemo(
    () =>
      columns
        .map(column => ({
          ...column,
          cardCount: allCards.filter(card => card.columnId === column.id)
            .length,
        }))
        .sort((a, b) => a.position - b.position),
    [columns, allCards]
  )

  const visibleColumns = useMemo(
    () => columnsWithCounts.filter(column => column.isEnabled !== false),
    [columnsWithCounts]
  )

  // const hiddenColumnCount = columnsWithCounts.length - visibleColumns.length

  const visibleColumnIds = useMemo(
    () => new Set(visibleColumns.map(column => column.id)),
    [visibleColumns]
  )

  const visibleCards = useMemo(
    () => allCards.filter(card => visibleColumnIds.has(card.columnId)),
    [allCards, visibleColumnIds]
  )

  const visibleColumnsById = useMemo(
    () => new Map(visibleColumns.map(column => [column.id, column])),
    [visibleColumns]
  )

  const cardsByColumn = useMemo(
    () =>
      new Map(
        visibleColumns.map(column => [
          column.id,
          visibleCards
            .filter(card => card.columnId === column.id)
            .sort((a, b) => {
              const priorityOrder = { high: 3, medium: 2, low: 1 }
              const priorityDiff =
                priorityOrder[b.priority] - priorityOrder[a.priority]

              if (priorityDiff !== 0) {
                return priorityDiff
              }

              return a.title.localeCompare(b.title)
            }),
        ])
      ),
    [visibleColumns, visibleCards]
  )

  const dueSummary = useMemo(() => {
    const summary = { overdue: 0, today: 0, soon: 0 }
    visibleCards.forEach(card => {
      const metadata = getCardDueMetadata(card.dueDate)
      if (!metadata) return
      if (metadata.status === 'overdue') {
        summary.overdue += 1
      } else if (metadata.status === 'today') {
        summary.today += 1
      } else if (metadata.status === 'soon') {
        summary.soon += 1
      }
    })
    return summary
  }, [visibleCards])

  const selectedCard = useMemo(
    () => visibleCards.find(card => card.id === selectedCardId) ?? null,
    [visibleCards, selectedCardId]
  )

  useEffect(() => {
    if (!selectedCardId) return
    if (!visibleCards.some(card => card.id === selectedCardId)) {
      setSelectedCardId(null)
    }
  }, [visibleCards, selectedCardId])

  const resetCardForm = useCallback(() => {
    setCardTitle('')
    setCardDescription('')
    setCardPriority('medium')
    setCardDueDate('')
  }, [])

  const handleCreateCard = useCallback(
    async (event: React.FormEvent) => {
      event.preventDefault()
      if (!cardTitle.trim() || !cardDialogColumn) return

      try {
        const trimmedTitle = cardTitle.trim()
        const columnCards = cardsByColumn.get(cardDialogColumn.id) || []

        // Always insert at the end of the column
        // The frontend displays cards sorted by priority and name,
        // but the backend position is just sequential (0, 1, 2...)
        const targetPosition = columnCards.length + 1

        await createCardMutation.mutateAsync({
          id: `temp-${Date.now()}`,
          boardId: board.id,
          columnId: cardDialogColumn.id,
          title: trimmedTitle,
          description: cardDescription.trim() || undefined,
          priority: cardPriority,
          dueDate: cardDueDate || undefined,
          position: targetPosition,
          tagIds: [],
        })
        resetCardForm()
        setIsCardDialogOpen(false)
        setCardDialogColumn(null)
      } catch (error) {
        console.error('Failed to create card', error)
        toast.error('Failed to create card')
      }
    },
    [
      board.id,
      cardTitle,
      cardDescription,
      cardPriority,
      cardDueDate,
      cardDialogColumn,
      createCardMutation,
      resetCardForm,
      cardsByColumn,
    ]
  )

  const handleCardSelect = useCallback(
    (card: KanbanCard) => {
      setSelectedCardId(card.id === selectedCardId ? null : card.id)
    },
    [selectedCardId]
  )

  const handleCloseDetails = useCallback(() => {
    setSelectedCardId(null)
  }, [])

  const handleDeleteCard = useCallback(
    async (card: KanbanCard) => {
      try {
        await deleteCardMutation.mutateAsync({
          id: card.id,
          boardId: board.id,
          columnId: card.columnId,
        })
        setSelectedCardId(prev => (prev === card.id ? null : prev))
        toast.success('Task deleted')
      } catch (error) {
        console.error('Failed to delete task', error)
        toast.error('Failed to delete task')
      }
    },
    [board.id, deleteCardMutation]
  )

  const handleDragStart = useCallback(
    (event: DragStartEvent) => {
      const rawId = event.active.id.toString()
      if (!rawId.startsWith('card-')) return

      const cardId = parseCardId(rawId)
      const card = visibleCards.find(c => c.id === cardId) ?? null
      setActiveDragCard(card)
    },
    [visibleCards, parseCardId]
  )

  const handleDragCancel = useCallback((_: DragCancelEvent) => {
    setActiveDragCard(null)
  }, [])

  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      setActiveDragCard(null)

      const { active, over } = event
      if (!over) return

      const rawActiveId = active.id.toString()
      if (!rawActiveId.startsWith('card-')) return

      const activeCardId = parseCardId(rawActiveId)
      const activeCard = visibleCards.find(card => card.id === activeCardId)
      if (!activeCard) return

      // Enhanced parsing logic to handle different drop scenarios
      const overData = over.data?.current as
        | { sortable?: { containerId?: string | number; index: number } }
        | undefined
      let destinationColumnId: string | null = null
      let targetIndex = 0

      // Try to get column ID from sortable container first (when dropping between cards)
      if (overData?.sortable?.containerId) {
        destinationColumnId = parseColumnId(overData.sortable.containerId)
        targetIndex = overData.sortable.index ?? 0
      }
      // If no container, check if we're dropping on a card directly
      else if (over.id.toString().startsWith('card-')) {
        const overCardId = parseCardId(over.id)
        const overCard = visibleCards.find(card => card.id === overCardId)
        if (overCard) {
          destinationColumnId = overCard.columnId
          // Find the position of the card we're dropping on
          const columnCards = cardsByColumn.get(overCard.columnId) ?? []
          targetIndex = columnCards.findIndex(card => card.id === overCardId)
          if (targetIndex === -1) targetIndex = columnCards.length
        }
      }
      // Finally, try to parse the over.id directly (when dropping on empty column or end zone)
      else {
        destinationColumnId = parseColumnId(over.id)
        const columnCards = cardsByColumn.get(destinationColumnId ?? '') ?? []

        // If dropping on end zone, always add to the end
        if (over.id.toString().endsWith('-end')) {
          targetIndex = columnCards.length
        } else {
          targetIndex = columnCards.length // Add to end if dropping on empty area
        }
      }

      console.log('Drag end debug:', {
        activeId: active.id,
        overId: over.id,
        overData,
        destinationColumnId,
        targetIndex,
        availableColumns: columns.map(c => ({ id: c.id, title: c.title })),
        activeCard: { id: activeCard.id, columnId: activeCard.columnId },
      })

      if (!destinationColumnId) {
        console.warn('Could not determine destination column ID')
        return
      }

      // Validate that the destination column exists
      if (!columns.some(col => col.id === destinationColumnId)) {
        console.warn('Destination column does not exist:', destinationColumnId)
        return
      }

      const columnCards = cardsByColumn.get(destinationColumnId) ?? []

      // Check if we're moving within the same column - if so, do nothing
      if (destinationColumnId === activeCard.columnId) {
        console.log('Ignoring reorder within same column')
        return
      }

      // Moving to a different column - target index should be within the destination column's bounds
      targetIndex = Math.max(0, Math.min(targetIndex, columnCards.length))

      // Final validation before API call
      if (!activeCardId || !destinationColumnId) {
        console.error('Missing required data for move operation')
        return
      }

      // Only proceed with the API call if there's an actual position change
      try {
        console.log('Moving card:', {
          cardId: activeCardId,
          fromColumnId: activeCard.columnId,
          toColumnId: destinationColumnId,
          targetIndex,
          columnCardsCount: columnCards.length,
        })

        await moveCardMutation.mutateAsync({
          boardId: board.id,
          cardId: activeCardId,
          fromColumnId: activeCard.columnId,
          toColumnId: destinationColumnId,
          targetIndex,
        })

        console.log('Card moved successfully')
      } catch (error) {
        console.error('Failed to move card:', {
          error,
          cardId: activeCardId,
          fromColumnId: activeCard.columnId,
          toColumnId: destinationColumnId,
          targetIndex,
        })
        toast.error(
          `Failed to move card: ${error instanceof Error ? error.message : 'Unknown error'}`
        )
      }
    },
    [
      board.id,
      visibleCards,
      columns,
      cardsByColumn,
      moveCardMutation,
      parseCardId,
      parseColumnId,
    ]
  )

  const isKanbanView = viewMode === 'kanban'
  const resolvedViewMode = isBoardViewMode(viewMode)
    ? viewMode
    : DEFAULT_BOARD_VIEW_MODE

  const isCreatingCard = createCardMutation.isPending

  if (isLoadingColumns || isLoadingCards) {
    return (
      <div className="flex flex-col gap-4 p-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10" />
          <Skeleton className="h-6 w-48" />
        </div>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {['first', 'second', 'third'].map(key => (
            <div key={`column-skeleton-${key}`} className="space-y-4">
              <Skeleton className="h-6 w-24" />
              <div className="space-y-2">
                {['a', 'b', 'c'].map(cardKey => (
                  <Skeleton
                    key={`card-skeleton-${key}-${cardKey}`}
                    className="h-20 w-full"
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (columnsError || cardsError) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 p-6">
        <div className="text-center">
          <h2 className="text-lg font-semibold">Failed to load board</h2>
          <p className="text-muted-foreground">
            {columnsError?.message ||
              cardsError?.message ||
              'An error occurred'}
          </p>
        </div>
        <Button onClick={() => Promise.all([refetchColumns(), refetchCards()])}>
          Try Again
        </Button>
      </div>
    )
  }

  const taskControls = (
    <>
      <ToggleGroup
        type="single"
        value={resolvedViewMode}
        onValueChange={value => {
          if (value && onViewModeChange && isBoardViewMode(value)) {
            onViewModeChange(value)
          }
        }}
      >
        {BOARD_VIEW_OPTIONS.map(option => (
          <ToggleGroupItem
            key={option.value}
            value={option.value}
            aria-label={option.label}
          >
            <option.icon className="h-4 w-4" />
          </ToggleGroupItem>
        ))}
      </ToggleGroup>

      <Button variant="outline" onClick={() => setIsColumnManagerOpen(true)}>
        <Settings2 className="mr-2 h-4 w-4" />
        Manage Columns
      </Button>
    </>
  )

  return (
    <div className="flex flex-col h-screen max-h-screen overflow-hidden">
      {/* Navbar */}
      <BoardNavbar
        boardTitle={board.title}
        boardIcon={board.icon ?? undefined}
        boardEmoji={board.emoji ?? undefined}
        boardColor={board.color ?? undefined}
        workspaceName={workspaces.find(ws => ws.id === board.workspaceId)?.name}
        activeTab={activeNavTab}
        onTabChange={handleTabChange}
        dueSummary={dueSummary}
        taskControls={taskControls}
      />

      {/* Main Content */}
      <div className="flex flex-col gap-6 p-6 flex-1 overflow-hidden">
        {activeNavTab === 'tasks' ? (
          <>
            {columnsWithCounts.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-4 py-12">
                <div className="text-center">
                  <h2 className="text-lg font-semibold">No columns yet</h2>
                  <p className="text-muted-foreground">
                    Create your first column to start organizing tasks
                  </p>
                </div>
                <Button onClick={() => setIsColumnManagerOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Column
                </Button>
              </div>
            ) : visibleColumns.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-4 py-12">
                <div className="text-center max-w-md">
                  <h2 className="text-lg font-semibold">
                    All columns are hidden
                  </h2>
                  <p className="text-muted-foreground">
                    Enable at least one column in the manager to view tasks on
                    this board.
                  </p>
                </div>
                <Button
                  variant="outline"
                  onClick={() => setIsColumnManagerOpen(true)}
                >
                  <Settings2 className="mr-2 h-4 w-4" />
                  Manage columns
                </Button>
              </div>
            ) : (
              <div className="flex flex-1 min-h-0 overflow-hidden">
                <div className="flex-1 min-h-0 overflow-hidden">
                  {isKanbanView ? (
                    <BoardKanbanView
                      columns={visibleColumns}
                      columnOrder={visibleColumns.map(col => col.id)}
                      cardsByColumn={cardsByColumn}
                      isCreatingCard={isCreatingCard}
                      onDragStart={handleDragStart}
                      onDragCancel={handleDragCancel}
                      onDragEnd={handleDragEnd}
                      activeCard={activeDragCard}
                      onCardSelect={handleCardSelect}
                      selectedCardId={selectedCardId}
                      boardId={board.id}
                      onDeleteTask={handleDeleteCard}
                      onCreateTask={async task => {
                        // Always insert at the end of the column
                        // The frontend displays cards sorted by priority and name,
                        // but the backend position is just sequential (0, 1, 2...)
                        const columnCards =
                          cardsByColumn.get(task.columnId) || []
                        const targetPosition = columnCards.length + 1

                        await createCardMutation.mutateAsync({
                          id: task.id,
                          boardId: task.boardId,
                          columnId: task.columnId,
                          title: task.title,
                          description: task.description || undefined,
                          priority: task.priority,
                          dueDate: task.dueDate ?? undefined,
                          position: targetPosition,
                          tagIds: task.tagIds ?? [],
                        })
                      }}
                    />
                  ) : resolvedViewMode === 'list' ? (
                    <BoardListView
                      columns={visibleColumns}
                      cardsByColumn={cardsByColumn}
                      isCreatingCard={isCreatingCard}
                      onCardSelect={handleCardSelect}
                      selectedCardId={selectedCardId}
                      boardId={board.id}
                      onDeleteTask={handleDeleteCard}
                      onCreateTask={async task => {
                        await createCardMutation.mutateAsync({
                          id: task.id,
                          boardId: task.boardId,
                          columnId: task.columnId,
                          title: task.title,
                          description: task.description || undefined,
                          priority: task.priority,
                          dueDate: task.dueDate ?? undefined,
                          position: task.position,
                          tagIds: task.tagIds ?? [],
                        })
                      }}
                    />
                  ) : (
                    <BoardTimelineView
                      cards={visibleCards}
                      columnsById={visibleColumnsById}
                      onDeleteTask={handleDeleteCard}
                    />
                  )}
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="flex flex-col items-center justify-center gap-4 py-12 flex-1">
            <div className="text-center">
              <h2 className="text-lg font-semibold capitalize">
                {activeNavTab}
              </h2>
              <p className="text-muted-foreground">
                This section is coming soon
              </p>
            </div>
          </div>
        )}

        <ColumnManagerDialog
          boardId={board.id}
          columns={columnsWithCounts}
          open={isColumnManagerOpen}
          onOpenChange={setIsColumnManagerOpen}
        />

        {/* Task Details Panel */}
        {selectedCard ? (
          <TaskDetailsPanel
            card={selectedCard}
            column={columnsById.get(selectedCard.columnId) ?? null}
            onClose={handleCloseDetails}
          />
        ) : null}

        {/* Create Card Dialog */}
        {isCardDialogOpen && cardDialogColumn && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-background rounded-lg shadow-lg w-full max-w-md">
              <div className="p-6">
                <h2 className="text-lg font-semibold mb-4">
                  Create Task in {cardDialogColumn.title}
                </h2>
                <form onSubmit={handleCreateCard}>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor={cardTitleId}>Title</Label>
                      <Input
                        id={cardTitleId}
                        value={cardTitle}
                        onChange={e => setCardTitle(e.target.value)}
                        placeholder="Enter task title"
                        disabled={isCreatingCard}
                        autoFocus
                      />
                    </div>
                    <div>
                      <Label htmlFor={cardDescriptionId}>Description</Label>
                      <Textarea
                        id={cardDescriptionId}
                        value={cardDescription}
                        onChange={e => setCardDescription(e.target.value)}
                        placeholder="Enter task description (optional)"
                        disabled={isCreatingCard}
                        rows={3}
                      />
                    </div>
                    <div>
                      <Label htmlFor="card-priority">Priority</Label>
                      <Select
                        value={cardPriority}
                        onValueChange={(value: KanbanPriority) =>
                          setCardPriority(value)
                        }
                        disabled={isCreatingCard}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="low">Low</SelectItem>
                          <SelectItem value="medium">Medium</SelectItem>
                          <SelectItem value="high">High</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor={cardDueDateId}>Due Date</Label>
                      <Input
                        id={cardDueDateId}
                        type="date"
                        value={cardDueDate}
                        onChange={e => setCardDueDate(e.target.value)}
                        disabled={isCreatingCard}
                      />
                    </div>
                  </div>
                  <div className="flex justify-end gap-2 mt-6">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setIsCardDialogOpen(false)
                        setCardDialogColumn(null)
                        resetCardForm()
                      }}
                      disabled={isCreatingCard}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={isCreatingCard || !cardTitle.trim()}
                    >
                      {isCreatingCard ? 'Creating...' : 'Create Task'}
                    </Button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
