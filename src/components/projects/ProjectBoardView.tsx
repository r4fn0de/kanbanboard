import { useCallback, useEffect, useMemo } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'

import { BoardDetailView } from '@/components/kanban/BoardDetailView'
import {
  DEFAULT_BOARD_VIEW_MODE,
  isBoardViewMode,
  type BoardViewMode,
} from '@/components/kanban/board-view-modes'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useBoards } from '@/services/kanban'
import { useWorkspaceStore } from '@/store/workspace-store'

export function ProjectBoardView() {
  const { boardId } = useParams<{ boardId: string }>()
  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()
  const { data: boards = [], isLoading, isError, error, refetch } = useBoards()
  const setSelectedWorkspaceId = useWorkspaceStore(
    state => state.setSelectedWorkspaceId
  )

  const viewParam = searchParams.get('view')
  const viewMode = useMemo<BoardViewMode>(() => {
    if (isBoardViewMode(viewParam)) {
      return viewParam
    }
    return DEFAULT_BOARD_VIEW_MODE
  }, [viewParam])

  const board = useMemo(
    () => boards.find(item => item.id === boardId),
    [boards, boardId]
  )

  useEffect(() => {
    if (board?.workspaceId) {
      setSelectedWorkspaceId(board.workspaceId)
    }
  }, [board, setSelectedWorkspaceId])

  useEffect(() => {
    if (viewParam && !isBoardViewMode(viewParam)) {
      setSearchParams(
        current => {
          const next = new URLSearchParams(current)
          next.delete('view')
          return next
        },
        { replace: true }
      )
    }
  }, [setSearchParams, viewParam])

  const handleViewModeChange = useCallback(
    (mode: BoardViewMode) => {
      setSearchParams(
        current => {
          const next = new URLSearchParams(current)
          if (mode === DEFAULT_BOARD_VIEW_MODE) {
            next.delete('view')
          } else {
            next.set('view', mode)
          }
          return next
        },
        { replace: true }
      )
    },
    [setSearchParams]
  )

  const handleBack = useCallback(() => {
    navigate('/')
  }, [navigate])

  if (!boardId) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center">
        <p className="text-lg font-semibold text-foreground">
          Project not specified
        </p>
        <Button onClick={handleBack}>Go back</Button>
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
        <p className="text-lg font-semibold text-foreground">
          Unable to load projects
        </p>
        {error instanceof Error ? (
          <p className="max-w-sm text-sm text-muted-foreground">
            {error.message}
          </p>
        ) : null}
        <div className="flex gap-2">
          <Button onClick={() => refetch()}>Try again</Button>
          <Button variant="ghost" onClick={handleBack}>
            Go back
          </Button>
        </div>
      </div>
    )
  }

  if (!board) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 p-6 text-center">
        <p className="text-lg font-semibold text-foreground">
          Project not found
        </p>
        <Button onClick={handleBack}>Go back</Button>
      </div>
    )
  }

  return (
    <BoardDetailView
      board={board}
      viewMode={viewMode}
      onViewModeChange={handleViewModeChange}
    />
  )
}

export default ProjectBoardView
