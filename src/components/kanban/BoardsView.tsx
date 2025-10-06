import { useCallback, useEffect, useId, useState } from 'react'
import type { FormEvent, KeyboardEvent } from 'react'
import { toast } from 'sonner'

import { BoardDetailView } from '@/components/kanban/BoardDetailView'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { Textarea } from '@/components/ui/textarea'
import type { KanbanBoard } from '@/types/common'
import { useBoards, useCreateBoard } from '@/services/kanban'

export function BoardsView() {
  const {
    data: boards = [],
    isLoading,
    isError,
    error,
    refetch,
  } = useBoards()
  const { mutateAsync: createBoard, isPending } = useCreateBoard()

  const [selectedBoard, setSelectedBoard] = useState<KanbanBoard | null>(null)

  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [formError, setFormError] = useState<string | null>(null)

  const titleInputId = useId()
  const descriptionInputId = useId()

  useEffect(() => {
    if (!selectedBoard) {
      return
    }

    const updated = boards.find(board => board.id === selectedBoard.id)
    if (
      updated &&
      (updated.title !== selectedBoard.title ||
        updated.description !== selectedBoard.description)
    ) {
      setSelectedBoard(updated)
    }
  }, [boards, selectedBoard])

  const resetForm = useCallback(() => {
    setTitle('')
    setDescription('')
    setFormError(null)
  }, [])

  const handleDialogOpenChange = useCallback(
    (open: boolean) => {
      if (!open) {
        resetForm()
      }
      setIsDialogOpen(open)
    },
    [resetForm]
  )

  const handleCreateBoardSubmit = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault()
      setFormError(null)

      const trimmedTitle = title.trim()
      if (!trimmedTitle) {
        setFormError('Inform a name for the board.')
        return
      }

      const trimmedDescription = description.trim()

      try {
        await createBoard({
          id: crypto.randomUUID(),
          title: trimmedTitle,
          description: trimmedDescription ? trimmedDescription : undefined,
        })
        toast.success('Board created successfully')
        resetForm()
        setIsDialogOpen(false)
      } catch (mutationError) {
        const message =
          mutationError instanceof Error
            ? mutationError.message
            : 'Could not create the board'
        toast.error(message)
        setFormError(message)
      }
    },
    [createBoard, description, resetForm, title]
  )

  const handleSelectBoard = useCallback((board: KanbanBoard) => {
    setSelectedBoard(board)
  }, [])

  const handleBoardKeyDown = useCallback(
    (board: KanbanBoard, event: KeyboardEvent<HTMLDivElement>) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault()
        handleSelectBoard(board)
      }
    },
    [handleSelectBoard]
  )

  const handleBackToBoards = useCallback(() => {
    setSelectedBoard(null)
  }, [])

  const handleEmptyStateCreate = useCallback(() => {
    setIsDialogOpen(true)
  }, [])

  const hasBoards = boards.length > 0

  if (selectedBoard) {
    return <BoardDetailView board={selectedBoard} onBack={handleBackToBoards} />
  }

  if (isLoading) {
    return (
      <div className="flex flex-col gap-4 p-6">
        <Skeleton className="h-10 w-48" />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {['a', 'b', 'c', 'd', 'e', 'f'].map(key => (
            <Skeleton key={key} className="h-36" />
          ))}
        </div>
      </div>
    )
  }

  if (isError) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 p-6 text-center">
        <p className="text-lg font-semibold text-foreground">
          Could not load the boards.
        </p>
        {error instanceof Error ? (
          <p className="text-sm text-muted-foreground">{error.message}</p>
        ) : null}
        <Button onClick={() => refetch()}>Try again</Button>
      </div>
    )
  }

  return (
    <Dialog open={isDialogOpen} onOpenChange={handleDialogOpenChange}>
      <div className="flex h-full flex-col gap-6 p-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Boards</h1>
            <p className="text-sm text-muted-foreground">
              Manage your local Kanban boards.
            </p>
          </div>
          <DialogTrigger asChild>
            <Button disabled={isPending}>New board</Button>
          </DialogTrigger>
        </div>

        {hasBoards ? (
          <div className="grid flex-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {boards.map(board => (
              <Card
                key={board.id}
                role="button"
                tabIndex={0}
                onClick={() => handleSelectBoard(board)}
                onKeyDown={event => handleBoardKeyDown(board, event)}
                className="flex flex-col justify-center gap-2 border border-border/60 p-4 transition hover:border-primary/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <CardHeader className="space-y-2 p-0">
                  <CardTitle className="line-clamp-1 text-lg font-semibold">
                    {board.title}
                  </CardTitle>
                  {board.description ? (
                    <CardDescription className="line-clamp-2 text-sm text-muted-foreground">
                      {board.description}
                    </CardDescription>
                  ) : null}
                </CardHeader>
              </Card>
            ))}
          </div>
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
            <p className="text-lg font-semibold text-foreground">
              No boards found
            </p>
            <p className="max-w-sm text-sm text-muted-foreground">
              Create the first board to start organizing your tasks in columns and cards.
            </p>
            <Button onClick={handleEmptyStateCreate} disabled={isPending}>
              Create first board
            </Button>
          </div>
        )}
      </div>

      <DialogContent>
        <DialogHeader>
            <DialogTitle>New board</DialogTitle>
          <DialogDescription>
            Define a name and description to start organizing your tasks.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleCreateBoardSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor={titleInputId}>Board name</Label>
            <Input
              id={titleInputId}
              value={title}
              onChange={event => setTitle(event.target.value)}
              placeholder="Ex.: Product planning"
              autoFocus
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor={descriptionInputId}>Description (optional)</Label>
            <Textarea
              id={descriptionInputId}
              value={description}
              onChange={event => setDescription(event.target.value)}
              placeholder="Inform details or objectives of the board"
              rows={3}
            />
          </div>
          {formError ? (
            <p className="text-sm text-destructive">{formError}</p>
          ) : null}
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline" disabled={isPending}>
                Cancel
              </Button>
            </DialogClose>
            <Button type="submit" disabled={isPending}>
              {isPending ? 'Creating...' : 'Create board'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export default BoardsView
