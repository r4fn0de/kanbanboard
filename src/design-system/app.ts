export const NOVON_APP_ID: string =
  (import.meta as ImportMeta).env?.VITE_NOVON_APP_ID ?? 'modulo'

export function applyNovonAppId(root?: HTMLElement): void {
  if (typeof document === 'undefined') {
    return
  }

  const target = root ?? document.documentElement
  target.dataset.novonApp = NOVON_APP_ID
}
