import type { ReactNode } from 'react'
import { useCallback, useId } from 'react'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Switch } from '@/components/ui/switch'
import { useTheme } from '@/hooks/use-theme'
import { useSavePreferences } from '@/services/preferences'
import { cn } from '@/lib/utils'

const SettingsField: React.FC<{
  label: string
  children: ReactNode
  description?: ReactNode
}> = ({ label, children, description }) => (
  <div className="space-y-2">
    <Label className="text-sm font-medium text-foreground">{label}</Label>
    {children}
    {description && (
      <div className="text-sm text-muted-foreground">{description}</div>
    )}
  </div>
)

const SettingsSection: React.FC<{
  title: string
  children: ReactNode
}> = ({ title, children }) => (
  <div className="space-y-4">
    <div>
      <h3 className="text-lg font-medium text-foreground">{title}</h3>
      <Separator className="mt-2" />
    </div>
    <div className="space-y-4">{children}</div>
  </div>
)

export const AppearancePane: React.FC = () => {
  const { theme, setTheme, transparencyEnabled, setTransparencyEnabled } =
    useTheme()
  const savePreferences = useSavePreferences()

  const transparencyId = useId()

  const handleThemeChange = useCallback(
    async (value: 'light' | 'dark' | 'system') => {
      // Update the theme provider immediately for instant UI feedback
      setTheme(value)

      // Persist the theme preference to disk
      savePreferences.mutate({ theme: value })
    },
    [setTheme, savePreferences]
  )

  const handleTransparencyToggle = useCallback(
    async (checked: boolean) => {
      setTransparencyEnabled(checked)
      savePreferences.mutate({
        transparencyEnabled: checked,
      })
    },
    [savePreferences, setTransparencyEnabled]
  )

  return (
    <div className="space-y-6">
      <SettingsSection title="Theme">
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Choose your preferred color theme
          </p>
          <div className="grid grid-cols-3 gap-4">
            {/* System */}
            <button
              type="button"
              onClick={() => handleThemeChange('system')}
              disabled={savePreferences.isPending}
              className={cn(
                'group flex flex-col items-center gap-2 text-sm',
                theme === 'system' ? 'text-foreground' : 'text-muted-foreground',
              )}
            >
              <div
                className={cn(
                  'w-full max-w-[140px] aspect-[16/9] rounded-xl border bg-muted flex overflow-hidden shadow-sm',
                  theme === 'system' &&
                    'border-primary ring-2 ring-primary/60',
                )}
              >
                <div className="w-1/4 bg-slate-900/80" />
                <div className="flex-1 flex flex-col gap-1.5 p-2">
                  <div className="h-1.5 rounded-full bg-slate-700/60" />
                  <div className="h-1.5 rounded-full bg-slate-500/40" />
                  <div className="h-1.5 rounded-full bg-slate-400/30" />
                </div>
              </div>
              <span className="font-medium">System</span>
            </button>

            {/* Light */}
            <button
              type="button"
              onClick={() => handleThemeChange('light')}
              disabled={savePreferences.isPending}
              className={cn(
                'group flex flex-col items-center gap-2 text-sm',
                theme === 'light' ? 'text-foreground' : 'text-muted-foreground',
              )}
            >
              <div
                className={cn(
                  'w-full max-w-[140px] aspect-[16/9] rounded-xl border bg-slate-50 flex overflow-hidden shadow-sm',
                  theme === 'light' &&
                    'border-primary ring-2 ring-primary/60',
                )}
              >
                <div className="w-1/4 bg-slate-200" />
                <div className="flex-1 flex flex-col gap-1.5 p-2">
                  <div className="h-1.5 rounded-full bg-slate-300" />
                  <div className="h-1.5 rounded-full bg-slate-200" />
                  <div className="h-1.5 rounded-full bg-slate-100" />
                </div>
              </div>
              <span className="font-medium">Light</span>
            </button>

            {/* Dark */}
            <button
              type="button"
              onClick={() => handleThemeChange('dark')}
              disabled={savePreferences.isPending}
              className={cn(
                'group flex flex-col items-center gap-2 text-sm',
                theme === 'dark' ? 'text-foreground' : 'text-muted-foreground',
              )}
            >
              <div
                className={cn(
                  'w-full max-w-[140px] aspect-[16/9] rounded-xl border bg-slate-900 flex overflow-hidden shadow-sm',
                  theme === 'dark' &&
                    'border-primary ring-2 ring-primary/60',
                )}
              >
                <div className="w-1/4 bg-slate-800" />
                <div className="flex-1 flex flex-col gap-1.5 p-2">
                  <div className="h-1.5 rounded-full bg-slate-600" />
                  <div className="h-1.5 rounded-full bg-slate-700" />
                  <div className="h-1.5 rounded-full bg-slate-800" />
                </div>
              </div>
              <span className="font-medium">Dark</span>
            </button>
          </div>
        </div>
      </SettingsSection>

      <SettingsSection title="Window Effects">
        <SettingsField
          label="Enable Transparency"
          description={
            <div>
              <p>
                Toggle the macOS-style translucent glass effect applied to
                sidebars and panels
              </p>
              <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                ⚠️ Beta feature - May contain bugs and performance issues
              </p>
            </div>
          }
        >
          <div className="flex items-center gap-3">
            <Switch
              id={transparencyId}
              checked={transparencyEnabled}
              onCheckedChange={handleTransparencyToggle}
              disabled={savePreferences.isPending}
            />
            <Label htmlFor={transparencyId} className="text-sm">
              {transparencyEnabled
                ? 'Transparency enabled'
                : 'Transparency disabled'}
            </Label>
          </div>
        </SettingsField>
      </SettingsSection>
    </div>
  )
}
