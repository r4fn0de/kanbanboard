import { useCallback, useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { toast } from 'sonner'
import { useQueryClient } from '@tanstack/react-query'

import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { CalendarDays, Paperclip, Tag, X } from 'lucide-react'
import { PriorityBadge } from './views/board-shared'
import { cn } from '@/lib/utils'
import {
  CARD_DUE_STATUS_STYLES,
  getCardDueMetadata,
} from './views/card-date'
import { getColumnIconComponent } from '@/components/kanban/column-icon-options'
import {
  kanbanQueryKeys,
  useUpdateCard,
  useUpdateCardTags,
} from '@/services/kanban'
import { ImageUpload } from '@/components/ui/image-upload'
import { TagSelector } from '@/components/kanban/tags/TagSelector'

import type { KanbanCard, KanbanColumn } from '@/types/common'

interface TaskDetailsPanelProps {
  card: KanbanCard | null
  column: KanbanColumn | null
  onClose: () => void
}

export function TaskDetailsPanel({
  card,
  column,
  onClose,
}: TaskDetailsPanelProps) {
  const queryClient = useQueryClient()
  const updateCard = useUpdateCard(card?.boardId || '')
  const updateCardTagsMutation = useUpdateCardTags(card?.boardId ?? '')
  const [isEditingTitle, setIsEditingTitle] = useState(false)
  const [titleDraft, setTitleDraft] = useState(card?.title || '')
  const [titleError, setTitleError] = useState<string | null>(null)
  const [isEditingDescription, setIsEditingDescription] = useState(false)
  const [descriptionDraft, setDescriptionDraft] = useState(
    card?.description ?? ''
  )

  const [previousCardId, setPreviousCardId] = useState<string | null>(null)
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>(
    card?.tags.map(tag => tag.id) ?? []
  )

  const dueMetadata = card ? getCardDueMetadata(card.dueDate) : null

  useEffect(() => {
    if (!card) {
      setPreviousCardId(null)
      setSelectedTagIds([])
      return
    }

    if (!isEditingTitle) {
      setTitleDraft(card.title)
    }
    if (!isEditingDescription) {
      setDescriptionDraft(card.description ?? '')
    }
    if (previousCardId && previousCardId !== card.id) {
      setIsEditingTitle(false)
      setIsEditingDescription(false)
      setTitleError(null)
    }
    setSelectedTagIds(card.tags.map(tag => tag.id))
    setPreviousCardId(card.id)
  }, [card, isEditingTitle, isEditingDescription, previousCardId])

  const handleTitleSubmit = useCallback(
    async (e?: React.FormEvent) => {
      e?.preventDefault()
      if (!card || !card.boardId || !titleDraft.trim()) return

      const trimmedTitle = titleDraft.trim()
      if (trimmedTitle === card.title) {
        setIsEditingTitle(false)
        return
      }

      setIsEditingTitle(false)
      setTitleError(null)

      try {
        await updateCard.mutateAsync({
          id: card.id,
          boardId: card.boardId,
          title: trimmedTitle,
        })
        // Note: useUpdateCard handles optimistic updates, so we don't need onUpdate here
      } catch (err) {
        setTitleError(
          err instanceof Error ? err.message : 'Failed to update title'
        )
        setIsEditingTitle(true)
      }
    },
    [card, titleDraft, updateCard]
  )

  const handleDescriptionSubmit = useCallback(
    async (e?: React.FormEvent) => {
      e?.preventDefault()
      if (!card || !card.boardId) return

      const trimmedDescription = descriptionDraft.trim()
      const finalDescription = trimmedDescription || null

      if (finalDescription === card.description) {
        setIsEditingDescription(false)
        return
      }

      setIsEditingDescription(false)

      try {
        await updateCard.mutateAsync({
          id: card.id,
          boardId: card.boardId,
          description: finalDescription,
        })
        // Note: useUpdateCard handles optimistic updates, so we don't need onUpdate here
      } catch (err) {
        setDescriptionDraft(card.description ?? '')
        setIsEditingDescription(true)
        toast.error(
          err instanceof Error ? err.message : 'Failed to update description'
        )
      }
    },
    [card, descriptionDraft, updateCard]
  )

  const handleDescriptionKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter') {
        if (e.shiftKey) {
          // Shift+Enter: allow default behavior (new line)
          return
        } else {
          // Enter: submit form
          e.preventDefault()
          handleDescriptionSubmit()
        }
      } else if (e.key === 'Escape') {
        // Escape: cancel editing
        e.preventDefault()
        setDescriptionDraft(card?.description ?? '')
        setIsEditingDescription(false)
      }
    },
    [handleDescriptionSubmit, card?.description]
  )

  const handleDueDateChange = useCallback(
    async (newDate: Date | undefined) => {
      if (!card || !card.boardId) {
        return
      }

      const newDateString = newDate ? newDate.toISOString().split('T')[0] : null

      try {
        await updateCard.mutateAsync({
          id: card.id,
          boardId: card.boardId,
          dueDate: newDateString,
        })
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : 'Failed to update due date'
        )
      }
    },
    [card, updateCard]
  )

  const handleTagChange = useCallback(
    (tagIds: string[]) => {
      if (!card || !card.boardId) {
        return
      }

      setSelectedTagIds(tagIds)
      updateCardTagsMutation.mutate(
        {
          cardId: card.id,
          boardId: card.boardId,
          tagIds,
        },
        {
          onError: error => {
            setSelectedTagIds(card.tags.map(tag => tag.id))
            toast.error(
              error instanceof Error ? error.message : 'Failed to update tags'
            )
          },
        }
      )
    },
    [card, updateCardTagsMutation]
  )

  if (!card || !column) {
    return null
  }

  return (
    <AnimatePresence mode="wait">
      <motion.div
        className="fixed inset-0 z-50 flex bg-black/40 p-6 backdrop-blur-sm"
        initial={{ opacity: 0, filter: 'blur(6px)' }}
        animate={{ opacity: 1, filter: 'blur(0px)' }}
        exit={{ opacity: 0, filter: 'blur(6px)' }}
        transition={{
          opacity: { duration: 0.25, ease: [0.25, 0.1, 0.25, 1.0] },
          filter: { duration: 0.35, ease: [0.25, 0.1, 0.25, 1.0] },
        }}
      >
        <button
          type="button"
          aria-label="Close task details"
          className="flex-1"
          onClick={onClose}
          onKeyDown={e => {
            if (e.key === 'Enter' || e.key === ' ') {
              onClose()
            }
          }}
        />
        <motion.div
          key={card.id}
          className="flex h-full w-full max-w-[420px] flex-col overflow-hidden rounded-3xl border border-border/80 bg-card shadow-2xl"
          initial={{
            opacity: 0,
            x: 40,
            filter: 'blur(10px)',
            scale: 0.98,
          }}
          animate={{ opacity: 1, x: 0, filter: 'blur(0px)', scale: 1 }}
          exit={{ opacity: 0, x: 40, filter: 'blur(10px)', scale: 0.98 }}
          transition={{
            type: 'spring',
            stiffness: 240,
            damping: 28,
            opacity: { duration: 0.25, ease: [0.25, 0.1, 0.25, 1.0] },
            filter: { duration: 0.35, ease: [0.25, 0.1, 0.25, 1.0] },
          }}
          style={{ willChange: 'transform, opacity, filter' }}
        >
          <div className="border-b border-border/80 px-6 py-5">
            <div className="flex items-start justify-between gap-4">
              <div className="flex min-w-0 flex-1 flex-col gap-3">
                <span
                  className={cn(
                    'inline-flex items-center gap-2 self-start rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.25em]',
                    'border-border/50 text-muted-foreground'
                  )}
                  style={
                    column.color
                      ? {
                          backgroundColor: `${column.color}1A`,
                          borderColor: `${column.color}33`,
                          color: column.color,
                        }
                      : undefined
                  }
                >
                  {(() => {
                    const ColumnIcon = getColumnIconComponent(
                      column.icon ?? null
                    )
                    return <ColumnIcon className="h-3.5 w-3.5" />
                  })()}
                  {column.title}
                </span>
                {isEditingTitle ? (
                  <form onSubmit={handleTitleSubmit} className="min-w-0">
                    <Input
                      value={titleDraft}
                      onChange={e => setTitleDraft(e.target.value)}
                      onBlur={() => handleTitleSubmit()}
                      className={`w-full border-0 bg-muted/40 px-3 py-2 text-lg font-semibold leading-tight shadow-none focus-visible:ring-2 focus-visible:ring-foreground/20 focus-visible:ring-offset-0 ${titleError ? 'ring-2 ring-rose-500/50' : ''}`}
                      disabled={updateCard.isPending}
                      autoFocus
                    />
                  </form>
                ) : (
                  <button
                    type="button"
                    className="group flex w-full items-start gap-2 text-left"
                    onClick={() => setIsEditingTitle(true)}
                    onKeyDown={e => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        setIsEditingTitle(true)
                      }
                    }}
                  >
                    <h2 className="line-clamp-3 text-lg font-semibold leading-tight text-foreground transition-colors group-hover:text-foreground/80">
                      {card.title}
                    </h2>
                  </button>
                )}
              </div>
              <div className="flex flex-shrink-0 items-start gap-3">
                <PriorityBadge priority={card.priority} />
                <button
                  type="button"
                  onClick={onClose}
                  className="flex h-8 w-8 items-center justify-center rounded-full border border-border/80 text-muted-foreground transition-colors hover:border-border hover:text-foreground"
                  onKeyDown={e => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      onClose()
                    }
                  }}
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-6 py-8">
            <div className="space-y-8">
              <section className="space-y-3">
                <Label className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
                  Description
                </Label>
                {isEditingDescription ? (
                  <form onSubmit={handleDescriptionSubmit}>
                    <Textarea
                      value={descriptionDraft}
                      onChange={e => setDescriptionDraft(e.target.value)}
                      onKeyDown={handleDescriptionKeyDown}
                      onBlur={() => handleDescriptionSubmit()}
                      placeholder="Add a description..."
                      disabled={updateCard.isPending}
                      rows={5}
                      className="min-h-[140px] resize-none rounded-2xl border-0 bg-muted/40 px-4 py-3 text-sm leading-relaxed text-foreground shadow-none focus-visible:ring-2 focus-visible:ring-foreground/20 focus-visible:ring-offset-0"
                      autoFocus
                    />
                  </form>
                ) : (
                  <button
                    type="button"
                    className="relative w-full rounded-2xl border border-border/60 bg-background px-4 py-3 text-left transition-colors hover:border-foreground/20"
                    onClick={() => setIsEditingDescription(true)}
                    onKeyDown={e => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        setIsEditingDescription(true)
                      }
                    }}
                  >
                    {card.description ? (
                      <p className="text-sm leading-relaxed text-foreground/90">
                        {card.description}
                      </p>
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        Add a description...
                      </p>
                    )}
                  </button>
                )}
              </section>

              <section className="space-y-4">
                <div className="flex items-center justify-between rounded-2xl border border-border/60 bg-background px-4 py-3">
                  <div className="flex flex-wrap items-center gap-3">
                    <CalendarDays className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium text-muted-foreground">
                      Due date
                    </span>
                    {dueMetadata && (
                      <Badge
                        className={cn(
                          'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold',
                          CARD_DUE_STATUS_STYLES[dueMetadata.status]
                        )}
                      >
                        {dueMetadata.display}
                      </Badge>
                    )}
                  </div>
                  <input
                    type="date"
                    value={
                      card.dueDate
                        ? new Date(card.dueDate).toISOString().split('T')[0]
                        : ''
                    }
                    onChange={e => {
                      const newDate = e.target.value
                        ? new Date(e.target.value)
                        : undefined
                      handleDueDateChange(newDate)
                    }}
                    className="rounded-full border-0 bg-transparent px-3 py-1 text-sm font-semibold text-foreground/80 transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/20"
                  />
                </div>
                <div className="flex flex-col gap-2 rounded-2xl border border-border/60 bg-background px-4 py-3">
                  <div className="flex items-center gap-3">
                    <Tag className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium text-muted-foreground">
                      Tags
                    </span>
                  </div>
                  <TagSelector
                    boardId={card.boardId}
                    selectedTagIds={selectedTagIds}
                    onChange={handleTagChange}
                    disabled={
                      updateCard.isPending || updateCardTagsMutation.isPending
                    }
                    className="[&_button[aria-expanded]]:rounded-2xl [&_button[aria-expanded]]:border-0 [&_button[aria-expanded]]:bg-muted/60"
                  />
                </div>
              </section>

              <section className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
                    Attachments
                  </Label>
                  {card.attachments && card.attachments.length > 0 ? (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Paperclip className="h-3.5 w-3.5" />
                      {card.attachments.length}
                    </div>
                  ) : null}
                </div>
                <ImageUpload
                  cardId={card.id}
                  boardId={card.boardId}
                  attachments={card.attachments}
                  onUploadComplete={() => {
                    queryClient.invalidateQueries({
                      queryKey: kanbanQueryKeys.cards(card.boardId),
                    })
                  }}
                  onRemoveComplete={() => {
                    queryClient.invalidateQueries({
                      queryKey: kanbanQueryKeys.cards(card.boardId),
                    })
                  }}
                />
              </section>
            </div>
          </div>

          <div className="flex items-center justify-between border-t border-border/80 bg-muted/40 px-6 py-4 text-xs text-muted-foreground">
            <div className="flex flex-col gap-1">
              <span className="uppercase tracking-[0.2em]">Created</span>
              <span className="text-sm font-medium text-foreground/80">
                {card.createdAt
                  ? new Date(card.createdAt).toLocaleDateString()
                  : 'Unknown'}
              </span>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
