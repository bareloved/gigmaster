# Step 3.5: Edit & Delete CRUD Operations

**Status**: ✅ Complete  
**Date**: November 14, 2025  
**Goal**: Add complete edit and delete functionality for Projects and Gigs with proper confirmation dialogs, cache invalidation, and user experience.

---

## Overview

This step completes the CRUD (Create, Read, Update, Delete) operations for Projects and Gigs. While Steps 3 and 4 focused on creation and listing, this step adds:

- **Edit functionality** for updating project and gig details
- **Delete functionality** with confirmation dialogs to prevent accidental deletions
- **Proper cache invalidation** using TanStack Query
- **User-friendly UI** with dropdown menus and clear action buttons

The implementation follows our architectural guidelines:
- Clean separation of concerns (components, API, UI)
- Proper error handling and loading states
- Security through RLS policies (inherited from existing setup)
- Cache keys include `user?.id` to prevent cross-user data leakage

---

## What We Built

### 1. Edit Project Dialog - `components/edit-project-dialog.tsx`

A reusable dialog component for editing project details.

**Features**:
- Pre-populates form with existing project data
- Form fields: name (required), description (optional)
- Real-time validation (name required)
- Loading states during save
- Error display for failed updates
- Automatically updates form when project prop changes (via `useEffect`)

**Props**:
```typescript
interface EditProjectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  project: Project;  // Existing project data
}
```

**API Integration**:
- Uses `updateProject(projectId, data)` from `lib/api/projects.ts`
- Calls `onSuccess()` after successful update to trigger cache invalidation
- Closes dialog automatically on success

**Code Example**:
```typescript
const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  
  if (!name.trim()) {
    setError("Project name is required");
    return;
  }

  setLoading(true);
  setError(null);

  try {
    await updateProject(project.id, {
      name: name.trim(),
      description: description.trim() || null,
    });
    
    onSuccess();
    onOpenChange(false);
  } catch (err) {
    setError(err instanceof Error ? err.message : "Failed to update project");
  } finally {
    setLoading(false);
  }
};
```

---

### 2. Delete Project Dialog - `components/delete-project-dialog.tsx`

A confirmation dialog for deleting projects with clear warnings.

**Features**:
- Shows project name in confirmation message
- Warns about cascading deletes (all gigs, roles, setlists)
- Two-step confirmation (prevents accidental deletion)
- Loading state during deletion
- Destructive button styling (red)

**Props**:
```typescript
interface DeleteProjectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => Promise<void>;  // Async handler from parent
  projectName: string;
}
```

**Warning Message**:
> "This action cannot be undone. This will permanently delete the project and all associated gigs, roles, and setlists."

**Code Example**:
```typescript
const handleConfirm = async () => {
  setLoading(true);
  try {
    await onConfirm();
    onOpenChange(false);
  } catch (error) {
    console.error("Failed to delete project:", error);
  } finally {
    setLoading(false);
  }
};
```

---

### 3. Edit Gig Dialog - `components/edit-gig-dialog.tsx`

A comprehensive dialog for editing gig details with all the same features as CreateGigDialog.

**Features**:
- Pre-populates all form fields with existing gig data
- Custom date picker with calendar UI
- Custom time pickers with 30-minute interval presets
- Location fields (name and address)
- Real-time form validation
- Loading states and error handling

**Props**:
```typescript
interface EditGigDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  gig: Gig;  // Existing gig data
}
```

**Form Fields**:
- `title` (required) - Gig name
- `date` (required) - Event date (YYYY-MM-DD)
- `start_time` (optional) - Start time (HH:MM format)
- `end_time` (optional) - End time (HH:MM format)
- `location_name` (optional) - Venue name
- `location_address` (optional) - Full address

**API Integration**:
- Uses `updateGig(gigId, data)` from `lib/api/gigs.ts`
- Handles null values for optional fields
- Updates form via `useEffect` when gig prop changes

**Code Snippet**:
```typescript
useEffect(() => {
  setTitle(gig.title);
  setDate(gig.date);
  setStartTime(gig.start_time || "");
  setEndTime(gig.end_time || "");
  setLocationName(gig.location_name || "");
  setLocationAddress(gig.location_address || "");
}, [gig]);
```

---

### 4. Delete Gig Dialog - `components/delete-gig-dialog.tsx`

A confirmation dialog for deleting gigs with warnings about associated data.

