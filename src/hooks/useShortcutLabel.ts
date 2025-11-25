import { useMemo } from 'react'

import { buildEffectiveBindings, formatChord } from '@/lib/shortcuts'
import { useShortcutsConfig } from '@/services/shortcuts'

const isMacPlatform =
  typeof navigator !== 'undefined' &&
  /Mac|iPod|iPhone|iPad/.test(navigator.platform)

export function formatChordForDisplay(label: string): string {
  const parts = label
    .split('+')
    .map(part => part.trim())
    .filter(Boolean)

  const prettyParts = parts.map(part => {
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
  })

  if (prettyParts.length === 0) return ''

  return isMacPlatform ? prettyParts.join('') : prettyParts.join('+')
}

export function useShortcutLabel(bindingId: string): string | null {
  const { data: shortcutsConfig } = useShortcutsConfig()

  const effectiveBindings = useMemo(
    () => buildEffectiveBindings(shortcutsConfig ?? null),
    [shortcutsConfig]
  )

  const binding = useMemo(
    () => effectiveBindings.find(b => b.id === bindingId) ?? null,
    [effectiveBindings, bindingId]
  )

  if (!binding || !binding.chord) return null

  const raw = formatChord(binding.chord)
  if (!raw) return null

  return formatChordForDisplay(raw)
}
