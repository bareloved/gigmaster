-- Add owner_id column to gigs table to track standalone gig creators
-- This fixes the bug where users couldn't see their own standalone gigs after creating them
-- 
-- PROBLEM: The SELECT policy required either project ownership OR a gig_role.
-- For newly created standalone gigs, neither condition was met, so users got 403 Forbidden.
--
-- SOLUTION: Add owner_id to track who created the gig, and update RLS policies accordingly.

-- ============================================
-- Add owner_id column
-- ============================================
ALTER TABLE gigs 
ADD COLUMN owner_id UUID REFERENCES auth.users(id);

-- ============================================
-- Set owner_id for existing gigs
-- ============================================
-- For project gigs: set to project owner
UPDATE gigs
SET owner_id = (
  SELECT owner_id 
  FROM projects 
  WHERE projects.id = gigs.project_id
)
WHERE project_id IS NOT NULL;

-- For standalone gigs (if any): set to the first user with a gig_role
UPDATE gigs
SET owner_id = (
  SELECT musician_id 
  FROM gig_roles 
  WHERE gig_roles.gig_id = gigs.id 
  LIMIT 1
)
WHERE project_id IS NULL AND owner_id IS NULL;

-- ============================================
-- Update RLS policies
-- ============================================

-- DROP existing policies
DROP POLICY IF EXISTS "gigs_select_policy" ON gigs;
DROP POLICY IF EXISTS "gigs_insert_policy" ON gigs;
DROP POLICY IF EXISTS "gigs_update_policy" ON gigs;
DROP POLICY IF EXISTS "gigs_delete_policy" ON gigs;

-- SELECT: View gigs
-- Users can view gigs if they own them, own the project, or have a gig_role
CREATE POLICY "gigs_select_policy" ON gigs
  FOR SELECT
  USING (
    -- User owns the gig directly (for standalone gigs)
    owner_id = auth.uid()
    OR
    -- User owns the project (for project gigs)
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = gigs.project_id
      AND projects.owner_id = auth.uid()
    )
    OR
    -- User has a role on this gig
    EXISTS (
      SELECT 1 FROM gig_roles
      WHERE gig_roles.gig_id = gigs.id
      AND gig_roles.musician_id = auth.uid()
    )
  );

-- INSERT: Create gigs
-- For project gigs: user must own the project
-- For standalone gigs: user must be set as owner
CREATE POLICY "gigs_insert_policy" ON gigs
  FOR INSERT
  WITH CHECK (
    -- For project gigs: user must own the project
    (
      project_id IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM projects
        WHERE projects.id = gigs.project_id
        AND projects.owner_id = auth.uid()
      )
    )
    OR
    -- For standalone gigs: user must be the owner
    (
      project_id IS NULL
      AND owner_id = auth.uid()
    )
  );

-- UPDATE: Update gigs
-- Users can update gigs if they own them, own the project, or have a role
CREATE POLICY "gigs_update_policy" ON gigs
  FOR UPDATE
  USING (
    -- User owns the gig directly
    owner_id = auth.uid()
    OR
    -- User owns the project
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = gigs.project_id
      AND projects.owner_id = auth.uid()
    )
    OR
    -- User has a role on the gig
    EXISTS (
      SELECT 1 FROM gig_roles
      WHERE gig_roles.gig_id = gigs.id
      AND gig_roles.musician_id = auth.uid()
    )
  );

-- DELETE: Delete gigs
-- Users can delete gigs if they own them or own the project
CREATE POLICY "gigs_delete_policy" ON gigs
  FOR DELETE
  USING (
    -- User owns the gig directly
    owner_id = auth.uid()
    OR
    -- User owns the project
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = gigs.project_id
      AND projects.owner_id = auth.uid()
    )
  );

-- ============================================
-- Index for performance
-- ============================================
CREATE INDEX IF NOT EXISTS idx_gigs_owner_id ON gigs(owner_id);

