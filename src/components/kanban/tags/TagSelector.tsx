import { useEffect, useMemo, useState, useId } from 'react'
import { toast } from 'sonner'
import { Check, ChevronsUpDown, Pencil, Plus, Trash2 } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@base-ui-components/react/checkbox'
import { Dialog } from '@base-ui-components/react/dialog'
import { Popover } from '@base-ui-components/react/popover'
import { ScrollArea } from '@base-ui-components/react/scroll-area'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useTheme } from '@/hooks/use-theme'
import { cn } from '@/lib/utils'
import {
  useCreateTag,
  useDeleteTag,
  useTags,
  useUpdateTag,
} from '@/services/kanban'
import type { KanbanTag } from '@/types/common'
import { getTagBadgeStyle } from './utils'

const TAG_COLOR_OPTIONS: readonly string[] = [
  '#f97316',
  '#ef4444',
  '#f59e0b',
  '#10b981',
  '#0ea5e9',
  '#6366f1',
  '#8b5cf6',
  '#ec4899',
  '#64748b',
]

interface TagEditorState {
  mode: 'create' | 'edit'
  tag?: KanbanTag
}

interface TagSelectorProps {
  boardId: string
  selectedTagIds: string[]
  onChange: (tagIds: string[]) => void
  disabled?: boolean
  className?: string
}

