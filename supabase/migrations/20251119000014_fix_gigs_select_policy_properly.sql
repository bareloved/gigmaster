-- 20251119000014_fix_gigs_select_policy_properly.sql

-- The SELECT policy needs to check ownership directly, not through a function
-- that might have context issues during INSERT...RETURNING

DROP POLICY IF EXISTS "gigs_select" ON gigs;

CREATE POLICY "gigs_select" ON gigs
  FOR SELECT USING (
    -- User is authenticated
    auth.role() = 'authenticated'
    AND (
      -- Case 1: User owns the gig directly (standalone gigs)
      owner_id = auth.uid()
      -- Case 2: User owns the project the gig belongs to
      OR EXISTS (
        SELECT 1 FROM projects
        WHERE projects.id = gigs.project_id
        AND projects.owner_id = auth.uid()
      )
      -- Case 3: User is a musician assigned to this gig
      OR EXISTS (
        SELECT 1 FROM gig_roles
        WHERE gig_roles.gig_id = gigs.id
        AND gig_roles.musician_id = auth.uid()
      )
    )
  );

