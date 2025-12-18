import { create } from 'zustand'
import { devtools } from 'zustand/middleware'

type PreferencePane = 'appearance' | 'workspaces' | 'storage' | 'shortcuts'

export interface WidgetConfig {
  id: string
  type: string
  title: string
  visible: boolean
  order: number
}

interface UpdateInfo {
  version: string
  notes?: string
  pubDate?: string
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
  createProjectDialogOpen: boolean

  updateInfo: UpdateInfo | null
  updateStatus: 'available' | 'installing' | 'installed' | null
  dismissedUpdateVersion: string | null

  toggleLeftSidebar: () => void
  setLeftSidebarVisible: (visible: boolean) => void
  setLeftSidebarLocked: (locked: boolean) => void
  toggleRightSidebar: () => void
  setRightSidebarVisible: (visible: boolean) => void
  toggleCommandPalette: () => void
  setCommandPaletteOpen: (open: boolean) => void
  togglePreferences: () => void
  setPreferencesOpen: (open: boolean) => void
  openPreferencesWithPane: (pane: PreferencePane, workspaceId?: string | null) => void
  setPreferencesActivePane: (pane: PreferencePane) => void
  setEditingWorkspaceId: (id: string | null) => void
  setWidgetLayout: (layout: WidgetConfig[]) => void
  setCreateProjectDialogOpen: (open: boolean) => void

  setUpdateAvailable: (info: UpdateInfo) => void
  setUpdateInstalling: () => void
  setUpdateInstalled: () => void
  dismissUpdate: () => void
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
      createProjectDialogOpen: false,

      updateInfo: null,
      updateStatus: null,
      dismissedUpdateVersion: null,

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

      setCreateProjectDialogOpen: open =>
        set(
          { createProjectDialogOpen: open },
          undefined,
          'setCreateProjectDialogOpen'
        ),

      setUpdateAvailable: info =>
        set(
          state => {
            if (state.dismissedUpdateVersion === info.version) {
              return {}
            }
            return { updateInfo: info, updateStatus: 'available' }
          },
          undefined,
          'setUpdateAvailable'
        ),

      setUpdateInstalling: () =>
        set({ updateStatus: 'installing' }, undefined, 'setUpdateInstalling'),

      setUpdateInstalled: () =>
        set({ updateStatus: 'installed' }, undefined, 'setUpdateInstalled'),

      dismissUpdate: () =>
        set(
          state => ({
            updateInfo: null,
            updateStatus: null,
            dismissedUpdateVersion: state.updateInfo?.version ?? null,
          }),
          undefined,
          'dismissUpdate'
        ),
    }),
    {
      name: 'ui-store',
    }
  )
)
