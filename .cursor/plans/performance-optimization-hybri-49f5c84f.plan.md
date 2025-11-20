<!-- 49f5c84f-bd45-4dfc-bac1-badea8ccc03e 4f2e393e-71da-4c75-b30c-a6fdf4fdaf42 -->
# Step 7 – Files & Materials (URL-Based)

## Overview

Add the ability to attach links to external files (Google Drive, Dropbox, OneDrive, etc.) to each gig. This provides organized access to charts, audio references, stems, and other materials without incurring storage costs.

## Database Schema

### Create `gig_files` table

**Migration:** `supabase/migrations/YYYYMMDD_gig_files.sql`

```sql
CREATE TABLE public.gig_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gig_id UUID NOT NULL REFERENCES public.gigs(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  url TEXT NOT NULL,
  type TEXT NOT NULL, -- 'chart' | 'audio' | 'video' | 'pdf' | 'folder' | 'other'
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Indexes
CREATE INDEX idx_gig_files_gig_id ON public.gig_files(gig_id);

-- RLS Policies (same pattern as setlist_items)
ALTER TABLE public.gig_files ENABLE ROW LEVEL SECURITY;

-- Users can view files for gigs in their projects
CREATE POLICY "Users can view gig files for their projects"
  ON public.gig_files FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.gigs
      JOIN public.projects ON gigs.project_id = projects.id
      WHERE gigs.id = gig_files.gig_id
      AND projects.owner_id = auth.uid()
    )
  );

-- Users can add files to gigs in their projects
CREATE POLICY "Users can add gig files to their projects"
  ON public.gig_files FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.gigs
      JOIN public.projects ON gigs.project_id = projects.id
      WHERE gigs.id = gig_files.gig_id
      AND projects.owner_id = auth.uid()
    )
  );

-- Update and Delete policies...
```

**Fields:**

- `label`: User-friendly name (e.g., "Lead Sheet - Superstition")
- `url`: Full URL to Google Drive, Dropbox, OneDrive, etc.
- `type`: Category for icon display (chart, audio, video, pdf, folder, other)

## API Layer

**File:** `lib/api/gig-files.ts`

Functions to implement:

- `listFilesForGig(gigId: string): Promise<GigFile[]>`
- `addFileToGig(data: GigFileInsert): Promise<GigFile>`
- `deleteFile(fileId: string): Promise<void>`

## UI Components

### 1. AddFileDialog Component

**File:** `components/add-file-dialog.tsx`

**Fields:**

- Label (required): Text input - "e.g., Lead Sheet - Superstition"
- URL (required): Text input - "Paste Google Drive / Dropbox link"
- Type (required): Select dropdown - Chart, Audio, Video, PDF, Folder, Other

**Features:**

- URL validation (basic check for http/https)
- Auto-detect file type from URL if possible
- Helper text: "Tip: Use shareable links from Google Drive or Dropbox"

### 2. Gig Detail Page Integration

**File:** `app/(app)/gigs/[id]/page.tsx`

**Replace Files placeholder card with:**

- Header with "Add File" button
- List of files with:
  - Icon based on type (FileText, Music, Video, File, Folder)
  - Label (truncated if long)
  - External link icon to open in new tab
  - Delete button (trash icon)
- Empty state: "No files yet. Add charts, audio references, or other materials."

**Layout:**

```
┌──────────────────────────────────────┐
│ 📁 Files                    [+ Add]  │
├──────────────────────────────────────┤
│ 📄 Lead Sheet - Superstition    🗑   │
│ 🎵 Reference Track - Drum Break  🗑   │
│ 📁 Charts Folder                 🗑   │
└──────────────────────────────────────┘
```

## Implementation Steps

1. **Database Migration** - Create gig_files table with RLS
2. **TypeScript Types** - Add to database.ts
3. **API Functions** - Create gig-files.ts with CRUD
4. **AddFileDialog** - Form component for adding file links
5. **UI Integration** - Replace placeholder in gig detail page
6. **Testing** - Verify with Google Drive/Dropbox links

## Future Enhancements (Not in this step)

Document in future enhancements file:

- Supabase Storage integration for actual file uploads
- Link preview/metadata fetching
- Automatic file type detection from URL
- Drag-and-drop link pasting
- Bulk import from folder link

### To-dos

- [x] Create gig_files table migration with RLS policies
- [ ] Add gig_files types to database.ts