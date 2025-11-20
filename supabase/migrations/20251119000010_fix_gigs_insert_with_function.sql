-- 20251119000010_fix_gigs_insert_with_function.sql

-- The issue is that (SELECT auth.uid()) in WITH CHECK might not be evaluating correctly
-- Let's create a helper function similar to the other permission checks

CREATE OR REPLACE FUNCTION public.fn_can_insert_gig(check_project_id uuid, check_owner_id uuid)
RETURNS boolean AS $$
BEGIN
  -- Case 1: Standalone gig (no project)
  IF check_project_id IS NULL THEN
    -- User must be the owner
    RETURN check_owner_id = auth.uid();
  END IF;
  
  -- Case 2: Project gig
  -- User must own the project
  RETURN fn_is_project_owner(check_project_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Replace the policy with the function-based check
DROP POLICY IF EXISTS "gigs_insert" ON gigs;

CREATE POLICY "gigs_insert" ON gigs
  FOR INSERT WITH CHECK (
    fn_can_insert_gig(project_id, owner_id)
  );

