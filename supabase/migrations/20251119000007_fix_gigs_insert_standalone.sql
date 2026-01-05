-- 20251119000007_fix_gigs_insert_standalone.sql

-- Fix the gigs_insert policy to properly handle standalone gigs (project_id = NULL)
-- The current policy fails because fn_is_project_owner(NULL) returns false

DROP POLICY IF EXISTS "gigs_insert" ON gigs;

CREATE POLICY "gigs_insert" ON gigs
  FOR INSERT WITH CHECK (
    -- For standalone gigs (no project), user must be the owner
    (project_id IS NULL AND owner_id = (SELECT auth.uid()))
    -- For project gigs, user must own the project
    OR (project_id IS NOT NULL AND fn_is_project_owner(project_id))
  );

