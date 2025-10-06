import { createContext } from 'react'

export type Theme = 'dark' | 'light' | 'system'

export interface ThemeProviderState {
  theme: Theme
  setTheme: (theme: Theme) => void
  transparencyEnabled: boolean
  setTransparencyEnabled: (enabled: boolean) => void
}

const initialState: ThemeProviderState = {
  theme: 'system',
  setTheme: () => null,
  transparencyEnabled: true,
  setTransparencyEnabled: () => null,
}

export const ThemeProviderContext =
  createContext<ThemeProviderState>(initialState)
