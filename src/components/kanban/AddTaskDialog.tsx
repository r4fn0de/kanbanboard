import { useState, useCallback, useId } from 'react'
import { toast } from 'sonner'
import { Dialog } from '@base-ui-components/react/dialog'
import { Select } from '@base-ui-components/react/select'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { TagSelector } from '@/components/kanban/tags/TagSelector'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'
import {
  CalendarDays,
  Columns3,
  Check,
} from 'lucide-react'
import { PriorityLowIcon, PriorityMediumIcon, PriorityHighIcon } from '@/components/ui/icons'
import type { KanbanCard, KanbanColumn, KanbanPriority } from '@/types/common'
import { createCardSchema } from '@/schemas/kanban'

interface AddTaskDialogProps {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  column: KanbanColumn | null
  boardId: string
  cardsInColumn: KanbanCard[]
  onCreateTask: (
    task: Omit<KanbanCard, 'createdAt' | 'updatedAt' | 'archivedAt'> & {
      tagIds?: string[]
    }
  ) => Promise<void>
}

const priorityItems = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
] as const

export function AddTaskDialog({
  isOpen,
  onOpenChange,
  column,
  boardId,
  onCreateTask,
}: AddTaskDialogProps) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [priority, setPriority] = useState<KanbanPriority>('medium')
  const [dueDate, setDueDate] = useState('')
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([])
  const [isCreating, setIsCreating] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const titleId = useId()
  const descriptionId = useId()
  const priorityId = useId()
  const dueDateId = useId()

  const resetForm = useCallback(() => {
    setTitle('')
    setDescription('')
    setPriority('medium')
    setDueDate('')
    setSelectedTagIds([])
    setFormError(null)
  }, [])

  const handleResetAndClose = useCallback(() => {
    if (isCreating) return
    onOpenChange(false)
    resetForm()
  }, [isCreating, onOpenChange, resetForm])

  const handleOpenChange = useCallback(
    (open: boolean) => {
      if (open) {
        onOpenChange(true)
        return
      }

      handleResetAndClose()
    },
    [handleResetAndClose, onOpenChange]
  )

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()
      if (!column) {
        setFormError('Select a column before creating a task.')
        return
      }

      const payload = {
        id: `temp-${Date.now()}`,
        boardId,
        columnId: column.id,
        title: title.trim(),
        description: description.trim() || undefined,
        priority,
        dueDate: dueDate || undefined,
        position: 0,
        tagIds: selectedTagIds,
      }

      const result = createCardSchema.safeParse(payload)
      if (!result.success) {
        const message = result.error.issues[0]?.message ?? 'Invalid task data'
        setFormError(message)
        toast.error(message)
        return
      }
      setFormError(null)

      setIsCreating(true)
      try {
        // Position will be calculated by the parent component (BoardDetailView)
        // based on priority and alphabetical order
        await onCreateTask({
          ...result.data,
          tags: [],
          attachments: null,
          subtasks: [],
        })

        resetForm()
        onOpenChange(false)
        toast.success('Task created successfully')
      } catch (error) {
        console.error('Failed to create task:', error)
        toast.error(
          `Failed to create task: ${error instanceof Error ? error.message : 'Unknown error'}`
        )
      } finally {
        setIsCreating(false)
      }
    },
    [
      title,
      description,
      priority,
      dueDate,
      selectedTagIds,
      column,
      boardId,
      onCreateTask,
      resetForm,
      onOpenChange,
    ]
  )

  const getPriorityIcon = (value: KanbanPriority) => {
    switch (value) {
      case 'low':
        return (
          <PriorityLowIcon className="h-3 w-3 text-emerald-700 dark:text-emerald-300" />
        )
      case 'high':
        return <PriorityHighIcon className="h-3 w-3 text-rose-700 dark:text-rose-300" />
      default:
        return <PriorityMediumIcon className="h-3 w-3 text-amber-700 dark:text-amber-300" />
    }
  }

  return (
    <Dialog.Root open={isOpen} onOpenChange={handleOpenChange}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 bg-black/50 z-50" />
        <Dialog.Popup className="fixed left-1/2 top-1/2 z-50 w-full max-w-[760px] -translate-x-1/2 -translate-y-1/2 rounded-xl border bg-background">
          <div className="border-b px-6 py-4">
            <Breadcrumb>
              <BreadcrumbList className="items-center gap-1 text-xs font-medium text-muted-foreground">
                <BreadcrumbItem>
                  <BreadcrumbLink href="#" className="flex items-center gap-2">
                    <Columns3 className="h-4 w-4" />
                    Tasks
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbLink href="#">
                    {column ? column.title : 'Select column'}
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbPage className="text-foreground">
                    New task
                  </BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>

          <form
            onSubmit={handleSubmit}
            className="flex flex-col gap-6 px-6 py-6"
          >
            <div className="space-y-3">
              <Label htmlFor={titleId} className="sr-only">
                Title
              </Label>
              <Input
                id={titleId}
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="Task title"
                disabled={isCreating}
                autoFocus
                required
                className="border-none bg-transparent px-0 text-2xl font-semibold shadow-none focus-visible:ring-0 dark:bg-transparent"
              />

              <Label htmlFor={descriptionId} className="sr-only">
                Description
              </Label>
              <Textarea
                id={descriptionId}
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="Add a task description"
                disabled={isCreating}
                className="min-h-[96px] resize-none border-none bg-transparent px-0 text-sm text-muted-foreground shadow-none focus-visible:ring-0 dark:bg-transparent"
              />
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors hover:bg-accent/50">
                <span className="font-medium text-foreground">
                  {column ? column.title : 'Column'}
                </span>
              </div>

              <Label htmlFor={priorityId} className="sr-only">
                Priority
              </Label>
              <Select.Root
                value={priority}
                onValueChange={value => setPriority(value as KanbanPriority)}
                disabled={isCreating}
                items={priorityItems}
              >
                <Select.Trigger className="h-auto w-auto rounded-lg border bg-transparent px-3 py-2 text-sm font-medium shadow-none transition-colors hover:bg-accent/50 focus:ring-0 focus:ring-offset-0">
                  <Select.Value>
                    {(value: KanbanPriority) => (
                      <div className="flex items-center gap-2">
                        {getPriorityIcon(value)}
                        {
                          priorityItems.find(item => item.value === value)
                            ?.label
                        }
                      </div>
                    )}
                  </Select.Value>
                </Select.Trigger>
                <Select.Portal>
                  <Select.Positioner sideOffset={5} className="z-50">
                    <Select.Popup className="rounded-md border bg-popover p-1">
                      <Select.List>
                        {priorityItems.map(item => (
                          <Select.Item
                            key={item.value}
                            value={item.value}
                            className="relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent focus:bg-accent data-[disabled]:pointer-events-none data-[disabled]:opacity-50"
                          >
                            <Select.ItemIndicator className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
                              <Check className="h-4 w-4" />
                            </Select.ItemIndicator>
                            <Select.ItemText className="pl-6">
                              <div className="flex items-center gap-2">
                                {getPriorityIcon(item.value as KanbanPriority)}
                                {item.label}
                              </div>
                            </Select.ItemText>
                          </Select.Item>
                        ))}
                      </Select.List>
                    </Select.Popup>
                  </Select.Positioner>
                </Select.Portal>
              </Select.Root>

              <div className="flex items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors hover:bg-accent/50">
                <CalendarDays className="h-4 w-4" />
                <Label htmlFor={dueDateId} className="sr-only">
                  Due date
                </Label>
                <Input
                  id={dueDateId}
                  type="date"
                  value={dueDate}
                  onChange={e => setDueDate(e.target.value)}
                  disabled={isCreating}
                  className="h-auto w-auto border-none bg-transparent px-0 py-0 text-sm shadow-none focus-visible:ring-0"
                />
              </div>

              <div className="min-w-[160px]">
                <TagSelector
                  boardId={boardId}
                  selectedTagIds={selectedTagIds}
                  onChange={setSelectedTagIds}
                  disabled={isCreating}
                  className="space-y-0 [&>div:first-child]:hidden [&_button]:shadow-none [&_button[aria-expanded]]:rounded-lg [&_button[aria-expanded]]:border [&_button[aria-expanded]]:bg-transparent [&_button[aria-expanded]]:px-3 [&_button[aria-expanded]]:py-2 [&_button[aria-expanded]]:hover:bg-accent/50"
                />
              </div>
            </div>

            {formError && (
              <p className="text-sm text-destructive" role="alert">
                {formError}
              </p>
            )}

            <div className="flex items-center justify-between border-t px-0 pt-4">
              <Dialog.Close
                render={
                  <Button
                    type="button"
                    variant="ghost"
                    disabled={isCreating}
                    className="px-4"
                  >
                    Cancel
                  </Button>
                }
              />
              <Button
                type="submit"
                disabled={isCreating || !title.trim() || !column}
                className="rounded-xl px-6"
              >
                {isCreating ? 'Creating…' : 'Create Task'}
              </Button>
            </div>
          </form>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
