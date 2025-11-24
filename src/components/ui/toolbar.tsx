'use client'

import * as React from 'react'

import { Toolbar as BaseToolbar } from '@base-ui-components/react/toolbar'
import { Tooltip as BaseTooltip } from '@base-ui-components/react/tooltip'
import { type VariantProps, cva } from 'class-variance-authority'
import { ChevronDown } from 'lucide-react'

import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'

// Exporta Toolbar.Root como Toolbar
export function Toolbar({
  className,
  ...props
}: React.ComponentProps<typeof BaseToolbar.Root>) {
  return (
    <BaseToolbar.Root
      className={cn('relative flex items-center select-none', className)}
      {...props}
    />
  )
}

export function ToolbarSeparator({
  className,
  ...props
}: React.ComponentProps<typeof BaseToolbar.Separator>) {
  return (
    <BaseToolbar.Separator
      className={cn('mx-2 my-1 w-px shrink-0 bg-border', className)}
      {...props}
    />
  )
}

export function ToolbarLink({
  className,
  ...props
}: React.ComponentProps<typeof BaseToolbar.Link>) {
  return (
    <BaseToolbar.Link
      className={cn('font-medium underline underline-offset-4', className)}
      {...props}
    />
  )
}

// From toggleVariants
const toolbarButtonVariants = cva(
  "inline-flex cursor-pointer items-center justify-center gap-2 rounded-md text-sm font-medium whitespace-nowrap transition-[color,box-shadow] outline-none hover:bg-muted hover:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50 aria-checked:bg-accent aria-checked:text-accent-foreground aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    defaultVariants: {
      size: 'default',
      variant: 'default',
    },
    variants: {
      size: {
        default: 'h-9 min-w-9 px-2',
        lg: 'h-10 min-w-10 px-2.5',
        sm: 'h-8 min-w-8 px-1.5',
      },
      variant: {
        default: 'bg-transparent',
        outline:
          'border border-input bg-transparent shadow-xs hover:bg-accent hover:text-accent-foreground',
      },
    },
  }
)

const dropdownArrowVariants = cva(
  cn(
    'inline-flex items-center justify-center rounded-r-md text-sm font-medium text-foreground transition-colors disabled:pointer-events-none disabled:opacity-50'
  ),
  {
    defaultVariants: {
      size: 'sm',
      variant: 'default',
    },
    variants: {
      size: {
        default: 'h-9 w-6',
        lg: 'h-10 w-8',
        sm: 'h-8 w-4',
      },
      variant: {
        default:
          'bg-transparent hover:bg-muted hover:text-muted-foreground aria-checked:bg-accent aria-checked:text-accent-foreground',
        outline:
          'border border-l-0 border-input bg-transparent hover:bg-accent hover:text-accent-foreground',
      },
    },
  }
)

type ToolbarButtonProps = {
  isDropdown?: boolean
  pressed?: boolean
} & Omit<React.ComponentPropsWithoutRef<typeof BaseToolbar.Button>, 'value'> &
  VariantProps<typeof toolbarButtonVariants>

export const ToolbarButton = withTooltip(function ToolbarButton({
  children,
  className,
  isDropdown,
  pressed,
  size = 'sm',
  variant,
  ...props
}: ToolbarButtonProps) {
  return (
    <BaseToolbar.Button
      className={cn(
        toolbarButtonVariants({
          size,
          variant,
        }),
        isDropdown && 'justify-between gap-1 pr-1',
        pressed && 'bg-accent text-accent-foreground',
        className
      )}
      {...props}
    >
      {isDropdown ? (
        <>
          <div className="flex flex-1 items-center gap-2 whitespace-nowrap">
            {children}
          </div>
          <div>
            <ChevronDown className="size-3.5 text-muted-foreground" data-icon />
          </div>
        </>
      ) : (
        children
      )}
    </BaseToolbar.Button>
  )
})

export function ToolbarSplitButton({
  className,
  ...props
}: React.ComponentPropsWithoutRef<typeof ToolbarButton>) {
  return (
    <ToolbarButton
      className={cn('group flex gap-0 px-0 hover:bg-transparent', className)}
      {...props}
    />
  )
}

type ToolbarSplitButtonPrimaryProps = Omit<
  React.ComponentPropsWithoutRef<'span'>,
  'value'
> &
  VariantProps<typeof toolbarButtonVariants>

