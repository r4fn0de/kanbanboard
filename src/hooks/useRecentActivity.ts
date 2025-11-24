import { useQuery } from '@tanstack/react-query'
import { invoke } from '@tauri-apps/api/core'

export interface Activity {
  id: string
  activity_type: string
  title: string
  board_name: string
  board_icon?: string
  timestamp: string
  entity_id: string
  entity_type: string
}

export function useRecentActivity(limit = 10) {
  return useQuery({
    queryKey: ['home', 'recent-activity', limit],
    queryFn: async () => {
      const activities = await invoke<Activity[]>('get_recent_activity', {
        limit,
      })
      return activities
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
  })
}
