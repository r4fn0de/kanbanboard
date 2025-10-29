import { cn } from '@/lib/utils'
import { PanelLeft, PanelLeftClose, Settings } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { MacOSWindowControls } from '@/components/titlebar/MacOSWindowControls'
import { executeCommand, useCommandContext } from '@/lib/commands'

interface SidebarHeaderProps {
  useTransparentStyle?: boolean
  leftSidebarVisible: boolean
  toggleLeftSidebar: () => void
  leftSidebarLocked: boolean
}

export function SidebarHeader({
  useTransparentStyle = false,
  leftSidebarVisible,
  toggleLeftSidebar,
  leftSidebarLocked,
}: SidebarHeaderProps) {
  const commandContext = useCommandContext()

  return (
    <div
      data-tauri-drag-region
      className="flex items-center justify-between px-4 pt-4 pb-3"
    >
      <MacOSWindowControls className="px-0" />
      <div className="flex items-center gap-1">
        <Button
          onClick={toggleLeftSidebar}
          variant="ghost"
          size="icon"
          className={cn(
            'h-6 w-6 hover:bg-accent/30',
            useTransparentStyle
              ? 'text-white/80 hover:text-white hover:bg-white/10'
              : 'text-foreground/70 hover:text-foreground'
          )}
          title={leftSidebarVisible ? 'Hide Left Sidebar' : 'Show Left Sidebar'}
          disabled={leftSidebarLocked}
        >
          {leftSidebarVisible ? (
            <PanelLeftClose className="h-3 w-3" />
          ) : (
            <PanelLeft className="h-3 w-3" />
          )}
        </Button>
        <Button
          onClick={() => executeCommand('open-preferences', commandContext)}
          variant="ghost"
          size="icon"
          className={cn(
            'h-6 w-6 hover:bg-accent/30',
            useTransparentStyle
              ? 'text-white/80 hover:text-white hover:bg-white/10'
              : 'text-foreground/70 hover:text-foreground'
          )}
          title="Settings"
        >
          <Settings className="h-3 w-3" />
        </Button>
      </div>
    </div>
  )
}

