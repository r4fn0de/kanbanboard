import type { LucideIcon } from 'lucide-react'
import {
  Folder,
  LayoutDashboard,
  Layers,
  Briefcase,
  ClipboardList,
  CalendarDays,
  Target,
  Rocket,
  Package,
  Users,
  MessagesSquare,
  Lightbulb,
  Palette,
  PenTool,
  LifeBuoy,
  Activity,
  AlarmClock,
  Code2,
  Database,
  Globe2,
  ShoppingCart,
  Wrench,
  BadgeCheck,
  Bolt,
  CalendarCheck,
  CheckCircle,
  Circle,
  Flag,
  Kanban as KanbanIcon,
  Loader,
  Play,
  Ship,
  Sparkles,
  Timer,
  TrendingUp,
  Zap,
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
  {
    label: 'Product & Dev',
    options: [
      { value: 'Activity', label: 'Activity', icon: Activity },
      { value: 'Code2', label: 'Code', icon: Code2 },
      { value: 'Database', label: 'Database', icon: Database },
      { value: 'Globe2', label: 'Website', icon: Globe2 },
    ],
  },
  {
    label: 'Operations',
    options: [
      { value: 'ShoppingCart', label: 'E-commerce', icon: ShoppingCart },
      { value: 'Wrench', label: 'Maintenance', icon: Wrench },
    ],
  },
  {
    label: 'Status & Flow',
    options: [
      { value: 'CheckCircle', label: 'Completed', icon: CheckCircle },
      { value: 'Circle', label: 'Status', icon: Circle },
      { value: 'Flag', label: 'Blocked', icon: Flag },
      { value: 'TrendingUp', label: 'Growth', icon: TrendingUp },
      { value: 'Zap', label: 'Quick win', icon: Zap },
      { value: 'Kanban', label: 'Pipeline', icon: KanbanIcon },
    ],
  },
  {
    label: 'Time',
    options: [
      { value: 'CalendarCheck', label: 'Review', icon: CalendarCheck },
      { value: 'Timer', label: 'Upcoming', icon: Timer },
      { value: 'AlarmClock', label: 'Reminder', icon: AlarmClock },
    ],
  },
  {
    label: 'Extra',
    options: [
      { value: 'Sparkles', label: 'Idea', icon: Sparkles },
      { value: 'Bolt', label: 'Action', icon: Bolt },
      { value: 'BadgeCheck', label: 'Approval', icon: BadgeCheck },
      { value: 'Loader', label: 'Backlog', icon: Loader },
      { value: 'Play', label: 'In progress', icon: Play },
      { value: 'Ship', label: 'Delivery', icon: Ship },
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
