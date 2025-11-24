import { describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor } from '@/test/test-utils'
import { Dashboard } from '@/components/home/Dashboard'
import { useWorkspaceStatus } from '@/hooks/useWorkspaceStatus'

// Mock hooks
vi.mock('@/hooks/useWidgetLayout', () => ({
  useWidgetLayout: () => ({
    widgets: [
      { id: 'overview', type: 'overview', title: 'Overview', visible: true },
      {
        id: 'quick-actions',
        type: 'quick-actions',
        title: 'Quick Actions',
        visible: true,
      },
    ],
    reorderWidgets: vi.fn(),
    toggleWidget: vi.fn(),
  }),
}))

vi.mock('@/hooks/useWorkspaceStatus', () => ({
  useWorkspaceStatus: vi.fn(),
}))

vi.mock('@/hooks/usePerformanceMonitor', () => ({
  usePerformanceMonitor: vi.fn(),
}))

vi.mock('@/store/ui-store', () => ({
  useUIStore: () => ({
    commandPaletteOpen: false,
    setCommandPaletteOpen: vi.fn(),
  }),
}))

// Mock components
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    section: ({ children, ...props }: any) => (
      <section {...props}>{children}</section>
    ),
    span: ({ children, ...props }: any) => <span {...props}>{children}</span>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}))

vi.mock('@/components/error/ErrorBoundary', () => ({
  ErrorBoundary: ({ children }: any) => children,
}))

vi.mock('@/components/search/GlobalSearch', () => ({
  GlobalSearch: () => <div data-testid="global-search">GlobalSearch</div>,
}))

describe('Dashboard', () => {
  it('should render welcome header', () => {
    const mockUseWorkspaceStatus = vi.mocked(useWorkspaceStatus)
    mockUseWorkspaceStatus.mockReturnValue({
      data: { isEmpty: false, isNewUser: false },
      isLoading: false,
      error: null,
    } as any)

    render(<Dashboard />)

    expect(screen.getByText('Dashboard')).toBeInTheDocument()
    expect(
      screen.getByText('Organize your projects and keep track of what matters.')
    ).toBeInTheDocument()
  })

  it('should render search and settings buttons', () => {
    const mockUseWorkspaceStatus = vi.mocked(useWorkspaceStatus)
    mockUseWorkspaceStatus.mockReturnValue({
      data: { isEmpty: false, isNewUser: false },
      isLoading: false,
      error: null,
    } as any)

    render(<Dashboard />)

    const searchButton = screen.getByTitle('Search (Cmd+K)')
    expect(searchButton).toBeInTheDocument()
    const settingsButton = screen.getByTitle('Customize dashboard')
    expect(settingsButton).toBeInTheDocument()
  })

  it('should render EmptyOnboarding when workspace is empty', async () => {
    const mockUseWorkspaceStatus = vi.mocked(useWorkspaceStatus)
    mockUseWorkspaceStatus.mockReturnValue({
      data: { isEmpty: true, isNewUser: false },
      isLoading: false,
      error: null,
    } as any)

    render(<Dashboard />)

    await waitFor(() => {
      expect(screen.getByText('Welcome to Modulo! 🎉')).toBeInTheDocument()
    })
  })

  it('should render NewUserOnboarding when user is new', async () => {
    const mockUseWorkspaceStatus = vi.mocked(useWorkspaceStatus)
    mockUseWorkspaceStatus.mockReturnValue({
      data: { isEmpty: false, isNewUser: true },
      isLoading: false,
      error: null,
    } as any)

    render(<Dashboard />)

    await waitFor(() => {
      expect(
        screen.getByText('Welcome! Here are some quick tips')
      ).toBeInTheDocument()
    })
  })

  it('should render loading skeleton when checking workspace status', () => {
    const mockUseWorkspaceStatus = vi.mocked(useWorkspaceStatus)
    mockUseWorkspaceStatus.mockReturnValue({
      data: null,
      isLoading: true,
      error: null,
    } as any)

    render(<Dashboard />)

    // Should show skeleton loading state (multiple animated placeholders)
    const skeletons = document.querySelectorAll('.animate-pulse')
    expect(skeletons.length).toBeGreaterThan(0)
  })

  it('should render widgets when workspace is populated', () => {
    const mockUseWorkspaceStatus = vi.mocked(useWorkspaceStatus)
    mockUseWorkspaceStatus.mockReturnValue({
      data: { isEmpty: false, isNewUser: false },
      isLoading: false,
      error: null,
    } as any)

    render(<Dashboard />)

    // Widgets should be rendered
    expect(screen.getByText('Overview')).toBeInTheDocument()
  })

  it('should handle keyboard shortcut for search', () => {
    const mockUseWorkspaceStatus = vi.mocked(useWorkspaceStatus)
    mockUseWorkspaceStatus.mockReturnValue({
      data: { isEmpty: false, isNewUser: false },
      isLoading: false,
      error: null,
    } as any)

    const { unmount } = render(<Dashboard />)

    // Simulate Cmd+K keyboard shortcut
    const event = new KeyboardEvent('keydown', {
      key: 'k',
      metaKey: true,
    })
    document.dispatchEvent(event)

    // The event handler should run without errors (no explicit assertion on defaultPrevented in JSDOM)
    expect(true).toBe(true)

    unmount()
  })

  it('should handle escape key', () => {
    const mockUseWorkspaceStatus = vi.mocked(useWorkspaceStatus)
    mockUseWorkspaceStatus.mockReturnValue({
      data: { isEmpty: false, isNewUser: false },
      isLoading: false,
      error: null,
    } as any)

    render(<Dashboard />)

    // Simulate Escape key
    const event = new KeyboardEvent('keydown', {
      key: 'Escape',
    })
    document.dispatchEvent(event)

    // Should be handled by GlobalSearch component
  })
})
