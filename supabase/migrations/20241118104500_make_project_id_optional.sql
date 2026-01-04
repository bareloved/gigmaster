-- Make project_id optional in gigs table
-- Allow gigs to exist without projects

-- Make project_id nullable
ALTER TABLE gigs ALTER COLUMN project_id DROP NOT NULL;

-- Update RLS policies to handle standalone gigs
-- Drop existing policy and recreate with NULL handling
DROP POLICY IF EXISTS "Users can view gigs they have access to" ON gigs;

-- Users can view gigs if:
-- 1. They own the project (if project exists)
-- 2. They are assigned to the gig as a player
-- 3. It's a standalone gig they created (via gig_roles)
CREATE POLICY "Users can view gigs they have access to" ON gigs
  FOR SELECT
  USING (
    -- Gigs in projects they own
    (project_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = gigs.project_id
      AND projects.owner_id = auth.uid()
    ))
    OR
    -- Gigs they're assigned to (as player)
    EXISTS (
      SELECT 1 FROM gig_roles
      WHERE gig_roles.gig_id = gigs.id
      AND gig_roles.musician_id = auth.uid()
    )
    OR
    -- Standalone gigs they created (need to track creator)
    -- For now, allow if they have any role on the gig
    (project_id IS NULL AND EXISTS (
      SELECT 1 FROM gig_roles
      WHERE gig_roles.gig_id = gigs.id
      AND gig_roles.musician_id = auth.uid()
    ))
  );

-- Update insert policy to allow creating standalone gigs
DROP POLICY IF EXISTS "Users can create gigs in their projects" ON gigs;

CREATE POLICY "Users can create gigs in their projects or standalone" ON gigs
  FOR INSERT
  WITH CHECK (
    -- Can create in projects they own
    (project_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = gigs.project_id
      AND projects.owner_id = auth.uid()
    ))
    OR
    -- Can create standalone gigs (no project)
    project_id IS NULL
  );

-- Update update policy
DROP POLICY IF EXISTS "Users can update gigs in their projects" ON gigs;

CREATE POLICY "Users can update gigs in their projects or standalone" ON gigs
  FOR UPDATE
  USING (
    -- Can update gigs in projects they own
    (project_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = gigs.project_id
      AND projects.owner_id = auth.uid()
    ))
    OR
    -- Can update standalone gigs they have access to
    (project_id IS NULL AND EXISTS (
      SELECT 1 FROM gig_roles
      WHERE gig_roles.gig_id = gigs.id
      AND gig_roles.musician_id = auth.uid()
    ))
  );

-- Update delete policy
DROP POLICY IF EXISTS "Users can delete gigs in their projects" ON gigs;

CREATE POLICY "Users can delete gigs in their projects or standalone" ON gigs
  FOR DELETE
  USING (
    -- Can delete gigs in projects they own
    (project_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = gigs.project_id
      AND projects.owner_id = auth.uid()
    ))
    OR
    -- Can delete standalone gigs they created
    (project_id IS NULL AND EXISTS (
      SELECT 1 FROM gig_roles
      WHERE gig_roles.gig_id = gigs.id
      AND gig_roles.musician_id = auth.uid()
    ))
  );

-- Add index for querying standalone gigs
CREATE INDEX idx_gigs_null_project ON gigs (project_id) WHERE project_id IS NULL;

-- Comment
COMMENT ON COLUMN gigs.project_id IS 'Optional project ID. NULL for standalone gigs.';

