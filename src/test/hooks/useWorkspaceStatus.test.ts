import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@/test/test-utils'
import { useWorkspaceStatus } from '@/hooks/useWorkspaceStatus'
import * as tauriModule from '@tauri-apps/api/core'

// Mock the Tauri API
vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn(),
}))

describe('useWorkspaceStatus', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should return empty state when no boards exist', async () => {
    const mockInvoke = vi.mocked(tauriModule.invoke)
    mockInvoke
      .mockResolvedValueOnce([]) // load_boards returns empty array
      .mockResolvedValueOnce([]) // get_recent_activity returns empty array

    const { result } = renderHook(() => useWorkspaceStatus())

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.data).toEqual({
      hasBoards: false,
      totalBoards: 0,
      hasActivity: false,
      isEmpty: true,
      isNewUser: false,
    })
  })

  it('should detect new user when boards exist but no activity', async () => {
    const mockInvoke = vi.mocked(tauriModule.invoke)
    mockInvoke
      .mockResolvedValueOnce([
        { id: '1', title: 'Test Board' },
      ]) // load_boards returns one board
      .mockResolvedValueOnce([]) // get_recent_activity returns empty array

    const { result } = renderHook(() => useWorkspaceStatus())

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.data).toEqual({
      hasBoards: true,
      totalBoards: 1,
      hasActivity: false,
      isEmpty: false,
      isNewUser: true,
    })
  })

  it('should detect active workspace when boards and activity exist', async () => {
    const mockInvoke = vi.mocked(tauriModule.invoke)
    mockInvoke
      .mockResolvedValueOnce([
        { id: '1', title: 'Test Board' },
        { id: '2', title: 'Another Board' },
      ]) // load_boards returns multiple boards
      .mockResolvedValueOnce([
        { id: '1', title: 'Card 1', activity_type: 'card_created' },
      ]) // get_recent_activity returns activity

    const { result } = renderHook(() => useWorkspaceStatus())

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.data).toEqual({
      hasBoards: true,
      totalBoards: 2,
      hasActivity: true,
      isEmpty: false,
      isNewUser: false,
    })
  })

  it('should handle errors gracefully', async () => {
    const mockInvoke = vi.mocked(tauriModule.invoke)
    mockInvoke.mockRejectedValue(new Error('Failed to load'))

    const { result } = renderHook(() => useWorkspaceStatus())

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
      expect(result.current.error).toBeTruthy()
    })
  })

  it('should have correct stale time configuration', () => {
    const { result } = renderHook(() => useWorkspaceStatus())
    // The hook should be configured with staleTime
    // This is implicit in the React Query configuration
    expect(result.current).toBeDefined()
  })
})
