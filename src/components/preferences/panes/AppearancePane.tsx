import type { ReactNode } from 'react'
import { useCallback, useId } from 'react'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { useTheme } from '@/hooks/use-theme'
import { useSavePreferences } from '@/services/preferences'

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
        <SettingsField
          label="Color Theme"
          description="Choose your preferred color theme"
        >
          <Select
            value={theme}
            onValueChange={handleThemeChange}
            disabled={savePreferences.isPending}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select theme" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="light">Light</SelectItem>
              <SelectItem value="dark">Dark</SelectItem>
              <SelectItem value="system">System</SelectItem>
            </SelectContent>
          </Select>
        </SettingsField>
      </SettingsSection>

      <SettingsSection title="Window Effects">
        <SettingsField
          label="Enable Transparency"
          description={
            <div>
              <p>Toggle the macOS-style translucent glass effect applied to sidebars and panels</p>
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
