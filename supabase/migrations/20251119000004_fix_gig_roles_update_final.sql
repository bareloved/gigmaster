-- 20251119000004_fix_gig_roles_update_final.sql

-- Final fix for "Auth RLS Initialization Plan" on gig_roles_update
-- The issue persists because the complex OR logic prevents Postgres from optimizing the subquery properly.
-- We will split the single complex UPDATE policy into separate, simple policies.

DROP POLICY IF EXISTS "gig_roles_update" ON gig_roles;

-- Policy 1: Owner can update everything
CREATE POLICY "gig_roles_update_owner" ON gig_roles
  FOR UPDATE USING (
    fn_is_gig_owner(gig_id)
  );

-- Policy 2: Musician can update their own role
CREATE POLICY "gig_roles_update_self" ON gig_roles
  FOR UPDATE USING (
    musician_id = (SELECT auth.uid())
  );

-- Policy 3: Invitees can update (accept) their role
-- We simplify this by just checking the invitation directly in a clean way
CREATE POLICY "gig_roles_update_invitee" ON gig_roles
  FOR UPDATE USING (
    musician_id IS NULL 
    AND EXISTS (
      SELECT 1 FROM gig_invitations 
      WHERE gig_role_id = id 
      -- Fully isolated subquery for the email claim
      AND email = (SELECT (auth.jwt() ->> 'email')::text)
      AND status = 'pending'
    )
  );

