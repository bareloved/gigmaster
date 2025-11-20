-- Create gig_roles table
CREATE TABLE IF NOT EXISTS public.gig_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gig_id UUID NOT NULL REFERENCES public.gigs(id) ON DELETE CASCADE,
  role_name TEXT NOT NULL,
  musician_name TEXT,
  musician_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  invitation_status TEXT NOT NULL DEFAULT 'invited',
  agreed_fee NUMERIC(10, 2),
  is_paid BOOLEAN DEFAULT FALSE,
  paid_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes for common queries
CREATE INDEX IF NOT EXISTS idx_gig_roles_gig_id ON public.gig_roles(gig_id);
CREATE INDEX IF NOT EXISTS idx_gig_roles_musician_id ON public.gig_roles(musician_id);
CREATE INDEX IF NOT EXISTS idx_gig_roles_status ON public.gig_roles(invitation_status);

-- Enable RLS
ALTER TABLE public.gig_roles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view gig roles for their projects" ON public.gig_roles;
DROP POLICY IF EXISTS "Users can insert gig roles for their projects" ON public.gig_roles;
DROP POLICY IF EXISTS "Users can update gig roles for their projects" ON public.gig_roles;
DROP POLICY IF EXISTS "Users can delete gig roles for their projects" ON public.gig_roles;

-- RLS Policy: Users can view roles for gigs they own
CREATE POLICY "Users can view gig roles for their projects"
  ON public.gig_roles
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.gigs
      INNER JOIN public.projects ON gigs.project_id = projects.id
      WHERE gigs.id = gig_roles.gig_id
      AND projects.owner_id = auth.uid()
    )
  );

-- RLS Policy: Users can insert roles for gigs they own
CREATE POLICY "Users can insert gig roles for their projects"
  ON public.gig_roles
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.gigs
      INNER JOIN public.projects ON gigs.project_id = projects.id
      WHERE gigs.id = gig_roles.gig_id
      AND projects.owner_id = auth.uid()
    )
  );

-- RLS Policy: Users can update roles for gigs they own
CREATE POLICY "Users can update gig roles for their projects"
  ON public.gig_roles
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.gigs
      INNER JOIN public.projects ON gigs.project_id = projects.id
      WHERE gigs.id = gig_roles.gig_id
      AND projects.owner_id = auth.uid()
    )
  );

-- RLS Policy: Users can delete roles for gigs they own
CREATE POLICY "Users can delete gig roles for their projects"
  ON public.gig_roles
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.gigs
      INNER JOIN public.projects ON gigs.project_id = projects.id
      WHERE gigs.id = gig_roles.gig_id
      AND projects.owner_id = auth.uid()
    )
  );

-- Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_gig_roles_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS update_gig_roles_updated_at ON public.gig_roles;

CREATE TRIGGER update_gig_roles_updated_at
  BEFORE UPDATE ON public.gig_roles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_gig_roles_updated_at();

