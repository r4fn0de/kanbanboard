import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'

interface WorkspaceState {
  selectedWorkspaceId: string | null
  setSelectedWorkspaceId: (workspaceId: string | null) => void
}

export const useWorkspaceStore = create<WorkspaceState>()(
  devtools(
    persist(
      set => ({
        selectedWorkspaceId: null,
        setSelectedWorkspaceId: workspaceId =>
          set(
            { selectedWorkspaceId: workspaceId },
            undefined,
            'setSelectedWorkspaceId'
          ),
      }),
      {
        name: 'workspace-storage',
      }
    ),
    {
      name: 'workspace-store',
    }
  )
)
