// Types that match the Rust AppPreferences struct
// Only contains settings that should be persisted to disk
export interface AppPreferences {
  theme: string
  transparencyEnabled?: boolean
  sidebarLayout?: number[]
  lastWorkspaceId?: string | null
  // Add new persistent preferences here, e.g.:
  // auto_save: boolean
  // language: string
}

export const defaultPreferences: AppPreferences = {
  theme: 'system',
  transparencyEnabled: true,
  sidebarLayout: [15, 65, 20],
  lastWorkspaceId: null,
  // Add defaults for new preferences here
}
