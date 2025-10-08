import type { LucideIcon } from 'lucide-react'
import {
  AlarmClock,
  BadgeCheck,
  Bolt,
  CalendarCheck,
  CheckCircle,
  Circle,
  ClipboardList,
  Flag,
  Kanban as KanbanIcon,
  Lightbulb,
  Loader,
  Play,
  Rocket,
  Ship,
  Sparkles,
  Target,
  Timer,
  TrendingUp,
  Zap,
} from 'lucide-react'

import {
  COLUMN_ICON_VALUES,
  DEFAULT_COLUMN_ICON,
  type ColumnIconValue,
} from '@/constants/kanban-columns'

const ICON_COMPONENTS: Record<ColumnIconValue, LucideIcon> = {
  Circle,
  Play,
  CheckCircle,
  Loader,
  AlarmClock,
  Bolt,
  Sparkles,
  Target,
  CalendarCheck,
  ClipboardList,
  Lightbulb,
  Flag,
  Timer,
  Ship,
  Kanban: KanbanIcon,
  TrendingUp,
  Zap,
  Rocket,
  BadgeCheck,
}

const ICON_LABELS: Record<ColumnIconValue, string> = {
  Circle: 'Status',
  Play: 'In progress',
  CheckCircle: 'Completed',
  Loader: 'Backlog',
  AlarmClock: 'Scheduled',
  Bolt: 'Action',
  Sparkles: 'Idea',
  Target: 'Goal',
  CalendarCheck: 'Review',
  ClipboardList: 'To do',
  Lightbulb: 'Insights',
  Flag: 'Blocked',
  Timer: 'Upcoming',
  Ship: 'Delivery',
  Kanban: 'Pipeline',
  TrendingUp: 'Growth',
  Zap: 'Quick win',
  Rocket: 'Launch',
  BadgeCheck: 'Approval',
}

export function getColumnIconComponent(
  value: ColumnIconValue | string | null | undefined
): LucideIcon {
  if (value && value in ICON_COMPONENTS) {
    return ICON_COMPONENTS[value as ColumnIconValue]
  }
  return ICON_COMPONENTS[DEFAULT_COLUMN_ICON]
}

export function getColumnIconLabel(value: ColumnIconValue): string {
  return ICON_LABELS[value]
}

export const COLUMN_ICON_OPTIONS = COLUMN_ICON_VALUES.map(value => ({
  value,
  label: ICON_LABELS[value],
  icon: ICON_COMPONENTS[value],
}))
