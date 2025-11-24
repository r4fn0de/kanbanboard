import { useState, useEffect, type FormEvent } from 'react'
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
import { useUpdateWorkspace } from '@/services/workspaces'
import { toast } from 'sonner'
import { DEFAULT_WORKSPACE_COLOR } from '@/components/layout/left-sidebar/constants'

interface EditWorkspaceDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  workspaceId: string | null
  initialName?: string
  initialColor?: string
}

export function EditWorkspaceDialog({
  open,
  onOpenChange,
  workspaceId,
  initialName = '',
  initialColor = DEFAULT_WORKSPACE_COLOR,
}: EditWorkspaceDialogProps) {
  const [workspaceName, setWorkspaceName] = useState(initialName)
  const [workspaceColor, setWorkspaceColor] = useState(initialColor)
  const updateWorkspace = useUpdateWorkspace()

  useEffect(() => {
    if (open) {
      setWorkspaceName(initialName)
      setWorkspaceColor(initialColor)
    }
  }, [open, initialName, initialColor])

  const handleClose = (newOpen: boolean) => {
    onOpenChange(newOpen)
    if (!newOpen) {
      setWorkspaceName('')
      setWorkspaceColor(DEFAULT_WORKSPACE_COLOR)
    }
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (updateWorkspace.isPending || !workspaceId) return

    const trimmedName = workspaceName.trim()
    if (!trimmedName) {
      toast.error('Workspace name is required')
      return
    }

    updateWorkspace.mutate(
      {
        id: workspaceId,
        name: trimmedName,
        color: workspaceColor,
      },
      {
        onSuccess: () => {
          toast.success('Workspace updated')
          handleClose(false)
        },
        onError: error => {
          const message =
            error instanceof Error ? error.message : 'Unknown error'
          toast.error('Failed to update workspace', {
            description: message,
          })
        },
      }
    )
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit workspace</DialogTitle>
          <DialogDescription>
            Update the workspace name and color.
          </DialogDescription>
        </DialogHeader>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <Label>Workspace name</Label>
            <Input
              value={workspaceName}
              onChange={event => setWorkspaceName(event.target.value)}
              placeholder="e.g. Product Team"
              autoFocus
              required
              className="h-10 border-0 bg-muted/70 text-foreground placeholder:text-muted-foreground focus-visible:ring-0 focus-visible:border-0"
            />
          </div>
          <div className="space-y-2">
            <Label>Color</Label>
            <div className="flex items-center gap-3">
              <Input
                type="color"
                value={workspaceColor}
                onChange={event => setWorkspaceColor(event.target.value)}
                className="h-10 w-16 cursor-pointer bg-transparent p-1"
              />
              <span className="text-xs text-muted-foreground">
                Used when no icon is set.
              </span>
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => handleClose(false)}
              disabled={updateWorkspace.isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={updateWorkspace.isPending}>
              {updateWorkspace.isPending ? 'Updating…' : 'Update workspace'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
