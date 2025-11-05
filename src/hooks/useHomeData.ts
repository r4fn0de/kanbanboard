import { useTaskStats } from './useTaskStats'
import { useRecentActivity } from './useRecentActivity'
import { useFavoriteBoards } from './useFavoriteBoards'
import { useUpcomingDeadlines } from './useUpcomingDeadlines'

export function useHomeData() {
  const { data: stats, isLoading: statsLoading, error: statsError } = useTaskStats()
  const { data: activity, isLoading: activityLoading, error: activityError } = useRecentActivity(10)
  const { data: favorites, isLoading: favoritesLoading, error: favoritesError } = useFavoriteBoards()
  const { data: deadlines, isLoading: deadlinesLoading, error: deadlinesError } = useUpcomingDeadlines(7)

  const isLoading = statsLoading || activityLoading || favoritesLoading || deadlinesLoading

  const hasError = statsError || activityError || favoritesError || deadlinesError

  return {
    stats,
    activity,
    favorites,
    deadlines,
    isLoading,
    hasError,
    errors: {
      stats: statsError,
      activity: activityError,
      favorites: favoritesError,
      deadlines: deadlinesError,
    },
  }
}
