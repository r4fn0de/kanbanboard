import * as React from 'react'
import { Dialog as BaseDialog } from '@base-ui-components/react/dialog'
import { cn } from '@/lib/utils'
import { XIcon } from 'lucide-react'

/**
 * Dialog Root - Base UI Dialog wrapper
 */
export interface DialogProps extends BaseDialog.Root.Props {
  children: React.ReactNode
}

export function Dialog({ children, ...props }: DialogProps) {
  return <BaseDialog.Root {...props}>{children}</BaseDialog.Root>
}

/**
 * Dialog Trigger
 */
export interface DialogTriggerProps extends BaseDialog.Trigger.Props {
  children: React.ReactNode
}

export function DialogTrigger({ children, className, ...props }: DialogTriggerProps) {
  return (
    <BaseDialog.Trigger className={cn('cursor-pointer', className)} {...props}>
      {children}
    </BaseDialog.Trigger>
  )
}

/**
 * Dialog Portal
 */
export interface DialogPortalProps extends BaseDialog.Portal.Props {
  children: React.ReactNode
}

export function DialogPortal({ children, ...props }: DialogPortalProps) {
  return <BaseDialog.Portal {...props}>{children}</BaseDialog.Portal>
}

/**
 * Dialog Backdrop/Overlay
 */
export interface DialogBackdropProps extends BaseDialog.Backdrop.Props {}

export function DialogBackdrop({ className, ...props }: DialogBackdropProps) {
  return (
    <BaseDialog.Backdrop
      className={cn(
        'fixed inset-0 z-50 bg-black/50',
        'data-[state=open]:animate-in data-[state=closed]:animate-out',
        'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
        'data-[state=open]:duration-300 data-[state=closed]:duration-200',
        className
      )}
      {...props}
    />
  )
}

/**
 * Dialog Popup/Content
 */
export interface DialogPopupProps extends BaseDialog.Popup.Props {
  children: React.ReactNode
  showCloseButton?: boolean
}

export function DialogPopup({
  className,
  children,
  showCloseButton = true,
  ...props
}: DialogPopupProps) {
  return (
    <BaseDialog.Popup
      className={cn(
        'fixed left-[50%] top-[50%] z-50',
        'translate-x-[-50%] translate-y-[-50%]',
        'grid w-full max-w-lg gap-4',
        'rounded-lg border bg-background p-6 shadow-lg',
        'data-[state=open]:animate-in data-[state=closed]:animate-out',
        'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
        'data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95',
        'data-[state=open]:duration-300 data-[state=closed]:duration-200',
        'max-h-[calc(100vh-2rem)] overflow-auto',
        className
      )}
      {...props}
    >
      {children}
      {showCloseButton && (
        <BaseDialog.Close
          className={cn(
            'absolute right-4 top-4 rounded-sm opacity-70',
            'ring-offset-background transition-opacity',
            'hover:opacity-100 focus:outline-none focus:ring-2',
            'focus:ring-ring focus:ring-offset-2',
            'disabled:pointer-events-none',
            'cursor-pointer'
          )}
        >
          <XIcon className="h-4 w-4" />
          <span className="sr-only">Close</span>
        </BaseDialog.Close>
      )}
    </BaseDialog.Popup>
  )
}

/**
 * Dialog Close Button
 */
export interface DialogCloseProps extends BaseDialog.Close.Props {
  children: React.ReactNode
}

export function DialogClose({ children, className, ...props }: DialogCloseProps) {
  return (
    <BaseDialog.Close className={cn('cursor-pointer', className)} {...props}>
      {children}
    </BaseDialog.Close>
  )
}

/**
 * Dialog Title
 */
export interface DialogTitleProps extends BaseDialog.Title.Props {
  children: React.ReactNode
}

export function DialogTitle({ className, children, ...props }: DialogTitleProps) {
  return (
    <BaseDialog.Title
      className={cn('text-lg font-semibold leading-none tracking-tight', className)}
      {...props}
    >
      {children}
    </BaseDialog.Title>
  )
}

/**
 * Dialog Description
 */
export interface DialogDescriptionProps extends BaseDialog.Description.Props {
  children: React.ReactNode
}

export function DialogDescription({
  className,
  children,
  ...props
}: DialogDescriptionProps) {
  return (
    <BaseDialog.Description
      className={cn('text-sm text-muted-foreground', className)}
      {...props}
    >
      {children}
    </BaseDialog.Description>
  )
}

/**
 * Dialog Header - Convenience component for title + description
 */
export interface DialogHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
}

export function DialogHeader({ className, children, ...props }: DialogHeaderProps) {
  return (
    <div
      className={cn('flex flex-col space-y-1.5 text-center sm:text-left', className)}
      {...props}
    >
      {children}
    </div>
  )
}

/**
 * Dialog Footer - Convenience component for action buttons
 */
export interface DialogFooterProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
}

export function DialogFooter({ className, children, ...props }: DialogFooterProps) {
  return (
    <div
      className={cn(
        'flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2',
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}

/**
 * Complete Dialog Component - All parts together
 */
export interface CompleteDialogProps {
  open?: boolean
  onOpenChange?: (open: boolean) => void
  title: string
  description?: string
  children: React.ReactNode
  showCloseButton?: boolean
  className?: string
}

export function CompleteDialog({
  open,
  onOpenChange,
  title,
  description,
  children,
  showCloseButton = true,
  className,
}: CompleteDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogPortal>
        <DialogBackdrop />
        <DialogPopup showCloseButton={showCloseButton} className={className}>
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            {description && <DialogDescription>{description}</DialogDescription>}
          </DialogHeader>
          {children}
        </DialogPopup>
      </DialogPortal>
    </Dialog>
  )
}
