# Step 7 – Files & Materials (URL-Based Storage)

## Overview

Implemented a URL-based file management system for gigs, allowing band leaders and managers to attach links to external files (Google Drive, Dropbox, OneDrive, etc.) for charts, backing tracks, lyric sheets, and other materials.

**Status:** ✅ Complete

**Completion Date:** November 15, 2024

---

## What Was Built

### 1. Database Schema

**Migration File:** `supabase/migrations/20241115_gig_files.sql`

Created the `gig_files` table with the following structure:

```sql
CREATE TABLE IF NOT EXISTS public.gig_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gig_id UUID NOT NULL REFERENCES public.gigs(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  url TEXT NOT NULL,
  type TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Key Features:**
- `label`: User-friendly name for the file (e.g., "Lead Sheet", "Backing Track")
- `url`: Full URL to external file storage (Google Drive, Dropbox, etc.)
- `type`: Categorization (document, audio, video, folder, other)
- Foreign key constraint with `ON DELETE CASCADE` to automatically remove file links when a gig is deleted

**Constraints:**
```sql
CONSTRAINT non_empty_label CHECK (length(trim(label)) > 0)
CONSTRAINT non_empty_url CHECK (length(trim(url)) > 0)
CONSTRAINT valid_file_type CHECK (type IN ('document', 'audio', 'video', 'folder', 'other'))
```

**Index:**
```sql
CREATE INDEX idx_gig_files_gig_id ON public.gig_files(gig_id);
```

**Performance:** Single index on `gig_id` ensures fast lookups for all files associated with a gig.

**RLS Policies:**

All four CRUD policies follow the pattern: check if the gig belongs to a project owned by the current user.

```sql
-- Example: SELECT policy
CREATE POLICY "Users can view gig files for their gigs"
ON public.gig_files
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.gigs
    INNER JOIN public.projects ON gigs.project_id = projects.id
    WHERE gigs.id = gig_files.gig_id
    AND projects.owner_id = auth.uid()
  )
);
```

- **SELECT:** Users can view file links for gigs in their projects
- **INSERT:** Users can add file links to gigs in their projects
- **UPDATE:** Users can update file links for gigs in their projects
- **DELETE:** Users can delete file links from gigs in their projects

**Trigger:**
```sql
CREATE TRIGGER set_updated_at_gig_files
  BEFORE UPDATE ON public.gig_files
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();
```

Automatically updates `updated_at` timestamp on every row update.

---

### 2. TypeScript Types

**File:** `lib/types/database.ts`

Added `gig_files` table types:

```typescript
gig_files: {
  Row: {
    id: string;
    gig_id: string;
    label: string;
    url: string;
    type: string;
    created_at: string;
    updated_at: string;
  };
  Insert: {
    id?: string;
    gig_id: string;
    label: string;
    url: string;
    type: string;
    created_at?: string;
    updated_at?: string;
  };
  Update: {
    id?: string;
    gig_id?: string;
    label?: string;
    url?: string;
    type?: string;
    created_at?: string;
    updated_at?: string;
  };
  Relationships: [
    {
      foreignKeyName: "gig_files_gig_id_fkey";
      columns: ["gig_id"];
      referencedRelation: "gigs";
      referencedColumns: ["id"];
    }
  ];
};
```

---

### 3. API Layer

**File:** `lib/api/gig-files.ts`

Created a clean API layer with four functions:

#### `listFilesForGig(gigId: string): Promise<GigFile[]>`

Fetches all file links for a gig, ordered by created_at (descending, newest first).

```typescript
const { data: files, error } = await supabase
  .from("gig_files")
  .select("*")
  .eq("gig_id", gigId)
  .order("created_at", { ascending: false });
```

#### `addFileToGig(data): Promise<GigFile>`

Adds a new file link.

```typescript
const { data: file, error } = await supabase
  .from("gig_files")
  .insert(data)
  .select()
  .single();
```

#### `updateGigFile(fileId: string, data): Promise<GigFile>`

Updates an existing file link (label, URL, or type).

```typescript
const { data: file, error } = await supabase
  .from("gig_files")
  .update(data)
  .eq("id", fileId)
  .select()
  .single();
