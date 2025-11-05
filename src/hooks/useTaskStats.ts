import { useQuery } from '@tanstack/react-query'
import { invoke } from '@tauri-apps/api/core'

export interface TaskStats {
  total_projects: number
  active_projects: number
  tasks_today: number
  tasks_this_week: number
  completed_today: number
  completed_this_week: number
  overdue_tasks: number
}

export function useTaskStats() {
  return useQuery({
    queryKey: ['home', 'task-stats'],
    queryFn: async () => {
      const stats = await invoke<TaskStats>('get_task_statistics')
      return stats
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}
