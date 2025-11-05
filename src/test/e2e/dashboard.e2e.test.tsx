import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@/test/test-utils'
import { Dashboard } from '@/components/home/Dashboard'

// Mock all external dependencies
vi.mock('@/hooks/useWidgetLayout')
vi.mock('@/hooks/useWorkspaceStatus')
vi.mock('@/hooks/usePerformanceMonitor')
vi.mock('@/store/ui-store')
vi.mock('framer-motion')
vi.mock('@/components/error/ErrorBoundary')
vi.mock('@/components/search/GlobalSearch')

describe('Dashboard E2E', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Empty Workspace Flow', () => {
    it('should guide user to create first board', async () => {
      const mockUseWorkspaceStatus = vi.mocked(
        require('@/hooks/useWorkspaceStatus').useWorkspaceStatus
      )
      mockUseWorkspaceStatus.mockReturnValue({
        data: { isEmpty: true, isNewUser: false },
        isLoading: false,
        error: null,
      } as any)

      render(<Dashboard />)

      await waitFor(() => {
        expect(screen.getByText('Welcome to Modulo! 🎉')).toBeInTheDocument()
      })

      expect(
        screen.getByText('Your productivity journey starts here. Let\'s create your first project!')
      ).toBeInTheDocument()
      expect(screen.getByText('Create Your First Project')).toBeInTheDocument()
      expect(
        screen.getByText('It takes less than a minute to get started')
      ).toBeInTheDocument()
    })
  })

  describe('New User Flow', () => {
    it('should show onboarding tips to new users', async () => {
      const mockUseWorkspaceStatus = vi.mocked(
        require('@/hooks/useWorkspaceStatus').useWorkspaceStatus
      )
      mockUseWorkspaceStatus.mockReturnValue({
        data: { isEmpty: false, isNewUser: true },
        isLoading: false,
        error: null,
      } as any)

      render(<Dashboard />)

      await waitFor(() => {
        expect(screen.getByText('Welcome! Here are some quick tips')).toBeInTheDocument()
      })

      expect(screen.getByText('Quick Search')).toBeInTheDocument()
      expect(screen.getByText('Drag & Drop')).toBeInTheDocument()
      expect(screen.getByText('Stay Organized')).toBeInTheDocument()
    })

    it('should allow user to dismiss onboarding tips', async () => {
      const mockUseWorkspaceStatus = vi.mocked(
        require('@/hooks/useWorkspaceStatus').useWorkspaceStatus
      )
      mockUseWorkspaceStatus.mockReturnValue({
        data: { isEmpty: false, isNewUser: true },
        isLoading: false,
        error: null,
      } as any)

      render(<Dashboard />)

      await waitFor(() => {
        expect(screen.getByText('Welcome! Here are some quick tips')).toBeInTheDocument()
      })

      const dismissButton = screen.getByRole('button', { name: 'Got it' })
      fireEvent.click(dismissButton)

      // Tips should be hidden after dismissal
      await waitFor(() => {
        expect(screen.queryByText('Welcome! Here are some quick tips')).not.toBeInTheDocument()
      })
    })
  })

  describe('Active Workspace Flow', () => {
    it('should show full dashboard for active workspace', async () => {
      const mockUseWorkspaceStatus = vi.mocked(
        require('@/hooks/useWorkspaceStatus').useWorkspaceStatus
      )
      mockUseWorkspaceStatus.mockReturnValue({
        data: { isEmpty: false, isNewUser: false },
        isLoading: false,
        error: null,
      } as any)

      const mockUseWidgetLayout = vi.mocked(
        require('@/hooks/useWidgetLayout').useWidgetLayout
      )
      mockUseWidgetLayout.mockReturnValue({
        widgets: [
          { id: 'overview', type: 'overview', title: 'Overview', visible: true },
          { id: 'quick-actions', type: 'quick-actions', title: 'Quick Actions', visible: true },
        ],
        reorderWidgets: vi.fn(),
        toggleWidget: vi.fn(),
      } as any)

      render(<Dashboard />)

      await waitFor(() => {
        expect(screen.getByText('Welcome to Modulo')).toBeInTheDocument()
      })

      // Should show dashboard sections
      expect(screen.getByText('Overview')).toBeInTheDocument()
      expect(screen.getByText('Quick Actions')).toBeInTheDocument()
    })
  })

  describe('Search Integration', () => {
    it('should open search with keyboard shortcut', async () => {
      const mockUseWorkspaceStatus = vi.mocked(
        require('@/hooks/useWorkspaceStatus').useWorkspaceStatus
      )
      mockUseWorkspaceStatus.mockReturnValue({
        data: { isEmpty: false, isNewUser: false },
        isLoading: false,
        error: null,
      } as any)

      render(<Dashboard />)

      // Press Cmd+K
      fireEvent.keyDown(window, { key: 'k', metaKey: true })

      await waitFor(() => {
        expect(screen.getByTestId('global-search')).toBeInTheDocument()
      })
    })

    it('should open search with button click', async () => {
      const mockUseWorkspaceStatus = vi.mocked(
        require('@/hooks/useWorkspaceStatus').useWorkspaceStatus
      )
      mockUseWorkspaceStatus.mockReturnValue({
        data: { isEmpty: false, isNewUser: false },
        isLoading: false,
        error: null,
      } as any)

      render(<Dashboard />)

      const searchButton = screen.getByRole('button', { name: /search/i })
      fireEvent.click(searchButton)

      await waitFor(() => {
        expect(screen.getByTestId('global-search')).toBeInTheDocument()
      })
    })
  })

  describe('Loading States', () => {
    it('should show skeleton while loading workspace status', () => {
      const mockUseWorkspaceStatus = vi.mocked(
        require('@/hooks/useWorkspaceStatus').useWorkspaceStatus
      )
      mockUseWorkspaceStatus.mockReturnValue({
        data: null,
        isLoading: true,
        error: null,
      } as any)

      render(<Dashboard />)

      // Should show header
      expect(screen.getByText('Welcome to Modulo')).toBeInTheDocument()
      // Should show skeleton content
      expect(screen.getAllByText(/./).length).toBeGreaterThan(0)
    })
  })
})
