-- Create gig_files table for external file links (Google Drive, Dropbox, etc.)
CREATE TABLE IF NOT EXISTS public.gig_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gig_id UUID NOT NULL REFERENCES public.gigs(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  url TEXT NOT NULL,
  type TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Ensure label is not empty
  CONSTRAINT non_empty_label CHECK (length(trim(label)) > 0),
  -- Ensure URL is not empty
  CONSTRAINT non_empty_url CHECK (length(trim(url)) > 0),
  -- Ensure type is valid
  CONSTRAINT valid_file_type CHECK (type IN ('document', 'audio', 'video', 'folder', 'other'))
);

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_gig_files_gig_id ON public.gig_files(gig_id);

-- Enable RLS
ALTER TABLE public.gig_files ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (for idempotency)
DROP POLICY IF EXISTS "Users can view gig files for their gigs" ON public.gig_files;
DROP POLICY IF EXISTS "Users can insert gig files for their gigs" ON public.gig_files;
DROP POLICY IF EXISTS "Users can update gig files for their gigs" ON public.gig_files;
DROP POLICY IF EXISTS "Users can delete gig files for their gigs" ON public.gig_files;

-- RLS Policies: Users can manage gig files for gigs in projects they own

-- SELECT: Users can view gig files for gigs in their projects
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

-- INSERT: Users can add gig files to gigs in their projects
CREATE POLICY "Users can insert gig files for their gigs"
ON public.gig_files
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.gigs
    INNER JOIN public.projects ON gigs.project_id = projects.id
    WHERE gigs.id = gig_files.gig_id
    AND projects.owner_id = auth.uid()
  )
);

-- UPDATE: Users can update gig files for gigs in their projects
CREATE POLICY "Users can update gig files for their gigs"
ON public.gig_files
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.gigs
    INNER JOIN public.projects ON gigs.project_id = projects.id
    WHERE gigs.id = gig_files.gig_id
    AND projects.owner_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.gigs
    INNER JOIN public.projects ON gigs.project_id = projects.id
    WHERE gigs.id = gig_files.gig_id
    AND projects.owner_id = auth.uid()
  )
);

-- DELETE: Users can delete gig files from gigs in their projects
CREATE POLICY "Users can delete gig files for their gigs"
ON public.gig_files
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.gigs
    INNER JOIN public.projects ON gigs.project_id = projects.id
    WHERE gigs.id = gig_files.gig_id
    AND projects.owner_id = auth.uid()
  )
);

-- Create trigger for updated_at
DROP TRIGGER IF EXISTS set_updated_at_gig_files ON public.gig_files;

CREATE TRIGGER set_updated_at_gig_files
  BEFORE UPDATE ON public.gig_files
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

