import type { KanbanCard } from '@/types/common'

export function formatCardDueDate(value: KanbanCard['dueDate']) {
  if (!value) return null
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null
  return new Intl.DateTimeFormat(undefined, {
    day: '2-digit',
    month: '2-digit',
  }).format(date)
}
