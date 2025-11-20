# Step 6 – Setlist Basics

## Overview

Implemented the setlist feature for gigs, allowing band leaders and managers to create an ordered list of songs for each gig with musical details (key, BPM, notes).

**Status:** ✅ Complete

**Completion Date:** November 15, 2024

---

## What Was Built

### 1. Database Schema

**Migration File:** `supabase/migrations/20241115_setlist_items.sql`

Created the `setlist_items` table with the following structure:

```sql
CREATE TABLE public.setlist_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gig_id UUID NOT NULL REFERENCES public.gigs(id) ON DELETE CASCADE,
  position INTEGER NOT NULL,
  title TEXT NOT NULL,
  key TEXT,
  bpm INTEGER,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Key Features:**
- `position`: Integer field for ordering songs (must be positive)
- `title`: Song name (required, cannot be empty after trimming)
- `key`: Optional musical key (e.g., "C", "Bb", "E minor")
- `bpm`: Optional beats per minute (must be positive if provided)
- `notes`: Optional free-text notes
- Foreign key constraint with `ON DELETE CASCADE` to automatically remove setlist items when a gig is deleted

**Indexes:**
```sql
CREATE INDEX idx_setlist_items_gig_id ON public.setlist_items(gig_id);
CREATE INDEX idx_setlist_items_gig_position ON public.setlist_items(gig_id, position);
```

**Performance:** The composite index on `(gig_id, position)` ensures fast ordered retrieval of setlist items for any gig.

**RLS Policies:**

All four CRUD policies follow the pattern: check if the gig belongs to a project owned by the current user.

```sql
-- Example: SELECT policy
CREATE POLICY "Users can view setlist items for their gigs"
ON public.setlist_items
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.gigs
    INNER JOIN public.projects ON gigs.project_id = projects.id
    WHERE gigs.id = setlist_items.gig_id
    AND projects.owner_id = auth.uid()
  )
);
```

- **SELECT:** Users can view setlist items for gigs in their projects
- **INSERT:** Users can add setlist items to gigs in their projects
- **UPDATE:** Users can update setlist items for gigs in their projects
- **DELETE:** Users can delete setlist items from gigs in their projects

**Trigger:**
```sql
CREATE TRIGGER set_updated_at_setlist_items
  BEFORE UPDATE ON public.setlist_items
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();
```

Automatically updates `updated_at` timestamp on every row update.

---

### 2. TypeScript Types

**File:** `lib/types/database.ts`

Added `setlist_items` table types:

```typescript
setlist_items: {
  Row: {
    id: string;
    gig_id: string;
    position: number;
    title: string;
    key: string | null;
    bpm: number | null;
    notes: string | null;
    created_at: string;
    updated_at: string;
  };
  Insert: {
    id?: string;
    gig_id: string;
    position: number;
    title: string;
    key?: string | null;
    bpm?: number | null;
    notes?: string | null;
    created_at?: string;
    updated_at?: string;
  };
  Update: {
    id?: string;
    gig_id?: string;
    position?: number;
    title?: string;
    key?: string | null;
    bpm?: number | null;
    notes?: string | null;
    created_at?: string;
    updated_at?: string;
  };
  Relationships: [
    {
      foreignKeyName: "setlist_items_gig_id_fkey";
      columns: ["gig_id"];
      referencedRelation: "gigs";
      referencedColumns: ["id"];
    }
  ];
};
```

---

### 3. API Layer

**File:** `lib/api/setlist-items.ts`

Created a clean API layer with four functions:

#### `listSetlistItemsForGig(gigId: string): Promise<SetlistItem[]>`

Fetches all setlist items for a gig, ordered by position (ascending).

```typescript
const { data: items, error } = await supabase
  .from("setlist_items")
  .select("*")
  .eq("gig_id", gigId)
  .order("position", { ascending: true });
