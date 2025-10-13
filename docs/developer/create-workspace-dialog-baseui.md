# CreateWorkspaceDialog - BaseUI Migration

## Overview

The `CreateWorkspaceDialog` component has been migrated from shadcn/ui Dialog to BaseUI Dialog components for better accessibility, flexibility, and consistency with the rest of the application.

## Changes Made

### Component Structure

**Before (shadcn/ui):**

```tsx
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
;<Dialog open={open} onOpenChange={handleDialogChange}>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Title</DialogTitle>
      <DialogDescription>Description</DialogDescription>
    </DialogHeader>
    {/* Content */}
  </DialogContent>
</Dialog>
```

**After (BaseUI):**

```tsx
import {
  Dialog,
  DialogPortal,
  DialogBackdrop,
  DialogPopup,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/base-ui-dialog'
;<Dialog open={open} onOpenChange={handleDialogChange}>
  <DialogPortal>
    <DialogBackdrop />
    <DialogPopup showCloseButton={false}>
      <div className="px-6 pt-6 pb-2 flex flex-col space-y-1.5">
        <DialogTitle>Title</DialogTitle>
        <DialogDescription>Description</DialogDescription>
      </div>
      {/* Content */}
    </DialogPopup>
  </DialogPortal>
</Dialog>
```

### Key Differences

1. **Portal and Backdrop**: BaseUI requires explicit `DialogPortal` and `DialogBackdrop` components
2. **Popup vs Content**: Uses `DialogPopup` instead of `DialogContent`
3. **Header Structure**: Header is now a regular div with flex layout instead of a `DialogHeader` component
4. **Close Button Control**: `showCloseButton` prop allows hiding the default close button

### Benefits of BaseUI

1. **Better Accessibility**: Built-in ARIA attributes and keyboard navigation
2. **More Control**: Explicit control over portal, backdrop, and popup behavior
3. **Headless UI**: Complete styling control without overriding default styles
4. **Consistency**: Matches other BaseUI components in the codebase (Menu, Select, etc.)

## Component Features

### Two-Step Interactive Flow

**Step 1: Name**

- Focus on workspace name input
- Character counter (0/50)
- Continue button disabled until valid name
- Smooth animation when proceeding

**Step 2: Customize**

- Live preview with workspace badge
- Icon upload with image cropper
- Color picker with 10 presets + custom color
- Back button to edit name
- Create button with loading state

### Visual Enhancements

- **Progress Indicator**: Two-bar progress showing current step
- **Animated Transitions**: Smooth slide animations between steps using Framer Motion
- **Live Preview**: Real-time workspace badge showing name initial and color
- **Interactive Colors**: Hover effects and scale animations on color swatches
- **Loading State**: Rotating spinner animation during creation

### Accessibility

- Proper ARIA labels via BaseUI
- Keyboard navigation support
- Focus management between steps
- Screen reader friendly descriptions

## Usage Example

```tsx
import { CreateWorkspaceDialog } from '@/components/workspace/CreateWorkspaceDialog'

function MyComponent() {
  const [open, setOpen] = useState(false)

  return (
    <CreateWorkspaceDialog
      open={open}
      onOpenChange={setOpen}
      onSuccess={workspaceId => {
        console.log('Workspace created:', workspaceId)
      }}
    />
  )
}
```

## Props

| Prop           | Type                            | Description                              |
| -------------- | ------------------------------- | ---------------------------------------- |
| `open`         | `boolean`                       | Controls dialog visibility               |
| `onOpenChange` | `(open: boolean) => void`       | Callback when visibility changes         |
| `onSuccess`    | `(workspaceId: string) => void` | Optional callback on successful creation |

## Related Files

- **Component**: `src/components/workspace/CreateWorkspaceDialog.tsx`
- **BaseUI Dialog**: `src/components/ui/base-ui-dialog.tsx`
- **Used in**: `src/components/layout/LeftSideBar.tsx`

## Best Practices

1. **Always use DialogPortal**: Ensures proper rendering outside the DOM tree
2. **Include DialogBackdrop**: Provides visual context and click-outside behavior
3. **Control Close Button**: Use `showCloseButton={false}` for custom close behavior
4. **Maintain ARIA**: Keep DialogTitle and DialogDescription for accessibility

## Future Improvements

- Add drag-and-drop for icon upload
- Support for workspace templates
- Bulk workspace creation
- Import/export workspace settings
