import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'

import { BoardDrawView } from '../BoardDrawView'

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
    mockedUseBoards.mockReturnValue({
      data: [],
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    })

    renderWithRouter('/projects/unknown/draws')

    expect(screen.getByText('Board not found.')).toBeInTheDocument()
  })

  it('renders tldraw canvas for existing board', () => {
    mockedUseBoards.mockReturnValue({
      data: [
        {
          id: 'board-123',
          title: 'Design Board',
          description: null,
          icon: 'Palette',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          archivedAt: null,
        },
      ],
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    })

    renderWithRouter('/projects/board-123/draws')

    expect(screen.getByText('Design Board')).toBeInTheDocument()
    const canvas = screen.getByTestId('tldraw')
    expect(canvas).toHaveAttribute('data-persistence-key', 'board-board-123-draws')
    expect(canvas).toHaveAttribute('data-has-asset-urls', 'true')
  })

  it('collapses the left sidebar on mount and restores on unmount when initially visible', async () => {
    mockedUseBoards.mockReturnValue({
      data: [
        {
          id: 'board-456',
          title: 'Focus Board',
          description: null,
          icon: 'Palette',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          archivedAt: null,
        },
      ],
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    })

    const { unmount } = renderWithRouter('/projects/board-456/draws')

    await waitFor(() => {
      expect(useUIStore.getState().leftSidebarVisible).toBe(false)
    })

    unmount()

    expect(useUIStore.getState().leftSidebarVisible).toBe(true)
  })
})
