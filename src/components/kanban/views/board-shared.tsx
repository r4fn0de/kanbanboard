import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type { KanbanCard } from '@/types/common'
import { ArrowDown, ArrowUp, Minus, Paperclip } from 'lucide-react'
import type { ComponentType } from 'react'
import { formatCardDueDate } from './card-date'
import { getTagBadgeStyle } from '../tags/utils'

export function PriorityBadge({
  priority,
}: {
  priority: KanbanCard['priority']
}) {
  const variants: Record<
    KanbanCard['priority'],
    {
      label: string
      className: string
      icon: ComponentType<{ className?: string }>
    }
  > = {
    low: {
      label: 'Low',
      className:
        'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300',
      icon: ArrowDown,
    },
    medium: {
      label: 'Medium',
      className:
        'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300',
      icon: Minus,
    },
    high: {
      label: 'High',
      className:
        'bg-rose-100 text-rose-700 dark:bg-rose-900/50 dark:text-rose-300',
      icon: ArrowUp,
    },
  }

  const variant = variants[priority]
  const Icon = variant.icon

  return (
    <Badge
      className={cn(
        'rounded-lg px-3 py-1 text-xs font-semibold leading-none flex items-center gap-1',
        variant.className
      )}
    >
      <Icon className="h-3 w-3" />
      {variant.label}
    </Badge>
  )
}

export function CardContent({ card }: { card: KanbanCard }) {
  const tagList = card.tags ?? []
  const displayTags = tagList.slice(0, 2)
  const remainingTags = tagList.length - displayTags.length
  const dueDateLabel = formatCardDueDate(card.dueDate)
  const hasAttachments = card.attachments && card.attachments.length > 0

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-start gap-3">
        <div className="flex flex-wrap items-center gap-2 flex-1 min-w-0">
          {displayTags.map(tag => {
            const badgeStyle = getTagBadgeStyle(tag)
            return (
              <Badge
                key={tag.id}
                className="rounded-full px-3 py-1 text-xs font-semibold leading-none opacity-100"
                style={
                  tag.color
                    ? {
                        backgroundColor: tag.color,
                        color: badgeStyle?.color,
                        borderColor: tag.color,
                        opacity: 1,
                      }
                    : undefined
                }
              >
                {tag.label}
              </Badge>
            )
          })}
          {remainingTags > 0 ? (
            <Badge
              variant="secondary"
              className="rounded-full px-3 py-1 text-xs font-semibold leading-none"
            >
              +{remainingTags}
            </Badge>
          ) : null}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {hasAttachments && (
            <div className="rounded-full bg-blue-100 p-1 text-blue-600 dark:bg-blue-900/50 dark:text-blue-300">
              <Paperclip className="h-3 w-3" />
            </div>
          )}
          <PriorityBadge priority={card.priority} />
          {dueDateLabel && (
            <span className="rounded-full bg-gray-300 px-3 py-1 text-xs font-semibold text-gray-800 dark:bg-gray-600 dark:text-gray-200">
              {dueDateLabel}
            </span>
          )}
        </div>
      </div>
      <div className="flex flex-col gap-2">
        <span className="text-base font-semibold leading-snug text-foreground">
          {card.title}
        </span>
        {card.description ? (
          <p className="text-sm leading-relaxed text-muted-foreground">
            {card.description}
          </p>
        ) : null}
      </div>
    </div>
  )
}
