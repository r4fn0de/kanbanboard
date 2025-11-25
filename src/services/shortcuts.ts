import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { invoke } from '@tauri-apps/api/core'
import { toast } from 'sonner'
import { logger } from '@/lib/logger'
import type { ShortcutsConfig } from '@/lib/shortcuts'

export const shortcutsQueryKeys = {
  all: ['shortcuts'] as const,
  config: () => [...shortcutsQueryKeys.all] as const,
}

export function useShortcutsConfig() {
  return useQuery({
    queryKey: shortcutsQueryKeys.config(),
    queryFn: async (): Promise<ShortcutsConfig> => {
      try {
        logger.debug('Loading shortcuts config from backend')
        const config = await invoke<ShortcutsConfig>('load_shortcuts')
        logger.info('Shortcuts config loaded successfully', { config })
        return config
      } catch (error) {
        logger.warn('Failed to load shortcuts config, using empty defaults', {
          error,
        })
        return { bindings: {} }
      }
    },
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 10,
  })
}

export function useSaveShortcutsConfig() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (config: ShortcutsConfig) => {
      try {
        logger.debug('Saving shortcuts config to backend', { config })
        await invoke('save_shortcuts', { config })
        logger.info('Shortcuts config saved successfully')
        return config
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Unknown error occurred'
        logger.error('Failed to save shortcuts config', { error, config })
        toast.error('Failed to save keyboard shortcuts', {
          description: message,
        })
        throw error
      }
    },
    onMutate: async newConfig => {
      await queryClient.cancelQueries({
        queryKey: shortcutsQueryKeys.config(),
      })
      const previous = queryClient.getQueryData<ShortcutsConfig>(
        shortcutsQueryKeys.config()
      )

      queryClient.setQueryData(shortcutsQueryKeys.config(), newConfig)

      return { previous }
    },
    onError: (_error, _variables, context) => {
      if (context?.previous) {
        queryClient.setQueryData(shortcutsQueryKeys.config(), context.previous)
      }
    },
    onSuccess: data => {
      if (data) {
        queryClient.setQueryData(shortcutsQueryKeys.config(), data)
      }
      logger.info('Shortcuts config cache updated')
    },
  })
}
