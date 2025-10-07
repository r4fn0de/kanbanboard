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
import { useCallback } from 'react'

export function MainWindow() {
  const { theme, transparencyEnabled } = useTheme()
  const { leftSidebarVisible, rightSidebarVisible, toggleLeftSidebar } =
    useUIStore()

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

  return (
    <div className="relative flex h-screen w-full flex-col overflow-hidden rounded-[12px] supports-[backdrop-filter]:rounded-[12px]">
      {!leftSidebarVisible ? (
        <button
          type="button"
          onClick={handleEdgeActivate}
          aria-label="Show left sidebar"
          className="absolute left-0 top-0 z-20 h-full w-2 cursor-pointer bg-transparent"
        />
      ) : null}

      {/* Main Content Area with Resizable Panels */}
      <div className={contentClasses}>
        <ResizablePanelGroup direction="horizontal">
          {/* Left Sidebar */}
          <ResizablePanel
            defaultSize={rightSidebarVisible ? 20 : 18}
            minSize={rightSidebarVisible ? 15 : 12}
            maxSize={40}
            className={cn(!leftSidebarVisible && 'hidden')}
          >
            <LeftSideBar />
          </ResizablePanel>

          <ResizableHandle className={cn(!leftSidebarVisible && 'hidden')} />

          {/* Main Content */}
          <ResizablePanel defaultSize={60} minSize={30}>
            <MainWindowContent />
          </ResizablePanel>

          <ResizableHandle className={cn(!rightSidebarVisible && 'hidden')} />

          {/* Right Sidebar */}
          <ResizablePanel
            defaultSize={20}
            minSize={15}
            maxSize={40}
            className={cn(!rightSidebarVisible && 'hidden')}
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
