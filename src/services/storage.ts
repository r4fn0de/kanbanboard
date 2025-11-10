import { invoke } from '@tauri-apps/api/core'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

export interface StorageStats {
  databaseBytes: number
  attachmentsBytes: number
  workspaceIconsBytes: number
  preferencesBytes: number
  totalBytes: number
  databasePath: string
  attachmentsPath: string
  workspaceIconsPath: string
  preferencesPath: string
}

export const storageQueryKeys = {
  all: ['storage'] as const,
  stats: () => [...storageQueryKeys.all, 'stats'] as const,
}

export async function fetchStorageStats(): Promise<StorageStats> {
  return invoke<StorageStats>('get_storage_stats')
}

export function useStorageStats() {
  return useQuery({
    queryKey: storageQueryKeys.stats(),
    queryFn: fetchStorageStats,
    staleTime: 1000 * 30,
    gcTime: 1000 * 60 * 5,
  })
}

export async function clearAttachments() {
  await invoke('clear_attachments')
}

export function useClearAttachments() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: clearAttachments,
    onSuccess: () => {
      toast.success('Attachments cleared')
      queryClient.invalidateQueries({ queryKey: storageQueryKeys.stats() })
    },
    onError: error => {
      const description = error instanceof Error ? error.message : 'Unknown error'
      toast.error('Failed to clear attachments', { description })
    },
  })
}

export async function resetApplicationData() {
  await invoke('reset_application_data')
}

export function useResetApplicationData() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: resetApplicationData,
    onSuccess: () => {
      toast.success('Application data reset')
      queryClient.invalidateQueries({ queryKey: storageQueryKeys.stats() })
    },
    onError: error => {
      const description = error instanceof Error ? error.message : 'Unknown error'
      toast.error('Failed to reset data', { description })
    },
  })
}
