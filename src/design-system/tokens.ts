export const NOVON_TOKENS = {
  background: '--background',
  foreground: '--foreground',
  card: '--card',
  cardForeground: '--card-foreground',
  popover: '--popover',
  popoverForeground: '--popover-foreground',
  primary: '--primary',
  primaryForeground: '--primary-foreground',
  secondary: '--secondary',
  secondaryForeground: '--secondary-foreground',
  muted: '--muted',
  mutedForeground: '--muted-foreground',
  accent: '--accent',
  accentForeground: '--accent-foreground',
  destructive: '--destructive',
  destructiveForeground: '--destructive-foreground',
  border: '--border',
  input: '--input',
  ring: '--ring',
  brand: '--brand',
  highlight: '--highlight',
  radius: '--radius',
  fontSans: '--font-sans',
  fontMono: '--font-mono',
  fontSerif: '--font-serif',
} as const

export type NovonTokenKey = keyof typeof NOVON_TOKENS

export function getNovonToken(
  key: NovonTokenKey,
  root?: HTMLElement
): string | null {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return null
  }

  const target = root ?? document.documentElement
  const cssVar = NOVON_TOKENS[key]
  const value = window.getComputedStyle(target).getPropertyValue(cssVar)

  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}
