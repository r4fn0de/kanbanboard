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
    return luminance > 0.4 ? '#000000' : '#ffffff'
  }

  // No modo claro, use um tom de texto mais suave em fundos muito claros
  // (#1f2937 ~ tailwind slate-800)
  return luminance > 0.5 ? '#1f2937' : '#ffffff'
}

export function getTagBadgeStyle(tag: KanbanTag, isDarkMode = false) {
  if (!tag.color) {
    return undefined
  }

  return {
    backgroundColor: tag.color,
    color: getAccessibleTextColor(tag.color, isDarkMode),
    borderColor: tag.color,
  } as const
}
