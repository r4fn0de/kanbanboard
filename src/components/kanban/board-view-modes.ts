import type { LucideIcon } from 'lucide-react'
import { ListIcon, KanbanIcon } from '@/components/ui/icons'

export const BOARD_VIEW_VALUES = ['kanban', 'list'] as const
export type BoardViewMode = (typeof BOARD_VIEW_VALUES)[number]

export const DEFAULT_BOARD_VIEW_MODE: BoardViewMode = 'kanban'

interface BoardViewOption {
  value: BoardViewMode
  label: string
  icon: LucideIcon | React.ComponentType<{ className?: string }>
}

export const BOARD_VIEW_OPTIONS: readonly BoardViewOption[] = [
  { value: 'kanban', label: 'Kanban', icon: KanbanIcon },
  { value: 'list', label: 'List', icon: ListIcon },
] as const

const BOARD_VIEW_VALUE_SET = new Set<string>(BOARD_VIEW_VALUES)

export function isBoardViewMode(
  value: string | null | undefined
): value is BoardViewMode {
  return typeof value === 'string' && BOARD_VIEW_VALUE_SET.has(value)
}
