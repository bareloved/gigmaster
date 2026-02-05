# Plan: Redirect Gig Duplication to Editor with Pre-filled Data

## Summary

Instead of the current dialog (title + date only), clicking "Duplicate Gig" will navigate to `/gigs/new?duplicate={gigId}` with **all fields pre-filled** from the source gig. User can edit anything before saving.

## Current Flow
1. User clicks "Duplicate Gig" → Dialog opens
2. User enters title and date
3. `duplicateGig()` API creates gig with copied data

## New Flow
1. User clicks "Duplicate Gig" → Navigates to `/gigs/new?duplicate={gigId}`
2. Editor opens with ALL fields pre-filled (title, venue, lineup, setlist, schedule, materials, etc.)
3. User can modify any field
4. Save creates new gig via normal flow

---

## Files to Modify

### 1. `/app/(app)/gigs/new/page.tsx`
**Current:** Simple wrapper, no params handling
```tsx
export default function NewGigPage() {
  return <GigEditorWrapper mode="create" />;
}
```

**Change:** Add `searchParams` handling to fetch source gig for duplication
- Check for `?duplicate=sourceGigId` URL param
- Fetch source gig data using `getGig()` server action
- Transform data for duplication (rename title, clear IDs, reset statuses)
- Pass to `GigEditorWrapper`

### 2. `/app/(app)/gigs/editor-wrapper.tsx`
**Current:** Passes `gig` prop to panel, no explicit `isEditing` prop

**Change:** Pass `isEditing={false}` explicitly when gig is provided for duplication
- The panel uses `isEditing = isEditingProp ?? !!gigPack` (line 277)
- Must pass `isEditing={false}` so it saves as NEW gig, not updates

### 3. `/components/dashboard/gig-item.tsx`
**Current:** Opens `DuplicateGigDialog` (line 382)
```tsx
<DropdownMenuItem onClick={() => setDuplicateDialogOpen(true)}>
```

**Change:** Navigate to `/gigs/new?duplicate={gig.gigId}` instead
- Remove dialog state and component
- Remove `useDuplicateGig` hook import
- Replace with `router.push()`

### 4. `/components/dashboard/gig-item-grid.tsx`
**Same changes as gig-item.tsx**

### 5. Create `/lib/gigpack/duplicate-utils.ts` (new file)
**Purpose:** Transform source gig data for duplication

```ts
export function prepareGigForDuplication(sourceGig: GigPack): GigPack
```

Transforms:
- Title → `"Copy of {original}"`
- Clear: `id`, `owner_id`, `public_slug`, `created_at`, `updated_at`
- Clear: `external_calendar_event_id`, `external_calendar_provider`
- Reset: `status` → `"draft"`
- Lineup: Keep roles, clear `gigRoleId`, keep `invitationStatus` as-is (optional: reset to pending)

---

## Implementation Steps

1. **Create `prepareGigForDuplication()` helper** in `/lib/gigpack/duplicate-utils.ts`

2. **Update `/gigs/new/page.tsx`** to:
   - Accept `searchParams` prop
   - Check for `duplicate` param
   - Fetch and transform source gig
   - Pass to wrapper with `isDuplicating={true}` flag

3. **Update `editor-wrapper.tsx`** to:
   - Accept `isDuplicating` prop
   - Pass `isEditing={false}` to panel when duplicating

4. **Update `gig-item.tsx`**:
   - Add `useRouter` import
   - Replace dialog onClick with `router.push(\`/gigs/new?duplicate=${gig.gigId}\`)`
   - Remove: `DuplicateGigDialog` import, `duplicateDialogOpen` state, `useDuplicateGig` hook, dialog JSX

5. **Update `gig-item-grid.tsx`** (same as step 4)

6. **Optional cleanup**: Remove or deprecate `DuplicateGigDialog` component

---

## Key Code Changes

### gig-item.tsx (line ~382)
```tsx
// Before:
<DropdownMenuItem onClick={() => setDuplicateDialogOpen(true)}>
  <Copy className="h-4 w-4 mr-2" />
  Duplicate Gig
</DropdownMenuItem>

// After:
<DropdownMenuItem onClick={() => router.push(`/gigs/new?duplicate=${gig.gigId}`)}>
  <Copy className="h-4 w-4 mr-2" />
  Duplicate Gig
</DropdownMenuItem>
```

### editor-wrapper.tsx
```tsx
// Add prop
interface GigEditorWrapperProps {
  mode?: string;
  gig?: GigPack | null;
  isDuplicating?: boolean;  // NEW
}

// Pass to panel
<GigEditorPanel
  gigPack={gig || undefined}
  isEditing={isDuplicating ? false : !!gig}  // NEW: false when duplicating
  ...
/>
```

---

## Verification

1. **Build check**: `npm run build` - no TypeScript errors
2. **Lint check**: `npm run lint`
3. **Manual test**:
   - Create a gig with lineup, setlist, schedule, materials
   - Click "Duplicate Gig" from quick actions
   - Verify: navigates to `/gigs/new?duplicate=...`
   - Verify: all fields pre-filled (title shows "Copy of...")
   - Verify: can edit any field
   - Verify: saving creates NEW gig (check database)
4. **Edge cases**:
   - Invalid duplicate ID → shows blank form
   - Source gig not found → shows blank form

---

## What's Preserved

- Lineup (roles, musicians, contacts)
- Setlist (sections, items)
- Schedule items
- Materials/files
- Venue, times, notes, branding

## What's Reset/Cleared

- ID (new gig)
- Title (prefixed with "Copy of")
- Status (draft)
- External calendar links
- Timestamps
