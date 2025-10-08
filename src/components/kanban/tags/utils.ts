import type { KanbanTag } from '@/types/common'

export function getAccessibleTextColor(
  hex: string | null | undefined,
  isDarkMode = false
): string | undefined {
  if (!hex) {
    return undefined
  }

  const normalized = hex.replace('#', '')
  if (normalized.length !== 6) {
    return undefined
  }

  const r = Number.parseInt(normalized.slice(0, 2), 16)
  const g = Number.parseInt(normalized.slice(2, 4), 16)
  const b = Number.parseInt(normalized.slice(4, 6), 16)

  // Fórmula mais conservadora para melhor contraste
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255
  
  // No modo escuro, ser muito mais rigoroso para usar texto branco
  if (isDarkMode) {
    return luminance > 0.25 ? '#000000' : '#ffffff'
  }
  
  return luminance > 0.5 ? '#000000' : '#ffffff'
}

export function getTagBadgeStyle(tag: KanbanTag, isDarkMode = false) {
  if (!tag.color) {
    return undefined
  }

  const textColor = getAccessibleTextColor(tag.color, isDarkMode)
  return {
    backgroundColor: tag.color,
    color: textColor,
    borderColor: tag.color,
  } as const
}
