import { invoke } from '@tauri-apps/api/core'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import type { Workspace } from '@/types/common'

export const workspaceQueryKeys = {
  all: ['workspaces'] as const,
}

export interface CreateWorkspaceInput {
  id: string
  name: string
  color?: string | null
  iconPath?: string | null
}

export interface UpdateWorkspaceInput {
  id: string
  name?: string
  color?: string | null
}

export interface UpdateWorkspaceIconInput {
  workspaceId: string
  filePath: string
}

export async function fetchWorkspaces(): Promise<Workspace[]> {
  return invoke<Workspace[]>('load_workspaces')
}

export async function createWorkspace(
  input: CreateWorkspaceInput
): Promise<Workspace> {
  return invoke<Workspace>('create_workspace', {
    args: {
      id: input.id,
      name: input.name,
      color: input.color ?? null,
      iconPath: input.iconPath ?? null,
    },
  })
}

export async function updateWorkspace(
  input: UpdateWorkspaceInput
): Promise<void> {
  return invoke('update_workspace', {
    args: {
      id: input.id,
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.color !== undefined ? { color: input.color } : {}),
    },
  })
}

export async function deleteWorkspace(id: string): Promise<void> {
  return invoke('delete_workspace', { id })
}

export async function updateWorkspaceIcon(
  input: UpdateWorkspaceIconInput
): Promise<Workspace> {
  return invoke<Workspace>('update_workspace_icon', {
    workspace_id: input.workspaceId,
    file_path: input.filePath,
  })
}

export async function removeWorkspaceIcon(workspaceId: string): Promise<Workspace> {
  return invoke<Workspace>('remove_workspace_icon', {
    workspace_id: workspaceId,
  })
}

export function useWorkspaces() {
  return useQuery({
    queryKey: workspaceQueryKeys.all,
    queryFn: fetchWorkspaces,
  })
}

export function useCreateWorkspace() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: createWorkspace,
    onSuccess: workspace => {
      queryClient.setQueryData<Workspace[]>(workspaceQueryKeys.all, previous =>
        previous ? [...previous, workspace] : [workspace]
      )
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: workspaceQueryKeys.all })
    },
  })
}

export function useUpdateWorkspace() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: updateWorkspace,
    onSuccess: (_, variables) => {
      queryClient.setQueryData<Workspace[]>(workspaceQueryKeys.all, previous => {
        if (!previous) return previous
        return previous.map(workspace => {
          if (workspace.id !== variables.id) return workspace
          return {
            ...workspace,
            ...(variables.name !== undefined && { name: variables.name }),
            ...(variables.color !== undefined && { color: variables.color ?? null }),
            updatedAt: new Date().toISOString(),
          }
        })
      })
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: workspaceQueryKeys.all })
    },
  })
}

export function useDeleteWorkspace() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: deleteWorkspace,
    onSuccess: (_, workspaceId) => {
      queryClient.setQueryData<Workspace[]>(workspaceQueryKeys.all, previous =>
        previous ? previous.filter(item => item.id !== workspaceId) : previous
      )
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: workspaceQueryKeys.all })
    },
  })
}

export function useUpdateWorkspaceIconMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: updateWorkspaceIcon,
    onSuccess: updatedWorkspace => {
      queryClient.setQueryData<Workspace[]>(workspaceQueryKeys.all, previous =>
        previous
          ? previous.map(workspace =>
              workspace.id === updatedWorkspace.id ? updatedWorkspace : workspace
            )
          : previous
      )
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: workspaceQueryKeys.all })
    },
  })
}

export function useRemoveWorkspaceIconMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: removeWorkspaceIcon,
    onSuccess: updatedWorkspace => {
      queryClient.setQueryData<Workspace[]>(workspaceQueryKeys.all, previous =>
        previous
          ? previous.map(workspace =>
              workspace.id === updatedWorkspace.id ? updatedWorkspace : workspace
            )
          : previous
      )
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: workspaceQueryKeys.all })
    },
  })
}
