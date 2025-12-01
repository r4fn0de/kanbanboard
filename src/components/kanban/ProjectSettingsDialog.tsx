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
import { useRenameBoard, useUpdateBoardIcon } from '@/services/kanban'
import { toast } from 'sonner'
import {
  PROJECT_ICON_MAP,
  DEFAULT_PROJECT_ICON,
} from '@/components/layout/left-sidebar/constants'
import type { KanbanBoard } from '@/types/common'

interface ProjectSettingsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  board: KanbanBoard | null
}

export function ProjectSettingsDialog({
  open,
  onOpenChange,
  board,
}: ProjectSettingsDialogProps) {
  const [projectName, setProjectName] = useState('')
  const [projectDescription, setProjectDescription] = useState('')
  const [projectIcon, setProjectIcon] = useState(DEFAULT_PROJECT_ICON)
  const [projectColor, setProjectColor] = useState('#6366F1')
  const renameBoard = useRenameBoard()
  const updateBoardIcon = useUpdateBoardIcon()
  const projectNameId = useId()
  const projectDescriptionId = useId()

  useEffect(() => {
    if (open && board) {
      setProjectName(board.title)
      setProjectDescription(board.description ?? '')
      setProjectIcon(board.icon ?? DEFAULT_PROJECT_ICON)
      setProjectColor(board.color ?? '#6366F1')
    }
  }, [open, board])

  const handleClose = (newOpen: boolean) => {
    onOpenChange(newOpen)
    if (!newOpen && board) {
      // Reset to initial values
      setProjectName(board.title)
      setProjectDescription(board.description ?? '')
      setProjectIcon(board.icon ?? DEFAULT_PROJECT_ICON)
      setProjectColor(board.color ?? '#6366F1')
    }
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (renameBoard.isPending || updateBoardIcon.isPending || !board) {
      return
    }

    const trimmedName = projectName.trim()
    if (!trimmedName) {
      toast.error('Project name is required')
      return
    }

    // Update name and description
    renameBoard.mutate(
      {
        id: board.id,
        title: trimmedName,
        description: projectDescription.trim() || undefined,
      },
      {
        onSuccess: () => {
          // Update icon after successful name update
          updateBoardIcon.mutate(
            {
              id: board.id,
              icon: projectIcon,
            },
            {
              onSuccess: () => {
                toast.success('Project settings updated')
                handleClose(false)
              },
              onError: error => {
                const message =
                  error instanceof Error ? error.message : 'Unknown error'
                toast.error('Failed to update project icon', {
                  description: message,
                })
              },
            }
          )
        },
        onError: error => {
          const message =
            error instanceof Error ? error.message : 'Unknown error'
          toast.error('Failed to update project', {
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
          <DialogTitle>Project Settings</DialogTitle>
          <DialogDescription>
            Manage your project name, description, appearance, and
            customization.
          </DialogDescription>
        </DialogHeader>
        <form className="space-y-6" onSubmit={handleSubmit}>
          {/* Visual Preview */}
          <div className="flex items-center justify-center gap-4 py-4">
            <IconColorPicker
              icon={projectIcon}
              onIconChange={setProjectIcon}
              color={projectColor}
              onColorChange={setProjectColor}
              disabled={renameBoard.isPending || updateBoardIcon.isPending}
            >
              <div
                className="relative flex h-16 w-16 items-center justify-center rounded-2xl border border-transparent transition-all duration-200 cursor-pointer hover:bg-accent hover:border-border active:scale-95"
                style={{
                  transform: 'scale(1)',
                }}
              >
                <IconComponent
                  className="h-12 w-12"
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
              className="h-10"
            />
          </div>

          {/* Customization */}
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
              className="resize-none"
            />
          </div>

          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => handleClose(false)}
              disabled={renameBoard.isPending || updateBoardIcon.isPending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={renameBoard.isPending || updateBoardIcon.isPending}
            >
              {renameBoard.isPending || updateBoardIcon.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving…
                </>
              ) : (
                'Save changes'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
