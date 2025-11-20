-- Migration: Exclude pending gig_roles from gigs SELECT policy
-- 
-- PROBLEM: Users with 'pending' gig_roles could view gigs before being officially invited
-- SOLUTION: Update RLS policy to only allow viewing if role is NOT pending
--
-- This ensures managers can still build lineups without prematurely exposing gigs to musicians

-- Drop existing policy
DROP POLICY IF EXISTS "gigs_select" ON gigs;

-- Recreate with filter for pending roles
-- Note: Gigs are owned via projects.owner_id (not gigs.owner_id in current schema)
CREATE POLICY "gigs_select" ON gigs
  FOR SELECT USING (
    auth.role() = 'authenticated' AND (
      -- User owns the project that owns this gig
      EXISTS (
        SELECT 1 FROM projects
        WHERE projects.id = gigs.project_id
        AND projects.owner_id = auth.uid()
      )
      -- OR user has a non-pending role in the gig
      OR EXISTS (
        SELECT 1 FROM gig_roles
        WHERE gig_roles.gig_id = gigs.id
        AND gig_roles.musician_id = auth.uid()
        AND gig_roles.invitation_status != 'pending'
      )
    )
  );

-- Index to optimize this RLS check
CREATE INDEX IF NOT EXISTS idx_gig_roles_musician_status 
  ON gig_roles (musician_id, invitation_status) 
  WHERE musician_id IS NOT NULL;

COMMENT ON POLICY "gigs_select" ON gigs IS 
  'Users can view gigs for projects they own OR where they have a non-pending role (invited/accepted/etc)';

