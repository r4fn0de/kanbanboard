import { create } from 'zustand'
import { devtools } from 'zustand/middleware'

interface WorkspaceState {
  selectedWorkspaceId: string | null
  setSelectedWorkspaceId: (workspaceId: string | null) => void
}

export const useWorkspaceStore = create<WorkspaceState>()(
  devtools(
    set => ({
      selectedWorkspaceId: null,
      setSelectedWorkspaceId: workspaceId =>
        set({ selectedWorkspaceId: workspaceId }, undefined, 'setSelectedWorkspaceId'),
    }),
    {
      name: 'workspace-store',
    }
  )
)