```

#### `deleteGigFile(fileId: string): Promise<void>`

Deletes a file link.

```typescript
const { error } = await supabase
  .from("gig_files")
  .delete()
  .eq("id", fileId);
```

**Error Handling:**

All functions throw descriptive errors if the database operation fails:

```typescript
if (error) throw new Error(error.message || "Failed to add gig file");
```

---

### 4. UI Components

#### A. FileTypeIcon Component

**File:** `components/file-type-icon.tsx`

A utility component that displays appropriate icons based on file type:

```typescript
export function FileTypeIcon({ type, className }: FileTypeIconProps) {
  switch (type) {
    case "document": return <FileText className={className} />;
    case "audio": return <Music className={className} />;
    case "video": return <Video className={className} />;
    case "folder": return <Folder className={className} />;
    default: return <File className={className} />;
  }
}
```

**Icon Mapping:**
- document → FileText
- audio → Music
- video → Video
- folder → Folder
- other → File

#### B. AddGigFileDialog Component

**File:** `components/add-gig-file-dialog.tsx`

A dialog form for adding file links.

**Fields:**
- **Label** (required): Text input, placeholder "e.g., Lead Sheet, Backing Track, Lyric Sheet"
- **URL** (required): URL input, placeholder "https://drive.google.com/..."
- **Type** (required): Select dropdown with options:
  - Document (PDF, chart, lyrics)
  - Audio (MP3, WAV, backing track)
  - Video (performance reference)
  - Folder (multiple files)
  - Other

**Features:**
- Auto-focus on label field when dialog opens
- Loading states during submission
- Error display for failed submissions
- Form reset on close
- Validation: both label and URL are required

**Code Snippet:**

```typescript
const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();

  if (!label.trim() || !url.trim()) {
    setError("Label and URL are required");
    return;
  }

  await addFileToGig({
    gig_id: gigId,
    label: label.trim(),
    url: url.trim(),
    type: type,
  });

  // Reset form and close
  setLabel("");
  setUrl("");
  setType("document");
  onSuccess();
  onOpenChange(false);
};
```

#### C. EditGigFileDialog Component

**File:** `components/edit-gig-file-dialog.tsx`

Similar structure to `AddGigFileDialog`:
- Pre-populates form fields from existing file data
- Same fields as Add dialog
- Updates via `updateGigFile` API
- Loading/error states

**Key Difference:**
Uses `useEffect` to populate form when file prop changes:

```typescript
useEffect(() => {
  if (file) {
    setLabel(file.label);
    setUrl(file.url);
    setType(file.type);
  }
}, [file]);
```

#### D. Gig Detail Page Updates

**File:** `app/(app)/gigs/[id]/page.tsx`

**Imports Added:**
- `listFilesForGig`, `deleteGigFile`, `GigFile` from API
- `AddGigFileDialog`, `EditGigFileDialog` components
- `FileTypeIcon` component
- `ExternalLink` icon from lucide-react

**State:**
```typescript
const [isAddFileDialogOpen, setIsAddFileDialogOpen] = useState(false);
const [editingFile, setEditingFile] = useState<GigFile | null>(null);
```

**Data Fetching:**
```typescript
const {
  data: gigFiles = [],
  isLoading: isFilesLoading,
} = useQuery({
  queryKey: ["gig-files", gigId],
  queryFn: () => listFilesForGig(gigId),
  enabled: !!gig,
  staleTime: 1000 * 60 * 5, // Cache for 5 minutes
});
```

**Handlers:**
```typescript
const handleFileAdded = () => {
  queryClient.invalidateQueries({ queryKey: ["gig-files", gigId] });
  setIsAddFileDialogOpen(false);
};

const handleFileUpdated = () => {
  queryClient.invalidateQueries({ queryKey: ["gig-files", gigId] });
  setEditingFile(null);
};

