-- Create setlist_items table for ordered songs in gigs
CREATE TABLE IF NOT EXISTS public.setlist_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gig_id UUID NOT NULL REFERENCES public.gigs(id) ON DELETE CASCADE,
  position INTEGER NOT NULL,
  title TEXT NOT NULL,
  key TEXT,
  bpm INTEGER,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Ensure position is positive
  CONSTRAINT positive_position CHECK (position > 0),
  -- Ensure BPM is positive if provided
  CONSTRAINT positive_bpm CHECK (bpm IS NULL OR bpm > 0),
  -- Ensure title is not empty
  CONSTRAINT non_empty_title CHECK (length(trim(title)) > 0)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_setlist_items_gig_id ON public.setlist_items(gig_id);
CREATE INDEX IF NOT EXISTS idx_setlist_items_gig_position ON public.setlist_items(gig_id, position);

-- Enable RLS
ALTER TABLE public.setlist_items ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (for idempotency)
DROP POLICY IF EXISTS "Users can view setlist items for their gigs" ON public.setlist_items;
DROP POLICY IF EXISTS "Users can insert setlist items for their gigs" ON public.setlist_items;
DROP POLICY IF EXISTS "Users can update setlist items for their gigs" ON public.setlist_items;
DROP POLICY IF EXISTS "Users can delete setlist items for their gigs" ON public.setlist_items;

-- RLS Policies: Users can manage setlist items for gigs in projects they own

-- SELECT: Users can view setlist items for gigs in their projects
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

-- INSERT: Users can add setlist items to gigs in their projects
CREATE POLICY "Users can insert setlist items for their gigs"
ON public.setlist_items
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.gigs
    INNER JOIN public.projects ON gigs.project_id = projects.id
    WHERE gigs.id = setlist_items.gig_id
    AND projects.owner_id = auth.uid()
  )
);

-- UPDATE: Users can update setlist items for gigs in their projects
CREATE POLICY "Users can update setlist items for their gigs"
ON public.setlist_items
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.gigs
    INNER JOIN public.projects ON gigs.project_id = projects.id
    WHERE gigs.id = setlist_items.gig_id
    AND projects.owner_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.gigs
    INNER JOIN public.projects ON gigs.project_id = projects.id
    WHERE gigs.id = setlist_items.gig_id
    AND projects.owner_id = auth.uid()
  )
);

-- DELETE: Users can delete setlist items from gigs in their projects
CREATE POLICY "Users can delete setlist items for their gigs"
ON public.setlist_items
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.gigs
    INNER JOIN public.projects ON gigs.project_id = projects.id
    WHERE gigs.id = setlist_items.gig_id
    AND projects.owner_id = auth.uid()
  )
);

-- Create trigger for updated_at
DROP TRIGGER IF EXISTS set_updated_at_setlist_items ON public.setlist_items;

CREATE TRIGGER set_updated_at_setlist_items
  BEFORE UPDATE ON public.setlist_items
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

