import { useCallback, useEffect, useMemo, useRef, lazy, Suspense } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { getAssetUrls } from '@tldraw/assets/selfHosted'
import type { Editor as TldrawEditor, TldrawProps } from '@tldraw/tldraw'
import '@tldraw/tldraw/tldraw.css'

import { BoardNavbar } from '@/components/kanban/BoardNavbar'
import { useBoards } from '@/services/kanban'
import { useWorkspaces } from '@/services/workspaces'
import { Button } from '@/components/ui/button'
import { useUIStore } from '@/store/ui-store'
import { useWorkspaceStore } from '@/store/workspace-store'
import { getWhiteboardSeedKey } from '@/services/demo-data'

const assetUrls: TldrawProps['assetUrls'] = getAssetUrls({
  baseUrl: '/tldraw-assets',
})

const TldrawLazy = lazy(() =>
  import('@tldraw/tldraw').then(mod => ({ default: mod.Tldraw }))
)

export function BoardDrawView() {
  const { boardId } = useParams<{ boardId: string }>()
  const navigate = useNavigate()
  const { data: boards = [], isLoading, isError, error, refetch } = useBoards()
  const { data: workspaces = [] } = useWorkspaces()
  const hasAppliedSeed = useRef(false)

  const setLeftSidebarVisible = useUIStore(state => state.setLeftSidebarVisible)
  const setLeftSidebarLocked = useUIStore(state => state.setLeftSidebarLocked)
  const setSelectedWorkspaceId = useWorkspaceStore(
    state => state.setSelectedWorkspaceId
  )

  useEffect(() => {
    const { leftSidebarVisible } = useUIStore.getState()
    const shouldRestoreSidebar = leftSidebarVisible

    if (leftSidebarVisible) {
      setLeftSidebarVisible(false)
    }

    setLeftSidebarLocked(true)

    return () => {
      if (shouldRestoreSidebar) {
        setLeftSidebarVisible(true)
      }
      setLeftSidebarLocked(false)
    }
  }, [setLeftSidebarVisible, setLeftSidebarLocked])

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

      if (tab === 'whiteboard') {
        return
      }

      navigate(`/projects/${boardId}`)
    },
    [boardId, navigate]
  )

  const handleWhiteboardMount = useCallback(
    (editor: TldrawEditor) => {
      if (!boardId || hasAppliedSeed.current) {
        return
      }
      hasAppliedSeed.current = true

      if (typeof window === 'undefined') {
        return
      }

      const raw = window.localStorage.getItem(getWhiteboardSeedKey(boardId))
      if (!raw) return

      try {
        const payload = JSON.parse(raw) as {
          shapes?: Record<string, unknown>[]
        }
        if (!payload?.shapes?.length) {
          return
        }

        // Type assertion for demo shapes
        const shapes = payload.shapes as Parameters<
          typeof editor.createShapes
        >[0]
        if (Array.isArray(shapes) && shapes.length > 0) {
          editor.createShapes(shapes)

          if (typeof editor.zoomToFit === 'function') {
            editor.zoomToFit({ animation: { duration: 240 } })
          }
        }
      } catch (seedError) {
        console.warn('Failed to apply whiteboard demo seed', seedError)
      } finally {
        window.localStorage.removeItem(getWhiteboardSeedKey(boardId))
      }
    },
    [boardId]
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
        boardIcon={board.icon ?? undefined}
        boardEmoji={board.emoji ?? undefined}
        boardColor={board.color ?? undefined}
        workspaceName={workspaces.find(ws => ws.id === board.workspaceId)?.name}
        activeTab="whiteboard"
        onTabChange={handleTabChange}
      />

      <div
        className="relative flex-1 overflow-hidden"
        style={{ cursor: 'auto', userSelect: 'auto' }}
      >
        <div className="absolute inset-0">
          <Suspense
            fallback={
              <div className="flex h-full w-full items-center justify-center text-sm text-muted-foreground">
                Loading whiteboard…
              </div>
            }
          >
            <TldrawLazy
              licenseKey="tldraw-2026-01-18/WyJhQlFqNDN0QiIsWyIqIl0sMTYsIjIwMjYtMDEtMTgiXQ.QYRIuxzb9KtFcg5AyxPtczlCkgqRtQrbRUO/4+o7ikWsPxGZdUg44h1NRD2cOcjTfHlmZhDsXe55+4j2r3LOUg"
              assetUrls={assetUrls}
              persistenceKey={`board-${boardId}-draws`}
              onMount={handleWhiteboardMount}
              data-testid="tldraw"
            />
          </Suspense>
        </div>
      </div>
    </div>
  )
}

export default BoardDrawView
