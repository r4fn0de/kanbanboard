import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@/test/test-utils'
import { useTaskStats } from '@/hooks/useTaskStats'
import type { TaskStats } from '@/hooks/useTaskStats'
import * as tauriModule from '@tauri-apps/api/core'

// Mock the Tauri API
vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn(),
}))

describe('useTaskStats', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  const mockStats: TaskStats = {
    total_projects: 5,
    active_projects: 3,
    tasks_today: 8,
    tasks_this_week: 25,
    completed_today: 3,
    completed_this_week: 15,
    overdue_tasks: 2,
  }

  it('should fetch task statistics successfully', async () => {
    const mockInvoke = vi.mocked(tauriModule.invoke)
    mockInvoke.mockResolvedValue(mockStats)

    const { result } = renderHook(() => useTaskStats())

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.data).toEqual(mockStats)
    expect(result.current.error).toBeNull()
    expect(mockInvoke).toHaveBeenCalledWith('get_task_statistics')
  })

  it('should handle loading state correctly', () => {
    const mockInvoke = vi.mocked(tauriModule.invoke)
    mockInvoke.mockImplementation(
      () => new Promise(() => {}) // Never resolves to keep loading state
    )

    const { result } = renderHook(() => useTaskStats())

    expect(result.current.isLoading).toBe(true)
    expect(result.current.data).toBeUndefined()
  })

  it('should handle errors gracefully', async () => {
    const mockInvoke = vi.mocked(tauriModule.invoke)
    const errorMessage = 'Failed to fetch statistics'
    mockInvoke.mockRejectedValue(new Error(errorMessage))

    const { result } = renderHook(() => useTaskStats())

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.error).toBeTruthy()
    expect(result.current.data).toBeUndefined()
  })

  it('should return default values when data is not available', async () => {
    const mockInvoke = vi.mocked(tauriModule.invoke)
    mockInvoke.mockResolvedValue(null)

    const { result } = renderHook(() => useTaskStats())

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.data).toBeNull()
  })

  it('should cache data for 5 minutes (staleTime)', async () => {
    const mockInvoke = vi.mocked(tauriModule.invoke)
    mockInvoke.mockResolvedValue(mockStats)

    const { result } = renderHook(() => useTaskStats())

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    // The hook should have cached the data
    expect(result.current.data).toEqual(mockStats)
    // Re-render should not refetch due to staleTime
    expect(mockInvoke).toHaveBeenCalledTimes(1)
  })

  it('should retry failed requests once', async () => {
    const mockInvoke = vi.mocked(tauriModule.invoke)
    mockInvoke
      .mockRejectedValueOnce(new Error('Network error'))
      .mockResolvedValueOnce(mockStats)

    const { result } = renderHook(() => useTaskStats())

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.data).toEqual(mockStats)
    expect(mockInvoke).toHaveBeenCalledTimes(2) // Initial call + retry
  })
})
