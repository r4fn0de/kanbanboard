import { create } from 'zustand'
import { devtools } from 'zustand/middleware'

interface UIState {
  leftSidebarVisible: boolean
  leftSidebarLocked: boolean
  rightSidebarVisible: boolean
  commandPaletteOpen: boolean
  preferencesOpen: boolean
  preferencesActivePane: 'general' | 'appearance' | 'workspaces' | 'advanced'
  editingWorkspaceId: string | null

  toggleLeftSidebar: () => void
  setLeftSidebarVisible: (visible: boolean) => void
  setLeftSidebarLocked: (locked: boolean) => void
  toggleRightSidebar: () => void
  setRightSidebarVisible: (visible: boolean) => void
  toggleCommandPalette: () => void
  setCommandPaletteOpen: (open: boolean) => void
  togglePreferences: () => void
  setPreferencesOpen: (open: boolean) => void
  openPreferencesWithPane: (
    pane: 'general' | 'appearance' | 'workspaces' | 'advanced',
    workspaceId?: string | null
  ) => void
  setPreferencesActivePane: (
    pane: 'general' | 'appearance' | 'workspaces' | 'advanced'
  ) => void
  setEditingWorkspaceId: (id: string | null) => void
}

export const useUIStore = create<UIState>()(
  devtools(
    set => ({
      leftSidebarVisible: true,
      leftSidebarLocked: false,
      rightSidebarVisible: false,
      commandPaletteOpen: false,
      preferencesOpen: false,
      preferencesActivePane: 'general',
      editingWorkspaceId: null,

      toggleLeftSidebar: () =>
        set(
          state => ({ leftSidebarVisible: !state.leftSidebarVisible }),
          undefined,
          'toggleLeftSidebar'
        ),

      setLeftSidebarVisible: visible =>
        set(
          { leftSidebarVisible: visible },
          undefined,
          'setLeftSidebarVisible'
        ),

      setLeftSidebarLocked: locked =>
        set({ leftSidebarLocked: locked }, undefined, 'setLeftSidebarLocked'),

      toggleRightSidebar: () =>
        set(
          state => ({ rightSidebarVisible: !state.rightSidebarVisible }),
          undefined,
          'toggleRightSidebar'
        ),

      setRightSidebarVisible: visible =>
        set(
          { rightSidebarVisible: visible },
          undefined,
          'setRightSidebarVisible'
        ),

      toggleCommandPalette: () =>
        set(
          state => ({ commandPaletteOpen: !state.commandPaletteOpen }),
          undefined,
          'toggleCommandPalette'
        ),

      setCommandPaletteOpen: open =>
        set({ commandPaletteOpen: open }, undefined, 'setCommandPaletteOpen'),

      togglePreferences: () =>
        set(
          state => ({ preferencesOpen: !state.preferencesOpen }),
          undefined,
          'togglePreferences'
        ),

      setPreferencesOpen: open =>
        set({ preferencesOpen: open }, undefined, 'setPreferencesOpen'),

      openPreferencesWithPane: (pane, workspaceId = null) =>
        set(
          {
            preferencesOpen: true,
            preferencesActivePane: pane,
            editingWorkspaceId: workspaceId,
          },
          undefined,
          'openPreferencesWithPane'
        ),

      setPreferencesActivePane: pane =>
        set(
          { preferencesActivePane: pane },
          undefined,
          'setPreferencesActivePane'
        ),

      setEditingWorkspaceId: id =>
        set({ editingWorkspaceId: id }, undefined, 'setEditingWorkspaceId'),
    }),
    {
      name: 'ui-store',
    }
  )
)
