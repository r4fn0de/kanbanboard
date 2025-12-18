import { useEffect, useMemo } from 'react'
import { listen } from '@tauri-apps/api/event'
import { check } from '@tauri-apps/plugin-updater'
import { useUIStore } from '@/store/ui-store'
import { useCommandContext } from './use-command-context'
import { logger } from '@/lib/logger'
import { useShortcutsConfig } from '@/services/shortcuts'
import {
  buildEffectiveBindings,
  chordFromKeyboardEvent,
  formatChord,
} from '@/lib/shortcuts'

/**
 * Main window event listeners - handles global keyboard shortcuts and other app-level events
 *
 * This hook provides a centralized place for all global event listeners, keeping
 * the MainWindow component clean while maintaining good separation of concerns.
 */
export function useMainWindowEventListeners() {
  const commandContext = useCommandContext()
  const { data: shortcutsConfig } = useShortcutsConfig()

  const effectiveBindings = useMemo(
    () => buildEffectiveBindings(shortcutsConfig ?? null),
    [shortcutsConfig]
  )

  const globalBindingsByChord = useMemo(() => {
    const map = new Map<
      string,
      ReturnType<typeof buildEffectiveBindings>[number]
    >()
    for (const binding of effectiveBindings) {
      if (binding.scope !== 'global' || !binding.chord) continue
      const key = formatChord(binding.chord)
      if (!key) continue
      map.set(key, binding)
    }
    return map
  }, [effectiveBindings])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const chord = chordFromKeyboardEvent(e)
      if (!chord) return

      const key = formatChord(chord)
      if (!key) return

      const binding = globalBindingsByChord.get(key)
      if (!binding) return

      e.preventDefault()

      switch (binding.commandId) {
        case 'open-preferences': {
          commandContext.openPreferences()
          break
        }
        case 'open-workspaces-preferences': {
          const { openPreferencesWithPane } = useUIStore.getState()
          openPreferencesWithPane('workspaces')
          break
        }
        case 'open-storage-preferences': {
          const { openPreferencesWithPane } = useUIStore.getState()
          openPreferencesWithPane('storage')
          break
        }
        case 'open-shortcuts-preferences': {
          const { openPreferencesWithPane } = useUIStore.getState()
          openPreferencesWithPane('shortcuts')
          break
        }
        case 'toggle-left-sidebar': {
          const { leftSidebarVisible, setLeftSidebarVisible } =
            useUIStore.getState()
          setLeftSidebarVisible(!leftSidebarVisible)
          break
        }
        case 'toggle-right-sidebar': {
          const { rightSidebarVisible, setRightSidebarVisible } =
            useUIStore.getState()
          setRightSidebarVisible(!rightSidebarVisible)
          break
        }
        case 'open-command-palette': {
          const { commandPaletteOpen, setCommandPaletteOpen } =
            useUIStore.getState()
          setCommandPaletteOpen(!commandPaletteOpen)
          break
        }
        case 'create-project': {
          const { setCreateProjectDialogOpen } = useUIStore.getState()
          setCreateProjectDialogOpen(true)
          break
        }
        default: {
          // Outros comandos globais poderão ser tratados aqui na fase 3+
          break
        }
      }
    }

    // Set up native menu event listeners
    const setupMenuListeners = async () => {
      logger.debug('Setting up menu event listeners')
      const unlisteners = await Promise.all([
        listen('menu-about', () => {
          logger.debug('About menu event received')
          // Show simple about dialog
          const appVersion = '0.1.0' // Could be dynamic from package.json
          alert(
            `Tauri Template App\n\nVersion: ${appVersion}\n\nBuilt with Tauri v2 + React + TypeScript`
          )
        }),

        listen('menu-check-updates', async () => {
          logger.debug('Check for updates menu event received')
          try {
            const update = await check()
            if (update) {
              const notes =
                typeof (update as any).body === 'string'
                  ? ((update as any).body as string)
                  : typeof (update as any).notes === 'string'
                    ? ((update as any).notes as string)
                    : undefined
              const pubDate =
                typeof (update as any).date === 'string'
                  ? ((update as any).date as string)
                  : typeof (update as any).pubDate === 'string'
                    ? ((update as any).pubDate as string)
                    : undefined

              useUIStore.getState().setUpdateAvailable({
                version: update.version,
                notes,
                pubDate,
              })

              commandContext.showToast(
                `Update available: ${update.version}`,
                'info'
              )
            } else {
              commandContext.showToast(
                'You are running the latest version',
                'success'
              )
            }
          } catch (error) {
            logger.error('Update check failed:', { error: String(error) })
            commandContext.showToast('Failed to check for updates', 'error')
          }
        }),

        listen('menu-preferences', () => {
          logger.debug('Preferences menu event received')
          commandContext.openPreferences()
        }),

        listen('menu-toggle-left-sidebar', () => {
          logger.debug('Toggle left sidebar menu event received')
          const { leftSidebarVisible, setLeftSidebarVisible } =
            useUIStore.getState()
          setLeftSidebarVisible(!leftSidebarVisible)
        }),

        listen('menu-toggle-right-sidebar', () => {
          logger.debug('Toggle right sidebar menu event received')
          const { rightSidebarVisible, setRightSidebarVisible } =
            useUIStore.getState()
          setRightSidebarVisible(!rightSidebarVisible)
        }),
      ])

      logger.debug(
        `Menu listeners set up successfully: ${unlisteners.length} listeners`
      )
      return unlisteners
    }

    document.addEventListener('keydown', handleKeyDown)

    let disposed = false
    let menuUnlisteners: (() => void)[] = []
    const setupPromise = setupMenuListeners()
      .then(unlisteners => {
        if (disposed) {
          unlisteners.forEach(unlisten => {
            if (unlisten && typeof unlisten === 'function') {
              unlisten()
            }
          })
          return
        }

        menuUnlisteners = unlisteners
        logger.debug('Menu listeners initialized successfully')
      })
      .catch(error => {
        if (!disposed) {
          logger.error('Failed to setup menu listeners:', error)
        }
      })

    return () => {
      disposed = true
      document.removeEventListener('keydown', handleKeyDown)
      menuUnlisteners.forEach(unlisten => {
        if (unlisten && typeof unlisten === 'function') {
          unlisten()
        }
      })

      void setupPromise
    }
  }, [commandContext, globalBindingsByChord])

  // Future: Other global event listeners can be added here
  // useWindowFocusListeners()
}
