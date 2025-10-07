import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { invoke } from '@tauri-apps/api/core'
import { toast } from 'sonner'
import { logger } from '@/lib/logger'
import type { AppPreferences } from '@/types/preferences'
import { defaultPreferences } from '@/types/preferences'

// Query keys for preferences
export const preferencesQueryKeys = {
  all: ['preferences'] as const,
  preferences: () => [...preferencesQueryKeys.all] as const,
}

// TanStack Query hooks following the architectural patterns
export function usePreferences() {
  return useQuery({
    queryKey: preferencesQueryKeys.preferences(),
    queryFn: async (): Promise<AppPreferences> => {
      try {
        logger.debug('Loading preferences from backend')
        const preferences = await invoke<AppPreferences>('load_preferences')
        logger.info('Preferences loaded successfully', { preferences })
        return preferences
      } catch (error) {
        // Return defaults if preferences file doesn't exist yet
        logger.warn('Failed to load preferences, using defaults', { error })
        return defaultPreferences
      }
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 10, // 10 minutes
  })
}

export function useSavePreferences() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (partialPrefs: Partial<AppPreferences>) => {
      const current =
        queryClient.getQueryData<AppPreferences>(
          preferencesQueryKeys.preferences()
        ) ?? defaultPreferences
      const preferences: AppPreferences = {
        ...current,
        ...partialPrefs,
      }
      try {
        logger.debug('Saving preferences to backend', { preferences })
        await invoke('save_preferences', { preferences })
        logger.info('Preferences saved successfully')
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Unknown error occurred'
        logger.error('Failed to save preferences', { error, preferences })
        toast.error('Failed to save preferences', { description: message })
        throw error
      }
    },
    onMutate: async partialPrefs => {
      await queryClient.cancelQueries({
        queryKey: preferencesQueryKeys.preferences(),
      })
      const previous = queryClient.getQueryData<AppPreferences>(
        preferencesQueryKeys.preferences()
      )

      const merged: AppPreferences = {
        ...(previous ?? defaultPreferences),
        ...partialPrefs,
      }

      queryClient.setQueryData(preferencesQueryKeys.preferences(), merged)

      return { previous }
    },
    onError: (_error, _variables, context) => {
      if (context?.previous) {
        queryClient.setQueryData(
          preferencesQueryKeys.preferences(),
          context.previous
        )
      }
    },
    onSuccess: (_data, _variables, _context) => {
      logger.info('Preferences cache updated')
      toast.success('Preferences saved')
    },
  })
}