export function ToolbarSplitButtonPrimary({
  children,
  className,
  size = 'sm',
  variant,
  ...props
}: ToolbarSplitButtonPrimaryProps) {
  return (
    <span
      className={cn(
        toolbarButtonVariants({
          size,
          variant,
        }),
        'rounded-r-none',
        'group-data-[pressed=true]:bg-accent group-data-[pressed=true]:text-accent-foreground',
        className
      )}
      {...props}
    >
      {children}
    </span>
  )
}

export function ToolbarSplitButtonSecondary({
  className,
  size,
  variant,
  ...props
}: React.ComponentPropsWithoutRef<'span'> &
  VariantProps<typeof dropdownArrowVariants>) {
  return (
    <span
      className={cn(
        dropdownArrowVariants({
          size,
          variant,
        }),
        'group-data-[pressed=true]:bg-accent group-data-[pressed=true]:text-accent-foreground',
        className
      )}
      onClick={e => e.stopPropagation()}
      role="button"
      {...props}
    >
      <ChevronDown className="size-3.5 text-muted-foreground" data-icon />
    </span>
  )
}

export function ToolbarGroup({
  children,
  className,
}: React.ComponentProps<'div'>) {
  return (
    <div
      className={cn(
        'group/toolbar-group',
        'relative hidden has-[button]:flex',
        className
      )}
    >
      <div className="flex items-center">{children}</div>

      <div className="mx-1.5 py-0.5 group-last/toolbar-group:hidden!">
        <Separator orientation="vertical" />
      </div>
    </div>
  )
}

type TooltipProps<T extends React.ElementType> = {
  tooltip?: React.ReactNode
  tooltipContentProps?: Omit<
    React.ComponentPropsWithoutRef<typeof BaseTooltip.Popup>,
    'children'
  >
  tooltipProps?: Omit<
    React.ComponentPropsWithoutRef<typeof BaseTooltip.Root>,
    'children'
  >
  tooltipTriggerProps?: React.ComponentPropsWithoutRef<
    typeof BaseTooltip.Trigger
  >
} & React.ComponentProps<T>

function withTooltip<T extends React.ElementType>(Component: T) {
  const ComponentWithTooltip = React.forwardRef<
    React.ElementRef<T>,
    TooltipProps<T>
  >(
    (
      {
        tooltip,
        tooltipContentProps,
        tooltipProps,
        tooltipTriggerProps,
        ...props
      },
      forwardedRef
    ) => {
      const [mounted, setMounted] = React.useState(false)

      React.useEffect(() => {
        setMounted(true)
      }, [])

      const Comp = Component as React.ComponentType<unknown>

      const component = (
        <Comp
          {...(props as React.ComponentProps<T>)}
          ref={forwardedRef as React.Ref<React.ElementRef<T>>}
        />
      )

      if (tooltip && mounted) {
        return (
          <BaseTooltip.Root {...tooltipProps}>
            <BaseTooltip.Trigger render={component} {...tooltipTriggerProps} />

            <BaseTooltip.Portal>
              <BaseTooltip.Positioner sideOffset={4}>
                <BaseTooltip.Popup
                  className={cn(
                    'z-50 w-fit rounded-md bg-primary px-3 py-1.5 text-xs text-balance text-primary-foreground',
                    tooltipContentProps?.className
                  )}
                  {...tooltipContentProps}
                >
                  {tooltip}
                </BaseTooltip.Popup>
              </BaseTooltip.Positioner>
            </BaseTooltip.Portal>
          </BaseTooltip.Root>
        )
      }

      return component
    }
  )

  ComponentWithTooltip.displayName = `WithTooltip(${(Component as React.ComponentType).displayName ?? (Component as React.ComponentType).name ?? 'Component'})`

  return ComponentWithTooltip
}

export function ToolbarMenuGroup({
  children,
  className,
  label,
  value: _value,
  onValueChange: _onValueChange,
  ...props
}: React.ComponentProps<'div'> & {
  label?: string
  value?: string
  onValueChange?: (value: string) => void
}) {
  return (
    <>
      <div className="hidden mb-0 shrink-0 h-px bg-border peer-has-[[role=menuitem]]/menu-group:block peer-has-[[role=menuitemradio]]/menu-group:block peer-has-[[role=option]]/menu-group:block" />

      <div
        {...props}
        className={cn(
          'hidden',
          'peer/menu-group group/menu-group my-1.5 has-[[role=menuitem]]:block has-[[role=menuitemradio]]:block has-[[role=option]]:block',
          className
        )}
      >
        {label && (
          <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground select-none">
            {label}
          </div>
        )}
        {children}
      </div>
    </>
  )
}
