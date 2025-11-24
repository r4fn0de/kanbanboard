import { useCallback, useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { cn } from '@/lib/utils'
import { motion, AnimatePresence } from 'framer-motion'
import { GripVertical, Plus, Loader2, Image as ImageIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
  type DragEndEvent,
  type DragStartEvent,
  defaultDropAnimationSideEffects,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { Workspace } from '@/types/common'
import { WorkspaceBadge } from './WorkspaceBadge'

interface WorkspaceSelectProps {
  workspaces: Workspace[]
  value: string | null
  onChange: (workspaceId: string) => void
  onRequestCreateWorkspace: () => void
  iconUrls: Map<string, string>
  useTransparentStyle?: boolean
  isLoading?: boolean
  isError?: boolean
  onRetry?: () => void
  onCreateWorkspaceDialogOpen?: boolean
  onOpenChange?: (open: boolean) => void
}

interface SortableWorkspaceItemProps {
  workspace: Workspace
  iconUrl?: string | null
}

function SortableWorkspaceItem({
  workspace,
  iconUrl,
}: SortableWorkspaceItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: workspace.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'flex items-center gap-2 w-full min-w-0',
        isDragging && 'pointer-events-none'
      )}
    >
      <div
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing flex-shrink-0 touch-none"
      >
        <GripVertical className="h-4 w-4 text-muted-foreground/40" />
      </div>
      <div className="flex-shrink-0">
        <WorkspaceBadge workspace={workspace} size="sm" iconUrl={iconUrl} />
      </div>
      <span className="truncate text-sm font-medium flex-1">
        {workspace.name}
      </span>
    </div>
  )
}

const dropAnimation = {
  sideEffects: defaultDropAnimationSideEffects({
    styles: {
      active: {
        opacity: '0.4',
      },
    },
  }),
}