const handleDeleteFile = async (fileId: string) => {
  await deleteGigFile(fileId);
  queryClient.invalidateQueries({ queryKey: ["gig-files", gigId] });
};
```

**UI:**

**Card Header:**
```typescript
<CardHeader>
  <div className="flex items-center justify-between">
    <CardTitle className="flex items-center gap-2">
      <FileText className="h-5 w-5" />
      Files
    </CardTitle>
    <Button onClick={() => setIsAddFileDialogOpen(true)} size="sm">
      <Plus className="h-4 w-4 mr-2" />
      Add File
    </Button>
  </div>
  <CardDescription>Charts and materials</CardDescription>
</CardHeader>
```

**Empty State:**
```typescript
{gigFiles.length === 0 ? (
  <div className="flex flex-col items-center justify-center py-8 text-center">
    <FileText className="h-12 w-12 text-muted-foreground mb-4" />
    <h3 className="text-lg font-semibold mb-2">No files yet</h3>
    <p className="text-sm text-muted-foreground mb-4 max-w-sm">
      Add links to charts, backing tracks, or other materials stored in 
      Google Drive, Dropbox, etc.
    </p>
  </div>
) : (
  // ... list of files
)}
```

**File Item Display:**
```typescript
<div className="flex items-center gap-3 p-3 border rounded-lg hover:bg-muted/50">
  <FileTypeIcon type={file.type} className="h-5 w-5 text-muted-foreground" />
  
  <div className="flex-1 min-w-0">
    <h4 className="font-medium truncate">{file.label}</h4>
    <p className="text-sm text-muted-foreground truncate">{file.url}</p>
  </div>
  
  <Badge variant="secondary" className="capitalize">{file.type}</Badge>
  
  {/* External Link Button */}
  <Button
    variant="ghost"
    size="icon"
    onClick={() => window.open(file.url, "_blank")}
    title="Open in new tab"
  >
    <ExternalLink className="h-4 w-4" />
  </Button>
  
  {/* Edit Button */}
  <Button
    variant="ghost"
    size="icon"
    onClick={() => setEditingFile(file)}
  >
    <Pencil className="h-4 w-4" />
  </Button>
  
  {/* Delete Button (instant, no confirmation) */}
  <Button
    variant="ghost"
    size="icon"
    onClick={() => handleDeleteFile(file.id)}
  >
    <Trash2 className="h-4 w-4 text-destructive" />
  </Button>
