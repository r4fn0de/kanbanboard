import * as React from 'react'
import { Menu as BaseMenu } from '@base-ui-components/react/menu'
import { cn } from '@/lib/utils'

/**
 * Menu Root - Base UI Menu wrapper
 */
export interface MenuProps extends BaseMenu.Root.Props {
  children: React.ReactNode
}

export function Menu({ children, ...props }: MenuProps) {
  return <BaseMenu.Root {...props}>{children}</BaseMenu.Root>
}

/**
 * Menu Trigger
 */
export interface MenuTriggerProps extends BaseMenu.Trigger.Props {
  children: React.ReactNode
  asChild?: boolean
}

export function MenuTrigger({ children, className, asChild, ...props }: MenuTriggerProps) {
  if (asChild && React.isValidElement(children)) {
    return (
      <BaseMenu.Trigger 
        className={cn('cursor-pointer', className)}
        render={children}
        {...props}
      />
    )
  }
  
  return (
    <BaseMenu.Trigger 
      className={cn('cursor-pointer', className)}
      {...props}
    >
      {children}
    </BaseMenu.Trigger>
  )
}

/**
 * Menu Portal
 */
export interface MenuPortalProps extends BaseMenu.Portal.Props {
  children: React.ReactNode
}

export function MenuPortal({ children, ...props }: MenuPortalProps) {
  return <BaseMenu.Portal {...props}>{children}</BaseMenu.Portal>
}

/**
 * Menu Positioner
 */
export interface MenuPositionerProps extends BaseMenu.Positioner.Props {
  children: React.ReactNode
}

export function MenuPositioner({ 
  children, 
  className,
  side = 'bottom',
  align = 'end',
  sideOffset = 5,
  ...props 
}: MenuPositionerProps) {
  return (
    <BaseMenu.Positioner 
      side={side}
      align={align}
      sideOffset={sideOffset}
      className={className}
      arrowPadding={8}
      {...props}
    >
      {children}
    </BaseMenu.Positioner>
  )
}

/**
 * Menu Popup/Content
 */
export interface MenuPopupProps extends BaseMenu.Popup.Props {
  children: React.ReactNode
}

export function MenuPopup({ className, children, ...props }: MenuPopupProps) {
  return (
    <BaseMenu.Popup
      className={cn(
        'z-50 min-w-[8rem] overflow-hidden',
        'rounded-md border bg-popover p-1 shadow-md',
        'data-[state=open]:animate-in data-[state=closed]:animate-out',
        'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
        'data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95',
        'data-[side=bottom]:slide-in-from-top-2',
        'data-[side=left]:slide-in-from-right-2',
        'data-[side=right]:slide-in-from-left-2',
        'data-[side=top]:slide-in-from-bottom-2',
        className
      )}
      {...props}
    >
      {children}
    </BaseMenu.Popup>
  )
}

/**
 * Menu Item
 */
export interface MenuItemProps extends BaseMenu.Item.Props {
  children: React.ReactNode
  destructive?: boolean
}

export function MenuItem({ 
  className, 
  children,
  destructive = false,
  ...props 
}: MenuItemProps) {
  return (
    <BaseMenu.Item
      className={cn(
        'relative flex cursor-pointer select-none items-center',
        'rounded-sm px-2 py-1.5 text-sm outline-none',
        'transition-colors',
        destructive 
          ? 'text-red-600 focus:text-red-600 focus:bg-red-50 hover:text-red-600 hover:bg-red-50 dark:text-red-400 dark:focus:text-red-300 dark:focus:bg-red-900/20'
          : 'focus:bg-accent focus:text-accent-foreground hover:bg-accent/80',
        'data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
        className
      )}
      {...props}
    >
      {children}
    </BaseMenu.Item>
  )
}

/**
 * Menu Separator
 */
export interface MenuSeparatorProps extends BaseMenu.Separator.Props {}

export function MenuSeparator({ className, ...props }: MenuSeparatorProps) {
  return (
    <BaseMenu.Separator
      className={cn('-mx-1 my-1 h-px bg-border', className)}
      {...props}
    />
  )
}

/**
 * Complete Menu Component - All parts together
 */
export interface CompleteMenuProps {
  trigger: React.ReactNode
  children: React.ReactNode
  side?: 'top' | 'right' | 'bottom' | 'left'
  align?: 'start' | 'center' | 'end'
  sideOffset?: number
  className?: string
}

export function CompleteMenu({
  trigger,
  children,
  side = 'bottom',
  align = 'end',
  sideOffset = 5,
  className,
}: CompleteMenuProps) {
  return (
    <Menu>
      <MenuTrigger asChild>{trigger}</MenuTrigger>
      <MenuPortal>
        <MenuPositioner side={side} align={align} sideOffset={sideOffset}>
          <MenuPopup className={className}>{children}</MenuPopup>
        </MenuPositioner>
      </MenuPortal>
    </Menu>
  )
}
