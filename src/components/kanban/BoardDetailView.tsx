import { useCallback, useEffect, useId, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { useQueryClient } from '@tanstack/react-query'

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
import { BoardKanbanView } from '@/components/kanban/views/BoardKanbanView'
import { BoardListView } from '@/components/kanban/views/BoardListView'
import { BoardTimelineView } from '@/components/kanban/views/BoardTimelineView'
import { TaskDetailsPanel } from '@/components/kanban/TaskDetailsPanel'
import type { KanbanBoard, KanbanCard, KanbanColumn, KanbanPriority } from '@/types/common'
import {
  useCards,
  useColumns,
  useCreateCard,
  useCreateColumn,
  kanbanQueryKeys,
  useMoveCard,
} from '@/services/kanban'
import { Plus, X } from 'lucide-react'
import type { DragEndEvent, DragStartEvent, DragCancelEvent } from '@dnd-kit/core'

interface BoardDetailViewProps {
  board: KanbanBoard
  onBack: () => void
  viewMode?: BoardViewMode
  onViewModeChange?: (mode: BoardViewMode) => void
}

export function BoardDetailView({
  board,
  onBack,
  viewMode = DEFAULT_BOARD_VIEW_MODE,
  onViewModeChange,
}: BoardDetailViewProps) {
  const queryClient = useQueryClient()
  const [isColumnDialogOpen, setIsColumnDialogOpen] = useState(false)
  const [isCardDialogOpen, setIsCardDialogOpen] = useState(false)
  const [columnTitle, setColumnTitle] = useState('')
  const [cardTitle, setCardTitle] = useState('')
  const [cardDescription, setCardDescription] = useState('')
  const [cardPriority, setCardPriority] = useState<KanbanPriority>('medium')
  const [cardDueDate, setCardDueDate] = useState('')
  const [cardDialogColumn, setCardDialogColumn] = useState<KanbanColumn | null>(null)
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null)
  const [activeDragCard, setActiveDragCard] = useState<KanbanCard | null>(null)

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
    data: cards = [],
    isLoading: isLoadingCards,
    error: cardsError,
    refetch: refetchCards,
  } = useCards(board.id)

  const createColumnMutation = useCreateColumn()
  const createCardMutation = useCreateCard(board.id)
  const moveCardMutation = useMoveCard(board.id)

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
    () => new Map(columns.map((column) => [column.id, column])),
    [columns]
  )

  const sortedColumns = useMemo(
    () =>
      columns
        .map((column) => ({
          ...column,
          cardCount: cards.filter((card) => card.columnId === column.id).length,
        }))
        .sort((a, b) => a.position - b.position),
    [columns, cards]
  )

  const cardsByColumn = useMemo(
    () =>
      new Map(
        sortedColumns.map((column) => [
          column.id,
          cards
            .filter((card) => card.columnId === column.id)
            .sort((a, b) => {
              // Priority order: high > medium > low
              const priorityOrder = { high: 3, medium: 2, low: 1 };
              const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
              
              if (priorityDiff !== 0) {
                return priorityDiff; // Higher priority first
              }
              
              // If same priority, sort by name alphabetically
              return a.title.localeCompare(b.title);
            }),
        ])
      ),
    [sortedColumns, cards]
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
  }, [])

  const resetCardForm = useCallback(() => {
    setCardTitle('')
    setCardDescription('')
    setCardPriority('medium')
    setCardDueDate('')
  }, [])

  const handleCreateColumn = useCallback(
    async (event: React.FormEvent) => {
      event.preventDefault()
      if (!columnTitle.trim()) return

      try {
        await createColumnMutation.mutateAsync({
          id: `temp-${Date.now()}`,
          boardId: board.id,
          title: columnTitle.trim(),
          position: sortedColumns.length,
        })
        resetColumnForm()
        setIsColumnDialogOpen(false)
      } catch (_error) {
        toast.error('Failed to create column')
      }
    },
    [board.id, columnTitle, createColumnMutation, resetColumnForm, sortedColumns.length]
  )

  const handleCreateCard = useCallback(
    async (event: React.FormEvent) => {
      event.preventDefault()
      if (!cardTitle.trim() || !cardDialogColumn) return

      try {
        const columnCards = cardsByColumn.get(cardDialogColumn.id) || []
        
        // Calculate position based on priority and name sorting
        const newCard = {
          title: cardTitle.trim(),
          priority: cardPriority,
        }
        
        // Find the correct position for the new card in the sorted order
        let targetPosition = 0
        for (const existingCard of columnCards) {
          const priorityOrder = { high: 3, medium: 2, low: 1 }
          const priorityDiff = priorityOrder[existingCard.priority] - priorityOrder[newCard.priority]
          
          if (priorityDiff > 0) {
            // Existing card has higher priority, new card goes before it
            break
          } else if (priorityDiff === 0) {
            // Same priority, compare names
            if (existingCard.title.localeCompare(newCard.title) <= 0) {
              // Existing card comes before alphabetically, new card goes after
              targetPosition = existingCard.position + 1
            } else {
              // New card comes before alphabetically
              break
            }
          } else {
            // Existing card has lower priority, new card goes before it
            break
          }
        }
        
        await createCardMutation.mutateAsync({
          id: `temp-${Date.now()}`,
          boardId: board.id,
          columnId: cardDialogColumn.id,
          title: cardTitle.trim(),
          description: cardDescription.trim() || undefined,
          priority: cardPriority,
          dueDate: cardDueDate || undefined,
          position: targetPosition,
        })
        resetCardForm()
        setIsCardDialogOpen(false)
        setCardDialogColumn(null)
      } catch (_error) {
        toast.error('Failed to create card')
      }
    },
    [board.id, cardTitle, cardDescription, cardPriority, cardDueDate, cardDialogColumn, createCardMutation, resetCardForm, cardsByColumn]
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

  const handleDragStart = useCallback(
    (event: DragStartEvent) => {
      const rawId = event.active.id.toString()
      if (!rawId.startsWith('card-')) return

      const cardId = parseCardId(rawId)
      const card = cards.find(c => c.id === cardId) ?? null
      setActiveDragCard(card)
    },
    [cards, parseCardId]
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
      const activeCard = cards.find(card => card.id === activeCardId)
      if (!activeCard) return

      // Enhanced parsing logic to handle different drop scenarios
      const overData = over.data?.current as { sortable?: { containerId?: string | number; index: number } } | undefined
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
        const overCard = cards.find(card => card.id === overCardId)
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
        activeCard: { id: activeCard.id, columnId: activeCard.columnId }
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
          columnCardsCount: columnCards.length
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
          targetIndex
        })
        toast.error(`Failed to move card: ${error instanceof Error ? error.message : 'Unknown error'}`)
      }
    },
    [board.id, cards, columns, cardsByColumn, moveCardMutation, parseCardId, parseColumnId]
  )

  const isKanbanView = viewMode === 'kanban'
  const resolvedViewMode = isBoardViewMode(viewMode) ? viewMode : DEFAULT_BOARD_VIEW_MODE
  const isCreatingColumn = createColumnMutation.isPending
  const isCreatingCard = createCardMutation.isPending

  if (isLoadingColumns || isLoadingCards) {
    return (
      <div className="flex flex-col gap-4 p-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10" />
          <Skeleton className="h-6 w-48" />
        </div>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={`column-skeleton-${index}`} className="space-y-4">
              <Skeleton className="h-6 w-24" />
              <div className="space-y-2">
                {Array.from({ length: 3 }).map((_, cardIndex) => (
                  <Skeleton key={`card-skeleton-${cardIndex}`} className="h-20 w-full" />
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
            {columnsError?.message || cardsError?.message || 'An error occurred'}
          </p>
        </div>
        <Button onClick={() => Promise.all([refetchColumns(), refetchCards()])}>
          Try Again
        </Button>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6 p-6 h-screen max-h-screen overflow-hidden">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={onBack}>
            <X className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">{board.title}</h1>
            <p className="text-muted-foreground">
              {columns.length} columns • {cards.length} tasks
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <ToggleGroup
            type="single"
            value={resolvedViewMode}
            onValueChange={(value) => {
              if (value && onViewModeChange && isBoardViewMode(value)) {
                onViewModeChange(value)
              }
            }}
          >
            {BOARD_VIEW_OPTIONS.map((option) => (
              <ToggleGroupItem key={option.value} value={option.value} aria-label={option.label}>
                <option.icon className="h-4 w-4" />
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
          
          <Button
            variant="outline"
            onClick={() => setIsColumnDialogOpen(true)}
            disabled={isCreatingColumn}
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Column
          </Button>
        </div>
      </div>

      {columns.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-4 py-12">
          <div className="text-center">
            <h2 className="text-lg font-semibold">No columns yet</h2>
            <p className="text-muted-foreground">
              Create your first column to start organizing tasks
            </p>
          </div>
          <Button
            onClick={() => setIsColumnDialogOpen(true)}
            disabled={isCreatingColumn}
          >
            Create first column
          </Button>
        </div>
      ) : (
        <div className="flex flex-1 min-h-0 overflow-hidden">
          <div className="flex-1 min-h-0 overflow-hidden">
            {isKanbanView ? (
              <BoardKanbanView
                columns={columns}
                columnOrder={columns.map(col => col.id)}
                cardsByColumn={cardsByColumn}
                isCreatingCard={isCreatingCard}
                onDragStart={handleDragStart}
                onDragCancel={handleDragCancel}
                onDragEnd={handleDragEnd}
                activeCard={activeDragCard}
                onCardSelect={handleCardSelect}
                selectedCardId={selectedCardId}
                boardId={board.id}
                onCreateTask={async (task) => {
                  // Calculate position based on priority and name sorting
                  const columnCards = cardsByColumn.get(task.columnId) || []
                  
                  // Find the correct position for the new card in the sorted order
                  let targetPosition = 0
                  for (const existingCard of columnCards) {
                    const priorityOrder = { high: 3, medium: 2, low: 1 }
                    const priorityDiff = priorityOrder[existingCard.priority] - priorityOrder[task.priority]
                    
                    if (priorityDiff > 0) {
                      // Existing card has higher priority, new card goes before it
                      break
                    } else if (priorityDiff === 0) {
                      // Same priority, compare names
                      if (existingCard.title.localeCompare(task.title) <= 0) {
                        // Existing card comes before alphabetically, new card goes after
                        targetPosition = existingCard.position + 1
                      } else {
                        // New card comes before alphabetically
                        break
                      }
                    } else {
                      // Existing card has lower priority, new card goes before it
                      break
                    }
                  }
                  
                  await createCardMutation.mutateAsync({
                    ...task,
                    description: task.description || undefined,
                    position: targetPosition,
                  })
                }}
              />
            ) : resolvedViewMode === 'list' ? (
              <BoardListView
                columns={sortedColumns}
                cardsByColumn={cardsByColumn}
                isCreatingCard={isCreatingCard}
                onCardSelect={handleCardSelect}
                selectedCardId={selectedCardId}
                boardId={board.id}
                onCreateTask={async (task) => {
                  await createCardMutation.mutateAsync({
                    ...task,
                    description: task.description || undefined,
                  })
                }}
              />
            ) : (
              <BoardTimelineView
                cards={cards}
                columnsById={columnsById}
              />
            )}
          </div>
        </div>
      )}

      {/* Task Details Panel */}
      {selectedCard ? (
        <TaskDetailsPanel
          card={selectedCard}
          column={columnsById.get(selectedCard.columnId) ?? null}
          onClose={handleCloseDetails}
        />
      ) : null}

      {/* Create Column Dialog */}
      {isColumnDialogOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-background rounded-lg shadow-lg w-full max-w-md">
            <div className="p-6">
              <h2 className="text-lg font-semibold mb-4">Create Column</h2>
              <form onSubmit={handleCreateColumn}>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor={cardTitleId}>Title</Label>
                    <Input
                      id={cardTitleId}
                      value={columnTitle}
                      onChange={(e) => setColumnTitle(e.target.value)}
                      placeholder="Enter column title"
                      disabled={isCreatingColumn}
                      autoFocus
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2 mt-6">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setIsColumnDialogOpen(false)
                      resetColumnForm()
                    }}
                    disabled={isCreatingColumn}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isCreatingColumn || !columnTitle.trim()}>
                    {isCreatingColumn ? 'Creating...' : 'Create Column'}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

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
                      onChange={(e) => setCardTitle(e.target.value)}
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
                      onChange={(e) => setCardDescription(e.target.value)}
                      placeholder="Enter task description (optional)"
                      disabled={isCreatingCard}
                      rows={3}
                    />
                  </div>
                  <div>
                    <Label htmlFor="card-priority">Priority</Label>
                    <Select
                      value={cardPriority}
                      onValueChange={(value: KanbanPriority) => setCardPriority(value)}
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
                      onChange={(e) => setCardDueDate(e.target.value)}
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
                  <Button type="submit" disabled={isCreatingCard || !cardTitle.trim()}>
                    {isCreatingCard ? 'Creating...' : 'Create Task'}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
