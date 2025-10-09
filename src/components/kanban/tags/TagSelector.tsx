import { useEffect, useMemo, useState, useId } from 'react'
import { toast } from 'sonner'
import { Check, ChevronsUpDown, Pencil, Plus, Trash2 } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useTheme } from '@/hooks/use-theme'
import { cn } from '@/lib/utils'
import {
  useCreateTag,
  useDeleteTag,
  useTags,
  useUpdateTag,
} from '@/services/kanban'
import type { KanbanTag } from '@/types/common'
import { getAccessibleTextColor, getTagBadgeStyle } from './utils'

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
  // Detectar modo escuro de forma mais robusta
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
                className="rounded-full px-3 py-1 text-xs font-semibold leading-none opacity-100"
                style={
                  tag.color
                    ? {
                        backgroundColor: tag.color,
                        color: badgeStyle?.color,
                        borderColor: tag.color,
                      }
                    : undefined
                }
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

      <Popover open={popoverOpen} onOpenChange={setPopoverOpen} modal={false}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            type="button"
            disabled={disabled}
            className="w-full justify-between"
            aria-expanded={popoverOpen}
          >
            <span className="truncate">
              {selectedTags.length > 0
                ? `${selectedTags.length} tag${
                    selectedTags.length === 1 ? '' : 's'
                  } selected`
                : 'Select tags'}
            </span>
            <ChevronsUpDown className="h-4 w-4 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-72 p-0" align="start">
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
          <ScrollArea className="max-h-64">
            <div className="flex flex-col gap-1 p-2">
              {isLoading ? (
                <div className="py-6 text-center text-sm text-muted-foreground">
                  Loading tags…
                </div>
              ) : tags.length > 0 ? (
                tags.map(tag => {
                  const selected = selectedTagIds.includes(tag.id)
                  const textColor = getAccessibleTextColor(
                    tag.color,
                    isDarkMode
                  )

                  return (
                    <button
                      key={tag.id}
                      type="button"
                      onClick={() => toggleTag(tag.id)}
                      className="flex items-center justify-between rounded-lg px-2 py-2 text-left text-sm hover:bg-muted"
                    >
                      <div className="flex items-center gap-2">
                        <Checkbox
                          checked={selected}
                          onCheckedChange={() => toggleTag(tag.id)}
                          onClick={event => event.stopPropagation()}
                          disabled={disabled}
                        />
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
                              'truncate font-semibold leading-none rounded-full px-3 py-1 text-xs',
                              selected && !tag.color && 'font-bold'
                            )}
                            style={
                              tag.color
                                ? {
                                    backgroundColor: tag.color,
                                    color: textColor,
                                    borderColor: tag.color,
                                  }
                                : undefined
                            }
                          >
                            {tag.label}
                          </span>
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        {selected ? (
                          <Check className="h-4 w-4 text-primary" />
                        ) : null}
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
          </ScrollArea>
        </PopoverContent>
      </Popover>

      <Dialog
        open={Boolean(editorState)}
        onOpenChange={open => {
          if (!open) {
            setEditorState(null)
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editorState?.mode === 'edit' ? 'Edit tag' : 'Create tag'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
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
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setEditorState(null)}
              disabled={isSaving}
            >
              Cancel
            </Button>
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
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
