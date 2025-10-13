# BaseDialog Component

A standardized dialog component that provides consistent patterns for dialogs and alert dialogs throughout the application.

## Overview

The `BaseDialog` component unifies the common patterns used in dialogs across the app:

- Consistent header/footer structure
- Loading states with disabled buttons
- Support for both regular dialogs and alert dialogs
- Form integration with proper button types
- Destructive action styling
- Customizable button text and callbacks

## Basic Usage

### Regular Dialog with Form

```tsx
import { BaseDialog } from '@/components/ui/base-dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

function CreateWorkspaceDialog() {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const { mutate, isPending } = useCreateWorkspace()

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    mutate(
      { name },
      {
        onSuccess: () => {
          toast.success('Workspace created')
          setOpen(false)
        },
        onError: error => {
          toast.error('Failed to create workspace', {
            description: error.message,
          })
        },
      }
    )
  }

  return (
    <BaseDialog
      open={open}
      onOpenChange={setOpen}
      title="Create Workspace"
      description="Give your workspace a name to get started"
      formId="create-workspace-form"
      confirmText="Create workspace"
      loading={isPending}
      loadingText="Creating..."
    >
      <form id="create-workspace-form" onSubmit={handleSubmit}>
        <div className="space-y-2">
          <Label>Workspace name</Label>
          <Input
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="e.g. Product Team"
            autoFocus
            required
          />
        </div>
      </form>
    </BaseDialog>
  )
}
```

### Alert Dialog for Destructive Actions

```tsx
import { BaseDialog } from '@/components/ui/base-dialog'

function DeleteWorkspaceDialog({ workspace, open, onOpenChange }) {
  const { mutate, isPending } = useDeleteWorkspace()

  const handleDelete = () => {
    mutate(workspace.id, {
      onSuccess: () => {
        toast.success('Workspace deleted')
        onOpenChange(false)
      },
      onError: error => {
        toast.error('Failed to delete workspace', {
          description: error.message,
        })
      },
    })
  }

  return (
    <BaseDialog
      alert
      open={open}
      onOpenChange={onOpenChange}
      title="Delete workspace"
      description={`This action cannot be undone. This will permanently delete "${workspace.name}".`}
      variant="destructive"
      confirmText="Delete"
      onConfirm={handleDelete}
      loading={isPending}
      loadingText="Deleting..."
    >
      <div className="text-sm text-muted-foreground">
        <strong>Note:</strong> You must move or delete all projects from this
        workspace before you can delete it.
      </div>
    </BaseDialog>
  )
}
```

## API Reference

### Props

| Prop              | Type                           | Default        | Description                                 |
| ----------------- | ------------------------------ | -------------- | ------------------------------------------- |
| `open`            | `boolean`                      | -              | Whether the dialog is open (required)       |
| `onOpenChange`    | `(open: boolean) => void`      | -              | Callback when open state changes (required) |
| `title`           | `string`                       | -              | Dialog title (required)                     |
| `description`     | `string`                       | -              | Optional description/subtitle               |
| `children`        | `ReactNode`                    | -              | Dialog content (required)                   |
| `confirmText`     | `string`                       | `"Save"`       | Primary action button text                  |
| `cancelText`      | `string`                       | `"Cancel"`     | Cancel button text                          |
| `onConfirm`       | `() => void`                   | -              | Callback for primary action                 |
| `onCancel`        | `() => void`                   | -              | Callback for cancel (defaults to closing)   |
| `loading`         | `boolean`                      | `false`        | Whether action is loading                   |
| `loadingText`     | `string`                       | `"Loading..."` | Text to show when loading                   |
| `confirmDisabled` | `boolean`                      | `false`        | Whether to disable confirm button           |
| `footerContent`   | `ReactNode`                    | -              | Additional footer content                   |
| `variant`         | `"default"` \| `"destructive"` | `"default"`    | Dialog styling variant                      |
| `formId`          | `string`                       | -              | Form ID to associate with confirm button    |
| `alert`           | `boolean`                      | `false`        | Use AlertDialog instead of Dialog           |

