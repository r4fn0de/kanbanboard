import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
  type DragCancelEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  arrayMove,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'

import {
  COLUMN_COLOR_OPTIONS,
  DEFAULT_COLUMN_ICON,
  DEFAULT_MONOCHROMATIC_COLOR,
} from '@/constants/kanban-columns'
import {
  COLUMN_ICON_OPTIONS,
  getColumnIconComponent,
} from '@/components/kanban/column-icon-options'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
} from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import type { KanbanColumn } from '@/types/common'
import {
  useMoveColumn,
  useUpdateColumn,
  useCreateColumn,
  useDeleteColumn,
} from '@/services/kanban'
import { createColumnSchema } from '@/schemas/kanban'
import { Check, GripVertical, Edit2, X, Plus } from 'lucide-react'
import { TrashIcon } from '@/components/ui/icons'

interface ColumnWithMeta extends KanbanColumn {
  cardCount: number
}

type ColumnStatusRole = 'backlog' | 'todo' | 'in_progress' | 'done' | 'custom'

interface ColumnManagerDialogProps {
  boardId: string
  columns: ColumnWithMeta[]
  open: boolean
  onOpenChange: (open: boolean) => void
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

function inferColumnStatusRole(
  column: KanbanColumn,
  index: number,
  total: number
): ColumnStatusRole {
  const title = column.title.trim().toLowerCase()

  if (title.includes('backlog')) return 'backlog'
  if (title.includes('to do') || title === 'todo') return 'todo'
  if (title.includes('in progress') || title.includes('progress'))
    return 'in_progress'
  if (title.includes('done') || title.includes('complete')) return 'done'

  // Fallback by position: first column as backlog, last as done
  if (index === 0) return 'backlog'
  if (index === total - 1 && total > 1) return 'done'

  return 'custom'
}

export function ColumnManagerDialog({
  boardId,
  columns,
  open,
  onOpenChange,
}: ColumnManagerDialogProps) {
  const moveColumn = useMoveColumn(boardId)
  const updateColumn = useUpdateColumn(boardId)
  const createColumn = useCreateColumn(boardId)
  const deleteColumn = useDeleteColumn(boardId)

  const [isCreatingNew, setIsCreatingNew] = useState(false)
  const [newColumnTitle, setNewColumnTitle] = useState('')
  const [newColumnColor, setNewColumnColor] = useState<string | null>(null)
  const [newColumnIcon, setNewColumnIcon] =
    useState<string>(DEFAULT_COLUMN_ICON)
  const [newColumnError, setNewColumnError] = useState<string | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 6 },
    })
  )

  const [order, setOrder] = useState(() => columns.map(column => column.id))

  useEffect(() => {
    setOrder(columns.map(column => column.id))
  }, [columns])

  const sortedColumns = useMemo(
    () =>
      order
        .map(id => columns.find(column => column.id === id))
        .filter((column): column is ColumnWithMeta => Boolean(column)),
    [columns, order]
  )

  const columnsWithRoles = useMemo(() => {
    const total = sortedColumns.length
    return sortedColumns.map((column, index) => ({
      column,
      role: inferColumnStatusRole(column, index, total),
    }))
  }, [sortedColumns])

  const enabledDoneCount = useMemo(
    () =>
      columnsWithRoles.filter(
        item => item.role === 'done' && item.column.isEnabled
      ).length,
    [columnsWithRoles]
  )

  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      const { active, over } = event
      if (!over || active.id === over.id) {
        return
      }

      const oldIndex = order.indexOf(active.id.toString())
      const newIndex = order.indexOf(over.id.toString())

      if (oldIndex === -1 || newIndex === -1) {
        return
      }

      const nextOrder = arrayMove(order, oldIndex, newIndex)
      setOrder(nextOrder)

      moveColumn.mutate(
        {
          boardId,
          columnId: active.id.toString(),
          targetIndex: newIndex,
        },
        {
          onError: error => {
            toast.error('Failed to reorder column', {
              description:
                error instanceof Error ? error.message : 'Unknown error',
            })
            setOrder(order)
          },
        }
      )
    },
    [boardId, moveColumn, order]
  )

  const handleCreateColumn = useCallback(async () => {
    const payload = {
      id: `temp-${Date.now()}`,
      boardId,
      title: newColumnTitle.trim(),
      icon: newColumnIcon,
      color: (newColumnColor || DEFAULT_MONOCHROMATIC_COLOR) ?? null,
      position: columns.length,
    }

    const result = createColumnSchema.safeParse(payload)
    if (!result.success) {
      const message =
        result.error.issues[0]?.message ?? 'Invalid column configuration'
      setNewColumnError(message)
      toast.error(message)
      return
    }

    try {
      await createColumn.mutateAsync(result.data)

      // Reset form
      setNewColumnTitle('')
      setNewColumnColor(null)
      setNewColumnIcon(DEFAULT_COLUMN_ICON)
      setIsCreatingNew(false)
      setNewColumnError(null)

      toast.success('Column created successfully')
    } catch (error) {
      toast.error('Failed to create column', {
        description: error instanceof Error ? error.message : 'Unknown error',
      })
    }
  }, [
    newColumnTitle,
    newColumnColor,
    newColumnIcon,
    createColumn,
    boardId,
    columns.length,
  ])

  const handleCancelCreate = () => {
    setNewColumnTitle('')
    setNewColumnColor(null)
    setNewColumnIcon(DEFAULT_COLUMN_ICON)
    setIsCreatingNew(false)
    setNewColumnError(null)
  }

  const handleDragStartColumns = useCallback((_: DragStartEvent) => {
    if (typeof document === 'undefined') return
    document.body.style.cursor = 'grabbing'
    document.body.style.userSelect = 'none'
  }, [])

  const resetBodyCursor = () => {
    if (typeof document === 'undefined') return
    document.body.style.cursor = ''
    document.body.style.userSelect = ''
  }

  const handleDragEndColumns = useCallback(
    (event: DragEndEvent) => {
      resetBodyCursor()
      void handleDragEnd(event)
    },
    [handleDragEnd]
  )

  const handleDragCancelColumns = useCallback((_: DragCancelEvent) => {
    resetBodyCursor()
  }, [])

  return (
    <TooltipProvider>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-96 sm:max-w-lg lg:max-w-xl">
          <DialogHeader className="space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-1">
                <DialogTitle>Manage columns</DialogTitle>
                <DialogDescription>
                  Customize the appearance and availability of your workflow
                  columns.
                </DialogDescription>
              </div>
              <Button
                variant="ghost"
                onClick={() => setIsCreatingNew(!isCreatingNew)}
                disabled={createColumn.isPending}
              >
                <Plus className="h-4 w-4 mr-2" />
                {isCreatingNew ? 'Cancel' : 'Add column'}
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">
              Drag and drop to reorder. Updates save automatically.
            </p>
          </DialogHeader>

          {isCreatingNew && (
            <div className="space-y-4 p-4 border border-dashed border-border rounded-lg bg-muted/30">
              <h4 className="text-sm font-medium">Create New Column</h4>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <Popover>
                    <PopoverTrigger>
                      <button
                        type="button"
                        className="flex items-center justify-center w-10 h-10 rounded-lg border-2 transition-all duration-150 ease-in-out hover:scale-105 hover:brightness-95"
                        style={{
                          backgroundColor:
                            newColumnColor ?? DEFAULT_MONOCHROMATIC_COLOR,
                          borderColor:
                            newColumnColor ?? DEFAULT_MONOCHROMATIC_COLOR,
                        }}
                        disabled={createColumn.isPending}
                      >
                        {(() => {
                          const IconComponent =
                            getColumnIconComponent(newColumnIcon)
                          return (
                            <IconComponent
                              className="h-5 w-5"
                              style={{
                                color: 'white',
                              }}
                            />
                          )
                        })()}
                      </button>
                    </PopoverTrigger>
                    <PopoverContent className="w-80" align="start">
                      <div className="space-y-4">
                        <div>
                          <h4 className="text-sm font-medium mb-2">Color</h4>
                          <div className="flex flex-wrap gap-2">
                            {COLUMN_COLOR_OPTIONS.map(option => (
                              <button
                                key={option}
                                type="button"
                                className={cn(
                                  'h-8 w-8 rounded-full border-2 transition-all',
                                  newColumnColor === option
                                    ? 'border-primary scale-110 shadow-sm'
                                    : 'border-transparent hover:border-muted-foreground/30 hover:scale-105'
                                )}
                                style={{ backgroundColor: option }}
                                onClick={() => setNewColumnColor(option)}
                                disabled={createColumn.isPending}
                              />
                            ))}
                            <button
                              type="button"
                              className="h-8 w-16 rounded-full border-2 border-dashed border-muted-foreground/30 text-xs font-medium text-muted-foreground hover:border-muted-foreground/60 transition-all"
                              onClick={() => setNewColumnColor(null)}
                              disabled={createColumn.isPending}
                            >
                              Clear
                            </button>
                          </div>
                        </div>

                        <div>
                          <Command>
                            <CommandInput placeholder="Search icon..." />
                            <CommandList>
                              <CommandEmpty>No icons found</CommandEmpty>
                              <CommandGroup className="max-h-48 overflow-y-auto">
                                {COLUMN_ICON_OPTIONS.map(option => (
                                  <CommandItem
                                    key={option.value}
                                    value={option.value}
                                    onSelect={() =>
                                      setNewColumnIcon(option.value)
                                    }
                                    className="flex items-center gap-2"
                                  >
                                    <option.icon className="h-4 w-4" />
                                    <span className="flex-1 text-sm font-medium">
                                      {option.label}
                                    </span>
                                    {newColumnIcon === option.value ? (
                                      <Check className="h-4 w-4 text-primary" />
                                    ) : null}
                                  </CommandItem>
                                ))}
                              </CommandGroup>
                            </CommandList>
                          </Command>
                        </div>
                      </div>
                    </PopoverContent>
                  </Popover>

                  <Input
                    value={newColumnTitle}
                    onChange={e => {
                      setNewColumnTitle(e.target.value)
                      if (newColumnError) {
                        setNewColumnError(null)
                      }
                    }}
                    placeholder="Enter column name..."
                    disabled={createColumn.isPending}
                    className="flex-1 h-10 border-0 bg-muted/70 text-foreground placeholder:text-muted-foreground focus-visible:ring-0 focus-visible:border-0"
                    autoFocus
                  />
                </div>
                {newColumnError && (
                  <p className="text-sm text-destructive" role="alert">
                    {newColumnError}
                  </p>
                )}

                <div className="flex items-center justify-end gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleCancelCreate}
                    disabled={createColumn.isPending}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    onClick={handleCreateColumn}
                    disabled={createColumn.isPending || !newColumnTitle.trim()}
                  >
                    {createColumn.isPending ? 'Creating...' : 'Create'}
                  </Button>
                </div>
              </div>
            </div>
          )}

          <ScrollArea className="max-h-[420px] pr-4">
            <DndContext
              sensors={sensors}
              onDragStart={handleDragStartColumns}
              onDragEnd={handleDragEndColumns}
              onDragCancel={handleDragCancelColumns}
            >
              <SortableContext
                items={sortedColumns.map(column => column.id)}
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-3 py-2">
                  {columnsWithRoles.map(({ column, role }) => (
                    <ColumnManagerRow
                      key={column.id}
                      column={column}
                      isUpdating={updateColumn.isPending}
                      onUpdate={async changes => {
                        try {
                          await updateColumn.mutateAsync({
                            id: column.id,
                            boardId: column.boardId,
                            ...changes,
                          })
                        } catch (error) {
                          toast.error('Failed to update column', {
                            description:
                              error instanceof Error
                                ? error.message
                                : 'Unknown error',
                          })
                          throw error
                        }
                      }}
                      onDelete={async () => {
                        try {
                          await deleteColumn.mutateAsync({
                            id: column.id,
                            boardId: column.boardId,
                          })
                          toast.success('Column deleted successfully')
                        } catch (error) {
                          toast.error('Failed to delete column', {
                            description:
                              error instanceof Error
                                ? error.message
                                : 'Unknown error',
                          })
                          throw error
                        }
                      }}
                      isProtectedDone={
                        role === 'done' &&
                        column.isEnabled &&
                        enabledDoneCount <= 1
                      }
                      canDelete={role === 'custom'}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </TooltipProvider>
  )
}

interface ColumnManagerChanges {
  title?: string
  color?: string | null
  icon?: string | null
  isEnabled?: boolean
}

interface ColumnManagerRowProps {
  column: ColumnWithMeta
  isUpdating: boolean
  onUpdate: (changes: Partial<ColumnManagerChanges>) => Promise<void>
  onDelete: () => Promise<void>
  isProtectedDone: boolean
  canDelete: boolean
}

function ColumnManagerRow({
  column,
  isUpdating,
  onUpdate,
  onDelete,
  isProtectedDone,
  canDelete,
}: ColumnManagerRowProps) {
  const [title, setTitle] = useState(column.title)
  const [color, setColor] = useState<string | null>(column.color ?? null)
  const [icon, setIcon] = useState<string>(column.icon ?? DEFAULT_COLUMN_ICON)
  const [isEnabled, setIsEnabled] = useState<boolean>(column.isEnabled)
  const [isEditingTitle, setIsEditingTitle] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  useEffect(() => {
    setTitle(column.title)
  }, [column.title])

  useEffect(() => {
    setColor(column.color ?? null)
  }, [column.color])

  useEffect(() => {
    setIcon(column.icon ?? DEFAULT_COLUMN_ICON)
  }, [column.icon])

  useEffect(() => {
    setIsEnabled(column.isEnabled)
  }, [column.isEnabled])

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: column.id })

  const normalizedTitle = column.title.trim().toLowerCase()
  let inferredStatusIcon: string | null = null
  if (normalizedTitle.includes('backlog')) {
    inferredStatusIcon = 'BacklogStatus'
  } else if (normalizedTitle.includes('to do') || normalizedTitle === 'todo') {
    inferredStatusIcon = 'TodoStatus'
  } else if (
    normalizedTitle.includes('in progress') ||
    normalizedTitle.includes('progress')
  ) {
    inferredStatusIcon = 'InProgressStatus'
  } else if (
    normalizedTitle.includes('done') ||
    normalizedTitle.includes('complete')
  ) {
    inferredStatusIcon = 'DoneStatus'
  }

  const resolvedIconKey =
    !icon || icon === DEFAULT_COLUMN_ICON ? (inferredStatusIcon ?? icon) : icon
  const IconComponent = getColumnIconComponent(resolvedIconKey)
  const accentColor = color ?? DEFAULT_MONOCHROMATIC_COLOR

  const handleTitleBlur = async () => {
    const trimmed = title.trim()
    if (!trimmed || trimmed === column.title) {
      setTitle(column.title)
      setIsEditingTitle(false)
      return
    }

    setTitle(trimmed)
    try {
      await onUpdate({ title: trimmed })
      setIsEditingTitle(false)
    } catch {
      setTitle(column.title)
      setIsEditingTitle(false)
    }
  }

  const handleTitleClick = () => {
    if (!isEditingTitle && !isUpdating) {
      setIsEditingTitle(true)
    }
  }

  const handleTitleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter') {
      handleTitleBlur()
    } else if (event.key === 'Escape') {
      setTitle(column.title)
      setIsEditingTitle(false)
    }
  }

  const handleToggle = async (next: boolean) => {
    if (!next && isProtectedDone) {
      toast.error('Cannot hide the last done column')
      return
    }

    const previous = isEnabled
    setIsEnabled(next)
    try {
      await onUpdate({ isEnabled: next })
    } catch {
      setIsEnabled(previous)
    }
  }

  const handleColorSelect = async (nextColor: string | null) => {
    const previous = color
    setColor(nextColor)
    try {
      await onUpdate({ color: nextColor })
    } catch {
      setColor(previous)
    }
  }

  const handleIconSelect = async (nextIcon: string) => {
    const option = COLUMN_ICON_OPTIONS.find(item => item.value === nextIcon)
    if (!option) {
      return
    }

    const previous = icon
    setIcon(option.value)
    try {
      await onUpdate({ icon: option.value })
    } catch {
      setIcon(previous)
    }
  }

  const handleDelete = async () => {
    setShowDeleteConfirm(false)
    try {
      await onDelete()
    } catch {
      // Error is handled by the parent component
    }
  }

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: transform ? CSS.Translate.toString(transform) : undefined,
        transition: isDragging ? 'none' : transition,
      }}
      className={cn(
        'flex items-center gap-4 rounded-lg border border-border bg-card px-4 py-3 shadow-sm',
        isDragging && 'opacity-70'
      )}
    >
      <button
        type="button"
        className="flex h-8 w-8 items-center justify-center rounded border border-dashed border-muted-foreground/40 text-muted-foreground hover:border-muted-foreground/60 cursor-grab active:cursor-grabbing"
        style={{ touchAction: 'none' }}
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-4 w-4 pointer-events-none" />
      </button>

      <div className="flex items-center gap-4 flex-1">
        <Popover>
          <PopoverTrigger>
            <button
              type="button"
              className="flex items-center justify-center w-10 h-10 rounded-lg border-2 transition-all duration-150 ease-in-out hover:scale-105 hover:brightness-95"
              style={{
                backgroundColor: 'transparent',
                borderColor: 'transparent',
              }}
              disabled={isUpdating}
            >
              <IconComponent
                className="h-5 w-5"
                style={{ color: color ?? DEFAULT_MONOCHROMATIC_COLOR }}
              />
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-80" align="start">
            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-medium mb-2">Color</h4>
                <div className="flex flex-wrap gap-2">
                  {COLUMN_COLOR_OPTIONS.map(option => (
                    <button
                      key={option}
                      type="button"
                      className={cn(
                        'h-9 w-9 rounded-full border-2 transition-all',
                        color === option
                          ? 'border-primary scale-110 shadow-sm'
                          : 'border-transparent hover:border-muted-foreground/30 hover:scale-105'
                      )}
                      style={{ backgroundColor: option }}
                      onClick={() => handleColorSelect(option)}
                      disabled={isUpdating}
                    />
                  ))}
                  <button
                    type="button"
                    className="h-9 w-16 rounded-full border-2 border-dashed border-muted-foreground/30 text-xs font-medium text-muted-foreground hover:border-muted-foreground/60 transition-all"
                    onClick={() => handleColorSelect(null)}
                    disabled={isUpdating}
                  >
                    Clear
                  </button>
                </div>
              </div>

              <div>
                <Command>
                  <CommandInput placeholder="Search icon..." />
                  <CommandList>
                    <CommandEmpty>No icons found</CommandEmpty>
                    <CommandGroup className="max-h-48 overflow-y-auto">
                      {COLUMN_ICON_OPTIONS.map(option => (
                        <CommandItem
                          key={option.value}
                          value={option.value}
                          onSelect={() => handleIconSelect(option.value)}
                          className="flex items-center gap-2"
                        >
                          <option.icon className="h-4 w-4" />
                          <span className="flex-1 text-sm font-medium">
                            {option.label}
                          </span>
                          {icon === option.value ? (
                            <Check className="h-4 w-4 text-primary" />
                          ) : null}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </div>
            </div>
          </PopoverContent>
        </Popover>

        {isEditingTitle ? (
          <div className="flex items-center gap-2 flex-1">
            <Input
              value={title}
              onChange={event => setTitle(event.target.value)}
              onBlur={handleTitleBlur}
              onKeyDown={handleTitleKeyDown}
              placeholder="Column name"
              disabled={isUpdating}
              autoFocus
              className="flex-1 h-10 border-0 bg-muted/70 text-foreground placeholder:text-muted-foreground focus-visible:ring-0 focus-visible:border-0"
              style={{ outline: 'none' }}
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                setTitle(column.title)
                setIsEditingTitle(false)
              }}
              disabled={isUpdating}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <button
            type="button"
            className="flex-1 text-left hover:bg-muted/50 rounded px-3 py-2 group"
            onClick={handleTitleClick}
            disabled={isUpdating}
            style={{ transition: 'background-color 150ms ease-in-out' }}
          >
            <span
              className="font-medium text-sm group-hover:text-primary"
              style={{ transition: 'color 150ms ease-in-out' }}
            >
              {title}
            </span>
            {!isUpdating && (
              <Edit2
                className="h-3 w-3 opacity-0 group-hover:opacity-50 ml-2 inline"
                style={{ transition: 'opacity 150ms ease-in-out' }}
              />
            )}
          </button>
        )}
      </div>

      <div className="flex items-center gap-4">
        <div className="flex flex-col items-end">
          <Badge
            variant={column.cardCount > 0 ? 'default' : 'secondary'}
            className="text-xs"
            style={{
              backgroundColor:
                column.cardCount > 0
                  ? (hexToRgba(accentColor, 0.16) ?? undefined)
                  : undefined,
              color: column.cardCount > 0 ? accentColor : undefined,
              borderColor:
                column.cardCount > 0
                  ? (hexToRgba(accentColor, 0.32) ?? undefined)
                  : undefined,
            }}
          >
            {column.cardCount} tasks
          </Badge>
          {!isEnabled ? (
            <span className="text-xs text-muted-foreground mt-1">Hidden</span>
          ) : null}
        </div>
        <Tooltip>
          <AlertDialog
            open={showDeleteConfirm}
            onOpenChange={setShowDeleteConfirm}
          >
            <AlertDialogTrigger>
              <Button
                variant={
                  column.cardCount > 0 || isUpdating ? 'ghost' : 'destructive'
                }
                size="sm"
                disabled={isUpdating || column.cardCount > 0 || !canDelete}
                className={cn(
                  'h-8 w-8 p-0',
                  (column.cardCount > 0 || isUpdating) &&
                    'opacity-50 cursor-not-allowed'
                )}
              >
                <TrashIcon
                  className={cn(
                    'h-4 w-4',
                    column.cardCount > 0 || isUpdating ? '' : 'text-white'
                  )}
                />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete Column</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to delete the column &ldquo;{title}
                  &rdquo;? This action cannot be undone.
                  {column.cardCount > 0 && (
                    <span className="block mt-2 text-destructive font-medium">
                      This column contains {column.cardCount} task(s). Please
                      move or delete all tasks before deleting the column.
                    </span>
                  )}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDelete}
                  disabled={column.cardCount > 0 || !canDelete}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
            <TooltipContent>
              {isUpdating
                ? 'Please wait...'
                : column.cardCount > 0
                  ? `Cannot delete column with ${column.cardCount} task${column.cardCount === 1 ? '' : 's'}`
                  : !canDelete
                    ? 'System columns cannot be deleted'
                    : 'Delete column'}
            </TooltipContent>
          </AlertDialog>
        </Tooltip>

        <Switch
          checked={isEnabled}
          onCheckedChange={handleToggle}
          disabled={isUpdating}
        />
      </div>
    </div>
  )
}
