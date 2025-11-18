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
import { useDeleteBoard } from '@/services/kanban'
import { toast } from 'sonner'
import { useLocation, useNavigate } from 'react-router-dom'

interface DeleteProjectDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  projectId: string | null
  projectTitle?: string
}

export function DeleteProjectDialog({
  open,
  onOpenChange,
  projectId,
  projectTitle,
}: DeleteProjectDialogProps) {
  const deleteBoard = useDeleteBoard()
  const navigate = useNavigate()
  const location = useLocation()

  const handleClose = (newOpen: boolean) => {
    onOpenChange(newOpen)
  }

  const handleConfirmDelete = () => {
    if (!projectId || deleteBoard.isPending) {
      return
    }

    const targetId = projectId

    deleteBoard.mutate(
      { id: targetId },
      {
        onSuccess: () => {
          toast.success('Project deleted')
          handleClose(false)

          if (location.pathname === `/projects/${targetId}`) {
            navigate('/')
          }
        },
        onError: error => {
          const message = error instanceof Error ? error.message : 'Unknown error'
          toast.error('Failed to delete project', { description: message })
        },
      }
    )
  }

  return (
    <AlertDialog open={open} onOpenChange={handleClose}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete project</AlertDialogTitle>
          <AlertDialogDescription>
            This action cannot be undone. This will permanently delete
            {projectTitle ? ` "${projectTitle}"` : ' this project'} and all of
            its data.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={deleteBoard.isPending}>
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={event => {
              event.preventDefault()
              handleConfirmDelete()
            }}
            disabled={deleteBoard.isPending}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {deleteBoard.isPending ? 'Deleting…' : 'Delete'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