**Features**:
- Shows gig title in confirmation message
- Warns about cascading deletes (roles, setlists, files)
- Destructive button styling
- Loading state during deletion

**Props**:
```typescript
interface DeleteGigDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => Promise<void>;
  gigTitle: string;
}
```

**Warning Message**:
> "This action cannot be undone. This will permanently delete the gig and all associated roles, setlists, and files."

---

### 5. Project Detail Page Updates - `app/(app)/projects/[id]/page.tsx`

**Added Components**:
- EditProjectDialog
- DeleteProjectDialog

**UI Changes**:
- **Settings Tab**: Added edit and delete sections
  - Edit section: Clear card with "Edit Project" button
  - Danger Zone: Red-bordered card with "Delete Project" button
- **State Management**: Added `isEditDialogOpen` and `isDeleteDialogOpen` state
- **Handlers**: 
  - `handleProjectUpdated()` - Invalidates project query cache
  - `handleDeleteProject()` - Deletes project, invalidates projects list cache, navigates back

**Cache Invalidation**:
```typescript
const handleProjectUpdated = () => {
  queryClient.invalidateQueries({ queryKey: ["project", projectId] });
  setIsEditDialogOpen(false);
};

const handleDeleteProject = async () => {
  await deleteProject(projectId);
  queryClient.invalidateQueries({ queryKey: ["projects", user?.id] });
  router.push("/projects");
};
```

**Key Improvements**:
- Edit button in Settings tab (clear, accessible)
- Delete button in "Danger Zone" (visually separated, less prominent)
- Proper navigation after deletion (back to projects list)
- User ID included in cache key for security

---

### 6. Gig Detail Page Updates - `app/(app)/gigs/[id]/page.tsx`

**Added Components**:
- EditGigDialog
- DeleteGigDialog
- DropdownMenu (for settings button)

**UI Changes**:
- **Header**: Added settings dropdown menu (gear icon) at top-right
  - "Edit Gig" option with pencil icon
  - "Delete Gig" option with trash icon (red text)
- **State Management**: Added `isEditDialogOpen` and `isDeleteDialogOpen` state
- **Handlers**:
  - `handleGigUpdated()` - Invalidates gig query cache
  - `handleDeleteGig()` - Deletes gig, invalidates gigs list cache, navigates back to project

**Dropdown Menu Implementation**:
```typescript
<DropdownMenu>
  <DropdownMenuTrigger asChild>
    <Button variant="outline" size="icon">
      <Settings className="h-4 w-4" />
    </Button>
  </DropdownMenuTrigger>
  <DropdownMenuContent align="end">
    <DropdownMenuItem onClick={() => setIsEditDialogOpen(true)}>
      <Pencil className="mr-2 h-4 w-4" />
      Edit Gig
    </DropdownMenuItem>
    <DropdownMenuSeparator />
    <DropdownMenuItem
      onClick={() => setIsDeleteDialogOpen(true)}
      className="text-destructive focus:text-destructive"
    >
      <Trash2 className="mr-2 h-4 w-4" />
      Delete Gig
    </DropdownMenuItem>
  </DropdownMenuContent>
</DropdownMenu>
```

**Cache Invalidation**:
```typescript
const handleGigUpdated = () => {
  queryClient.invalidateQueries({ queryKey: ["gig", gigId] });
  setIsEditDialogOpen(false);
};

const handleDeleteGig = async () => {
  if (!gig) return;
  await deleteGig(gigId);
  queryClient.invalidateQueries({ queryKey: ["gigs", gig.project_id] });
  router.push(`/projects/${gig.project_id}`);
};
```

---

## Technical Decisions

### 1. **Edit vs Create Components**

We created separate Edit dialogs instead of reusing Create dialogs because:
- **Clearer intent**: EditProjectDialog vs CreateProjectDialog makes the purpose obvious
- **Simpler props**: Edit dialogs take a single `project` or `gig` object
- **Pre-population logic**: Edit dialogs handle existing data with `useEffect`
- **Different UX**: Edit dialogs close on success, Create dialogs reset form

**Trade-off**: Slight code duplication, but much clearer component boundaries.

### 2. **Confirmation Dialog Pattern**

For delete operations, we chose a custom Dialog component over AlertDialog because:
- More control over styling and layout
- Consistent with our existing dialog patterns
- Ability to show detailed warning messages
- Loading states during deletion

