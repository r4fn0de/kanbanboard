import { useCallback, useEffect, useId, useMemo, useState } from 'react'
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
import { Textarea } from '@/components/ui/textarea'
import type { KanbanBoard } from '@/types/common'
import { useBoards, useCreateBoard } from '@/services/kanban'
import { useWorkspaceStore } from '@/store/workspace-store'

export function BoardsView() {
  const { data: boards = [], isLoading, isError, error, refetch } = useBoards()
  const { mutateAsync: createBoard, isPending } = useCreateBoard()
  const selectedWorkspaceId = useWorkspaceStore(
    state => state.selectedWorkspaceId
  )

  const [selectedBoard, setSelectedBoard] = useState<KanbanBoard | null>(null)

  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [formError, setFormError] = useState<string | null>(null)

  const titleInputId = useId()
  const descriptionInputId = useId()

  const filteredBoards = useMemo(() => {
    if (!selectedWorkspaceId) {
      return boards
    }

    return boards.filter(board => board.workspaceId === selectedWorkspaceId)
  }, [boards, selectedWorkspaceId])

  useEffect(() => {
    if (!selectedBoard) {
      return
    }

    const updated = boards.find(board => board.id === selectedBoard.id)

    if (!updated) {
      setSelectedBoard(null)
      return
    }

    if (selectedWorkspaceId && updated.workspaceId !== selectedWorkspaceId) {
      setSelectedBoard(null)
      return
    }

    if (
      updated.title !== selectedBoard.title ||
      updated.description !== selectedBoard.description ||
      (updated.icon ?? null) !== (selectedBoard.icon ?? null)
    ) {
      setSelectedBoard(updated)
    }
  }, [boards, selectedBoard, selectedWorkspaceId])

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

      if (!selectedWorkspaceId) {
        toast.error('Select a workspace before creating a board')
        return
      }

      try {
        await createBoard({
          id: crypto.randomUUID(),
          workspaceId: selectedWorkspaceId,
          title: trimmedTitle,
          description: trimmedDescription ? trimmedDescription : undefined,
          icon: 'Folder',
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
    [createBoard, description, resetForm, selectedWorkspaceId, title]
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

  const handleEmptyStateCreate = useCallback(() => {
    setIsDialogOpen(true)
  }, [])

  const hasBoards = filteredBoards.length > 0

  if (!selectedWorkspaceId) {
    return (
      <div className="flex h-full items-center justify-center p-8 text-sm text-muted-foreground">
        Select a workspace to view its boards.
      </div>
    )
  }

  if (selectedBoard) {
    return <BoardDetailView board={selectedBoard} />
  }

  if (isLoading) {
    return (
      <div className="flex flex-col gap-8 p-8">
        <div className="flex items-center justify-between gap-4">
          <div className="flex flex-col gap-2">
            <div className="h-8 w-32 bg-gray-200 rounded-lg animate-pulse dark:bg-gray-700"></div>
            <div className="h-4 w-48 bg-gray-200 rounded animate-pulse dark:bg-gray-700"></div>
          </div>
          <div className="h-10 w-24 bg-gray-200 rounded-xl animate-pulse dark:bg-gray-700"></div>
        </div>
        <div className="grid flex-1 gap-6 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {['a', 'b', 'c', 'd', 'e', 'f'].map(key => (
            <div
              key={key}
              className="h-40 bg-white border border-gray-200/60 rounded-2xl p-6 shadow-sm dark:bg-gray-900 dark:border-gray-700/60"
            >
              <div className="space-y-3">
                <div className="h-6 bg-gray-200 rounded animate-pulse dark:bg-gray-700"></div>
                <div className="h-4 bg-gray-200 rounded animate-pulse dark:bg-gray-700"></div>
                <div className="h-4 bg-gray-200 rounded w-3/4 animate-pulse dark:bg-gray-700"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (isError) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-6 p-8 text-center">
        <div className="flex flex-col items-center gap-4">
          <div className="h-16 w-16 rounded-full bg-red-50 flex items-center justify-center dark:bg-red-900/20">
            <svg
              className="h-8 w-8 text-red-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"
              />
            </svg>
          </div>
          <div className="flex flex-col gap-2">
            <p className="text-xl font-semibold text-gray-900 dark:text-gray-100">
              Could not load the boards.
            </p>
            {error instanceof Error ? (
              <p className="text-base text-gray-600 leading-relaxed dark:text-gray-400">
                {error.message}
              </p>
            ) : null}
          </div>
        </div>
        <Button onClick={() => refetch()} size="lg" className="px-8">
          Try again
        </Button>
      </div>
    )
  }

  return (
    <Dialog open={isDialogOpen} onOpenChange={handleDialogOpenChange}>
      <div className="flex h-full flex-col gap-8 p-8">
        <div className="flex items-center justify-between gap-4">
          <div className="flex flex-col gap-2">
            <h1 className="text-3xl font-semibold tracking-tight text-gray-900 dark:text-gray-100">
              Boards
            </h1>
            <p className="text-base text-gray-600 dark:text-gray-400">
              Manage your local Kanban boards.
            </p>
          </div>
          <DialogTrigger asChild>
            <Button
              disabled={isPending || !selectedWorkspaceId}
              size="lg"
              className="px-6"
            >
              New board
            </Button>
          </DialogTrigger>
        </div>

        {hasBoards ? (
          <div className="grid flex-1 gap-6 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
            {filteredBoards.map(board => (
              <Card
                key={board.id}
                role="button"
                tabIndex={0}
                onClick={() => handleSelectBoard(board)}
                onKeyDown={event => handleBoardKeyDown(board, event)}
                className="group flex flex-col justify-center gap-4 border border-gray-200/60 bg-white p-6 rounded-2xl shadow-sm transition-all duration-200 hover:shadow-lg hover:border-gray-300/80 hover:scale-[1.02] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-400/20 focus-visible:ring-offset-2 dark:border-gray-700/60 dark:bg-gray-900 dark:hover:border-gray-600/80 cursor-pointer"
              >
                <CardHeader className="space-y-3 p-0">
                  <CardTitle className="line-clamp-2 text-xl font-semibold text-gray-900 group-hover:text-gray-800 dark:text-gray-100 dark:group-hover:text-gray-200">
                    {board.title}
                  </CardTitle>
                  {board.description ? (
                    <CardDescription className="line-clamp-3 text-sm text-gray-600 leading-relaxed dark:text-gray-400">
                      {board.description}
                    </CardDescription>
                  ) : (
                    <div className="h-4"></div> // Spacer for consistent height
                  )}
                </CardHeader>
                <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-500">
                  <span className="flex items-center gap-1">
                    <div className="h-2 w-2 rounded-full bg-gray-400"></div>
                    Board
                  </span>
                  <span className="opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                    Click to open →
                  </span>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center gap-6 text-center">
            <div className="flex flex-col items-center gap-4">
              <div className="h-16 w-16 rounded-full bg-gray-100 flex items-center justify-center dark:bg-gray-800">
                <svg
                  className="h-8 w-8 text-gray-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
                  />
                </svg>
              </div>
              <div className="flex flex-col gap-2">
                <p className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                  No boards found
                </p>
                <p className="max-w-sm text-base text-gray-600 leading-relaxed dark:text-gray-400">
                  Create the first board to start organizing your tasks in
                  columns and cards.
                </p>
              </div>
            </div>
            <Button
              onClick={handleEmptyStateCreate}
              disabled={isPending}
              size="lg"
              className="px-8"
            >
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
