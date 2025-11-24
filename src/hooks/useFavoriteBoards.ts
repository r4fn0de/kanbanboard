import { useQuery } from '@tanstack/react-query'
import { invoke } from '@tauri-apps/api/core'

export interface FavoriteBoard {
  id: string
  title: string
  icon: string
  emoji?: string
  color?: string
  isFavorite: boolean
  createdAt: string
  updatedAt: string
  totalCards: number
  activeCards: number
}

export function useFavoriteBoards() {
  return useQuery({
    queryKey: ['home', 'favorite-boards'],
    queryFn: async (): Promise<FavoriteBoard[]> => {
      const boards = await invoke<FavoriteBoard[]>('get_favorite_boards')

      // Ensure we return plain FavoriteBoard objects
      return boards.map(board => ({ ...board }))
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}
