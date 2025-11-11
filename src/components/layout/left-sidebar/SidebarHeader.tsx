import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { MacOSWindowControls } from '@/components/titlebar/MacOSWindowControls'
import { executeCommand, useCommandContext } from '@/lib/commands'
import { LeftSidebarIcon } from '@/components/ui/icons/left-sidebar-icon'
import { SettingsIcon } from '@/components/ui/icons/settings'

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
              ? 'text-white/85 hover:text-white hover:bg-white/15'
              : 'text-foreground/70 hover:text-foreground'
          )}
          title={leftSidebarVisible ? 'Hide Left Sidebar' : 'Show Left Sidebar'}
          disabled={leftSidebarLocked}
        >
          <LeftSidebarIcon className="h-3 w-3" collapsed={!leftSidebarVisible} />
        </Button>
        <Button
          onClick={() => executeCommand('open-preferences', commandContext)}
          variant="ghost"
          size="icon"
          className={cn(
            'h-6 w-6 hover:bg-accent/30',
            useTransparentStyle
              ? 'text-white/85 hover:text-white hover:bg-white/15'
              : 'text-foreground/70 hover:text-foreground'
          )}
          title="Settings"
        >
          <SettingsIcon className="h-3 w-3" />
        </Button>
      </div>
    </div>
  )
}