export function TagSelector({
  boardId,
  selectedTagIds,
  onChange,
  disabled = false,
  className,
}: TagSelectorProps) {
  const labelInputId = useId()
  const { theme } = useTheme()
  const isDarkMode =
    theme === 'dark' ||
    (typeof window !== 'undefined' &&
      window.matchMedia('(prefers-color-scheme: dark)')?.matches &&
      theme === 'system')
  const { data: tags = [], isLoading } = useTags(boardId)
  const createTag = useCreateTag()
  const updateTag = useUpdateTag()
  const deleteTag = useDeleteTag()

  const [popoverOpen, setPopoverOpen] = useState(false)
  const [editorState, setEditorState] = useState<TagEditorState | null>(null)
  const [label, setLabel] = useState('')
  const [color, setColor] = useState<string | null>(
    TAG_COLOR_OPTIONS[0] ?? null
  )

  useEffect(() => {
    if (!editorState) {
      setLabel('')
      setColor(TAG_COLOR_OPTIONS[0] ?? null)
      return
    }

    if (editorState.mode === 'edit' && editorState.tag) {
      setLabel(editorState.tag.label)
      setColor(editorState.tag.color ?? null)
    } else {
      setLabel('')
      setColor(TAG_COLOR_OPTIONS[0] ?? null)
    }
  }, [editorState])

  const selectedTags = useMemo(() => {
    const lookup = new Map(tags.map(tag => [tag.id, tag]))
    return selectedTagIds
      .map(id => lookup.get(id))
      .filter((tag): tag is KanbanTag => Boolean(tag))
  }, [selectedTagIds, tags])

  const toggleTag = (tagId: string) => {
    if (disabled) {
      return
    }

    if (selectedTagIds.includes(tagId)) {
      onChange(selectedTagIds.filter(id => id !== tagId))
    } else {
      onChange([...selectedTagIds, tagId])
    }
  }

  const handleCreateTag = async () => {
    if (!label.trim()) {
      toast.error('Tag name is required')
      return
    }

    try {
      const id =
        globalThis.crypto?.randomUUID?.() ?? `tag-${Date.now().toString(36)}`

      const newTag = await createTag.mutateAsync({
        id,
        boardId,
        label: label.trim(),
        color,
      })

      setEditorState(null)
      if (!selectedTagIds.includes(newTag.id)) {
        onChange([...selectedTagIds, newTag.id])
      }
      toast.success('Tag created')
    } catch (error) {
      toast.error(
        `Failed to create tag: ${
          error instanceof Error ? error.message : 'unknown error'
        }`
      )
    }
  }

  const handleUpdateTag = async (tag: KanbanTag) => {
    const trimmedLabel = label.trim()
    if (!trimmedLabel) {
      toast.error('Tag name is required')
      return
    }

    const changes: Record<string, unknown> = {}
    if (trimmedLabel !== tag.label) {
      changes.label = trimmedLabel
    }
    if ((color ?? null) !== (tag.color ?? null)) {
      changes.color = color ?? null
    }

    if (Object.keys(changes).length === 0) {
      setEditorState(null)
      return
    }

    try {
      await updateTag.mutateAsync({
        id: tag.id,
        boardId,
        ...changes,
      })
      setEditorState(null)
      toast.success('Tag updated')
    } catch (error) {
      toast.error(
        `Failed to update tag: ${
          error instanceof Error ? error.message : 'unknown error'
        }`
      )
    }
  }

  const handleDeleteTag = async (tag: KanbanTag) => {
    try {
      await deleteTag.mutateAsync({ id: tag.id, boardId })
      onChange(selectedTagIds.filter(id => id !== tag.id))
      toast.success('Tag removed')
    } catch (error) {
      toast.error(
        `Failed to delete tag: ${
          error instanceof Error ? error.message : 'unknown error'
        }`
      )
    }
  }

  const isSaving = createTag.isPending || updateTag.isPending
  const isDeleting = deleteTag.isPending

  return (
    <div className={cn('space-y-3', className)}>
      <div className="flex flex-wrap gap-2">
        {selectedTags.length > 0 ? (
          selectedTags.map(tag => {
            const badgeStyle = getTagBadgeStyle(tag, isDarkMode)
            return (
              <Badge
                key={tag.id}
                className="rounded-lg px-3 py-1 text-xs font-semibold leading-none"
                style={badgeStyle}
              >
                {tag.label}
              </Badge>
            )
          })
        ) : (
          <span className="text-sm text-muted-foreground">
            No tags selected
          </span>
        )}
      </div>

      <Popover.Root open={popoverOpen} onOpenChange={setPopoverOpen}>
        <Popover.Trigger
          render={({ ref, className: triggerClassName, ...triggerProps }) => (
            <Button
              asChild
              variant="outline"
              className={cn('w-full justify-between', triggerClassName)}
              disabled={disabled}
            >
              <button
                ref={ref}
                type="button"
                aria-expanded={popoverOpen}
                disabled={disabled}
                {...triggerProps}
              >
                <span className="truncate">
                  {selectedTags.length > 0
                    ? `${selectedTags.length} tag${
                        selectedTags.length === 1 ? '' : 's'
                      } selected`
                    : 'Select tags'}
                </span>
                <ChevronsUpDown className="h-4 w-4 opacity-50" />
              </button>
            </Button>
          )}
        />
        <Popover.Portal>
          <Popover.Positioner
            sideOffset={5}
            className="z-50"
            side="bottom"
            align="start"
          >
            <Popover.Popup className="w-72 p-0 bg-background border rounded-md shadow-lg">
              <div className="flex items-center justify-between border-b px-3 py-2">
                <p className="text-sm font-medium">Tags</p>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setPopoverOpen(false)
                    setEditorState({ mode: 'create' })
                  }}
                >
                  <Plus className="mr-1 h-4 w-4" />
                  New
                </Button>
              </div>
              <ScrollArea.Root className="max-h-64">
                <ScrollArea.Viewport className="max-h-64 p-2">
                  <div className="flex flex-col gap-1">
                    {isLoading ? (
                      <div className="py-6 text-center text-sm text-muted-foreground">
                        Loading tags…
                      </div>
                    ) : tags.length > 0 ? (
                      tags.map(tag => {
                        const selected = selectedTagIds.includes(tag.id)

                        return (
                          <button
                            key={tag.id}
                            type="button"
                            onClick={() => toggleTag(tag.id)}
                            className="flex items-center justify-between rounded-lg px-2 py-2 text-left text-sm hover:bg-muted"
                          >
                            <div className="flex items-center gap-2">
                              <Checkbox.Root
                                checked={selected}
                                onCheckedChange={() => toggleTag(tag.id)}
                                disabled={disabled}
                                className="flex h-4 w-4 items-center justify-center rounded border border-input bg-background"
                              >
                                <Checkbox.Indicator className="text-primary">
                                  <Check className="h-3 w-3" />
                                </Checkbox.Indicator>
                              </Checkbox.Root>
                              <span className="flex items-center gap-2">
                                <span
                                  className="h-3 w-3 rounded-full border"
                                  style={
                                    tag.color
                                      ? {
                                          backgroundColor: tag.color,
                                          borderColor: tag.color,
                                        }
                                      : undefined
                                  }
                                />
                                <span
                                  className={cn(
                                    'truncate font-semibold leading-none rounded-lg px-3 py-1 text-xs',
                                    selected && !tag.color && 'font-bold'
                                  )}
                                  style={getTagBadgeStyle(tag, isDarkMode)}
                                >
                                  {tag.label}
                                </span>
                              </span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7"
                                onClick={event => {
                                  event.stopPropagation()
                                  setPopoverOpen(false)
                                  setEditorState({ mode: 'edit', tag })
                                }}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-destructive"
                                onClick={event => {
                                  event.stopPropagation()
                                  handleDeleteTag(tag)
                                }}
                                disabled={isDeleting}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </button>
                        )
                      })
                    ) : (
                      <div className="py-6 text-center text-sm text-muted-foreground">
                        No tags yet. Create one to get started.
                      </div>
                    )}
                  </div>
                </ScrollArea.Viewport>
                <ScrollArea.Scrollbar
                  orientation="vertical"
                  className="flex w-2.5 touch-none select-none border-l border-l-transparent p-px transition-colors"
                >
                  <ScrollArea.Thumb className="relative flex-1 rounded-full bg-border" />
                </ScrollArea.Scrollbar>
              </ScrollArea.Root>
            </Popover.Popup>
          </Popover.Positioner>
        </Popover.Portal>
      </Popover.Root>

      <Dialog.Root
        open={Boolean(editorState)}
        onOpenChange={open => {
          if (!open) {
            setEditorState(null)
          }
        }}
      >
        <Dialog.Portal>
          <Dialog.Backdrop className="fixed inset-0 bg-black/50 z-50" />
          <Dialog.Popup className="fixed left-1/2 top-1/2 z-50 max-w-md w-full -translate-x-1/2 -translate-y-1/2 bg-background border rounded-md shadow-lg p-6">
            <Dialog.Title className="text-lg font-semibold mb-1">
              {editorState?.mode === 'edit' ? 'Edit tag' : 'Create tag'}
            </Dialog.Title>
            <Dialog.Description className="text-sm text-muted-foreground mb-4">
              {editorState?.mode === 'edit'
                ? 'Edit the tag details below.'
                : 'Create a new tag to organize your tasks.'}
            </Dialog.Description>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor={labelInputId}>Name</Label>
                <Input
                  id={labelInputId}
                  value={label}
                  onChange={event => setLabel(event.target.value)}
                  placeholder="e.g. Priority"
                  disabled={isSaving}
                  autoFocus
                />
              </div>
              <div className="space-y-2">
                <Label>Color</Label>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setColor(null)}
                    className={cn(
                      'flex h-9 items-center justify-center rounded-full border px-3 text-sm transition-colors',
                      color === null
                        ? 'border-primary text-primary'
                        : 'border-border'
                    )}
                    disabled={isSaving}
                  >
                    None
                  </button>
                  {TAG_COLOR_OPTIONS.map(option => (
                    <button
                      key={option}
                      type="button"
                      onClick={() => setColor(option)}
                      className={cn(
                        'h-8 w-8 rounded-full border-2 transition',
                        color === option
                          ? 'border-primary scale-105'
                          : 'border-transparent'
                      )}
                      style={{ backgroundColor: option }}
                      disabled={isSaving}
                      aria-label={`Select ${option} color`}
                    />
                  ))}
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Dialog.Close
                render={
                  <Button type="button" variant="outline" disabled={isSaving}>
                    Cancel
                  </Button>
                }
              />
              <Button
                type="button"
                onClick={async () => {
                  if (!editorState) {
                    return
                  }

                  if (editorState.mode === 'edit' && editorState.tag) {
                    await handleUpdateTag(editorState.tag)
                  } else {
                    await handleCreateTag()
                  }
                }}
                disabled={isSaving}
              >
                {isSaving ? 'Saving…' : 'Save'}
              </Button>
            </div>
            <Dialog.Close
              render={
                <button
                  type="button"
                  className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none text-2xl leading-none"
                  aria-label="Close"
                >
                  ×
                </button>
              }
            />
          </Dialog.Popup>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  )
}