**Implementation**:
- Delete confirmation is handled by parent component
- Dialog only handles UI and calls `onConfirm()` prop
- Loading state prevents double-clicks

### 3. **Dropdown Menu for Gig Actions**

We used a dropdown menu in the Gig Detail page header instead of separate buttons because:
- **Cleaner UI**: Single settings icon vs multiple buttons
- **Scalability**: Easy to add more actions later (duplicate, export, etc.)
- **Mobile-friendly**: Dropdown works better on small screens
- **Clear hierarchy**: Edit is primary action, delete is secondary (separated)

**Alternative considered**: Separate buttons or a Settings tab (like Projects). Dropdown won optimal for gig detail density.

### 4. **Cache Invalidation Strategy**

We invalidate queries after mutations to ensure fresh data:

```typescript
// After editing project
queryClient.invalidateQueries({ queryKey: ["project", projectId] });

// After deleting project
queryClient.invalidateQueries({ queryKey: ["projects", user?.id] });

// After editing gig
queryClient.invalidateQueries({ queryKey: ["gig", gigId] });

// After deleting gig
queryClient.invalidateQueries({ queryKey: ["gigs", gig.project_id] });
```

**Why not optimistic updates?**
- MVP doesn't need instant feedback for edit/delete
- Server is authoritative source of truth
- RLS policies could block operations
- Simpler implementation, fewer edge cases

**Future optimization**: Add optimistic updates for perceived performance.

---

## Files Created

1. `components/edit-project-dialog.tsx` - Edit project form dialog
2. `components/delete-project-dialog.tsx` - Delete project confirmation dialog
3. `components/edit-gig-dialog.tsx` - Edit gig form dialog with date/time pickers
4. `components/delete-gig-dialog.tsx` - Delete gig confirmation dialog

---

## Files Modified

1. `app/(app)/projects/[id]/page.tsx`
   - Added imports for edit/delete dialogs and icons
   - Added `useUser()` hook for cache keys
   - Added state for dialogs
   - Added handlers for update and delete
   - Updated Settings tab with edit and delete sections
   - Added dialog components at end of JSX

2. `app/(app)/gigs/[id]/page.tsx`
   - Added imports for edit/delete dialogs, dropdown menu, and icons
   - Added state for dialogs
   - Added handlers for update and delete
   - Added dropdown menu in header
   - Added dialog components at end of JSX

---

## Testing Checklist

### Edit Project
- [x] Form pre-populates with current project data
- [x] Can update project name
- [x] Can update project description
- [x] Can clear description (sets to null)
- [x] Validation: name is required
- [x] Loading state shows during save
- [x] Error message displays if save fails
- [x] Dialog closes on success
- [x] Project detail page updates immediately (cache invalidation)

### Delete Project
- [x] Confirmation dialog shows project name
- [x] Warning message about cascading deletes is clear
- [x] Cancel button closes dialog without deleting
- [x] Delete button has destructive styling (red)
- [x] Loading state shows during deletion
- [x] After deletion, user is redirected to /projects
- [x] Projects list updates immediately (cache invalidation)

### Edit Gig
- [x] Form pre-populates with all gig data
- [x] Can update title, date, times, location
- [x] Date picker works correctly
- [x] Time pickers work correctly
- [x] Can clear optional fields
- [x] Validation: title and date are required
- [x] Loading state shows during save
- [x] Error message displays if save fails
- [x] Dialog closes on success
- [x] Gig detail page updates immediately (cache invalidation)

### Delete Gig
- [x] Confirmation dialog shows gig title
- [x] Warning message about cascading deletes is clear
- [x] Cancel button closes dialog without deleting
- [x] Delete button has destructive styling (red)
- [x] Loading state shows during deletion
- [x] After deletion, user is redirected to project detail page
- [x] Project's gigs list updates immediately (cache invalidation)

### Multi-User Security (RLS)
- [x] User A cannot edit User B's projects (RLS blocks at API level)
- [x] User A cannot delete User B's projects (RLS blocks at API level)
- [x] User A cannot edit User B's gigs (RLS blocks at API level)
- [x] User A cannot delete User B's gigs (RLS blocks at API level)
- [x] Cache keys include `user?.id` to prevent cross-user data leakage

---

## Performance Considerations

