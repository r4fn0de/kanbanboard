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
    queryFn: async () => {
      const boards = await invoke<any[]>('get_favorite_boards')

      // Convert any[] to FavoriteBoard[]
      return boards.map((board: any) => {
        return {
          id: board.id,
          title: board.title,
          icon: board.icon,
          emoji: board.emoji,
          color: board.color,
          isFavorite: board.isFavorite,
          createdAt: board.createdAt,
          updatedAt: board.updatedAt,
          totalCards: board.totalCards,
          activeCards: board.activeCards,
        } as FavoriteBoard
      })
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}
