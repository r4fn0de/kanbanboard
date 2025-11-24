import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@/test/test-utils'
import { useGlobalSearch, type SearchResult } from '@/hooks/useGlobalSearch'
import * as tauriModule from '@tauri-apps/api/core'

// Mock the Tauri API
vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn(),
}))

// Mock useDebounce
vi.mock('@/hooks/use-debounce', () => ({
  useDebounce: vi.fn(value => value),
}))

// Mock react-router navigation so we don't need a real Router in tests
const mockNavigate = vi.fn()

vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
}))

describe('useGlobalSearch', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  const mockResults: [SearchResult] = [
    {
      id: '1',
      title: 'Test Board',
      item_type: 'board' as const,
      board_id: 'board-1',
      board_name: 'My Board',
      description: 'Test description',
      url: '/board/board-1',
    },
  ]

  it('should initialize with empty query and no results', () => {
    const { result } = renderHook(() => useGlobalSearch())

    expect(result.current.query).toBe('')
    expect(result.current.results).toEqual([])
    expect(result.current.isLoading).toBe(false)
    expect(result.current.isOpen).toBe(false)
  })

  it('should update query when handleSearch is called', () => {
    const { result } = renderHook(() => useGlobalSearch())

    act(() => {
      result.current.handleSearch('test query')
    })

    expect(result.current.query).toBe('test query')
    expect(result.current.isOpen).toBe(true)
  })

  it('should close search and clear query when handleClose is called', () => {
    const { result } = renderHook(() => useGlobalSearch())

    act(() => {
      result.current.handleSearch('test query')
    })

    expect(result.current.isOpen).toBe(true)

    act(() => {
      result.current.handleClose()
    })

    expect(result.current.isOpen).toBe(false)
    expect(result.current.query).toBe('')
  })

  it('should handle result selection', async () => {
    const mockInvoke = vi.mocked(tauriModule.invoke)
    mockInvoke.mockResolvedValue(mockResults)

    const { result } = renderHook(() => useGlobalSearch())

    act(() => {
      result.current.handleSearch('test')
    })

    // Wait for debounced search
    await new Promise(resolve => setTimeout(resolve, 300))

    const firstResult = mockResults[0]

    act(() => {
      result.current.handleSelect(firstResult)
    })

    // For item_type 'board', the hook navigates to `/projects/${result.id}`
    expect(mockNavigate).toHaveBeenCalledWith('/projects/1')
    expect(result.current.isOpen).toBe(false)
  })

  it('should open search when non-empty query is entered', () => {
    const { result } = renderHook(() => useGlobalSearch())

    act(() => {
      result.current.handleSearch('test')
    })

    expect(result.current.isOpen).toBe(true)
  })

  it('should close search when query is cleared', () => {
    const { result } = renderHook(() => useGlobalSearch())

    act(() => {
      result.current.handleSearch('test')
    })
    expect(result.current.isOpen).toBe(true)

    act(() => {
      result.current.handleSearch('')
    })
    expect(result.current.isOpen).toBe(false)
  })

  it('should handle setIsOpen directly', () => {
    const { result } = renderHook(() => useGlobalSearch())

    act(() => {
      result.current.setIsOpen(true)
    })

    expect(result.current.isOpen).toBe(true)

    act(() => {
      result.current.setIsOpen(false)
    })

    expect(result.current.isOpen).toBe(false)
  })

  it('should return all required methods and properties', () => {
    const { result } = renderHook(() => useGlobalSearch())

    expect(result.current).toHaveProperty('query')
    expect(result.current).toHaveProperty('results')
    expect(result.current).toHaveProperty('isLoading')
    expect(result.current).toHaveProperty('isOpen')
    expect(result.current).toHaveProperty('handleSearch')
    expect(result.current).toHaveProperty('handleClose')
    expect(result.current).toHaveProperty('handleSelect')
    expect(result.current).toHaveProperty('setIsOpen')
  })
})
