-- Add setlist_learning_status table for per-musician song learning tracking
-- Part of Artistry Dashboard Phase 2 - Task 2B: Practice Focus

-- Create setlist_learning_status table
CREATE TABLE IF NOT EXISTS public.setlist_learning_status (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  setlist_item_id UUID NOT NULL REFERENCES public.setlist_items(id) ON DELETE CASCADE,
  musician_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  
  -- Learning status
  learned BOOLEAN NOT NULL DEFAULT false,
  
  -- Practice tracking
  last_practiced_at TIMESTAMPTZ,
  practice_count INTEGER NOT NULL DEFAULT 0,
  
  -- Difficulty & priority
  difficulty TEXT CHECK (difficulty IN ('easy', 'medium', 'hard')),
  priority TEXT CHECK (priority IN ('low', 'medium', 'high')) DEFAULT 'medium',
  
  -- Notes
  notes TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  
  -- Each musician can only have one learning status per setlist item
  CONSTRAINT unique_setlist_musician UNIQUE(setlist_item_id, musician_id)
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_setlist_learning_setlist_item_id ON public.setlist_learning_status(setlist_item_id);
CREATE INDEX IF NOT EXISTS idx_setlist_learning_musician_id ON public.setlist_learning_status(musician_id);
CREATE INDEX IF NOT EXISTS idx_setlist_learning_learned ON public.setlist_learning_status(learned);
CREATE INDEX IF NOT EXISTS idx_setlist_learning_musician_learned ON public.setlist_learning_status(musician_id, learned);

-- Enable Row Level Security
ALTER TABLE public.setlist_learning_status ENABLE ROW LEVEL SECURITY;

-- RLS Policies for setlist_learning_status

-- Musicians can view their own learning status
CREATE POLICY "Musicians can view own learning status"
  ON public.setlist_learning_status
  FOR SELECT
  USING (auth.uid() = musician_id);

-- Gig managers can view learning status for their gigs' setlists
CREATE POLICY "Managers can view gig learning status"
  ON public.setlist_learning_status
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.setlist_items
      JOIN public.gigs ON gigs.id = setlist_items.gig_id
      JOIN public.projects ON projects.id = gigs.project_id
      WHERE setlist_items.id = setlist_learning_status.setlist_item_id
      AND projects.owner_id = auth.uid()
    )
  );

-- Musicians can insert their own learning status
CREATE POLICY "Musicians can insert own learning status"
  ON public.setlist_learning_status
  FOR INSERT
  WITH CHECK (auth.uid() = musician_id);

-- Musicians can update their own learning status
CREATE POLICY "Musicians can update own learning status"
  ON public.setlist_learning_status
  FOR UPDATE
  USING (auth.uid() = musician_id);

-- Musicians can delete their own learning status
CREATE POLICY "Musicians can delete own learning status"
  ON public.setlist_learning_status
  FOR DELETE
  USING (auth.uid() = musician_id);

-- Add trigger to update updated_at timestamp
CREATE TRIGGER set_updated_at_setlist_learning_status
  BEFORE UPDATE ON public.setlist_learning_status
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Add comments for documentation
COMMENT ON TABLE public.setlist_learning_status IS 'Tracks individual musician learning status for setlist items';
COMMENT ON COLUMN public.setlist_learning_status.learned IS 'Whether the musician has learned this song';
COMMENT ON COLUMN public.setlist_learning_status.last_practiced_at IS 'Last time the musician practiced this song';
COMMENT ON COLUMN public.setlist_learning_status.practice_count IS 'Number of times the musician has practiced this song';
COMMENT ON COLUMN public.setlist_learning_status.difficulty IS 'Musician''s perceived difficulty: easy, medium, hard';
COMMENT ON COLUMN public.setlist_learning_status.priority IS 'Practice priority: low, medium, high';
COMMENT ON COLUMN public.setlist_learning_status.notes IS 'Personal practice notes for the musician';

