import type { KanbanCard, KanbanColumn } from '@/types/common'
import { CalendarClock } from 'lucide-react'
import { useMemo } from 'react'
import { PriorityBadge } from './board-shared'
import { formatCardDueDate } from './card-date'

interface BoardTimelineViewProps {
  cards: KanbanCard[]
  columnsById: Map<string, KanbanColumn>
}

export function BoardTimelineView({
  cards,
  columnsById,
}: BoardTimelineViewProps) {
  const dateFormatter = useMemo(
    () => new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }),
    []
  )

  const groups = useMemo(() => {
    const map = new Map<
      string,
      { key: string; date: Date | null; cards: KanbanCard[] }
    >()

    for (const card of cards) {
      const dueDate = card.dueDate ? new Date(card.dueDate) : null
      const isValid = dueDate && !Number.isNaN(dueDate.getTime())

      let key = 'no-date'
      let normalizedDate: Date | null = null

      if (isValid) {
        normalizedDate = new Date(dueDate.getTime())
        key = normalizedDate.toISOString().slice(0, 10)
      }

      let group = map.get(key)
      if (!group) {
        group = { key, date: normalizedDate, cards: [] }
        map.set(key, group)
      }
      group.cards.push(card)
    }

    const entries = Array.from(map.values())
    entries.sort((a, b) => {
      if (a.date && b.date) {
        return a.date.getTime() - b.date.getTime()
      }
      if (a.date) return -1
      if (b.date) return 1
      return 0
    })
    return entries
  }, [cards])

  if (groups.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center rounded-[32px] border border-dashed border-gray-300 bg-gray-50/50 p-10 text-center text-sm text-muted-foreground dark:border-gray-600 dark:bg-gray-800/50">
        No cards have been added to this board yet.
      </div>
    )
  }

  return (
    <div className="relative flex-1">
      <div className="absolute left-[18px] top-4 bottom-4 hidden border-l border-gray-200 sm:block dark:border-gray-700" />
      <div className="space-y-8">
        {groups.map(group => (
          <div
            key={group.key}
            className="relative flex flex-col gap-4 sm:flex-row sm:gap-6"
          >
            <div className="flex items-center gap-3 sm:w-64">
              <div className="flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-600 shadow-sm dark:border-gray-700 dark:bg-gray-900 dark:text-gray-400">
                <CalendarClock className="h-4 w-4" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">
                  {group.date
                    ? dateFormatter.format(group.date)
                    : 'No due date'}
                </p>
                <p className="text-xs text-muted-foreground">
                  {group.cards.length}{' '}
                  {group.cards.length === 1 ? 'card' : 'cards'}
                </p>
              </div>
            </div>
            <div className="flex-1 space-y-3">
              {group.cards.map(card => {
                const column = columnsById.get(card.columnId)
                const dueLabel = formatCardDueDate(card.dueDate)
                return (
                  <div
                    key={card.id}
                    className="rounded-[28px] border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900"
                  >
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex flex-col gap-1">
                        <span className="text-sm font-semibold text-foreground">
                          {card.title}
                        </span>
                        <span className="text-xs uppercase tracking-wide text-muted-foreground">
                          {column?.title ?? 'Unassigned'}
                        </span>
                      </div>
                      <PriorityBadge priority={card.priority} />
                    </div>
                    {card.description ? (
                      <p className="mt-2 line-clamp-3 text-sm text-muted-foreground">
                        {card.description}
                      </p>
                    ) : null}
                    <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      {dueLabel ? (
                        <span className="rounded-full bg-gray-300 px-2 py-1 font-medium text-gray-800 dark:bg-gray-600 dark:text-gray-200">
                          Due {dueLabel}
                        </span>
                      ) : null}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
