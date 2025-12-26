import { useEffect } from 'react'
import { RouterProvider } from 'react-router-dom'
import { check } from '@tauri-apps/plugin-updater'
import { initializeCommandSystem } from './lib/commands'
import { logger } from './lib/logger'
import { cleanupOldFiles } from './lib/recovery'
import './App.css'
import './design-system/novon.css'
import { NovonProvider } from './design-system/NovonProvider'
import ErrorBoundary from './components/ErrorBoundary'
import { appRouter } from './routes/router'
import { useUIStore } from './store/ui-store'

function App() {
  // Initialize command system and cleanup on app startup
  useEffect(() => {
    logger.info('🚀 Frontend application starting up')
    initializeCommandSystem()
    logger.debug('Command system initialized')

    // Clean up old recovery files on startup
    cleanupOldFiles().catch(error => {
      logger.warn('Failed to cleanup old recovery files', { error })
    })

    // Example of logging with context
    logger.info('App environment', {
      isDev: import.meta.env.DEV,
      mode: import.meta.env.MODE,
    })

    // Auto-updater logic - check for updates 5 seconds after app loads
    const checkForUpdates = async () => {
      try {
        const update = await check()
        if (update) {
          logger.info(`Update available: ${update.version}`)

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
        }
      } catch (checkError) {
        logger.error(`Update check failed: ${String(checkError)}`)
        // Silent fail for update checks - don't bother user with network issues
      }
    }

    // Check for updates 5 seconds after app loads
    const updateTimer = setTimeout(checkForUpdates, 5000)
    return () => clearTimeout(updateTimer)
  }, [])

  return (
    <ErrorBoundary>
      <NovonProvider>
        <RouterProvider router={appRouter} />
      </NovonProvider>
    </ErrorBoundary>
  )
}

export default App
