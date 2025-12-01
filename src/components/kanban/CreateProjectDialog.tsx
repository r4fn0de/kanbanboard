import { useState, useEffect, type FormEvent, useId } from 'react'
import { Folder, Loader2 } from 'lucide-react'
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
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { IconColorPicker } from '@/components/kanban/IconColorPicker'
import { useCreateBoard, createColumn } from '@/services/kanban'
import { toast } from 'sonner'
import {
  PROJECT_ICON_MAP,
  DEFAULT_PROJECT_ICON,
} from '@/components/layout/left-sidebar/constants'
import {
  DEFAULT_COLUMN_ICON,
  DEFAULT_MONOCHROMATIC_COLOR,
} from '@/constants/kanban-columns'

interface CreateProjectDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  workspaceId: string | null
}

export function CreateProjectDialog({
  open,
  onOpenChange,
  workspaceId,
}: CreateProjectDialogProps) {
  const [projectName, setProjectName] = useState('')
  const [projectDescription, setProjectDescription] = useState('')
  const [projectIcon, setProjectIcon] = useState(DEFAULT_PROJECT_ICON)
  const [projectColor, setProjectColor] = useState('#6366F1')
  const createBoard = useCreateBoard()
  const projectNameId = useId()
  const projectDescriptionId = useId()

  useEffect(() => {
    if (!open) {
      // Reset form on close
      setProjectName('')
      setProjectDescription('')
      setProjectIcon(DEFAULT_PROJECT_ICON)
      setProjectColor('#6366F1')
    }
  }, [open])

  const handleClose = (newOpen: boolean) => {
    onOpenChange(newOpen)
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (createBoard.isPending) return

    const trimmedName = projectName.trim()
    if (!trimmedName) {
      toast.error('Project name is required')
      return
    }

    if (!workspaceId) {
      toast.error('Select a workspace before creating a project')
      return
    }

    const id = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}`

    createBoard.mutate(
      {
        id,
        workspaceId,
        title: trimmedName,
        description: projectDescription.trim() || undefined,
        icon: projectIcon,
        color: projectColor,
      },
      {
        onSuccess: async () => {
          try {
            const defaultColumns: { title: string; position: number }[] = [
              { title: 'Backlog', position: 0 },
              { title: 'To Do', position: 1 },
              { title: 'In Progress', position: 2 },
              { title: 'Done', position: 3 },
            ]

            for (const [index, column] of defaultColumns.entries()) {
              await createColumn({
                id:
                  globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${index}`,
                boardId: id,
                title: column.title,
                position: column.position,
                icon: DEFAULT_COLUMN_ICON,
                color: DEFAULT_MONOCHROMATIC_COLOR,
              })
            }
          } catch (error) {
            const message =
              error instanceof Error
                ? error.message
                : typeof error === 'string'
                  ? error
                  : JSON.stringify(error)
            console.error('Failed to create default columns', error)
            toast.error('Failed to create default columns', {
              description: message,
            })
          }

          toast.success('Project created')
          handleClose(false)
        },
        onError: error => {
          const message =
            error instanceof Error ? error.message : 'Unknown error'
          toast.error('Failed to create project', {
            description: message,
          })
        },
      }
    )
  }

  const IconComponent = PROJECT_ICON_MAP[projectIcon] ?? Folder

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Create project</DialogTitle>
          <DialogDescription>
            Choose an icon and customize the color for your project.
          </DialogDescription>
        </DialogHeader>
        <form className="space-y-6" onSubmit={handleSubmit}>
          {/* Visual Preview */}
          <div className="flex items-center justify-center gap-4 py-6">
            <IconColorPicker
              icon={projectIcon}
              onIconChange={setProjectIcon}
              color={projectColor}
              onColorChange={setProjectColor}
              disabled={createBoard.isPending}
            >
              <div
                className="relative flex h-20 w-20 items-center justify-center rounded-2xl border border-transparent transition-all duration-200 cursor-pointer hover:bg-accent hover:border-border active:scale-95"
                style={{
                  transform: 'scale(1)',
                }}
              >
                <IconComponent
                  className="h-14 w-14"
                  style={{ color: projectColor }}
                />
              </div>
            </IconColorPicker>
          </div>

          {/* Project Name */}
          <div className="space-y-2">
            <Label htmlFor={projectNameId} className="text-sm font-medium">
              Project name
            </Label>
            <Input
              id={projectNameId}
              value={projectName}
              onChange={event => setProjectName(event.target.value)}
              placeholder="e.g. Marketing Launch"
              autoFocus
              required
              className="h-10 border-0 bg-muted/70 text-foreground placeholder:text-muted-foreground focus-visible:ring-0 focus-visible:border-0"
            />
          </div>

          {/* Customization Grid */}
          {/* Removed old selector */}

          {/* Description */}
          <div className="space-y-2">
            <Label
              htmlFor={projectDescriptionId}
              className="text-sm font-medium"
            >
              Description{' '}
              <span className="text-muted-foreground">(optional)</span>
            </Label>
            <Textarea
              id={projectDescriptionId}
              value={projectDescription}
              onChange={event => setProjectDescription(event.target.value)}
              placeholder="What's this project about?"
              rows={3}
              className="resize-none border-0 bg-muted/70 text-foreground placeholder:text-muted-foreground focus-visible:ring-0 focus-visible:border-0"
            />
          </div>

          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => handleClose(false)}
              disabled={createBoard.isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={createBoard.isPending}>
              {createBoard.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating…
                </>
              ) : (
                'Create project'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
