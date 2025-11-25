import { useCallback, useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Kbd, KbdGroup } from '@/components/ui/kbd'
import {
  useShortcutsConfig,
  useSaveShortcutsConfig,
} from '@/services/shortcuts'
import {
  buildEffectiveBindings,
  formatChord,
  isBlockedCombination,
  parseChordString,
  type ShortcutBinding,
} from '@/lib/shortcuts'

function getChordKeyFromEvent(event: KeyboardEvent): string | null {
  const parts: string[] = []

  if (event.metaKey || event.ctrlKey) {
    parts.push('mod')
  }
  if (event.shiftKey) {
    parts.push('shift')
  }
  if (event.altKey) {
    parts.push('alt')
  }

  const key = event.key.toLowerCase()

  if (
    !key ||
    key === 'meta' ||
    key === 'control' ||
    key === 'shift' ||
    key === 'alt'
  ) {
    return null
  }

  parts.push(key)

  return parts.join('+')
}

function getScopeLabel(scope: ShortcutBinding['scope']): string {
  if (scope === 'global') return 'Global'
  if (scope === 'board') return 'Board'
  return scope
}

const isMacPlatform =
  typeof navigator !== 'undefined' &&
  /Mac|iPod|iPhone|iPad/.test(navigator.platform)

function renderChordKbd(label: string) {
  const parts = label
    .split('+')
    .map(p => p.trim())
    .filter(Boolean)

  const pretty = (part: string): string => {
    switch (part) {
      case 'mod':
        return isMacPlatform ? '⌘' : 'Ctrl'
      case 'shift':
        return '⇧'
      case 'alt':
        return '⌥'
      case 'ctrl':
        return 'Ctrl'
      case 'enter':
        return '↵'
      case 'escape':
        return 'Esc'
      case 'arrowup':
        return '↑'
      case 'arrowdown':
        return '↓'
      case 'arrowleft':
        return '←'
      case 'arrowright':
        return '→'
      default:
        return part.length === 1 ? part.toUpperCase() : part
    }
  }

  return (
    <KbdGroup>
      {parts.map(part => (
        <Kbd key={part}>{pretty(part)}</Kbd>
      ))}
    </KbdGroup>
  )
}

