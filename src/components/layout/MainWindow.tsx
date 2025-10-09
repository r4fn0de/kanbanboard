import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from '@/components/ui/resizable'
import { LeftSideBar } from './LeftSideBar'
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
        savePreferences({ sidebarLayout: layout })
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
            className="absolute left-0 top-0 z-20 h-full w-8 cursor-pointer bg-transparent"
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
                  'absolute left-2 top-2 bottom-2 z-30 w-64 shadow-2xl rounded-[12px] overflow-hidden',
                  transparencyEnabled
                    ? 'bg-white/70 dark:bg-black/70 backdrop-blur-3xl'
                    : 'bg-background'
                )}
              >
                <div className={cn(
                  transparencyEnabled && 'text-foreground [&_*]:!text-foreground'
                )}>
                  <LeftSideBar />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </>
      ) : null}

      {/* Main Content Area with Resizable Panels */}
      <div className={contentClasses}>
        <ResizablePanelGroup
          direction="horizontal"
          onLayout={debouncedSaveLayout}
          autoSaveId="app-layout"
        >
          {/* Left Sidebar */}
          <ResizablePanel
            minSize={10}
            maxSize={15}
            className={cn(!leftSidebarVisible && 'hidden')}
            defaultSize={preferences?.sidebarLayout?.[0] ?? 15}
          >
            <LeftSideBar />
          </ResizablePanel>

          <ResizableHandle className={cn(!leftSidebarVisible && 'hidden')} />

          {/* Main Content */}
          <ResizablePanel
            minSize={30}
            defaultSize={preferences?.sidebarLayout?.[1] ?? 65}
          >
            <MainWindowContent />
          </ResizablePanel>

          <ResizableHandle className={cn(!rightSidebarVisible && 'hidden')} />

          {/* Right Sidebar */}
          <ResizablePanel
            minSize={15}
            maxSize={40}
            className={cn(!rightSidebarVisible && 'hidden')}
            defaultSize={preferences?.sidebarLayout?.[2] ?? 20}
          >
            <RightSideBar />
          </ResizablePanel>
        </ResizablePanelGroup>
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
