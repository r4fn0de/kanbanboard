import {
  differenceInCalendarDays,
  format,
  formatDistanceToNow,
  parseISO,
} from 'date-fns'
import type { KanbanCard } from '@/types/common'

export type CardDueStatus = 'overdue' | 'today' | 'soon' | 'upcoming'

export interface CardDueMetadata {
  status: CardDueStatus
  display: string
  formattedDate: string
  daysUntil: number
  relativeText?: string
}

const SOON_THRESHOLD_DAYS = 3

export const CARD_DUE_STATUS_STYLES: Record<CardDueStatus, string> = {
  overdue:
    'bg-rose-500/10 text-rose-600 dark:text-rose-300',
  today:
    'bg-amber-500/10 text-amber-600 dark:text-amber-300',
  soon:
    'bg-amber-500/10 text-amber-600 dark:text-amber-300',
  upcoming: 'bg-muted/50 text-foreground',
}

export function getCardDueMetadata(
  value: KanbanCard['dueDate']
): CardDueMetadata | null {
  if (!value) return null
  const date = parseISO(value)
  if (Number.isNaN(date.getTime())) return null

  const today = new Date()
  const daysUntil = differenceInCalendarDays(date, today)
  const formattedDate = format(date, 'MMM dd')

  let display: string
  let status: CardDueStatus

  if (daysUntil < 0) {
    status = 'overdue'
    display = formattedDate
  } else if (daysUntil === 0) {
    status = 'today'
    display = 'Due today'
  } else if (daysUntil === 1) {
    status = 'soon'
    display = 'Due tomorrow'
  } else if (daysUntil <= SOON_THRESHOLD_DAYS) {
    status = 'soon'
    display = `Due in ${daysUntil} days`
  } else {
    status = 'upcoming'
    const relativeText = formatDistanceToNow(date, { addSuffix: true })
    display = `Due ${formattedDate}`
    
    return {
      status,
      display,
      formattedDate,
      daysUntil,
      relativeText,
    }
  }

  return {
    status,
    display,
    formattedDate,
    daysUntil,
  }
}
