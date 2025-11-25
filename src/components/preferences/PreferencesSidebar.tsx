import { cn } from '@/lib/utils'
import {
  PaintPaletteIcon,
  FolderIcon,
  HardDriveIcon,
  KeyboardIcon,
} from '@/components/ui/icons'

const navigationItems = [
  { id: 'appearance' as const, name: 'Appearance', icon: PaintPaletteIcon },
  { id: 'workspaces' as const, name: 'Workspaces', icon: FolderIcon },
  { id: 'shortcuts' as const, name: 'Keyboard Shortcuts', icon: KeyboardIcon },
  { id: 'storage' as const, name: 'Storage', icon: HardDriveIcon },
]

export type PreferencePane = (typeof navigationItems)[number]['id']

interface PreferencesSidebarProps {
  activePane: PreferencePane
  onChange: (pane: PreferencePane) => void
}

export function PreferencesSidebar({
  activePane,
  onChange,
}: PreferencesSidebarProps) {
  return (
    <aside className="w-56 h-full flex flex-col py-3 px-2">
      <nav className="flex flex-col gap-1">
        {navigationItems.map(item => {
          const Icon = item.icon
          const active = activePane === item.id
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onChange(item.id)}
              className={cn(
                'flex items-center gap-2 w-full rounded-xl px-3 py-2 text-sm font-medium transition-colors',
                active
                  ? 'bg-accent text-accent-foreground shadow-sm'
                  : 'text-muted-foreground hover:bg-accent/70 hover:text-accent-foreground'
              )}
            >
              <Icon className="h-4 w-4" />
              <span>{item.name}</span>
            </button>
          )
        })}
      </nav>
    </aside>
  )
}
