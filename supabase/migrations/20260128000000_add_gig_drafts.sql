-- ============================================================================
-- Gig Drafts Table
-- Allows users to save gig drafts to the database for cross-device access.
-- ============================================================================

-- Create gig_drafts table
CREATE TABLE IF NOT EXISTS public.gig_drafts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT,  -- Optional title for easy identification
  form_data JSONB NOT NULL,  -- All the form data as JSON
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Add comment for documentation
COMMENT ON TABLE public.gig_drafts IS 'Stores gig creation drafts for users to resume later';
COMMENT ON COLUMN public.gig_drafts.form_data IS 'JSON blob containing all gig form fields';

-- Enable RLS
ALTER TABLE public.gig_drafts ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only access their own drafts
CREATE POLICY "Users can manage own drafts"
  ON public.gig_drafts
  FOR ALL
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

-- Index for listing user's drafts efficiently
CREATE INDEX idx_gig_drafts_owner ON public.gig_drafts(owner_id, updated_at DESC);

-- Update trigger for updated_at
CREATE OR REPLACE FUNCTION update_gig_draft_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER gig_drafts_updated_at
  BEFORE UPDATE ON public.gig_drafts
  FOR EACH ROW
  EXECUTE FUNCTION update_gig_draft_updated_at();