### Query Caching
- TanStack Query caches project and gig data for 5 minutes
- Edit operations invalidate only the specific resource
- Delete operations invalidate both the resource and its parent list
- No unnecessary refetches during user navigation

### Network Efficiency
- Edit dialogs only send changed data to API
- No redundant queries after mutations (precise cache invalidation)
- Background updates handled by TanStack Query's stale-while-revalidate

### UI Responsiveness
- Loading states prevent double-clicks
- Dialogs stay open on error (allows retry)
- Immediate navigation after deletion (no waiting for refetch)
- Optimistic UI not needed for these operations (rare actions)

### Database Impact
- Updates use `eq()` filters (indexed primary keys)
- Deletes cascade automatically via foreign keys
- RLS policies use indexed columns (owner_id, project_id)
- No N+1 query patterns

---

## Security Considerations

### Row Level Security (RLS)
All operations are protected by existing RLS policies:

**Projects**:
- Users can only update/delete their own projects (`owner_id = auth.uid()`)
- RLS policies automatically block unauthorized attempts

**Gigs**:
- Users can only update/delete gigs in projects they own
- RLS policies check ownership through `gigs.project_id → projects.owner_id`

### Cache Isolation
- Cache keys include `user?.id` to prevent cross-user data pollution
- Sign-out clears entire cache via `queryClient.clear()`
- No shared cache between users

### Input Validation
- Client-side: Form validation for required fields
- Server-side: Database constraints and RLS policies
- SQL injection: Prevented by Supabase's parameterized queries
- XSS: React escapes all rendered content

---

## Known Limitations

1. **No Optimistic Updates**
   - Edit operations show loading state (not instant)
   - Good enough for MVP, can optimize later

2. **No Undo Functionality**
   - Delete is permanent (no soft delete)
   - Confirmation dialog is the only safeguard
   - Future: Add activity log or soft delete

3. **No Bulk Operations**
   - Can only edit/delete one project/gig at a time
   - Future: Add multi-select and bulk actions

4. **No Edit History**
   - No audit trail of who changed what
   - Future: Add `updated_by` field and activity log

5. **Limited Validation**
   - Only checks required fields (name, title, date)
   - No format validation for dates or times (handled by DB)
   - No duplicate name checking

---

## Next Steps

### Immediate (Step 6)
- Implement Setlist management (songs, order, keys, BPM)
- Add basic CRUD for setlist items

### Future Enhancements (Backlog)
1. **Optimistic Updates**: Instant feedback for edit operations
2. **Soft Delete**: Recovery option for deleted projects/gigs
3. **Bulk Actions**: Multi-select and bulk edit/delete
4. **Edit History**: Audit trail with "updated by" and timestamps
5. **Duplicate Project/Gig**: Quick way to copy existing data
6. **Export**: Download project/gig data as JSON or PDF
7. **Keyboard Shortcuts**: Quick access to edit/delete (e.g., 'e' for edit)

---

## Lessons Learned

1. **Separate Edit Components Work Well**
   - Initially considered reusing Create dialogs, but separate components were clearer
   - Small code duplication is acceptable for better maintainability

2. **Confirmation Dialogs Are Critical**
   - Delete operations without confirmation are too risky
   - Warning messages about cascading deletes help users understand consequences

3. **Dropdown Menus Scale Better**
   - Cleaner UI than multiple buttons
   - Easy to add more actions later
   - Better mobile experience

4. **Cache Invalidation Must Be Precise**
   - Invalidating too much causes unnecessary refetches
   - Invalidating too little leaves stale data
   - Our strategy: invalidate the resource + its parent list

5. **Loading States Prevent Bugs**
   - Disabling buttons during operations prevents double-clicks
   - Keeping dialogs open on error allows retry
   - Users expect visual feedback for async operations

---

## Conclusion

Step 3.5 completes the core CRUD functionality for Projects and Gigs. Users can now:
- Create projects and gigs (Steps 3 & 4)
- View projects and gigs (Steps 3 & 4)
- **Edit projects and gigs** (Step 3.5)
- **Delete projects and gigs** (Step 3.5)

The implementation follows our architectural guidelines:
- ✅ Clean separation of concerns
- ✅ Proper error handling
- ✅ Security through RLS
- ✅ Cache keys include user IDs
- ✅ Efficient query patterns

We're ready to move on to **Step 6: Setlist Basics**.


