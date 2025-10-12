import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'

import { BoardDrawView } from '../BoardDrawView'
import type { KanbanBoard } from '@/types/common'

vi.mock('@tldraw/tldraw', () => ({
  Tldraw: ({
    persistenceKey,
    assetUrls,
  }: {
    persistenceKey?: string
    assetUrls?: unknown
  }) => (
    <div
      data-testid="tldraw"
      data-persistence-key={persistenceKey ?? ''}
      data-has-asset-urls={assetUrls ? 'true' : 'false'}
    />
  ),
}))

vi.mock('@tldraw/assets/selfHosted', () => ({
  getAssetUrls: () => ({ fonts: { tldraw_draw: '/fonts/tldraw_draw.woff2' } }),
}))

vi.mock('@/services/kanban', () => ({
  useBoards: vi.fn(),
}))

import { useBoards } from '@/services/kanban'
import { useUIStore } from '@/store/ui-store'

const mockedUseBoards = vi.mocked(useBoards)

function createUseBoardsResult(data: KanbanBoard[]) {
  return {
    data,
    isLoading: false,
    isError: false,
    error: null,
    refetch: vi.fn(),
    isPending: false,
    isSuccess: true,
    isFetching: false,
    isFetched: true,
    isRefetching: false,
    isLoadingError: false,
    isRefetchError: false,
    isPlaceholderData: false,
    isPaused: false,
    isStale: false,
    failureCount: 0,
    failureReason: null,
    status: 'success' as const,
    fetchStatus: 'idle' as const,
    dataUpdatedAt: Date.now(),
    errorUpdatedAt: 0,
    remove: vi.fn(),
  } as unknown as ReturnType<typeof useBoards>
}

beforeEach(() => {
  useUIStore.setState({
    leftSidebarVisible: true,
  })
})

afterEach(() => {
  mockedUseBoards.mockReset()
  useUIStore.setState({
    leftSidebarVisible: true,
  })
})

function renderWithRouter(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/projects/:boardId/draws" element={<BoardDrawView />} />
      </Routes>
    </MemoryRouter>
  )
}

describe('BoardDrawView', () => {
  it('renders fallback when board does not exist', () => {
    mockedUseBoards.mockReturnValue(createUseBoardsResult([]))

    renderWithRouter('/projects/unknown/draws')

    expect(screen.getByText('Board not found.')).toBeInTheDocument()
  })

  it('renders tldraw canvas for existing board', () => {
    mockedUseBoards.mockReturnValue(
      createUseBoardsResult([
        {
          id: 'board-123',
          workspaceId: 'workspace-1',
          title: 'Design Board',
          description: null,
          icon: 'Palette',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          archivedAt: null,
        },
      ])
    )

    renderWithRouter('/projects/board-123/draws')

    expect(screen.getByText('Design Board')).toBeInTheDocument()
    const canvas = screen.getByTestId('tldraw')
    expect(canvas).toHaveAttribute('data-persistence-key', 'board-board-123-draws')
    expect(canvas).toHaveAttribute('data-has-asset-urls', 'true')
  })

  it('collapses the left sidebar on mount and restores on unmount when initially visible', async () => {
    mockedUseBoards.mockReturnValue(
      createUseBoardsResult([
        {
          id: 'board-456',
          workspaceId: 'workspace-1',
          title: 'Focus Board',
          description: null,
          icon: 'Palette',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          archivedAt: null,
        },
      ])
    )

    const { unmount } = renderWithRouter('/projects/board-456/draws')

    await waitFor(() => {
      expect(useUIStore.getState().leftSidebarVisible).toBe(false)
    })

    unmount()

    expect(useUIStore.getState().leftSidebarVisible).toBe(true)
  })
})
