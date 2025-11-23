import { useState, useCallback } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { invoke } from '@tauri-apps/api/core'
import { useDebounce } from './use-debounce'

export interface SearchResult {
  id: string
  title: string
  item_type: string // 'board' | 'card' | 'note' from Rust as string
  board_id: string
  board_name: string
  description?: string
  url?: string
}

export function useGlobalSearch() {
  const [query, setQuery] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const debouncedQuery = useDebounce(query, 300)
  const navigate = useNavigate()

  const { data: results, isLoading } = useQuery({
    queryKey: ['global-search', debouncedQuery],
    queryFn: async () => {
      if (!debouncedQuery.trim()) return []
      const searchResults = await invoke<SearchResult[]>('global_search', {
        query: debouncedQuery,
      })
      return searchResults
    },
    enabled: debouncedQuery.trim().length > 0,
    staleTime: 5 * 60 * 1000, // 5 minutes
  })

  const handleSearch = useCallback((value: string) => {
    setQuery(value)
    if (value.trim().length > 0) {
      setIsOpen(true)
    } else {
      setIsOpen(false)
    }
  }, [])

  const handleClose = useCallback(() => {
    setIsOpen(false)
    setQuery('')
  }, [])

  const handleSelect = useCallback((result: SearchResult) => {
    console.log('=== DEBUG: handleSelect called ===')
    console.log('Result data:', result)
    console.log('Result item_type:', result.item_type, typeof result.item_type)
    console.log('Result id:', result.id)
    console.log('Result board_id:', result.board_id)
    
    // Navigate based on item type
    let path = ''
    switch (result.item_type as string) {
      case 'board':
        path = `/projects/${result.id}`
        console.log('Board path calculated:', path)
        break
      case 'card':
        path = `/projects/${result.board_id}`
        console.log('Card path calculated:', path)
        break
      case 'note':
        path = `/projects/${result.board_id}/notes`
        console.log('Note path calculated:', path)
        break
      default:
        console.log('Unknown item_type:', result.item_type)
    }
    
    console.log('Final path:', path)
    
    if (path) {
      console.log('Attempting to navigate to:', path)
      try {
        navigate(path)
        console.log('Navigation called successfully')
      } catch (error) {
        console.error('Navigation failed:', error)
      }
    } else {
      console.log('No path to navigate to')
    }
    
    console.log('Calling handleClose()')
    handleClose()
  }, [navigate, handleClose])

  return {
    query,
    results: results || [],
    isLoading,
    isOpen,
    handleSearch,
    handleClose,
    handleSelect,
    setIsOpen,
  }
}
