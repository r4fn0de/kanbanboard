import type { LucideIcon } from 'lucide-react'
import {
  Folder,
  LayoutDashboard,
  Layers,
  Briefcase,
  ClipboardList,
  CalendarDays,
  BarChart3,
  Target,
  Rocket,
  Package,
  Users,
  MessagesSquare,
  Lightbulb,
  Palette,
  PenTool,
  LifeBuoy,
} from 'lucide-react'

export interface ProjectIconOption {
  value: string
  label: string
  icon: LucideIcon
}

export interface ProjectIconSection {
  label: string
  options: readonly ProjectIconOption[]
}

export const PROJECT_ICON_SECTIONS: readonly ProjectIconSection[] = [
  {
    label: 'General',
    options: [
      { value: 'Folder', label: 'Folder', icon: Folder },
      { value: 'LayoutDashboard', label: 'Dashboard', icon: LayoutDashboard },
      { value: 'Layers', label: 'Layers', icon: Layers },
      { value: 'Briefcase', label: 'Briefcase', icon: Briefcase },
    ],
  },
  {
    label: 'Planning',
    options: [
      { value: 'ClipboardList', label: 'Tasks', icon: ClipboardList },
      { value: 'CalendarDays', label: 'Schedule', icon: CalendarDays },
      { value: 'BarChart3', label: 'Analytics', icon: BarChart3 },
      { value: 'Target', label: 'Goals', icon: Target },
    ],
  },
  {
    label: 'Collaboration',
    options: [
      { value: 'Users', label: 'Team', icon: Users },
      { value: 'MessagesSquare', label: 'Discussions', icon: MessagesSquare },
      { value: 'LifeBuoy', label: 'Support', icon: LifeBuoy },
      { value: 'Lightbulb', label: 'Ideas', icon: Lightbulb },
    ],
  },
  {
    label: 'Execution',
    options: [
      { value: 'Rocket', label: 'Launch', icon: Rocket },
      { value: 'Package', label: 'Delivery', icon: Package },
      { value: 'Palette', label: 'Design', icon: Palette },
      { value: 'PenTool', label: 'Creation', icon: PenTool },
    ],
  },
] as const

export const PROJECT_ICON_OPTIONS = PROJECT_ICON_SECTIONS.flatMap(
  section => section.options
)

export const PROJECT_ICON_MAP = PROJECT_ICON_OPTIONS.reduce<
  Record<string, LucideIcon>
>((accumulator, option) => {
  accumulator[option.value] = option.icon
  return accumulator
}, {})

export const DEFAULT_PROJECT_ICON = PROJECT_ICON_OPTIONS[0]?.value ?? 'Folder'
export const DEFAULT_WORKSPACE_COLOR = '#6366F1'

