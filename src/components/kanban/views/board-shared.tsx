import { Badge } from '@/components/ui/badge'
import { Popover } from '@base-ui-components/react/popover'
import { cn } from '@/lib/utils'
import type { KanbanCard } from '@/types/common'
import { ChevronDown } from 'lucide-react'
import { PaperclipIcon, PriorityIcon, PriorityLowIcon, PriorityMediumIcon, PriorityHighIcon, CalendarIcon } from '@/components/ui/icons'
import {
  CARD_DUE_STATUS_STYLES,
  getCardDueMetadata,
} from './card-date'
import type { ComponentType } from 'react'
import { getTagBadgeStyle } from '../tags/utils'

const PRIORITY_VARIANTS: Record<
  KanbanCard['priority'],
  {
    label: string
    className: string
    icon: ComponentType<{ className?: string }>
  }
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

export { CalendarIcon }
export function PriorityBadge({
  priority,
}: {
  priority: KanbanCard['priority']
}) {
  const variant = PRIORITY_VARIANTS[priority]
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

export function PrioritySelector({
  priority,
  onChange,
  disabled = false,
}: {
  priority: KanbanCard['priority']
  onChange: (priority: KanbanCard['priority']) => void
  disabled?: boolean
}) {
  const variant = PRIORITY_VARIANTS[priority]
  const Icon = variant.icon
  const isDisabled = disabled

  return (
    <Popover.Root>
      <Popover.Trigger
        type="button"
        className={cn(
          'h-auto rounded-lg px-3 py-1 text-xs font-semibold leading-none flex items-center gap-1',
          'bg-transparent hover:bg-transparent focus:bg-transparent',
          'focus-visible:ring-1 focus-visible:ring-ring/50',
          isDisabled ? 'disabled:opacity-50' : '',
          'border-0 cursor-pointer',
          variant.className
        )}
        disabled={isDisabled}
      >
        <Icon className="h-3 w-3" />
        {variant.label}
        <ChevronDown className="h-3 w-3 ml-1 opacity-60" />
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Positioner>
          <Popover.Popup className="w-40 p-2 bg-background border border-border/20 rounded-md shadow-lg">
            <div className="flex flex-col gap-1">
              {Object.entries(PRIORITY_VARIANTS).map(([key, config]) => {
                const priorityKey = key as KanbanCard['priority']
                const PriorityIcon = config.icon
                const isSelected = priority === priorityKey
                return (
                  <button
                    key={priorityKey}
                    type="button"
                    onClick={() => {
                      onChange(priorityKey)
                    }}
                    className={cn(
                      'w-full justify-start h-auto rounded px-2 py-1.5 text-xs font-semibold leading-none',
                      'hover:bg-accent/50',
                      'focus:bg-accent/50 focus:outline-none',
                      'border-0 cursor-pointer',
                      isSelected && 'bg-accent/30'
                    )}
                  >
                    <div
                      className={cn(
                        'rounded px-2 py-1 text-xs font-semibold flex items-center gap-1',
                        config.className
                      )}
                    >
                      <PriorityIcon className="h-3 w-3" />
                      {config.label}
                    </div>
                    {isSelected && (
                      <div className="ml-auto h-2 w-2 rounded-full bg-foreground/80" />
                    )}
                  </button>
                )
              })}
            </div>
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  )
}

export function CardContent({ card }: { card: KanbanCard }) {
  const tagList = card.tags ?? []
  const displayTags = tagList.slice(0, 2)
  const remainingTags = tagList.length - displayTags.length
  const dueMetadata = getCardDueMetadata(card.dueDate)
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
                className="rounded-lg px-3 py-1 text-xs font-semibold leading-none opacity-100"
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
              className="rounded-lg px-3 py-1 text-xs font-semibold leading-none"
            >
              +{remainingTags}
            </Badge>
          ) : null}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {hasAttachments && (
            <div className="rounded-full bg-blue-100 p-1 text-blue-600 dark:bg-blue-900/50 dark:text-blue-300">
              <PaperclipIcon className="h-3 w-3 scale-x-[-1]" />
            </div>
          )}
          <PriorityBadge priority={card.priority} />
          {dueMetadata && (
            <Badge
              className={cn(
                'rounded-lg px-3 py-1 text-xs font-semibold leading-none flex items-center gap-1',
                CARD_DUE_STATUS_STYLES[dueMetadata.status]
              )}
            >
              {dueMetadata.display}
            </Badge>
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
