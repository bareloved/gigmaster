-- 20251119000005_fix_gig_roles_update_consolidated.sql

-- Revert the split policies and fix the original issue properly
-- The split approach caused "Multiple Permissive Policies" warnings because we had 3 separate UPDATE policies
-- We will consolidate back to a single policy but with a cleaner structure for the InitPlan issue

DROP POLICY IF EXISTS "gig_roles_update_owner" ON gig_roles;
DROP POLICY IF EXISTS "gig_roles_update_self" ON gig_roles;
DROP POLICY IF EXISTS "gig_roles_update_invitee" ON gig_roles;
DROP POLICY IF EXISTS "gig_roles_update" ON gig_roles;

CREATE POLICY "gig_roles_update" ON gig_roles
  FOR UPDATE USING (
    -- 1. Check if user owns the gig
    fn_is_gig_owner(gig_id) 
    -- 2. OR if user is the assigned musician (using subquery for initplan)
    OR musician_id = (SELECT auth.uid())
    -- 3. OR if user is an invitee (using fully isolated subquery for BOTH parts)
    OR (
      musician_id IS NULL 
      AND EXISTS (
        SELECT 1 FROM gig_invitations 
        WHERE gig_role_id = id 
        AND status = 'pending'
        -- This subquery is key: it must be completely independent
        AND email = (SELECT (auth.jwt() ->> 'email')::text)
      )
    )
  );

