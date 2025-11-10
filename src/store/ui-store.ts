import { create } from 'zustand'
import { devtools } from 'zustand/middleware'

type PreferencePane = 'appearance' | 'workspaces' | 'storage'

export interface WidgetConfig {
  id: string
  type: string
  title: string
  visible: boolean
  order: number
}

interface UIState {
  leftSidebarVisible: boolean
  leftSidebarLocked: boolean
  rightSidebarVisible: boolean
  commandPaletteOpen: boolean
  preferencesOpen: boolean
  preferencesActivePane: PreferencePane
  editingWorkspaceId: string | null
  widgetLayout: WidgetConfig[]

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
    pane: PreferencePane,
    workspaceId?: string | null
  ) => void
  setPreferencesActivePane: (pane: PreferencePane) => void
  setEditingWorkspaceId: (id: string | null) => void
  setWidgetLayout: (layout: WidgetConfig[]) => void
}

export const useUIStore = create<UIState>()(
  devtools(
    set => ({
      leftSidebarVisible: true,
      leftSidebarLocked: false,
      rightSidebarVisible: false,
      commandPaletteOpen: false,
      preferencesOpen: false,
      preferencesActivePane: 'appearance',
      editingWorkspaceId: null,
      widgetLayout: [],

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

      setWidgetLayout: layout =>
        set({ widgetLayout: layout }, undefined, 'setWidgetLayout'),
    }),
    {
      name: 'ui-store',
    }
  )
)
