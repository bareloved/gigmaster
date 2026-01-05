-- Add gig_readiness table for per-musician gig preparation tracking
-- Part of Artistry Dashboard Phase 2 - Task 2A

-- Create gig_readiness table
CREATE TABLE IF NOT EXISTS public.gig_readiness (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gig_id UUID NOT NULL REFERENCES public.gigs(id) ON DELETE CASCADE,
  musician_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  
  -- Song learning progress
  songs_total INTEGER NOT NULL DEFAULT 0,
  songs_learned INTEGER NOT NULL DEFAULT 0,
  
  -- Preparation checklist items
  charts_ready BOOLEAN NOT NULL DEFAULT false,
  sounds_ready BOOLEAN NOT NULL DEFAULT false,
  travel_checked BOOLEAN NOT NULL DEFAULT false,
  gear_packed BOOLEAN NOT NULL DEFAULT false,
  
  -- Notes (optional, for future use)
  notes TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  
  -- Each user can only have one readiness record per gig
  CONSTRAINT unique_gig_musician UNIQUE(gig_id, musician_id)
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_gig_readiness_gig_id ON public.gig_readiness(gig_id);
CREATE INDEX IF NOT EXISTS idx_gig_readiness_musician_id ON public.gig_readiness(musician_id);
CREATE INDEX IF NOT EXISTS idx_gig_readiness_gig_musician ON public.gig_readiness(gig_id, musician_id);

-- Enable Row Level Security
ALTER TABLE public.gig_readiness ENABLE ROW LEVEL SECURITY;

-- RLS Policies for gig_readiness

-- Users can view their own readiness records
CREATE POLICY "Users can view own readiness"
  ON public.gig_readiness
  FOR SELECT
  USING (auth.uid() = musician_id);

-- Gig managers can view readiness for all musicians on their gigs
CREATE POLICY "Managers can view gig readiness"
  ON public.gig_readiness
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.gigs
      JOIN public.projects ON projects.id = gigs.project_id
      WHERE gigs.id = gig_readiness.gig_id
      AND projects.owner_id = auth.uid()
    )
  );

-- Users can insert their own readiness records
CREATE POLICY "Users can insert own readiness"
  ON public.gig_readiness
  FOR INSERT
  WITH CHECK (auth.uid() = musician_id);

-- Users can update their own readiness records
CREATE POLICY "Users can update own readiness"
  ON public.gig_readiness
  FOR UPDATE
  USING (auth.uid() = musician_id);

-- Users can delete their own readiness records
CREATE POLICY "Users can delete own readiness"
  ON public.gig_readiness
  FOR DELETE
  USING (auth.uid() = musician_id);

-- Add trigger to update updated_at timestamp
CREATE TRIGGER set_updated_at_gig_readiness
  BEFORE UPDATE ON public.gig_readiness
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Add comments for documentation
COMMENT ON TABLE public.gig_readiness IS 'Tracks individual musician preparation status for gigs';
COMMENT ON COLUMN public.gig_readiness.songs_total IS 'Total number of songs in the setlist';
COMMENT ON COLUMN public.gig_readiness.songs_learned IS 'Number of songs the musician has learned';
COMMENT ON COLUMN public.gig_readiness.charts_ready IS 'Whether musician has all charts/sheet music';
COMMENT ON COLUMN public.gig_readiness.sounds_ready IS 'Whether sounds/patches are programmed in rig';
COMMENT ON COLUMN public.gig_readiness.travel_checked IS 'Whether travel plan has been checked';
COMMENT ON COLUMN public.gig_readiness.gear_packed IS 'Whether gear is packed and ready';

