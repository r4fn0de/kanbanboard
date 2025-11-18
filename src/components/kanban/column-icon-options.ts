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
import { BacklogStatusIcon } from '@/components/ui/icons/backlog-status-icon'
import { DoneStatusIcon } from '@/components/ui/icons/done-status-icon'
import { InProgressStatusIcon } from '@/components/ui/icons/in-progress-status-icon'
import { TodoStatusIcon } from '@/components/ui/icons/todo-status-icon'

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
  // Custom SVG icons for default status columns created on new boards
  if (value === 'BacklogStatus') {
    return BacklogStatusIcon as unknown as LucideIcon
  }
  if (value === 'TodoStatus') {
    return TodoStatusIcon as unknown as LucideIcon
  }
  if (value === 'InProgressStatus') {
    return InProgressStatusIcon as unknown as LucideIcon
  }
  if (value === 'DoneStatus') {
    return DoneStatusIcon as unknown as LucideIcon
  }

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
