import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from '@/components/ui/resizable'
import { LeftSideBar } from './'
import { RightSideBar } from './RightSideBar'
import { MainWindowContent } from './MainWindowContent'
import { CommandPalette } from '@/components/command-palette/CommandPalette'
import { PreferencesDialog } from '@/components/preferences/PreferencesDialog'
import { Toaster } from 'sonner'
import { useTheme } from '@/hooks/use-theme'
import { useUIStore } from '@/store/ui-store'
import { useMainWindowEventListeners } from '@/hooks/useMainWindowEventListeners'
import { cn } from '@/lib/utils'
import { useCallback, useMemo, useState } from 'react'
import { usePreferences, useSavePreferences } from '@/services/preferences'
import { motion, AnimatePresence } from 'framer-motion'

const SIDEBAR_WIDTH = 256

// A simple debounce function
function debounce<Args extends unknown[]>(
  func: (...args: Args) => void,
  wait: number
): (...args: Args) => void {
  let timeout: ReturnType<typeof setTimeout> | null = null
  return function (this: unknown, ...args: Args) {
    if (timeout) {
      clearTimeout(timeout)
    }
    timeout = setTimeout(() => {
      func.apply(this, args)
    }, wait)
  }
}

export function MainWindow() {
  const { theme, transparencyEnabled } = useTheme()
  const { leftSidebarVisible, rightSidebarVisible, toggleLeftSidebar } =
    useUIStore()
  const { data: preferences } = usePreferences()
  const { mutate: savePreferences } = useSavePreferences()
  const sidebarLayoutPreference = preferences?.sidebarLayout ?? []
  const mainPanelDefault =
    sidebarLayoutPreference.length === 3
      ? sidebarLayoutPreference[1]
      : (sidebarLayoutPreference[0] ?? 70)
  const rightPanelDefault =
    sidebarLayoutPreference.length === 3
      ? sidebarLayoutPreference[2]
      : (sidebarLayoutPreference[1] ?? 30)
  const [isHoveringEdge, setIsHoveringEdge] = useState(false)

  // Set up global event listeners (keyboard shortcuts, etc.)
  useMainWindowEventListeners()

  const contentClasses = cn(
    'flex flex-1 overflow-hidden rounded-b-[12px]',
    transparencyEnabled
      ? 'bg-background/20 backdrop-blur-md supports-[backdrop-filter]:rounded-b-[12px] supports-[backdrop-filter]:bg-background/10 supports-[backdrop-filter]:backdrop-blur-lg'
      : 'bg-background supports-[backdrop-filter]:rounded-b-[12px]'
  )

  const handleEdgeActivate = useCallback(() => {
    if (!leftSidebarVisible) {
      toggleLeftSidebar()
    }
  }, [leftSidebarVisible, toggleLeftSidebar])

  const debouncedSaveLayout = useMemo(
    () =>
      debounce((layout: number[]) => {
        const normalizedLayout = layout.slice(0, 2)
        if (normalizedLayout.length === 2) {
          savePreferences({ sidebarLayout: normalizedLayout })
        }
      }, 500),
    [savePreferences]
  )

  return (
    <div className="relative flex h-screen w-full flex-col overflow-hidden rounded-[12px] supports-[backdrop-filter]:rounded-[12px]">
      {!leftSidebarVisible ? (
        <>
          {/* Hover trigger area */}
          <div
            onMouseEnter={() => setIsHoveringEdge(true)}
            onMouseLeave={() => setIsHoveringEdge(false)}
            onClick={handleEdgeActivate}
            aria-label="Show left sidebar"
            className="absolute left-0 top-0 z-30 h-full w-2 cursor-pointer bg-transparent"
          />

          {/* Floating sidebar on hover */}
          <AnimatePresence>
            {isHoveringEdge && (
              <motion.div
                initial={{ x: -256, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: -256, opacity: 0 }}
                transition={{ duration: 0.2, ease: 'easeOut' }}
                onMouseEnter={() => setIsHoveringEdge(true)}
                onMouseLeave={() => setIsHoveringEdge(false)}
                className={cn(
                  'absolute left-0 top-0 bottom-0 z-40 w-64 shadow-2xl rounded-r-[12px] overflow-hidden bg-background'
                )}
              >
                <LeftSideBar className="h-full bg-background" forceSolidStyle />
              </motion.div>
            )}
          </AnimatePresence>
        </>
      ) : null}

      {/* Main Content Area with Resizable Panels */}
      <div className={contentClasses}>
        <motion.div
          initial={false}
          animate={{
            width: leftSidebarVisible ? SIDEBAR_WIDTH : 0,
            opacity: leftSidebarVisible ? 1 : 0,
            x: leftSidebarVisible ? 0 : -24,
          }}
          transition={{ duration: 0.25, ease: 'easeInOut' }}
          aria-hidden={!leftSidebarVisible}
          className="relative h-full overflow-hidden rounded-l-[12px] flex-shrink-0"
          style={{ pointerEvents: leftSidebarVisible ? 'auto' : 'none' }}
        >
          <LeftSideBar className="h-full" />
        </motion.div>

        <div className="flex h-full flex-1 overflow-hidden">
          <ResizablePanelGroup
            direction="horizontal"
            onLayout={debouncedSaveLayout}
            autoSaveId="app-layout"
            className="flex-1"
          >
            {/* Main Content */}
            <ResizablePanel minSize={30} defaultSize={mainPanelDefault}>
              <MainWindowContent />
            </ResizablePanel>

            <ResizableHandle className={cn(!rightSidebarVisible && 'hidden')} />

            {/* Right Sidebar */}
            <ResizablePanel
              minSize={15}
              maxSize={40}
              className={cn(!rightSidebarVisible && 'hidden')}
              defaultSize={rightPanelDefault}
            >
              <RightSideBar />
            </ResizablePanel>
          </ResizablePanelGroup>
        </div>
      </div>

      {/* Global UI Components (hidden until triggered) */}
      <CommandPalette />
      <PreferencesDialog />
      <Toaster
        position="bottom-right"
        theme={
          theme === 'dark' ? 'dark' : theme === 'light' ? 'light' : 'system'
        }
        className="toaster group rounded-[16px]"
        toastOptions={{
          classNames: {
            toast:
              'group toast group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg',
            description: 'group-[.toast]:text-muted-foreground',
            actionButton:
              'group-[.toast]:bg-primary group-[.toast]:text-primary-foreground',
            cancelButton:
              'group-[.toast]:bg-muted group-[.toast]:text-muted-foreground',
          },
        }}
      />
    </div>
  )
}

export default MainWindow