```

#### `addSetlistItem(data): Promise<SetlistItem>`

Adds a new setlist item. If `position` is not provided (or is 0), automatically assigns the next position by finding the max position + 1.

```typescript
// Auto-assign position if not provided
if (!insertData.position) {
  const { data: existingItems } = await supabase
    .from("setlist_items")
    .select("position")
    .eq("gig_id", data.gig_id)
    .order("position", { ascending: false })
    .limit(1);

  const maxPosition = existingItems?.[0]?.position || 0;
  insertData.position = maxPosition + 1;
}
```

#### `updateSetlistItem(itemId: string, data): Promise<SetlistItem>`

Updates an existing setlist item (title, key, BPM, notes, or position).

#### `deleteSetlistItem(itemId: string): Promise<void>`

Deletes a setlist item.

**Error Handling:**

All functions throw descriptive errors if the database operation fails:

```typescript
if (error) throw new Error(error.message || "Failed to add setlist item");
```

---

### 4. UI Components

#### A. AddSetlistItemDialog Component

**File:** `components/add-setlist-item-dialog.tsx`

A dialog form for adding songs to the setlist.

**Fields:**
- **Song Title** (required): Text input with placeholder "e.g., Superstition, I Want You Back"
- **Key** (optional): Text input with placeholder "e.g., C, Bb, E minor"
- **BPM** (optional): Number input with placeholder "e.g., 120"
- **Notes** (optional): Textarea for free-text notes

**Features:**
- Auto-focus on title field when dialog opens
- Loading states during submission
- Error display for failed submissions
- Form reset on close
- Validation: title is required and must not be empty

**Code Snippet:**

```typescript
const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();

  if (!title.trim()) {
    setError("Song title is required");
    return;
  }

  await addSetlistItem({
    gig_id: gigId,
    position: 0, // Will be auto-assigned
    title: title.trim(),
    key: key.trim() || null,
    bpm: bpm ? parseInt(bpm, 10) : null,
    notes: notes.trim() || null,
  });

  // Reset form and close
  setTitle("");
  setKey("");
  setBpm("");
  setNotes("");
  onSuccess();
  onOpenChange(false);
};
```

#### B. Gig Detail Page Updates

**File:** `app/(app)/gigs/[id]/page.tsx`

Replaced the placeholder "Setlist" card with a fully functional implementation.

**Changes:**

1. **Imports:**
   - Added `listSetlistItemsForGig` and `deleteSetlistItem` from API
   - Added `AddSetlistItemDialog` component

2. **State:**
   - `isAddSetlistItemDialogOpen`: Controls dialog visibility
   - `setlistItemIdPendingDelete`: Tracks which item is pending deletion for inline confirmation

3. **Data Fetching:**
   ```typescript
   const {
     data: setlistItems = [],
     isLoading: isSetlistLoading,
   } = useQuery({
     queryKey: ["setlist-items", gigId],
     queryFn: () => listSetlistItemsForGig(gigId),
     enabled: !!gig,
     staleTime: 1000 * 60 * 5, // Cache for 5 minutes
   });
   ```

4. **Handlers:**
   ```typescript
   const handleSetlistItemAdded = () => {
     queryClient.invalidateQueries({ queryKey: ["setlist-items", gigId] });
     setIsAddSetlistItemDialogOpen(false);
   };

   const handleDeleteSetlistItem = async (itemId: string) => {
     await deleteSetlistItem(itemId);
     queryClient.invalidateQueries({ queryKey: ["setlist-items", gigId] });
     setSetlistItemIdPendingDelete(null);
   };
   ```

5. **UI:**

**Card Header:**
```typescript
<CardHeader>
  <div className="flex items-center justify-between">
    <CardTitle className="flex items-center gap-2">
      <Music className="h-5 w-5" />
      Setlist
    </CardTitle>
    <Button 
      onClick={() => setIsAddSetlistItemDialogOpen(true)}
      size="sm"
    >
      <Plus className="h-4 w-4 mr-2" />
      Add Song
    </Button>
  </div>
  <CardDescription>Songs and order</CardDescription>
</CardHeader>
```

**Empty State:**
```typescript
{setlistItems.length === 0 ? (
  <div className="flex flex-col items-center justify-center py-8 text-center">
    <Music className="h-12 w-12 text-muted-foreground mb-4" />
    <h3 className="text-lg font-semibold mb-2">No songs yet</h3>
    <p className="text-sm text-muted-foreground mb-4 max-w-sm">
      Add songs to create your setlist
    </p>
  </div>
) : (
  // ... list of songs
)}
```

**Song Item Display:**
```typescript
<div className="flex items-start gap-4 p-4 border rounded-lg hover:bg-muted/50 transition-colors">
  <div className="text-muted-foreground font-mono text-sm font-semibold min-w-[24px]">
    #{item.position}
  </div>
  <div className="flex-1 min-w-0">
    <h4 className="font-medium truncate">{item.title}</h4>
    <div className="flex gap-4 text-sm text-muted-foreground mt-1 flex-wrap">
      {item.key && <span>Key: {item.key}</span>}
      {item.bpm && <span>BPM: {item.bpm}</span>}
    </div>
    {item.notes && (
      <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
        {item.notes}
      </p>
    )}
  </div>
  {/* Delete button with inline confirmation */}
