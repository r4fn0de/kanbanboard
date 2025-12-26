import { useEffect } from 'react'
import type { ReactNode } from 'react'

import { ThemeProvider } from '@/components/ThemeProvider'
import type { Theme } from '@/lib/theme-context'

import { applyNovonAppId } from './app'

interface NovonProviderProps {
  children: ReactNode
  defaultTheme?: Theme
  storageKey?: string
}

export function NovonProvider({
  children,
  defaultTheme,
  storageKey,
}: NovonProviderProps) {
  useEffect(() => {
    applyNovonAppId()
  }, [])

  return (
    <ThemeProvider defaultTheme={defaultTheme} storageKey={storageKey}>
      {children}
    </ThemeProvider>
  )
}
