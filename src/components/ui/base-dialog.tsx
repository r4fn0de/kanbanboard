import * as React from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

/**
 * Props for the BaseDialog component
 */
export interface BaseDialogProps {
  /** Whether the dialog is open */
  open: boolean
  /** Callback when the dialog open state changes */
  onOpenChange: (open: boolean) => void
  /** Title of the dialog */
  title: string
  /** Description/subtitle text */
  description?: string
  /** Dialog content */
  children: React.ReactNode
  /** Primary action button text (default: "Save") */
  confirmText?: string
  /** Cancel button text (default: "Cancel") */
  cancelText?: string
  /** Callback for primary action */
  onConfirm?: () => void
  /** Callback for cancel action */
  onCancel?: () => void
  /** Whether the action is loading */
  loading?: boolean
  /** Loading text to show when loading (default: "Loading...") */
  loadingText?: string
  /** Whether to disable the confirm button */
  confirmDisabled?: boolean
  /** Additional footer content (appears before action buttons) */
  footerContent?: React.ReactNode
  /** Variant of the dialog: "default" or "destructive" */
  variant?: 'default' | 'destructive'
  /** Form ID to associate with the confirm button (for form submission) */
  formId?: string
  /** Whether to use AlertDialog instead of Dialog (for destructive actions) */
  alert?: boolean
}

/**
 * BaseDialog: A standardized dialog component with common patterns
 *
 * Features:
 * - Consistent styling and behavior
 * - Loading states with disabled buttons
 * - Support for both regular and alert dialogs
 * - Form integration support
 * - Customizable action buttons
 * - Destructive action styling
 *
 * @example
 * // Regular dialog with form
 * <BaseDialog
 *   open={open}
 *   onOpenChange={setOpen}
 *   title="Create Project"
 *   description="Give your project a name"
 *   formId="create-project-form"
 *   confirmText="Create"
 *   loading={isPending}
 *   loadingText="Creating..."
 * >
 *   <form id="create-project-form" onSubmit={handleSubmit}>
 *     <Input name="name" />
 *   </form>
 * </BaseDialog>
 *
 * @example
 * // Alert dialog for destructive action
 * <BaseDialog
 *   alert
 *   open={open}
 *   onOpenChange={setOpen}
 *   title="Delete Workspace"
 *   description="This action cannot be undone."
 *   variant="destructive"
 *   confirmText="Delete"
 *   onConfirm={handleDelete}
 *   loading={isPending}
 * >
 *   <p>Are you sure you want to delete this workspace?</p>
 * </BaseDialog>
 */
export function BaseDialog({
  open,
  onOpenChange,
  title,
  description,
  children,
  confirmText = 'Save',
  cancelText = 'Cancel',
  onConfirm,
  onCancel,
  loading = false,
  loadingText = 'Loading...',
  confirmDisabled = false,
  footerContent,
  variant = 'default',
  formId,
  alert = false,
}: BaseDialogProps) {
  const handleCancel = React.useCallback(() => {
    if (onCancel) {
      onCancel()
    } else {
      onOpenChange(false)
    }
  }, [onCancel, onOpenChange])

  const handleConfirm = React.useCallback(
    (event: React.MouseEvent) => {
      if (onConfirm && !formId) {
        event.preventDefault()
        onConfirm()
      }
      // If formId is provided, let the form handle submission
    },
    [onConfirm, formId]
  )

  // Render as AlertDialog for destructive actions
  if (alert) {
    return (
      <AlertDialog open={open} onOpenChange={onOpenChange}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{title}</AlertDialogTitle>
            {description && (
              <AlertDialogDescription>{description}</AlertDialogDescription>
            )}
          </AlertDialogHeader>
          {children}
          <AlertDialogFooter>
            {footerContent}
            <AlertDialogCancel disabled={loading} onClick={handleCancel}>
              {cancelText}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirm}
              disabled={loading || confirmDisabled}
              className={
                variant === 'destructive'
                  ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90'
                  : ''
              }
            >
              {loading ? loadingText : confirmText}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    )
  }

  // Render as regular Dialog
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        {children}
        <DialogFooter>
          {footerContent}
          <Button
            type="button"
            variant="outline"
            onClick={handleCancel}
            disabled={loading}
          >
            {cancelText}
          </Button>
          <Button
            type={formId ? 'submit' : 'button'}
            form={formId}
            onClick={handleConfirm}
            disabled={loading || confirmDisabled}
            variant={variant === 'destructive' ? 'destructive' : 'default'}
          >
            {loading ? loadingText : confirmText}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