export function KeyboardShortcutsPane() {
  const { data: shortcutsConfig, isLoading } = useShortcutsConfig()
  const saveShortcuts = useSaveShortcutsConfig()

  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingChord, setEditingChord] = useState<string | null>(null)

  const bindings = shortcutsConfig?.bindings

  const currentBindings = useMemo(() => bindings ?? {}, [bindings])

  const effectiveBindings = useMemo(
    () => buildEffectiveBindings(shortcutsConfig ?? null),
    [shortcutsConfig]
  )

  const sortedBindings = useMemo(() => {
    return [...effectiveBindings].sort(
      (a, b) =>
        a.scope.localeCompare(b.scope) ||
        a.description?.localeCompare(b.description ?? '') ||
        a.id.localeCompare(b.id)
    )
  }, [effectiveBindings])

  const chordUsage = useMemo(() => {
    const map = new Map<string, ShortcutBinding[]>()

    sortedBindings.forEach(binding => {
      const override = currentBindings[binding.id]
      const chordLabel = override
        ? override
        : binding.chord
          ? formatChord(binding.chord)
          : ''

      if (!chordLabel) return

      const list = map.get(chordLabel) ?? []
      list.push(binding)
      map.set(chordLabel, list)
    })

    return map
  }, [sortedBindings, currentBindings])

  const startEditing = useCallback(
    (binding: ShortcutBinding) => {
      const override = currentBindings[binding.id]
      const base = override ?? (binding.chord ? formatChord(binding.chord) : '')
      setEditingId(binding.id)
      setEditingChord(base || null)
    },
    [currentBindings]
  )

  const stopEditing = useCallback(() => {
    setEditingId(null)
    setEditingChord(null)
  }, [])

  const handleReset = useCallback(
    (bindingId: string) => {
      const existing = currentBindings[bindingId]
      if (existing == null) return

      const { [bindingId]: _removed, ...nextBindings } = currentBindings
      saveShortcuts.mutate({ bindings: nextBindings })

      if (editingId === bindingId) {
        stopEditing()
      }
    },
    [currentBindings, saveShortcuts, editingId, stopEditing]
  )

  const handleSave = useCallback(
    (bindingId: string) => {
      if (!editingChord) {
        // Nothing captured, do not change anything
        stopEditing()
        return
      }

      const parsed = parseChordString(editingChord)
      if (!parsed) {
        toast.error('Invalid shortcut', {
          description: 'Use combinations like mod+k, shift+mod+p, enter, etc.',
        })
        return
      }

      if (isBlockedCombination(parsed)) {
        toast.error('Blocked shortcut', {
          description:
            'This combination is reserved by the operating system (e.g. Cmd+Q, Cmd+W, Cmd+H).',
        })
        return
      }

      // Conflict detection: block if another binding already uses the same chord
      const hasConflict = sortedBindings.some(binding => {
        if (binding.id === bindingId) return false
        const override = currentBindings[binding.id]
        const chordLabel = override
          ? override
          : binding.chord
            ? formatChord(binding.chord)
            : ''

        if (!chordLabel) return false
        return chordLabel === editingChord
      })

      if (hasConflict) {
        toast.error('Shortcut already in use', {
          description:
            'Another command is already using this shortcut. Choose a different combination.',
        })
        return
      }

      const nextBindings = {
        ...currentBindings,
        [bindingId]: editingChord,
      }

      saveShortcuts.mutate({ bindings: nextBindings })
      stopEditing()
    },
    [currentBindings, editingChord, saveShortcuts, stopEditing, sortedBindings]
  )

  useEffect(() => {
    if (!editingId) return

    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null

      if (target) {
        const tagName = target.tagName
        const isEditable =
          target.isContentEditable ||
          tagName === 'INPUT' ||
          tagName === 'TEXTAREA' ||
          tagName === 'SELECT'

        if (isEditable) {
          return
        }
      }

      // While capturing, prevent the default action as much as possible
      event.preventDefault()

      if (event.key === 'Escape') {
        stopEditing()
        return
      }

      if (event.key === 'Backspace' || event.key === 'Delete') {
        setEditingChord(null)
        return
      }

      const chordKey = getChordKeyFromEvent(event)
      if (!chordKey) return

      setEditingChord(chordKey)
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [editingId, stopEditing])

  if (isLoading && effectiveBindings.length === 0) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h2 className="text-lg font-medium text-foreground">
          Keyboard Shortcuts
        </h2>
        <p className="text-sm text-muted-foreground">
          Customize global and board-level keyboard shortcuts. Changes are saved
          locally and take effect immediately.
        </p>
      </div>

      <div className="overflow-hidden rounded-xl border border-border/60 bg-background/60">
        <div className="grid grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)] items-center gap-2 border-b border-border/60 px-4 py-2 text-xs font-medium text-muted-foreground">
          <div>Action</div>
          <div>Scope</div>
          <div className="text-right">Shortcut</div>
        </div>

        <div className="divide-y divide-border/60">
          {sortedBindings.map(binding => {
            const override = currentBindings[binding.id]
            const effectiveChordLabel = override
              ? override
              : binding.chord
                ? formatChord(binding.chord)
                : ''

            const isRowEditing = editingId === binding.id

            const hasOverride = override != null

            const usage = effectiveChordLabel
              ? chordUsage.get(effectiveChordLabel)
              : undefined
            const hasConflict = usage != null && usage.length > 1

            return (
              <div
                key={binding.id}
                className="grid grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)] items-center gap-2 px-4 py-2 text-sm"
              >
                <div className="space-y-0.5">
                  <div className="font-medium text-foreground">
                    {binding.description ?? binding.commandId}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    <code className="rounded bg-muted px-1.5 py-0.5 text-[11px]">
                      {binding.id}
                    </code>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Badge
                    variant={
                      binding.scope === 'global' ? 'secondary' : 'outline'
                    }
                    size="sm"
                  >
                    {getScopeLabel(binding.scope)}
                  </Badge>
                  {hasOverride && (
                    <span className="text-[11px] text-muted-foreground">
                      Customized
                    </span>
                  )}
                  {hasConflict && (
                    <span className="text-[11px] text-amber-600 dark:text-amber-400">
                      Conflict
                    </span>
                  )}
                </div>

                <div className="flex items-center justify-end gap-2">
                  <div className="min-w-[140px] rounded-md border border-border/60 bg-muted/40 px-2 py-1 text-xs text-foreground text-right">
                    {isRowEditing && !editingChord ? (
                      <span className="text-[11px] text-muted-foreground">
                        Press a key combination
                      </span>
                    ) : effectiveChordLabel ? (
                      renderChordKbd(effectiveChordLabel)
                    ) : (
                      <span className="text-[11px] text-muted-foreground">
                        Not set
                      </span>
                    )}
                  </div>
                  {isRowEditing ? (
                    <>
                      <Button
                        size="xs"
                        variant="outline"
                        onClick={() => handleSave(binding.id)}
                        disabled={saveShortcuts.isPending}
                      >
                        Save
                      </Button>
                      <Button
                        size="xs"
                        variant="ghost"
                        onClick={stopEditing}
                        disabled={saveShortcuts.isPending}
                      >
                        Cancel
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button
                        size="xs"
                        variant="outline"
                        onClick={() => startEditing(binding)}
                        disabled={saveShortcuts.isPending}
                      >
                        Edit
                      </Button>
                      <Button
                        size="xs"
                        variant="ghost"
                        onClick={() => handleReset(binding.id)}
                        disabled={!hasOverride || saveShortcuts.isPending}
                      >
                        Reset
                      </Button>
                    </>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
