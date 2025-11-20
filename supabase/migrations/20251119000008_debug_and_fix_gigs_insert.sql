-- 20251119000008_debug_and_fix_gigs_insert.sql

-- The issue might be that the policy is too strict or auth.uid() isn't being evaluated correctly
-- Let's simplify and make it more explicit

DROP POLICY IF EXISTS "gigs_insert" ON gigs;

CREATE POLICY "gigs_insert" ON gigs
  FOR INSERT WITH CHECK (
    -- Case 1: Standalone gig (no project)
    -- User must be authenticated and owner_id must match their auth.uid()
    (
      project_id IS NULL 
      AND owner_id IS NOT NULL
      AND owner_id = (SELECT auth.uid())
    )
    -- Case 2: Project gig
    -- User must own the project
    OR (
      project_id IS NOT NULL 
      AND fn_is_project_owner(project_id)
    )
  );