</div>
```

**Inline Delete Confirmation:**

Used the same pattern as gig roles (trash icon → check + X icons):

```typescript
<div className="relative w-[72px] h-10 flex-shrink-0">
  {setlistItemIdPendingDelete === item.id ? (
    <div className="absolute inset-0 flex items-center gap-0">
      <Button
        variant="ghost"
        size="icon"
        onClick={() => handleDeleteSetlistItem(item.id)}
        className="h-9 w-9"
      >
        <Check className="h-4 w-4 text-green-600" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setSetlistItemIdPendingDelete(null)}
        className="h-9 w-9"
      >
        <X className="h-4 w-4" />
      </Button>
    </div>
  ) : (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => handleDeleteSetlistClick(item.id)}
      className="h-10 w-10"
    >
      <Trash2 className="h-4 w-4 text-destructive" />
    </Button>
  )}
</div>
```

---

## Technical Decisions & Rationale

### 1. Auto-Position Assignment

**Decision:** When `position` is not provided (or is 0), automatically assign the next position.

**Rationale:**
- Simplifies the UI - no need to manually specify position when adding songs
- Songs are appended to the end by default
- Still allows manual position specification for advanced use cases

### 2. Inline Delete Confirmation

**Decision:** Use inline confirmation (trash → check + X) instead of native `confirm()` popups.

**Rationale:**
- Consistent with the existing UX pattern established in Step 5 (gig roles)
- Less intrusive than screen-blocking native popups
- Better user experience on mobile and touch devices
- More visually integrated with the design

### 3. Query Key Strategy

**Decision:** Use `["setlist-items", gigId]` as the query key (no user ID).

**Rationale:**
- Setlist items are scoped by gig ID, not user ID
- RLS policies handle security at the database level
- Simpler cache management
- Consistent with the gig-roles pattern

### 4. Stale Time

**Decision:** Set `staleTime: 1000 * 60 * 5` (5 minutes) for setlist items query.

**Rationale:**
- Setlists don't change as frequently as other data
- Reduces unnecessary refetches
- Still provides reasonably fresh data
- Can be manually invalidated after mutations

### 5. Database Constraints

**Decision:** Added constraints for `position > 0`, `bpm > 0 OR NULL`, and `title` not empty.

**Rationale:**
- Prevents invalid data at the database level
- Provides clear error messages if validation fails
- Ensures data integrity even if client-side validation is bypassed

---

## Files Created/Modified

### Created:
1. `supabase/migrations/20241115_setlist_items.sql` - Database migration
2. `lib/api/setlist-items.ts` - API layer for setlist items
3. `components/add-setlist-item-dialog.tsx` - Dialog component for adding songs
4. `docs/future-enhancements/setlist-enhancements.md` - Future enhancement specs
5. `docs/build-process/step-6-setlist-basics.md` - This documentation file

### Modified:
1. `lib/types/database.ts` - Added `setlist_items` table types
2. `app/(app)/gigs/[id]/page.tsx` - Replaced placeholder setlist card with functional implementation
3. `docs/future-enhancements/README.md` - Added setlist enhancements to the index

---

## Testing & Verification

### Manual Testing Checklist

✅ Create a new setlist item for a gig
- Added songs successfully with auto-position assignment
- Form validation works (title is required)
- Dialog closes and data refreshes after submission

✅ View setlist items in correct order
- Items display in ascending order by position
- Position numbers are visible (e.g., #1, #2, #3)

✅ Display song details
- Title, key, and BPM display correctly
- Notes are truncated with `line-clamp-2` for long text
- Empty fields are gracefully hidden (no "Key: null")

✅ Delete setlist items with inline confirmation
- Clicking trash icon shows check + X icons
- Clicking check deletes the item
- Clicking X cancels the deletion
- No layout shift during confirmation state

✅ Empty state displays correctly
- Shows music icon, heading, and description
- "Add Song" button is accessible

✅ Loading states work properly
- Skeleton placeholders display while fetching
- Loading state on "Adding..." button during submission

### RLS Verification

Checked database advisors for security issues:

```bash
$ mcp_Supabase_get_advisors --type security
```

✅ No critical RLS issues detected
✅ RLS is enabled on `setlist_items` table
✅ All four CRUD policies are in place
✅ Policies correctly check ownership via `gigs → projects → owner_id`

Verified with `list_tables` tool:
- `setlist_items.rls_enabled: true`
- Foreign key constraint to `gigs.id` with `ON DELETE CASCADE`

### Cache Invalidation

✅ After adding a song, query `["setlist-items", gigId]` is invalidated
✅ After deleting a song, query `["setlist-items", gigId]` is invalidated
✅ Data refreshes automatically without full page reload

---

## Performance Considerations

### Database

✅ **Indexes:**
- `idx_setlist_items_gig_id` for fast lookup by gig
- `idx_setlist_items_gig_position` (composite) for ordered retrieval

✅ **Selective Queries:**
- Only fetch setlist items for the current gig (scoped by `gig_id`)
- `ORDER BY position ASC` uses the composite index

✅ **No N+1 Queries:**
- Single query fetches all setlist items for a gig
- No additional queries per item

### Frontend

✅ **Query Optimization:**
- Query is enabled only when `gig` is loaded: `enabled: !!gig`
- 5-minute stale time reduces unnecessary refetches
- TanStack Query deduplicates identical requests

✅ **Rendering:**
- Uses `map()` for clean, efficient rendering
- No heavy computations in render loop
- CSS-based hover effects (no JS event handlers)

✅ **Layout Shifts:**
- Fixed-width container for delete buttons prevents layout shift
- Absolute positioning for confirmation buttons

---

## Security Considerations

### RLS Policies

🔒 **All policies enforce ownership:**

Users can only access setlist items for gigs in projects they own:

```sql
EXISTS (
  SELECT 1 FROM public.gigs
  INNER JOIN public.projects ON gigs.project_id = projects.id
  WHERE gigs.id = setlist_items.gig_id
  AND projects.owner_id = auth.uid()
)
```

🔒 **No user can:**
- View setlist items for gigs in projects they don't own
- Add/update/delete setlist items for gigs in projects they don't own

### Data Validation

🔒 **Database Constraints:**
- `position > 0`: Prevents negative or zero positions
- `bpm IS NULL OR bpm > 0`: Prevents negative BPM
- `length(trim(title)) > 0`: Prevents empty song titles

🔒 **API Layer:**
- All insert/update operations go through the API layer
- Errors are caught and re-thrown with descriptive messages

🔒 **Client-Side:**
- Title field is required in the form
- Number inputs have `min="1"` for BPM
- Trim whitespace before submission

---

## Known Limitations

1. **No Drag-and-Drop Reordering:**
   - Users cannot visually reorder songs by dragging
   - Manual position editing not yet implemented
   - *Planned for future enhancement*

2. **No Song Library:**
   - Every song must be manually entered
   - No autocomplete from previous setlists
   - *Planned for future enhancement*

3. **No Bulk Import:**
   - Cannot paste a text list or import from CSV
   - *Planned for future enhancement*

4. **No Set Sections:**
   - Cannot group songs into sections (Set 1, Set 2, Encore)
   - *Planned for future enhancement*

5. **No Edit Functionality:**
   - Users cannot edit song details after creation
   - Must delete and re-add to change information
   - *To be added in Step 6.5 or as part of future iteration*

---

## Next Steps

### Immediate Follow-Ups

1. **Add Edit Functionality:**
   - Create `EditSetlistItemDialog` component
   - Add edit button (pencil icon) next to delete button
   - Use `updateSetlistItem` API function

2. **Testing with Real Data:**
   - Create setlists for multiple gigs
   - Test with 20-30 songs per setlist
   - Verify performance with larger datasets

### Future Enhancements

See `docs/future-enhancements/setlist-enhancements.md` for detailed specs on:

1. **Drag-and-Drop Reordering** (High Priority)
2. **Song Library / Templates** (High Priority)
3. **Bulk Import from Text/CSV** (Medium Priority)
4. **Set Sections** (Medium Priority)
5. **Duplicate Song Detection** (Low Priority)
6. **Music Notation Integration** (Low Priority)

---

## Lessons Learned

### What Went Well

✅ **Clean Architecture:**
- Clear separation between database, API, and UI layers
- Easy to understand and maintain
- Consistent patterns with gig roles implementation

✅ **Performance First:**
- Proper indexing from the start
- Efficient queries with minimal data transfer
- Good caching strategy

✅ **UX Consistency:**
- Inline delete confirmation matches existing patterns
- Empty states are informative and actionable
- Loading states prevent confusion

### What Could Be Improved

⚠️ **Initial Testing Friction:**
- Docker Desktop was not running during local migration testing
- Had to use Supabase MCP tools instead of local `supabase db reset`
- *Future: Check Docker status before attempting migrations*

⚠️ **Function Naming:**
- Used `handle_updated_at()` instead of `update_updated_at_column()`
- Had to fix the migration after initial error
- *Future: Reference existing migrations for function names*

---

## Conclusion

Step 6 successfully implemented the basic setlist feature, providing band leaders and managers with a structured way to manage songs for each gig. The implementation follows best practices for performance, security, and user experience, with clear patterns that can be extended for future enhancements.

The feature is production-ready for the MVP scope, with a solid foundation for advanced features like drag-and-drop reordering and song libraries.

**Next:** Step 7 – Files & Materials

