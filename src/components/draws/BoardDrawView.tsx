import { useCallback, useEffect, useMemo } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { getAssetUrls } from '@tldraw/assets/selfHosted'
import { Tldraw, type TldrawProps } from '@tldraw/tldraw'
import '@tldraw/tldraw/tldraw.css'

import { BoardNavbar } from '@/components/kanban/BoardNavbar'
import { useBoards } from '@/services/kanban'
import { Button } from '@/components/ui/button'
import { useUIStore } from '@/store/ui-store'
import { useWorkspaceStore } from '@/store/workspace-store'

const assetUrls: TldrawProps['assetUrls'] = getAssetUrls({ baseUrl: '/tldraw-assets' })

export function BoardDrawView() {
  const { boardId } = useParams<{ boardId: string }>()
  const navigate = useNavigate()
  const {
    data: boards = [],
    isLoading,
    isError,
    error,
    refetch,
  } = useBoards()

  const setLeftSidebarVisible = useUIStore(state => state.setLeftSidebarVisible)
  const setSelectedWorkspaceId = useWorkspaceStore(
    state => state.setSelectedWorkspaceId
  )

  useEffect(() => {
    const { leftSidebarVisible } = useUIStore.getState()
    const shouldRestoreSidebar = leftSidebarVisible

    if (leftSidebarVisible) {
      setLeftSidebarVisible(false)
    }

    return () => {
      if (shouldRestoreSidebar) {
        setLeftSidebarVisible(true)
      }
    }
  }, [setLeftSidebarVisible])

  const board = useMemo(
    () => boards.find(item => item.id === boardId) ?? null,
    [boards, boardId]
  )

  useEffect(() => {
    if (board?.workspaceId) {
      setSelectedWorkspaceId(board.workspaceId)
    }
  }, [board, setSelectedWorkspaceId])

  const handleTabChange = useCallback(
    (tab: string) => {
      if (!boardId) {
        return
      }

      if (tab === 'tasks') {
        navigate(`/projects/${boardId}`)
        return
      }

      if (tab === 'notes') {
        navigate(`/projects/${boardId}/notes`)
        return
      }

      if (tab === 'draws') {
        return
      }

      navigate(`/projects/${boardId}`)
    },
    [boardId, navigate]
  )

  if (!boardId) {
    return (
      <div className="flex h-full items-center justify-center p-6">
        <p className="text-muted-foreground">Project not found.</p>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center p-6">
        <p className="text-muted-foreground">Loading board…</p>
      </div>
    )
  }

  if (isError) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 p-6 text-center">
        <div>
          <p className="text-lg font-semibold text-foreground">
            Unable to load projects
          </p>
          {error instanceof Error ? (
            <p className="mt-2 text-sm text-muted-foreground">
              {error.message}
            </p>
          ) : null}
        </div>
        <Button onClick={() => refetch()}>Try again</Button>
      </div>
    )
  }

  if (!board) {
    return (
      <div className="flex h-full items-center justify-center p-6">
        <p className="text-muted-foreground">Board not found.</p>
      </div>
    )
  }

  return (
    <div className="flex h-screen max-h-screen flex-col overflow-hidden">
      <BoardNavbar
        boardTitle={board.title}
        activeTab="draws"
        onTabChange={handleTabChange}
      />

      <div
        className="relative flex-1 overflow-hidden"
        style={{ cursor: 'auto', userSelect: 'auto' }}
      >
        <div className="absolute inset-0">
          <Tldraw licenseKey="tldraw-2026-01-18/WyJhQlFqNDN0QiIsWyIqIl0sMTYsIjIwMjYtMDEtMTgiXQ.QYRIuxzb9KtFcg5AyxPtczlCkgqRtQrbRUO/4+o7ikWsPxGZdUg44h1NRD2cOcjTfHlmZhDsXe55+4j2r3LOUg" assetUrls={assetUrls} persistenceKey={`board-${boardId}-draws`} />
        </div>
      </div>
    </div>
  )
}

export default BoardDrawView