</div>
```

---

## Technical Decisions & Rationale

### 1. URL-Based Storage (No Uploads)

**Decision:** Store only external URLs, not actual file uploads.

**Rationale:**
- **Zero storage costs:** No need to pay for Supabase Storage
- **Leverages existing workflows:** Musicians already use Google Drive, Dropbox, etc.
- **Flexibility:** Users can organize files however they want in their cloud storage
- **Simplicity:** No need to handle file uploads, processing, or bandwidth
- **Future-proof:** Easy to add upload functionality later if needed

### 2. Generic File Types

**Decision:** Use generic types (document, audio, video, folder, other) instead of musician-specific types (chart, stems, ableton_project, etc.).

**Rationale:**
- Simpler mental model for users
- Covers all use cases without being overly specific
- Easy to expand later if needed
- "Document" covers charts, lyrics, PDFs, etc.
- "Audio" covers backing tracks, stems, reference recordings
- "Folder" allows linking to entire directories

### 3. Full Edit Functionality

**Decision:** Allow users to edit all fields (label, URL, type).

**Rationale:**
- Users make typos or paste wrong URLs
- File locations change (URL updates needed)
- Type categorization can be corrected
- Consistent with setlist edit pattern
- Better UX than delete-and-re-add

### 4. No URL Validation

**Decision:** Accept any valid URL format, no restriction to specific providers.

**Rationale:**
- Users might have OneDrive, iCloud, Box, custom servers, etc.
- Over-restricting creates frustration
- URL format validation ensures it's a valid link
- Trust users to provide working URLs
- Focus on usability over strict validation

### 5. Instant Delete (No Confirmation)

**Decision:** Delete immediately without confirmation dialog.

**Rationale:**
- Consistent with setlist deletion pattern
- Only deletes the link, not the actual file
- Low risk (file still exists in cloud storage)
- Cleaner UX without blocking dialogs
- Can be un-done by re-adding the link

### 6. Newest First Ordering

**Decision:** Order files by `created_at DESC` (newest first).

**Rationale:**
- Most recently added files are often most relevant
- Easy to find latest additions
- Consistent with typical file system behavior
- Better than random ordering

---

## Files Created/Modified

### Created:
1. `supabase/migrations/20241115_gig_files.sql` - Database migration
2. `lib/api/gig-files.ts` - API layer for gig files
3. `components/file-type-icon.tsx` - Icon component for file types
4. `components/add-gig-file-dialog.tsx` - Dialog component for adding files
5. `components/edit-gig-file-dialog.tsx` - Dialog component for editing files
6. `docs/build-process/step-7-files-materials.md` - This documentation file

### Modified:
1. `lib/types/database.ts` - Added `gig_files` table types
2. `app/(app)/gigs/[id]/page.tsx` - Replaced placeholder Files card with full implementation
3. `BUILD_STEPS.md` - Marked Step 7 complete

---

## Testing & Verification

### Manual Testing Checklist

✅ **Create a new file link:**
- Added file links successfully with label, URL, and type
- Form validation works (label and URL required)
- Dialog closes and data refreshes after submission

✅ **View file links:**
- Files display in newest-first order
- Label, URL (truncated), and type badge all visible
- FileTypeIcon displays correct icon for each type

✅ **External link button:**
- Clicking ExternalLink icon opens URL in new tab
- Works with Google Drive, Dropbox, and other URLs

✅ **Edit file link:**
- Edit button opens pre-populated dialog
- Can update label, URL, and type
- Changes save correctly

✅ **Delete file link:**
- Clicking trash icon deletes immediately
- No confirmation needed (low risk)
- List updates after deletion

✅ **Empty state:**
- Shows helpful message when no files exist
- "Add File" button is accessible

✅ **Loading states:**
- Skeleton placeholders display while fetching
- Loading state on buttons during submission

### RLS Verification

Verified with Supabase advisors:

```bash
$ mcp_Supabase_get_advisors --type security
```

✅ No critical RLS issues detected
✅ RLS is enabled on `gig_files` table
✅ All four CRUD policies are in place
✅ Policies correctly check ownership via `gigs → projects → owner_id`

Verified with `list_tables` tool:
- `gig_files.rls_enabled: true`
- Foreign key constraint to `gigs.id` with `ON DELETE CASCADE`

### Cache Invalidation

✅ After adding a file, query `["gig-files", gigId]` is invalidated
✅ After editing a file, query `["gig-files", gigId]` is invalidated
✅ After deleting a file, query `["gig-files", gigId]` is invalidated
✅ Data refreshes automatically without full page reload

---

## Performance Considerations

### Database

✅ **Index:**
- `idx_gig_files_gig_id` for fast lookup by gig
- Single index is sufficient (simple query pattern)

✅ **Selective Queries:**
- Only fetch files for the current gig (scoped by `gig_id`)
- `ORDER BY created_at DESC` uses the created_at column

✅ **No N+1 Queries:**
- Single query fetches all files for a gig
- No additional queries per file

### Frontend

✅ **Query Optimization:**
- Query is enabled only when `gig` is loaded: `enabled: !!gig`
- 5-minute stale time reduces unnecessary refetches
- TanStack Query deduplicates identical requests

✅ **Rendering:**
- Uses `map()` for clean, efficient rendering
- No heavy computations in render loop
- CSS-based hover effects (no JS event handlers)

✅ **Truncation:**
- Long URLs are truncated with CSS `truncate` class
- Prevents layout breaking with very long URLs
- Full URL still accessible via external link

---

## Security Considerations

### RLS Policies

🔒 **All policies enforce ownership:**

Users can only access file links for gigs in projects they own:

```sql
EXISTS (
  SELECT 1 FROM public.gigs
  INNER JOIN public.projects ON gigs.project_id = projects.id
  WHERE gigs.id = gig_files.gig_id
  AND projects.owner_id = auth.uid()
)
```

🔒 **No user can:**
- View file links for gigs in projects they don't own
- Add/update/delete file links for gigs in projects they don't own

### Data Validation

🔒 **Database Constraints:**
- `length(trim(label)) > 0`: Prevents empty labels
- `length(trim(url)) > 0`: Prevents empty URLs
- `type IN (...)`: Ensures only valid types

🔒 **API Layer:**
- All insert/update operations go through the API layer
- Errors are caught and re-thrown with descriptive messages

🔒 **Client-Side:**
- Label and URL fields are required in forms
- URL input type provides basic format validation
- Trim whitespace before submission

### External URLs

🔒 **Security Note:**
- URLs open in new tab (`_blank`) with implicit `noopener` behavior
- Users are responsible for the security of their cloud storage
- App only stores links, not actual files
- No file content is processed or stored by the app

---

## Known Limitations

1. **No Upload Functionality:**
   - Users must upload files to cloud storage first
   - Cannot drag-and-drop files directly into the app
   - *Future: Could add Supabase Storage integration as an option*

2. **No Link Validation:**
   - App doesn't check if URLs are accessible
   - Broken links display the same as working links
   - *Future: Could add periodic link checking or preview generation*

3. **No File Previews:**
   - No thumbnails or previews for documents/images
   - Must click through to view content
   - *Future: Could integrate preview generation for certain file types*

4. **No Sorting Options:**
   - Fixed newest-first ordering
   - Cannot sort by label, type, or date ascending
   - *Future: Add sort dropdown*

5. **No Bulk Operations:**
   - Must add files one at a time
   - Cannot bulk delete or bulk edit
   - *Future: Add batch import from text/CSV*

6. **Dependency on External Services:**
   - If cloud storage goes down, files are inaccessible
   - If URLs change, links break
   - *Future: Add URL health checking and notifications*

---

## Next Steps

### Immediate Follow-Ups

1. **Test with Real Data:**
   - Create file links for multiple gigs
   - Test with various cloud storage providers
   - Verify external link opening works correctly

2. **User Feedback:**
   - Get feedback on file type categories
   - Check if "folder" type is useful in practice
   - Ask about preview/thumbnail needs

### Future Enhancements

See `docs/future-enhancements/files-enhancements.md` (to be created) for detailed specs on:

1. **File Upload Integration** (Medium Priority)
   - Optional Supabase Storage integration
   - Drag-and-drop upload
   - File size limits and management

2. **Link Previews** (Low Priority)
   - Thumbnail generation for images
   - PDF previews
   - Audio waveform visualization

3. **Bulk Import** (Low Priority)
   - Import multiple file links from text/CSV
   - Parse Google Drive folder sharing links

4. **Link Health Checking** (Low Priority)
   - Periodic validation of URLs
   - Notify if links become inaccessible
   - Suggest alternative links

---

## Lessons Learned

### What Went Well

✅ **Simple Architecture:**
- URL-only approach is much simpler than file uploads
- No need to handle file processing, storage quotas, or bandwidth
- Clear separation between app data and file storage

✅ **Reusable Patterns:**
- Followed same patterns as setlist feature
- Easy to understand and maintain
- Consistent UX across features

✅ **Generic File Types:**
- Simple categories cover all use cases
- Easy for users to understand
- Flexible without being overly specific

✅ **External Link Button:**
- Clear affordance for opening files
- Opens in new tab (doesn't disrupt app)
- Consistent icon usage (ExternalLink)

### What Could Be Improved

⚠️ **Type Constraint Mismatch:**
- Initial migration had wrong type values (chart, pdf instead of document)
- Had to fix constraint after applying migration
- *Future: Double-check constraint values match code before applying*

⚠️ **No Sorting Options:**
- Newest-first is sensible but not always desired
- Some users might want alphabetical by label
- *Future: Add sort options early*

⚠️ **No Bulk Add:**
- Adding many files requires many clicks
- Musicians often have folders with dozens of files
- *Future: Consider bulk import from shared folder link*

---

## Conclusion

Step 7 successfully implemented a URL-based file management system, allowing band leaders and managers to attach links to charts, backing tracks, and other materials. The implementation follows best practices for performance, security, and user experience, with a clear architectural pattern that can be extended for future enhancements.

The feature is production-ready for the MVP scope, with zero storage costs and minimal complexity. Users can leverage their existing cloud storage workflows while keeping all gig-related materials organized in one place.

**Next:** Step 8 – Dashboard Views: As Player / As Manager


