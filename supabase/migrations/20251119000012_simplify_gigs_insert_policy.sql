-- 20251119000012_simplify_gigs_insert_policy.sql

-- The SECURITY DEFINER function approach isn't working for WITH CHECK clauses
-- Let's go back to inline logic but make it bulletproof

DROP POLICY IF EXISTS "gigs_insert" ON gigs;

CREATE POLICY "gigs_insert" ON gigs
  FOR INSERT WITH CHECK (
    -- The user must be authenticated
    auth.role() = 'authenticated'
    AND (
      -- Case 1: Standalone gig (no project)
      -- owner_id must match the authenticated user
      (
        project_id IS NULL 
        AND owner_id = auth.uid()
      )
      -- Case 2: Project gig  
      -- User must own the project (using our existing function which DOES work)
      OR (
        project_id IS NOT NULL 
        AND fn_is_project_owner(project_id)
      )
    )
  );

