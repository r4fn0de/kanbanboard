import { logger } from '@/lib/logger'

export type Modifier = 'mod' | 'shift' | 'alt' | 'ctrl' | 'meta'

export interface KeyChord {
  key: string
  modifiers: Modifier[]
}

export interface ShortcutBinding {
  id: string
  commandId: string
  scope: 'global' | 'board'
  description?: string
  chord: KeyChord | null
}

export interface ShortcutsConfig {
  // Map from logical binding id to normalized shortcut string (e.g. 'mod+k').
  bindings: Record<string, string>
}

// Combinations que não devem ser permitidas por conflitar com o SO/Shell.
const BLOCKED_COMBINATIONS = new Set<string>(['mod+q', 'mod+w', 'mod+h'])

export function normalizeChord(chord: KeyChord): KeyChord {
  const key = chord.key.toLowerCase()
  const uniqueModifiers = Array.from(new Set(chord.modifiers))
  uniqueModifiers.sort()
  return { key, modifiers: uniqueModifiers }
}

export function formatChord(chord: KeyChord | null): string {
  if (!chord) return ''
  const { key, modifiers } = normalizeChord(chord)
  const parts = [...modifiers, key]
  return parts.join('+')
}

export function parseChordString(
  value: string | null | undefined
): KeyChord | null {
  if (!value) return null
  const raw = value.trim().toLowerCase()
  if (!raw) return null

  const parts = raw
    .split('+')
    .map(p => p.trim())
    .filter(Boolean)
  if (parts.length === 0) return null

  const key = parts[parts.length - 1]
  if (!key) return null
  const mods = parts.slice(0, -1) as Modifier[]
  return normalizeChord({ key, modifiers: mods })
}

export function isBlockedCombination(chord: KeyChord | null): boolean {
  if (!chord) return false
  const repr = formatChord(chord)
  return BLOCKED_COMBINATIONS.has(repr)
}

// Converte um KeyboardEvent em um KeyChord normalizado para comparação
// com as bindings configuradas. Nesta fase, consideramos apenas atalhos
// com modificadores (Cmd/Ctrl, Shift, Alt) para escopo global.
export function chordFromKeyboardEvent(event: KeyboardEvent): KeyChord | null {
  const modifiers: Modifier[] = []

  if (event.metaKey || event.ctrlKey) {
    modifiers.push('mod')
  }
  if (event.shiftKey) {
    modifiers.push('shift')
  }
  if (event.altKey) {
    modifiers.push('alt')
  }

  // Ignora eventos sem modificadores por enquanto (enter, letras puras, etc.)
  // Esses serão tratados em contexto de board na fase 3.
  if (modifiers.length === 0) {
    return null
  }

  const key = event.key.toLowerCase()

  // Ignora teclas de modificador puras
  if (key === 'meta' || key === 'control' || key === 'shift' || key === 'alt') {
    return null
  }

  return normalizeChord({ key, modifiers })
}

// Defaults iniciais de atalhos. Board-related ainda serão conectados na fase 2.
export const defaultShortcutBindings: ShortcutBinding[] = [
  {
    id: 'open-command-palette',
    commandId: 'open-command-palette',
    scope: 'global',
    description: 'Open command palette',
    chord: { key: 'k', modifiers: ['mod'] },
  },
  {
    id: 'open-preferences',
    commandId: 'open-preferences',
    scope: 'global',
    description: 'Open preferences',
    chord: { key: ',', modifiers: ['mod'] },
  },
  {
    id: 'toggle-left-sidebar',
    commandId: 'toggle-left-sidebar',
    scope: 'global',
    description: 'Toggle left sidebar',
    chord: { key: '1', modifiers: ['mod'] },
  },
  {
    id: 'toggle-right-sidebar',
    commandId: 'toggle-right-sidebar',
    scope: 'global',
    description: 'Toggle right sidebar',
    chord: { key: '2', modifiers: ['mod'] },
  },
  {
    id: 'create-project',
    commandId: 'create-project',
    scope: 'global',
    description: 'Create new project',
    chord: { key: 'n', modifiers: ['mod', 'shift'] },
  },
  {
    id: 'open-shortcuts-preferences',
    commandId: 'open-shortcuts-preferences',
    scope: 'global',
    description: 'Open Keyboard Shortcuts preferences',
    chord: { key: '/', modifiers: ['mod'] },
  },
  {
    id: 'open-workspaces-preferences',
    commandId: 'open-workspaces-preferences',
    scope: 'global',
    description: 'Open Workspaces preferences',
    chord: { key: 'w', modifiers: ['mod', 'shift'] },
  },
  {
    id: 'open-storage-preferences',
    commandId: 'open-storage-preferences',
    scope: 'global',
    description: 'Open Storage preferences',
    chord: { key: 's', modifiers: ['mod', 'shift'] },
  },
  // Board-level actions (ainda serão conectadas ao board na fase 2+)
  {
    id: 'board-new-card',
    commandId: 'board-new-card',
    scope: 'board',
    description: 'Create new card in current column',
    chord: { key: 'n', modifiers: ['mod'] },
  },
  {
    id: 'board-open-card',
    commandId: 'board-open-card',
    scope: 'board',
    description: 'Open selected card',
    chord: { key: 'enter', modifiers: [] },
  },
  {
    id: 'board-move-card-next-column',
    commandId: 'board-move-card-next-column',
    scope: 'board',
    description: 'Move selected card to next column',
    chord: { key: 'arrowright', modifiers: ['mod', 'shift'] },
  },
  {
    id: 'board-mark-card-done',
    commandId: 'board-mark-card-done',
    scope: 'board',
    description: 'Mark selected card as done',
    chord: { key: 'enter', modifiers: ['mod', 'shift'] },
  },
  {
    id: 'board-select-next-card',
    commandId: 'board-select-next-card',
    scope: 'board',
    description: 'Select next card',
    chord: { key: 'arrowdown', modifiers: [] },
  },
  {
    id: 'board-select-previous-card',
    commandId: 'board-select-previous-card',
    scope: 'board',
    description: 'Select previous card',
    chord: { key: 'arrowup', modifiers: [] },
  },
  {
    id: 'board-clear-selection',
    commandId: 'board-clear-selection',
    scope: 'board',
    description: 'Clear card selection',
    chord: { key: 'escape', modifiers: [] },
  },
  {
    id: 'board-toggle-subtasks-summary',
    commandId: 'board-toggle-subtasks-summary',
    scope: 'board',
    description: 'Toggle subtasks summary visibility',
    chord: { key: 't', modifiers: ['mod', 'shift'] },
  },
  {
    id: 'board-toggle-view-mode',
    commandId: 'board-toggle-view-mode',
    scope: 'board',
    description: 'Toggle board view mode',
    chord: { key: 'v', modifiers: ['mod', 'shift'] },
  },
]

export function buildEffectiveBindings(
  config: ShortcutsConfig | null
): ShortcutBinding[] {
  const overrides = config?.bindings ?? {}
  return defaultShortcutBindings.map(binding => {
    const override = overrides[binding.id]
    if (!override) return binding

    const parsed = parseChordString(override)
    if (!parsed) {
      logger.warn('Ignoring invalid shortcut override', {
        id: binding.id,
        value: override,
      })
      return binding
    }

    if (isBlockedCombination(parsed)) {
      logger.warn('Ignoring blocked shortcut override', {
        id: binding.id,
        value: override,
      })
      return binding
    }

    return { ...binding, chord: parsed }
  })
}
