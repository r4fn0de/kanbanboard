import { useQuery } from '@tanstack/react-query'
import { invoke } from '@tauri-apps/api/core'

export interface WorkspaceStatus {
  hasBoards: boolean
  totalBoards: number
  hasActivity: boolean
  isEmpty: boolean
  isNewUser: boolean
}

export function useWorkspaceStatus() {
  return useQuery({
    queryKey: ['workspace', 'status'],
    queryFn: async (): Promise<WorkspaceStatus> => {
      const boards = await invoke<unknown[]>('load_boards')
      const activity = await invoke<unknown[]>('get_recent_activity', {
        limit: 1,
      })

      const hasBoards = boards.length > 0
      const hasActivity = activity.length > 0
      const isEmpty = !hasBoards
      const isNewUser = hasBoards && !hasActivity

      return {
        hasBoards,
        totalBoards: boards.length,
        hasActivity,
        isEmpty,
        isNewUser,
      }
    },
    staleTime: 30 * 1000, // 30 seconds - workspace status doesn't change often
    retry: false,
  })
}
