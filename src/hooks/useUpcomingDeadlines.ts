import { useQuery } from '@tanstack/react-query'
import { invoke } from '@tauri-apps/api/core'

export interface TaskWithDeadline {
  id: string
  title: string
  deadline: string
  board_name: string
  board_id: string
  is_overdue: boolean
  days_until: number
}

export function useUpcomingDeadlines(daysAhead = 7) {
  return useQuery({
    queryKey: ['home', 'upcoming-deadlines', daysAhead],
    queryFn: async () => {
      const tasks = await invoke<TaskWithDeadline[]>('get_upcoming_deadlines', {
        days_ahead: daysAhead,
      })

      // Sort: overdue first, then by deadline
      return tasks.sort((a, b) => {
        if (a.is_overdue && !b.is_overdue) return -1
        if (!a.is_overdue && b.is_overdue) return 1
        return new Date(a.deadline).getTime() - new Date(b.deadline).getTime()
      })
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}
