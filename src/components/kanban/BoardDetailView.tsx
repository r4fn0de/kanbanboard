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
import { Tooltip as BaseTooltip } from '@base-ui-components/react/tooltip'
import {
  BOARD_VIEW_OPTIONS,
  DEFAULT_BOARD_VIEW_MODE,
  isBoardViewMode,
  type BoardViewMode,
} from '@/components/kanban/board-view-modes'
import { BoardKanbanView } from './views/BoardKanbanView'
import { BoardListView } from './views/BoardListView'
import { BoardTimelineView } from './views/BoardTimelineView'
import { getCardDueMetadata, type CardDueStatus } from './views/card-date'
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
  useDuplicateCard,
} from '@/services/kanban'
import {
  Plus,
  Settings2,
  ArrowDown,
  ArrowUp,
  Minus,
  ListFilter,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type {
  DragEndEvent,
  DragStartEvent,
  DragCancelEvent,
} from '@dnd-kit/core'
import { createCardSchema } from '@/schemas/kanban'

interface BoardDetailViewProps {
  board: KanbanBoard
  viewMode?: BoardViewMode
  onViewModeChange?: (mode: BoardViewMode) => void
}

type PriorityFilter = 'all' | KanbanPriority
type DueFilter = 'all' | CardDueStatus | 'no_due'

interface PriorityFilterOption {
  value: PriorityFilter
  label: string
  icon: LucideIcon
}

const PRIORITY_FILTER_OPTIONS: PriorityFilterOption[] = [
  { value: 'all', label: 'All priorities', icon: ListFilter },
  { value: 'high', label: 'High', icon: ArrowUp },
  { value: 'medium', label: 'Medium', icon: Minus },
  { value: 'low', label: 'Low', icon: ArrowDown },
]

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
  const [cardFormError, setCardFormError] = useState<string | null>(null)
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null)
  const [activeDragCard, setActiveDragCard] = useState<KanbanCard | null>(null)
  const [activeNavTab, setActiveNavTab] = useState('tasks')
  const [priorityFilter, setPriorityFilter] = useState<PriorityFilter>('all')
  const [dueFilter, setDueFilter] = useState<DueFilter>('all')

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
    () =>
      allCards
        .filter(card => visibleColumnIds.has(card.columnId))
        .filter(card => {
          if (priorityFilter !== 'all' && card.priority !== priorityFilter) {
            return false
          }

          if (dueFilter === 'all') {
            return true
          }

          if (dueFilter === 'no_due') {
            return !card.dueDate
          }

          const metadata = getCardDueMetadata(card.dueDate)
          return metadata?.status === dueFilter
        }),
    [allCards, visibleColumnIds, priorityFilter, dueFilter]
  )

  const visibleColumnsById = useMemo(
    () => new Map(visibleColumns.map(column => [column.id, column])),
    [visibleColumns]
  )

  const cardsByColumn = useMemo(() => {
    const grouped = new Map<string, KanbanCard[]>()

    visibleColumns.forEach(column => {
      grouped.set(column.id, [])
    })

    visibleCards.forEach(card => {
      const list = grouped.get(card.columnId)
      if (!list) {
        return
      }
      list.push(card)
    })

    grouped.forEach(list => {
      list.sort((a, b) => {
        const positionA = a.position ?? Number.MAX_SAFE_INTEGER
        const positionB = b.position ?? Number.MAX_SAFE_INTEGER

        if (positionA !== positionB) {
          return positionA - positionB
        }

        const updatedA = a.updatedAt ? Date.parse(a.updatedAt) : 0
        const updatedB = b.updatedAt ? Date.parse(b.updatedAt) : 0

        if (updatedA !== updatedB) {
          return updatedA - updatedB
        }

        const createdA = a.createdAt ? Date.parse(a.createdAt) : 0
        const createdB = b.createdAt ? Date.parse(b.createdAt) : 0

        if (createdA !== createdB) {
          return createdA - createdB
        }

        return a.title.localeCompare(b.title)
      })
    })

    return grouped
  }, [visibleColumns, visibleCards])

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
    setCardFormError(null)
  }, [])

  const handleCreateCard = useCallback(
    async (event: React.FormEvent) => {
      event.preventDefault()
      if (!cardDialogColumn) {
        setCardFormError('Select a column before creating a task.')
        return
      }

      try {
        const parsed = createCardSchema.safeParse({
          id: `temp-${Date.now()}`,
          boardId: board.id,
          columnId: cardDialogColumn.id,
          title: cardTitle.trim(),
          description: cardDescription.trim() || undefined,
          priority: cardPriority,
          dueDate: cardDueDate || undefined,
          position: 0,
          tagIds: [],
        })

        if (!parsed.success) {
          const message =
            parsed.error.issues[0]?.message ?? 'Invalid task data provided'
          setCardFormError(message)
          toast.error(message)
          return
        }

        setCardFormError(null)

        const columnCards = cardsByColumn.get(cardDialogColumn.id) || []

        // Always insert at the end of the column
        // The frontend displays cards sorted by priority and name,
        // but the backend position is just sequential (0, 1, 2...)
        const targetPosition = columnCards.length + 1

        await createCardMutation.mutateAsync({
          ...parsed.data,
          position: targetPosition,
          tagIds: parsed.data.tagIds ?? [],
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
      cardDialogColumn,
      createCardMutation,
      resetCardForm,
      cardsByColumn,
      cardTitle,
      cardDescription,
      cardPriority,
      cardDueDate,
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

  const duplicateCardMutation = useDuplicateCard(board.id)

  const handleDuplicateCard = useCallback(
    async (card: KanbanCard) => {
      try {
        // Get current cards in the same column to find the next available position
        const columnCards = cardsByColumn.get(card.columnId) || []
        const maxPosition = Math.max(...columnCards.map(c => c.position), -1)
        const nextPosition = maxPosition + 1
        
        await duplicateCardMutation.mutateAsync({
          id: `card-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          boardId: board.id,
          columnId: card.columnId,
          title: card.title + " (copy)",
          description: card.description,
          priority: card.priority,
          dueDate: card.dueDate,
          position: nextPosition, // Use calculated next position
        })
        toast.success('Task duplicated')
      } catch (error) {
        console.error('Failed to duplicate task', error)
        toast.error('Failed to duplicate task')
      }
    },
    [duplicateCardMutation, board.id, cardsByColumn]
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
      let targetIndex: number | null = null

      const rawOverId = over.id.toString()
      if (rawOverId === rawActiveId) {
        return
      }

      // Try to get column ID from sortable container first (when dropping between cards)
      if (overData?.sortable?.containerId) {
        destinationColumnId = parseColumnId(overData.sortable.containerId)
        targetIndex = overData.sortable.index ?? 0
      }
      // If no container, check if we're dropping on a card directly
      else if (rawOverId.startsWith('card-')) {
        const overCardId = parseCardId(rawOverId)
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
        destinationColumnId = parseColumnId(rawOverId)
        const columnCards = cardsByColumn.get(destinationColumnId ?? '') ?? []

        // If dropping on end zone, always add to the end
        if (rawOverId.endsWith('-end')) {
          targetIndex = columnCards.length
        } else {
          targetIndex = columnCards.length // Add to end if dropping on empty area
        }
      }

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
      const activeIndexInColumn = columnCards.findIndex(
        card => card.id === activeCardId
      )

      if (targetIndex == null) {
        if (rawOverId.startsWith('card-')) {
          const overCardId = parseCardId(rawOverId)
          targetIndex = columnCards.findIndex(card => card.id === overCardId)
          if (targetIndex === -1) {
            targetIndex = columnCards.length
          }
        } else {
          targetIndex = columnCards.length
        }
      }

      const isSameColumn = destinationColumnId === activeCard.columnId

      if (isSameColumn) {
        if (activeIndexInColumn === -1) {
          return
        }

        if (columnCards.length <= 1) {
          return
        }

        if (targetIndex >= columnCards.length) {
          targetIndex = columnCards.length - 1
        }

        if (targetIndex === activeIndexInColumn) {
          return
        }
      }

      // Target index should respect destination bounds
      const maxIndex = isSameColumn
        ? Math.max(0, columnCards.length - 1)
        : columnCards.length
      targetIndex = Math.max(0, Math.min(targetIndex, maxIndex))

      // Final validation before API call
      if (!activeCardId || !destinationColumnId) {
        console.error('Missing required data for move operation')
        return
      }

      // Only proceed with the API call if there's an actual position change
      try {
        await moveCardMutation.mutateAsync({
          boardId: board.id,
          cardId: activeCardId,
          fromColumnId: activeCard.columnId,
          toColumnId: destinationColumnId,
          targetIndex,
        })
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
    <div className="flex w-full flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end">
      {/* Filtros de Prioridade e Deadline */}
      <div className="flex w-full flex-wrap items-center gap-2 rounded-lg border border-border/40 bg-background/70 px-2.5 py-1.5 shadow-none sm:w-auto sm:flex-nowrap">
        <div className="flex flex-1 items-center gap-1.5 sm:flex-initial">
          <span className="text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground/70">
            PRIORITY
          </span>
          <Select
            value={priorityFilter}
            onValueChange={value => setPriorityFilter(value as PriorityFilter)}
          >
            <SelectTrigger className="h-7 w-full rounded-md border border-border/30 bg-background/70 px-2 text-xs font-medium text-muted-foreground transition-colors duration-150 hover:text-foreground hover:bg-accent/30 sm:w-auto sm:min-w-[104px]">
              <SelectValue placeholder="All">
                {(() => {
                  const option = PRIORITY_FILTER_OPTIONS.find(
                    item => item.value === priorityFilter
                  )
                  const PriorityIcon = option?.icon ?? ListFilter
                  const isActive = priorityFilter !== 'all'
                  return (
                    <span className="flex items-center gap-1.5">
                      <PriorityIcon
                        className={`h-3 w-3 ${isActive ? 'text-foreground' : 'text-muted-foreground/70'}`}
                      />
                      <span
                        className={`truncate ${isActive ? 'text-foreground font-medium' : 'text-muted-foreground/90'}`}
                      >
                        {option?.label ?? 'All'}
                      </span>
                    </span>
                  )
                })()}
              </SelectValue>
            </SelectTrigger>
            <SelectContent
              align="end"
              sideOffset={4}
              className="rounded-md border border-border/40 bg-popover/95 shadow-md"
            >
              {PRIORITY_FILTER_OPTIONS.map(option => {
                const Icon = option.icon
                const isSelected = option.value === priorityFilter
                return (
                  <SelectItem
                    key={option.value}
                    value={option.value}
                    className="flex items-center gap-2 text-xs transition-colors duration-150 hover:bg-muted cursor-pointer data-[state=checked]:bg-accent data-[state=checked]:text-accent-foreground"
                  >
                    <Icon className="h-3 w-3" />
                    {option.label}
                    {isSelected && (
                      <div className="ml-auto h-1.5 w-1.5 rounded-full bg-foreground" />
                    )}
                  </SelectItem>
                )
              })}
            </SelectContent>
          </Select>
        </div>

        <div className="hidden h-5 w-px bg-border/40 sm:mx-1.5 sm:block" />

        <div className="flex flex-1 items-center gap-1.5 sm:flex-initial">
          <span className="text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground/70">
            DEADLINE
          </span>
          <Select
            value={dueFilter}
            onValueChange={value => setDueFilter(value as DueFilter)}
          >
            <SelectTrigger className="h-7 w-full rounded-md border border-border/30 bg-background/70 px-2 text-xs font-medium text-muted-foreground transition-colors duration-150 hover:text-foreground hover:bg-accent/30 sm:w-auto sm:min-w-[112px]">
              <SelectValue placeholder="All">
                {(() => {
                  const isActive = dueFilter !== 'all'
                  return (
                    <span
                      className={`truncate ${isActive ? 'text-foreground font-medium' : 'text-muted-foreground/90'}`}
                    >
                      {dueFilter === 'all'
                        ? 'All'
                        : dueFilter === 'overdue'
                          ? 'Overdue'
                          : dueFilter === 'today'
                            ? 'Today'
                            : dueFilter === 'soon'
                              ? 'Soon'
                              : dueFilter === 'upcoming'
                                ? 'Upcoming'
                                : dueFilter === 'no_due'
                                  ? 'No date'
                                  : 'All'}
                    </span>
                  )
                })()}
              </SelectValue>
            </SelectTrigger>
            <SelectContent
              align="end"
              sideOffset={4}
              className="rounded-md border border-border/40 bg-popover/95 shadow-md"
            >
              <SelectItem
                value="all"
                className="text-xs transition-colors duration-150 hover:bg-muted cursor-pointer data-[state=checked]:bg-accent data-[state=checked]:text-accent-foreground"
              >
                <div className="flex items-center gap-2">
                  <span>All deadlines</span>
                  {dueFilter === 'all' && (
                    <div className="ml-auto h-1.5 w-1.5 rounded-full bg-foreground" />
                  )}
                </div>
              </SelectItem>
              <SelectItem
                value="overdue"
                className="text-xs transition-colors duration-150 hover:bg-muted cursor-pointer data-[state=checked]:bg-accent data-[state=checked]:text-accent-foreground"
              >
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-destructive" />
                  <span>Overdue</span>
                  {dueFilter === 'overdue' && (
                    <div className="ml-auto h-1.5 w-1.5 rounded-full bg-foreground" />
                  )}
                </div>
              </SelectItem>
              <SelectItem
                value="today"
                className="text-xs transition-colors duration-150 hover:bg-muted cursor-pointer data-[state=checked]:bg-accent data-[state=checked]:text-accent-foreground"
              >
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-orange-500" />
                  <span>Due today</span>
                  {dueFilter === 'today' && (
                    <div className="ml-auto h-1.5 w-1.5 rounded-full bg-foreground" />
                  )}
                </div>
              </SelectItem>
              <SelectItem
                value="soon"
                className="text-xs transition-colors duration-150 hover:bg-muted cursor-pointer data-[state=checked]:bg-accent data-[state=checked]:text-accent-foreground"
              >
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-yellow-500" />
                  <span>Due soon</span>
                  {dueFilter === 'soon' && (
                    <div className="ml-auto h-1.5 w-1.5 rounded-full bg-foreground" />
                  )}
                </div>
              </SelectItem>
              <SelectItem
                value="upcoming"
                className="text-xs transition-colors duration-150 hover:bg-muted cursor-pointer data-[state=checked]:bg-accent data-[state=checked]:text-accent-foreground"
              >
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-blue-500" />
                  <span>Upcoming</span>
                  {dueFilter === 'upcoming' && (
                    <div className="ml-auto h-1.5 w-1.5 rounded-full bg-foreground" />
                  )}
                </div>
              </SelectItem>
              <SelectItem
                value="no_due"
                className="text-xs transition-colors duration-150 hover:bg-muted cursor-pointer data-[state=checked]:bg-accent data-[state=checked]:text-accent-foreground"
              >
                <div className="flex items-center gap-2">
                  <span>No due date</span>
                  {dueFilter === 'no_due' && (
                    <div className="ml-auto h-1.5 w-1.5 rounded-full bg-foreground" />
                  )}
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Toggle de Visualização */}
      <ToggleGroup
        type="single"
        value={resolvedViewMode}
        onValueChange={value => {
          if (value && onViewModeChange && isBoardViewMode(value)) {
            onViewModeChange(value)
          }
        }}
        className="flex h-8 items-center gap-1 rounded-md border border-border/40 bg-background/70 px-1.5 shadow-none"
      >
        {BOARD_VIEW_OPTIONS.map(option => (
          <BaseTooltip.Root key={option.value} delay={0} closeDelay={0}>
            <BaseTooltip.Trigger
              render={({ ref, ...triggerProps }) => (
                <ToggleGroupItem
                  ref={ref}
                  {...triggerProps}
                  value={option.value}
                  aria-label={option.label}
                  className="flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground transition-colors duration-150 hover:bg-muted hover:text-foreground data-[state=on]:bg-accent data-[state=on]:text-accent-foreground"
                >
                  <option.icon className="h-4 w-4" />
                </ToggleGroupItem>
              )}
            />
            <BaseTooltip.Portal>
              <BaseTooltip.Positioner sideOffset={6}>
                <BaseTooltip.Popup className="z-50 w-fit rounded-md bg-popover/95 px-2 py-1 text-xs text-popover-foreground border border-border/60 shadow-lg backdrop-blur-sm">
                  {option.label}
                </BaseTooltip.Popup>
              </BaseTooltip.Positioner>
            </BaseTooltip.Portal>
          </BaseTooltip.Root>
        ))}
      </ToggleGroup>

      {/* Botão de Gerenciar Colunas */}
      <Button
        variant="outline"
        className="h-9 rounded-lg border-border/60 bg-background/80 backdrop-blur-sm px-3.5 text-xs font-medium transition-all duration-200 hover:bg-accent hover:text-accent-foreground hover:shadow-sm hover:border-border"
        onClick={() => setIsColumnManagerOpen(true)}
      >
        <Settings2 className="mr-1.5 h-3.5 w-3.5" />
        Manage
      </Button>
    </div>
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
      <div className="flex-1 overflow-hidden">
        {activeNavTab === 'tasks' ? (
          <>
            {columnsWithCounts.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full gap-6">
                <div className="text-center space-y-2">
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
              <div className="flex flex-col items-center justify-center h-full">
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
              <div className="h-full overflow-hidden">
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
                    onDuplicateTask={handleDuplicateCard}
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
            )}
          </>
        ) : (
          <div className="flex flex-col items-center justify-center h-full">
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
            <div className="bg-background rounded-lg w-full max-w-md">
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
                  {cardFormError && (
                    <p className="text-sm text-destructive" role="alert">
                      {cardFormError}
                    </p>
                  )}
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
