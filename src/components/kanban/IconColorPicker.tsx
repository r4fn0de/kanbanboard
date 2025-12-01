import type { ReactNode } from 'react'

import { cn } from '@/lib/utils'
import { Input } from '@/components/ui/input'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  Command,
  CommandEmpty,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import {
  PROJECT_ICON_OPTIONS,
  DEFAULT_PROJECT_ICON,
} from '@/components/layout/left-sidebar/constants'

interface IconColorPickerProps {
  icon: string | null | undefined
  onIconChange: (value: string) => void
  color: string
  onColorChange: (value: string) => void
  disabled?: boolean
  open?: boolean
  onOpenChange?: (open: boolean) => void
  children?: ReactNode
}

export function IconColorPicker({
  icon,
  onIconChange,
  color,
  onColorChange,
  disabled,
  open,
  onOpenChange,
  children,
}: IconColorPickerProps) {
  const iconKey = icon || DEFAULT_PROJECT_ICON

  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild disabled={disabled}>
        {children}
      </PopoverTrigger>
      <PopoverContent
        className="w-80 p-0 max-h-none overflow-visible"
        align="start"
        side="bottom"
      >
        <Command>
          <CommandInput placeholder="Search icon..." autoFocus={false} />
          <CommandList className="max-h-48 icon-picker-scroll">
            <CommandEmpty>No icons found</CommandEmpty>
            <div className="p-2 space-y-3">
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground">
                  Color
                </p>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={color}
                    onChange={event => onColorChange(event.target.value)}
                    className="h-9 w-12 cursor-pointer rounded-md border"
                  />
                  <Input
                    value={color}
                    onChange={event => onColorChange(event.target.value)}
                    placeholder="#6366F1"
                    className="h-9 flex-1 border-0 bg-muted/70 font-mono text-xs text-foreground placeholder:text-muted-foreground focus-visible:ring-0 focus-visible:border-0"
                  />
                </div>
              </div>

              <div className="grid grid-cols-6 gap-2">
                {PROJECT_ICON_OPTIONS.map(option => {
                  const OptionIconComponent = option.icon
                  const isSelected = iconKey === option.value
                  return (
                    <CommandItem
                      key={option.value}
                      value={`${option.label} ${option.value}`}
                      onSelect={() => onIconChange(option.value)}
                      className={cn(
                        'flex h-10 w-10 items-center justify-center rounded-xl border bg-background text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground',
                        isSelected && 'border-primary bg-primary/5 text-primary'
                      )}
                    >
                      <OptionIconComponent className="h-4 w-4" />
                      <span className="sr-only">{option.label}</span>
                    </CommandItem>
                  )
                })}
              </div>
            </div>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
