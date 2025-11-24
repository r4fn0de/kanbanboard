import type { ComponentType } from 'react'
import {
  PriorityIcon,
  PriorityLowIcon,
  PriorityMediumIcon,
  PriorityHighIcon,
} from '@/components/ui/icons'
import type { KanbanCard } from '@/types/common'

export interface PriorityVariant {
  label: string
  className: string
  icon: ComponentType<{ className?: string }>
}

export const PRIORITY_VARIANTS: Record<
  KanbanCard['priority'],
  PriorityVariant
> = {
  none: {
    label: 'No priority',
    className:
      'bg-muted text-muted-foreground dark:bg-muted/40 dark:text-muted-foreground',
    icon: PriorityIcon,
  },
  low: {
    label: 'Low',
    className:
      'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400',
    icon: PriorityLowIcon,
  },
  medium: {
    label: 'Medium',
    className:
      'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400',
    icon: PriorityMediumIcon,
  },
  high: {
    label: 'High',
    className:
      'bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-400',
    icon: PriorityHighIcon,
  },
}
