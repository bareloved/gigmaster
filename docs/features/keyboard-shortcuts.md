# Keyboard Shortcuts

## Overview

The app now supports keyboard shortcuts to improve efficiency and user experience. The primary shortcut implemented is **Cmd+Enter** (Mac) or **Ctrl+Enter** (Windows/Linux) to submit forms in dialog components.

## Implementation

### Core Hook: `useKeyboardSubmit`

Located at: `hooks/use-keyboard-submit.tsx`

This hook provides a simple way to add keyboard submission to any dialog:

```typescript
useKeyboardSubmit(open: boolean, formRef?: React.RefObject<HTMLFormElement>)
```

**How it works:**
- Listens for `keydown` events when the dialog is open
- Detects Cmd+Enter (Mac) or Ctrl+Enter (Windows/Linux)
- Finds the form element within the dialog
- Calls `form.requestSubmit()` to trigger proper validation and submit handlers
- Cleans up event listeners when dialog closes

**Key features:**
- Only active when dialog is open
- Doesn't interfere with native text input behavior
- Uses `requestSubmit()` instead of `submit()` to trigger validation
- Works with dialogs containing multiple forms (via tabs) by submitting the visible form

## Supported Dialogs

The keyboard shortcut has been added to **15 dialog components**:

### High-Priority Dialogs
- ✅ `create-gig-dialog.tsx` - Create Gig
- ✅ `edit-gig-dialog.tsx` - Save Changes
- ✅ `create-project-dialog.tsx` - Create Project
- ✅ `add-role-dialog.tsx` - Add Role
- ✅ `add-setlist-item-dialog.tsx` - Add Song
- ✅ `invite-musician-dialog.tsx` - Send Email / Open WhatsApp

### Other Dialogs
- ✅ `edit-project-dialog.tsx` - Save Changes
- ✅ `edit-setlist-item-dialog.tsx` - Save Changes
- ✅ `add-gig-file-dialog.tsx` - Add File
- ✅ `edit-gig-file-dialog.tsx` - Save Changes
- ✅ `add-contact-dialog.tsx` - Add Contact
- ✅ `edit-contact-dialog.tsx` - Save Changes
- ✅ `bulk-add-setlist-dialog.tsx` - Add Songs (*)
- ✅ `add-from-circle-dialog.tsx` - Add Selected (*)
- ✅ `quick-invite-dialog.tsx` - Add & Invite

**Note (*):** These dialogs don't have traditional form structures, so the keyboard shortcut won't work automatically. Future enhancement could refactor these to use forms.

## Usage

For users:
1. Open any dialog with a form (e.g., "Create Gig")
2. Fill in the required fields
3. Press **Cmd+Enter** (Mac) or **Ctrl+Enter** (Windows/Linux) to submit
4. Form validation will run before submission

## Technical Details

### Adding to New Dialogs

To add keyboard submission to a new dialog:

1. Import the hook:
```typescript
import { useKeyboardSubmit } from "@/hooks/use-keyboard-submit";
```

2. Add near the top of your component:
```typescript
useKeyboardSubmit(open);
```

3. Ensure your dialog contains a `<form>` element with `onSubmit` handler

### Special Cases

**Dialogs with tabs (multiple forms):**
The hook automatically finds and submits the first visible form in the dialog. This works for dialogs like `invite-musician-dialog.tsx` which have email and WhatsApp tabs.

**Dialogs without forms:**
Some dialogs like `bulk-add-setlist-dialog.tsx` and `add-from-circle-dialog.tsx` don't have traditional form structures. The hook is added but won't function automatically. These could be refactored in the future to wrap their content in forms.

## Future Enhancements

This keyboard shortcut foundation enables additional shortcuts:

1. **Escape to close dialogs** - Already built into shadcn Dialog component
2. **Cmd+K** - Global search/command palette
3. **Cmd+N** - Quick "New Gig" dialog
4. **j/k** - Navigate lists (vim-style)
5. **/** - Focus search input
6. **g + d** - Go to dashboard
7. **g + g** - Go to gigs
8. **g + p** - Go to projects

## Testing Checklist

When testing keyboard shortcuts:

- ✅ Cmd+Enter works on Mac / Ctrl+Enter on Windows
- ✅ Form validation runs before submission
- ✅ Loading states work correctly
- ✅ Doesn't interfere with textarea line breaks (Shift+Enter still works for new lines)
- ✅ Works across all dialog types (create, edit, add)
- ✅ Only triggers when dialog is open
- ✅ Works in dialogs with tabs (submits the visible form)

## Performance Considerations

- Event listeners are only active when dialogs are open
- Cleanup functions properly remove listeners on unmount
- No performance impact on closed dialogs
- Minimal overhead (single event listener per open dialog)

## Accessibility

- The keyboard shortcut follows platform conventions (Cmd on Mac, Ctrl on Windows/Linux)
- Form validation is preserved (uses `requestSubmit()` not `submit()`)
- Screen readers are not affected
- Existing keyboard navigation (Tab, Enter, Escape) continues to work

## Browser Compatibility

The keyboard shortcut uses standard Web APIs:
- `KeyboardEvent` with `metaKey` and `ctrlKey`
- `HTMLFormElement.requestSubmit()` - Supported in all modern browsers

No polyfills or fallbacks needed for the target browsers (modern Chrome, Firefox, Safari, Edge).

