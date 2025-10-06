import { useMemo } from 'react'
import { useNavigate, useParams } from 'react-router-dom'

import { BoardDetailView } from '@/components/kanban/BoardDetailView'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useBoards } from '@/services/kanban'

export function ProjectBoardView() {
  const { boardId } = useParams<{ boardId: string }>()
  const navigate = useNavigate()
  const {
    data: boards = [],
    isLoading,
    isError,
    error,
    refetch,
  } = useBoards()

  const board = useMemo(() => boards.find(item => item.id === boardId), [boards, boardId])

  if (!boardId) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center">
        <p className="text-lg font-semibold text-foreground">Project not specified</p>
        <Button onClick={() => navigate('/projects/all')}>Go back</Button>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="flex h-full flex-col gap-4 p-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  if (isError) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 p-6 text-center">
        <p className="text-lg font-semibold text-foreground">Unable to load projects</p>
        {error instanceof Error ? (
          <p className="max-w-sm text-sm text-muted-foreground">{error.message}</p>
        ) : null}
        <div className="flex gap-2">
          <Button onClick={() => refetch()}>Try again</Button>
          <Button variant="outline" onClick={() => navigate('/projects/all')}>
            Go back
          </Button>
        </div>
      </div>
    )
  }

  if (!board) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 p-6 text-center">
        <p className="text-lg font-semibold text-foreground">Project not found</p>
        <Button onClick={() => navigate('/projects/all')}>Go back</Button>
      </div>
    )
  }

  return <BoardDetailView board={board} onBack={() => navigate('/projects/all')} />
}

export default ProjectBoardView
