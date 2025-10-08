import { useState, useCallback, useId } from 'react'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { TagSelector } from '@/components/kanban/tags/TagSelector'
import type { KanbanCard, KanbanColumn, KanbanPriority } from '@/types/common'

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

export function AddTaskDialog({
  isOpen,
  onOpenChange,
  column,
  boardId,
  cardsInColumn,
  onCreateTask,
}: AddTaskDialogProps) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [priority, setPriority] = useState<KanbanPriority>('medium')
  const [dueDate, setDueDate] = useState('')
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([])
  const [isCreating, setIsCreating] = useState(false)

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
  }, [])

  const handleClose = useCallback(() => {
    if (isCreating) return
    onOpenChange(false)
    resetForm()
  }, [isCreating, onOpenChange, resetForm])

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()
      if (!title.trim() || !column) return

      setIsCreating(true)
      try {
        // Usar o comprimento da coluna + 1 para garantir uma posição única no final (sistema usa base 1)
        const position = cardsInColumn.length + 1

        await onCreateTask({
          id: `temp-${Date.now()}`,
          boardId,
          columnId: column.id,
          title: title.trim(),
          description: description.trim() || undefined,
          priority,
          dueDate: dueDate || undefined,
          tags: [],
          tagIds: selectedTagIds,
          position,
          attachments: null,
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
      cardsInColumn,
      onCreateTask,
      resetForm,
      onOpenChange,
    ]
  )

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Create New Task</DialogTitle>
          <DialogDescription>
            Add a new task to{' '}
            <span className="font-medium">{column?.title}</span>
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor={titleId}>Title *</Label>
              <Input
                id={titleId}
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="Enter task title"
                disabled={isCreating}
                autoFocus
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor={descriptionId}>Description</Label>
              <Textarea
                id={descriptionId}
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="Enter task description (optional)"
                disabled={isCreating}
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor={priorityId}>Priority</Label>
                <Select
                  value={priority}
                  onValueChange={(value: KanbanPriority) => setPriority(value)}
                  disabled={isCreating}
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

              <div className="space-y-2">
                <Label htmlFor={dueDateId}>Due Date</Label>
                <Input
                  id={dueDateId}
                  type="date"
                  value={dueDate}
                  onChange={e => setDueDate(e.target.value)}
                  disabled={isCreating}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Tags</Label>
              <TagSelector
                boardId={boardId}
                selectedTagIds={selectedTagIds}
                onChange={setSelectedTagIds}
                disabled={isCreating}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isCreating}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isCreating || !title.trim() || !column}
            >
              {isCreating ? 'Creating...' : 'Create Task'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
