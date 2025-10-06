import { useCallback, useEffect, useState } from 'react'
import { ThemeProviderContext, type Theme } from '@/lib/theme-context'
import { usePreferences } from '@/services/preferences'
import { getCurrentWindow } from '@tauri-apps/api/window'

interface ThemeProviderProps {
  children: React.ReactNode
  defaultTheme?: Theme
  storageKey?: string
}

export function ThemeProvider({
  children,
  defaultTheme = 'system',
  storageKey = 'ui-theme',
  ...props
}: ThemeProviderProps) {
  const [theme, setTheme] = useState<Theme>(
    () => (localStorage.getItem(storageKey) as Theme) || defaultTheme
  )
  const transparencyStorageKey = `${storageKey}-transparency`
  const [transparencyEnabled, setTransparencyEnabledState] = useState<boolean>(
    () => {
      if (typeof window === 'undefined') {
        return true
      }
      const stored = window.localStorage.getItem(transparencyStorageKey)
      return stored === null ? true : stored === 'true'
    }
  )

  const setTransparencyEnabled = useCallback(
    (enabled: boolean) => {
      setTransparencyEnabledState(enabled)
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(transparencyStorageKey, enabled ? 'true' : 'false')
      }
    },
    [transparencyStorageKey]
  )

  // Load theme from persistent preferences
  const { data: preferences } = usePreferences()

  // Sync theme with preferences when they load
  useEffect(() => {
    if (!preferences) {
      return
    }

    if (preferences.theme && preferences.theme !== theme) {
      setTheme(preferences.theme as Theme)
    }

    if (
      typeof preferences.transparencyEnabled === 'boolean' &&
      preferences.transparencyEnabled !== transparencyEnabled
    ) {
      setTransparencyEnabled(preferences.transparencyEnabled)
    }
  }, [preferences, theme, transparencyEnabled, setTransparencyEnabled])

  useEffect(() => {
    const root = window.document.documentElement

    root.classList.remove('light', 'dark')

    if (theme === 'system') {
      const systemTheme = window.matchMedia('(prefers-color-scheme: dark)')
        .matches
        ? 'dark'
        : 'light'

      root.classList.add(systemTheme)
      return
    }

    root.classList.add(theme)
  }, [theme])

  useEffect(() => {
    if (typeof document !== 'undefined') {
      const root = document.documentElement
      const body = document.body
      if (transparencyEnabled) {
        root.classList.remove('transparency-disabled')
        body.style.backgroundColor = 'transparent'
      } else {
        root.classList.add('transparency-disabled')
        body.style.backgroundColor = ''
      }
    }

    const applyEffects = async () => {
      const tauriWindow = window as typeof window & {
        __TAURI__?: unknown
      }

      if (typeof window === 'undefined' || tauriWindow.__TAURI__ === undefined) {
        return
      }

      try {
        const win = getCurrentWindow()
        const w = win as unknown as {
          setEffects?: (options: unknown) => Promise<void>
          setTransparentTitlebar?: (visible: boolean, color?: string) => Promise<void>
        }

        if (transparencyEnabled) {
          if (typeof w.setEffects === 'function') {
            await w.setEffects({
              radius: 18,
              effects: [
                {
                  effect: 'hudWindow',
                  state: 'active',
                },
              ],
            })
          }
          if (typeof w.setTransparentTitlebar === 'function') {
            await w.setTransparentTitlebar(true, '#00000000')
          }
        } else {
          if (typeof w.setEffects === 'function') {
            await w.setEffects({
              radius: 0,
              effects: [],
            })
          }
          if (typeof w.setTransparentTitlebar === 'function') {
            await w.setTransparentTitlebar(false)
          }
        }
      } catch (error) {
        console.error('Failed to toggle window effects', error)
      }
    }

    applyEffects()
  }, [transparencyEnabled])

  const value = {
    theme,
    setTheme: (theme: Theme) => {
      localStorage.setItem(storageKey, theme)
      setTheme(theme)
    },
    transparencyEnabled,
    setTransparencyEnabled,
  }

  return (
    <ThemeProviderContext.Provider {...props} value={value}>
      {children}
    </ThemeProviderContext.Provider>
  )
}
