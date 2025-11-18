import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { useDeleteWorkspace } from '@/services/workspaces'
import { toast } from 'sonner'

interface DeleteWorkspaceDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  workspaceId: string | null
  workspaceName?: string
}

export function DeleteWorkspaceDialog({
  open,
  onOpenChange,
  workspaceId,
  workspaceName,
}: DeleteWorkspaceDialogProps) {
  const deleteWorkspace = useDeleteWorkspace()

  const handleClose = (newOpen: boolean) => {
    onOpenChange(newOpen)
  }

  const handleDelete = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault()
    if (!workspaceId) return

    deleteWorkspace.mutate(workspaceId, {
      onSuccess: () => {
        toast.success('Workspace deleted')
        handleClose(false)
      },
      onError: error => {
        const message = error instanceof Error ? error.message : 'Unknown error'
        toast.error('Failed to delete workspace', {
          description: message,
        })
      },
    })
  }

  return (
    <AlertDialog open={open} onOpenChange={handleClose}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete workspace</AlertDialogTitle>
          <AlertDialogDescription>
            This action cannot be undone. This will permanently delete
            {workspaceName ? ` "${workspaceName}"` : ' this workspace'}.
            <br />
            <br />
            <strong>Note:</strong> You must move or delete all projects from
            this workspace before you can delete it.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={deleteWorkspace.isPending}>
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={deleteWorkspace.isPending}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {deleteWorkspace.isPending ? 'Deleting…' : 'Delete'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
