-- 20251119000013_temporarily_permissive_gigs_select.sql

-- Temporarily make the SELECT policy more permissive to test if that's the issue
-- We can make it strict again once we confirm this is the problem

DROP POLICY IF EXISTS "gigs_select" ON gigs;

CREATE POLICY "gigs_select" ON gigs
  FOR SELECT USING (
    -- Allow if user is authenticated (temporary - for debugging)
    auth.role() = 'authenticated'
    -- Original logic (commented out for now):
    -- fn_is_gig_owner(id) OR fn_is_gig_musician(id)
  );