## Patterns

### Pattern 1: Form-Based Dialog

When your dialog contains a form, use the `formId` prop to properly connect the submit button:

```tsx
<BaseDialog
  formId="my-form"
  confirmText="Submit"
  // ... other props
>
  <form id="my-form" onSubmit={handleSubmit}>
    {/* form fields */}
  </form>
</BaseDialog>
```

The confirm button will automatically have `type="submit"` and the correct `form` attribute.

### Pattern 2: Direct Action Dialog

When your dialog performs an action directly (not via form submission), use `onConfirm`:

```tsx
<BaseDialog
  onConfirm={handleAction}
  confirmText="Perform Action"
  loading={isPending}
  // ... other props
>
  {/* content */}
</BaseDialog>
```

### Pattern 3: Destructive Actions

For destructive actions like delete, use the alert mode with destructive variant:

```tsx
<BaseDialog
  alert
  variant="destructive"
  confirmText="Delete"
  onConfirm={handleDelete}
  // ... other props
>
  {/* warning content */}
</BaseDialog>
```

### Pattern 4: Custom Cleanup on Close

If you need custom cleanup logic when the dialog closes:

```tsx
<BaseDialog
  onOpenChange={open => {
    if (!open) {
      // Reset form state
      setName('')
      setError(null)
    }
  }}
  // ... other props
>
  {/* content */}
</BaseDialog>
```

Or use the `onCancel` callback:

```tsx
<BaseDialog
  onCancel={() => {
    // Custom cleanup
    resetState()
    // Dialog will close automatically
  }}
  // ... other props
>
  {/* content */}
</BaseDialog>
```

## Migration Guide

### Before (Manual Dialog)

```tsx
<Dialog open={open} onOpenChange={setOpen}>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Edit Workspace</DialogTitle>
      <DialogDescription>Update the workspace name and color</DialogDescription>
    </DialogHeader>
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* form fields */}
      <DialogFooter>
        <Button
          type="button"
          variant="outline"
          onClick={() => setOpen(false)}
          disabled={isPending}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={isPending}>
          {isPending ? 'Updating…' : 'Update workspace'}
        </Button>
      </DialogFooter>
    </form>
  </DialogContent>
</Dialog>
```

### After (BaseDialog)

```tsx
<BaseDialog
  open={open}
  onOpenChange={setOpen}
  title="Edit Workspace"
  description="Update the workspace name and color"
  formId="edit-workspace-form"
  confirmText="Update workspace"
  loading={isPending}
  loadingText="Updating…"
>
  <form id="edit-workspace-form" onSubmit={handleSubmit} className="space-y-4">
    {/* form fields */}
  </form>
</BaseDialog>
```

## Benefits

1. **Consistency**: All dialogs follow the same structure and behavior
2. **Less Code**: Reduces boilerplate for common dialog patterns
3. **Loading States**: Automatic handling of loading states and button disabling
4. **Accessibility**: Proper button types and ARIA attributes
5. **Type Safety**: Full TypeScript support with proper prop types
6. **Maintainability**: Changes to dialog patterns can be made in one place

## Testing

When testing components using BaseDialog:

```tsx
import { render, screen, fireEvent } from '@testing-library/react'

test('handles form submission', async () => {
  const handleSubmit = vi.fn()

  render(
    <BaseDialog
      open
      onOpenChange={vi.fn()}
      title="Test Dialog"
      formId="test-form"
      confirmText="Submit"
    >
      <form id="test-form" onSubmit={handleSubmit}>
        <input name="test" />
      </form>
    </BaseDialog>
  )

  const submitButton = screen.getByRole('button', { name: 'Submit' })
  fireEvent.click(submitButton)

  expect(handleSubmit).toHaveBeenCalled()
})
```

## See Also

- [Dialog UI Component](../../src/components/ui/dialog.tsx)
- [Alert Dialog UI Component](../../src/components/ui/alert-dialog.tsx)
- [Animations and Transitions](./animations-transitions.md)