export function WorkspaceSelect({
  workspaces,
  value,
  onChange,
  onRequestCreateWorkspace,
  iconUrls,
  useTransparentStyle = false,
  isLoading = false,
  isError = false,
  onRetry,
  onCreateWorkspaceDialogOpen = false,
  onOpenChange,
}: WorkspaceSelectProps) {
  const [orderedWorkspaces, setOrderedWorkspaces] = useState<Workspace[]>([])
  const [activeId, setActiveId] = useState<string | null>(null)
  const [selectOpen, setSelectOpen] = useState(false)

  const handleSelectOpenChange = useCallback(
    (open: boolean) => {
      setSelectOpen(open)
      onOpenChange?.(open)
    },
    [onOpenChange]
  )

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  const currentWorkspace = useMemo(() => {
    if (!value) return null
    return workspaces.find(workspace => workspace.id === value) ?? null
  }, [value, workspaces])

  const activeWorkspace = useMemo(() => {
    if (!activeId) return null
    return orderedWorkspaces.find(ws => ws.id === activeId) ?? null
  }, [activeId, orderedWorkspaces])

  // Sync ordered workspaces from localStorage or default to workspaces order
  useEffect(() => {
    if (workspaces.length === 0) {
      setOrderedWorkspaces([])
      return
    }

    const savedOrder = localStorage.getItem('workspaceOrder')
    if (savedOrder) {
      try {
        const orderIds: string[] = JSON.parse(savedOrder)
        const orderedMap = new Map(workspaces.map(ws => [ws.id, ws]))
        const ordered = orderIds
          .map(id => orderedMap.get(id))
          .filter((ws): ws is Workspace => ws !== undefined)

        // Add any new workspaces that aren't in the saved order
        const existingIds = new Set(orderIds)
        const newWorkspaces = workspaces.filter(ws => !existingIds.has(ws.id))

        setOrderedWorkspaces([...ordered, ...newWorkspaces])
      } catch {
        setOrderedWorkspaces(workspaces)
      }
    } else {
      setOrderedWorkspaces(workspaces)
    }
  }, [workspaces])

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(event.active.id as string)
    // Add global cursor style and prevent text selection during drag
    document.body.style.cursor = 'grabbing'
    document.body.style.userSelect = 'none'
  }, [])

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event

    // Reset cursor and user selection
    document.body.style.cursor = ''
    document.body.style.userSelect = ''

    if (!over || active.id === over.id) {
      setActiveId(null)
      return
    }

    setOrderedWorkspaces(items => {
      const oldIndex = items.findIndex(item => item.id === active.id)
      const newIndex = items.findIndex(item => item.id === over.id)

      const newOrder = arrayMove(items, oldIndex, newIndex)

      // Save order to localStorage
      const orderIds = newOrder.map(ws => ws.id)
      localStorage.setItem('workspaceOrder', JSON.stringify(orderIds))

      return newOrder
    })

    setActiveId(null)
  }, [])

  const handleDragCancel = useCallback(() => {
    // Reset cursor and user selection
    document.body.style.cursor = ''
    document.body.style.userSelect = ''
    setActiveId(null)
  }, [])

  if (isLoading) {
    return (
      <div className="flex flex-1 items-center gap-1.5 text-xs text-muted-foreground">
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
        Loading workspaces…
      </div>
    )
  }

  if (isError && onRetry) {
    return (
      <div className="flex flex-1 items-center justify-between gap-1.5 text-xs text-destructive">
        <span>Failed to load workspaces</span>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-6 px-2 text-xs"
          onClick={() => void onRetry()}
        >
          Retry
        </Button>
      </div>
    )
  }

  if (workspaces.length === 0) {
    return (
      <div className="flex flex-1 items-center gap-1.5 text-xs text-muted-foreground">
        <ImageIcon className="h-3.5 w-3.5" />
        No workspaces found
      </div>
    )
  }

  const currentWorkspaceIconUrl = currentWorkspace?.iconPath
    ? iconUrls.get(currentWorkspace.iconPath)
    : null

  const activeWorkspaceIconUrl = activeWorkspace?.iconPath
    ? iconUrls.get(activeWorkspace.iconPath)
    : null

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <Select
        value={value ?? undefined}
        onValueChange={nextValue => {
          if (nextValue) {
            onChange(nextValue)
          }
        }}
        open={selectOpen}
        onOpenChange={handleSelectOpenChange}
      >
        <SelectTrigger
          className={cn(
            'w-full border-0 bg-transparent px-2.5 py-2 text-left focus:ring-0 focus:ring-offset-0 min-w-0 hover:bg-accent/50 rounded-lg transition-colors',
            useTransparentStyle &&
              'text-white/95 hover:text-white hover:bg-white/20 focus:bg-white/25'
          )}
          onClick={e => {
            // Prevent opening if dialog is open
            if (onCreateWorkspaceDialogOpen) {
              e.preventDefault()
            }
          }}
        >
          <AnimatePresence mode="wait">
            {currentWorkspace ? (
              <motion.div
                key={currentWorkspace.id}
                className="flex items-center gap-2 min-w-0 flex-1"
                initial={{ opacity: 0, filter: 'blur(4px)', x: -10 }}
                animate={{ opacity: 1, filter: 'blur(0px)', x: 0 }}
                exit={{ opacity: 0, filter: 'blur(4px)', x: 10 }}
                transition={{
                  type: 'spring',
                  stiffness: 300,
                  damping: 30,
                  opacity: { duration: 0.2 },
                  filter: { duration: 0.3 },
                }}
              >
                <div className="flex-shrink-0">
                  <WorkspaceBadge
                    workspace={currentWorkspace}
                    size="md"
                    iconUrl={currentWorkspaceIconUrl}
                  />
                </div>
                <span
                  className={cn(
                    'truncate text-sm font-medium',
                    useTransparentStyle ? 'text-white' : 'text-foreground'
                  )}
                >
                  {currentWorkspace.name}
                </span>
              </motion.div>
            ) : (
              <SelectValue>Select workspace</SelectValue>
            )}
          </AnimatePresence>
        </SelectTrigger>
        <SelectContent
          className={cn(
            'min-w-[220px] max-w-[300px] p-1.5 rounded-lg',
            useTransparentStyle &&
              'backdrop-blur-xl bg-popover/90 dark:bg-popover/95 supports-[backdrop-filter]:bg-popover/85 dark:supports-[backdrop-filter]:bg-popover/90 border border-border/60',
            activeId && '[&>*:not([data-dnd-kit-sortable])]:pointer-events-none'
          )}
        >
          <SortableContext
            items={orderedWorkspaces.map(ws => ws.id)}
            strategy={verticalListSortingStrategy}
          >
            {orderedWorkspaces.map(workspace => {
              const workspaceIconUrl = workspace.iconPath
                ? iconUrls.get(workspace.iconPath)
                : null
              return (
                <SelectItem
                  key={workspace.id}
                  value={workspace.id}
                  className={cn(
                    'rounded-md px-2 py-2 my-0.5',
                    useTransparentStyle
                      ? 'data-[state=checked]:bg-accent/60 dark:data-[state=checked]:bg-white/20 data-[state=checked]:text-accent-foreground dark:data-[state=checked]:text-white hover:bg-accent/40 dark:hover:bg-white/30 text-foreground dark:text-white/95'
                      : 'data-[state=checked]:bg-accent/60 hover:bg-accent/40'
                  )}
                >
                  <SortableWorkspaceItem
                    workspace={workspace}
                    iconUrl={workspaceIconUrl}
                  />
                </SelectItem>
              )
            })}
          </SortableContext>
          <SelectSeparator className="my-1.5" />
          <button
            type="button"
            className={cn(
              'flex w-full items-center gap-2.5 rounded-md px-2 py-2 text-sm font-medium transition-colors',
              useTransparentStyle
                ? 'hover:bg-accent/40 dark:hover:bg-white/25 text-foreground dark:text-white/90 hover:text-foreground dark:hover:text-white'
                : 'hover:bg-accent/40 text-muted-foreground hover:text-foreground'
            )}
            onClick={e => {
              e.preventDefault()
              e.stopPropagation()
              // Close the select dropdown first
              handleSelectOpenChange(false)
              // Small delay to ensure dropdown closes before dialog opens
              setTimeout(() => {
                onRequestCreateWorkspace()
              }, 100)
            }}
          >
            <Plus className="h-4 w-4" />
            <span>New workspace</span>
          </button>
        </SelectContent>
      </Select>
      {createPortal(
        <DragOverlay dropAnimation={dropAnimation}>
          {activeWorkspace ? (
            <div
              className="flex items-center gap-2 rounded-md bg-background px-2 py-2 min-w-[180px] cursor-grabbing"
              style={{ zIndex: 10000 }}
            >
              <GripVertical className="h-4 w-4 text-muted-foreground/40 flex-shrink-0" />
              <div className="flex-shrink-0">
                <WorkspaceBadge
                  workspace={activeWorkspace}
                  size="sm"
                  iconUrl={activeWorkspaceIconUrl}
                />
              </div>
              <span className="truncate text-sm font-medium flex-1">
                {activeWorkspace.name}
              </span>
            </div>
          ) : null}
        </DragOverlay>,
        document.body
      )}
    </DndContext>
  )
}
