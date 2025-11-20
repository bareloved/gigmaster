-- Migration: Optimize RLS Policy Performance
-- Created: 2024-11-18
-- Purpose: Fix 51 performance warnings from Supabase linter
-- 
-- ISSUES FIXED:
-- 1. Auth RLS InitPlan (43 warnings): Wrap auth.uid() in subqueries to prevent re-evaluation per row
-- 2. Multiple Permissive Policies (8 warnings): Consolidate duplicate policies for better performance
--
-- PERFORMANCE IMPACT: Significant improvement for queries on large tables
-- When auth.uid() is called without a subquery wrapper, it gets re-evaluated for EVERY row.
-- With (select auth.uid()), it's evaluated once and cached for the query.

-- ============================================================================
-- FIX 1: PROFILES TABLE (3 policies)
-- ============================================================================

DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;

CREATE POLICY "Users can view own profile"
  ON public.profiles
  FOR SELECT
  USING ((select auth.uid()) = id);

CREATE POLICY "Users can update own profile"
  ON public.profiles
  FOR UPDATE
  USING ((select auth.uid()) = id);

CREATE POLICY "Users can insert own profile"
  ON public.profiles
  FOR INSERT
  WITH CHECK ((select auth.uid()) = id);

-- ============================================================================
-- FIX 2: PROJECTS TABLE (4 policies)
-- ============================================================================

DROP POLICY IF EXISTS "Users can view own projects" ON public.projects;
DROP POLICY IF EXISTS "Users can insert own projects" ON public.projects;
DROP POLICY IF EXISTS "Users can update own projects" ON public.projects;
DROP POLICY IF EXISTS "Users can delete own projects" ON public.projects;

CREATE POLICY "Users can view own projects"
  ON public.projects
  FOR SELECT
  USING ((select auth.uid()) = owner_id);

CREATE POLICY "Users can insert own projects"
  ON public.projects
  FOR INSERT
  WITH CHECK ((select auth.uid()) = owner_id);

CREATE POLICY "Users can update own projects"
  ON public.projects
  FOR UPDATE
  USING ((select auth.uid()) = owner_id);

CREATE POLICY "Users can delete own projects"
  ON public.projects
  FOR DELETE
  USING ((select auth.uid()) = owner_id);

-- ============================================================================
-- FIX 3: GIGS TABLE (4 policies)
-- ============================================================================

DROP POLICY IF EXISTS "gigs_select_policy" ON public.gigs;
DROP POLICY IF EXISTS "gigs_insert_policy" ON public.gigs;
DROP POLICY IF EXISTS "gigs_update_policy" ON public.gigs;
DROP POLICY IF EXISTS "gigs_delete_policy" ON public.gigs;

-- SELECT: View gigs (owner, project owner, or has role)
CREATE POLICY "gigs_select_policy" ON public.gigs
  FOR SELECT
  USING (
    owner_id = (select auth.uid())
    OR
    EXISTS (
      SELECT 1 FROM public.projects
      WHERE projects.id = gigs.project_id
      AND projects.owner_id = (select auth.uid())
    )
    OR
    EXISTS (
      SELECT 1 FROM public.gig_roles
      WHERE gig_roles.gig_id = gigs.id
      AND gig_roles.musician_id = (select auth.uid())
    )
  );

-- INSERT: Create gigs (project owner or standalone owner)
CREATE POLICY "gigs_insert_policy" ON public.gigs
  FOR INSERT
  WITH CHECK (
    (
      project_id IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM public.projects
        WHERE projects.id = gigs.project_id
        AND projects.owner_id = (select auth.uid())
      )
    )
    OR
    (
      project_id IS NULL
      AND owner_id = (select auth.uid())
    )
  );

-- UPDATE: Update gigs (owner, project owner, or has role)
CREATE POLICY "gigs_update_policy" ON public.gigs
  FOR UPDATE
  USING (
    owner_id = (select auth.uid())
    OR
    EXISTS (
      SELECT 1 FROM public.projects
      WHERE projects.id = gigs.project_id
      AND projects.owner_id = (select auth.uid())
    )
    OR
    EXISTS (
      SELECT 1 FROM public.gig_roles
      WHERE gig_roles.gig_id = gigs.id
      AND gig_roles.musician_id = (select auth.uid())
    )
  );

-- DELETE: Delete gigs (owner or project owner only)
CREATE POLICY "gigs_delete_policy" ON public.gigs
  FOR DELETE
  USING (
    owner_id = (select auth.uid())
    OR
    EXISTS (
      SELECT 1 FROM public.projects
      WHERE projects.id = gigs.project_id
      AND projects.owner_id = (select auth.uid())
    )
  );

-- ============================================================================
-- FIX 4: SETLIST_ITEMS TABLE (4 policies)
-- ============================================================================

DROP POLICY IF EXISTS "Users can view setlist items for their gigs" ON public.setlist_items;
DROP POLICY IF EXISTS "Users can insert setlist items for their gigs" ON public.setlist_items;
DROP POLICY IF EXISTS "Users can update setlist items for their gigs" ON public.setlist_items;
DROP POLICY IF EXISTS "Users can delete setlist items for their gigs" ON public.setlist_items;

-- Note: These policies still check project ownership, which may need updating for standalone gigs
-- For now, optimizing the auth.uid() calls

CREATE POLICY "Users can view setlist items for their gigs"
ON public.setlist_items
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.gigs
    INNER JOIN public.projects ON gigs.project_id = projects.id
    WHERE gigs.id = setlist_items.gig_id
    AND projects.owner_id = (select auth.uid())
  )
);

CREATE POLICY "Users can insert setlist items for their gigs"
ON public.setlist_items
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.gigs
    INNER JOIN public.projects ON gigs.project_id = projects.id
    WHERE gigs.id = setlist_items.gig_id
    AND projects.owner_id = (select auth.uid())
  )
);

CREATE POLICY "Users can update setlist items for their gigs"
ON public.setlist_items
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.gigs
    INNER JOIN public.projects ON gigs.project_id = projects.id
    WHERE gigs.id = setlist_items.gig_id
    AND projects.owner_id = (select auth.uid())
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.gigs
    INNER JOIN public.projects ON gigs.project_id = projects.id
    WHERE gigs.id = setlist_items.gig_id
    AND projects.owner_id = (select auth.uid())
  )
);

CREATE POLICY "Users can delete setlist items for their gigs"
ON public.setlist_items
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.gigs
    INNER JOIN public.projects ON gigs.project_id = projects.id
    WHERE gigs.id = setlist_items.gig_id
    AND projects.owner_id = (select auth.uid())
  )
);

-- ============================================================================
-- FIX 5: GIG_FILES TABLE
-- ============================================================================
-- ISSUE: Multiple permissive policies (4 warnings) + auth.uid() optimization (8 policies)
-- SOLUTION: Consolidate policies to handle both project gigs and standalone gigs in one policy per action

DROP POLICY IF EXISTS "Users can view gig files for their gigs" ON public.gig_files;
DROP POLICY IF EXISTS "Users can view gig files for their projects" ON public.gig_files;
DROP POLICY IF EXISTS "Users can add gig files to their projects" ON public.gig_files;
DROP POLICY IF EXISTS "Users can insert gig files for their gigs" ON public.gig_files;
DROP POLICY IF EXISTS "Users can update gig files for their gigs" ON public.gig_files;
DROP POLICY IF EXISTS "Users can update gig files for their projects" ON public.gig_files;
DROP POLICY IF EXISTS "Users can delete gig files for their gigs" ON public.gig_files;
DROP POLICY IF EXISTS "Users can delete gig files for their projects" ON public.gig_files;

-- SELECT: Consolidated policy for viewing gig files
CREATE POLICY "Users can view gig files"
ON public.gig_files
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.gigs
    LEFT JOIN public.projects ON gigs.project_id = projects.id
    WHERE gigs.id = gig_files.gig_id
    AND (
      -- User owns the gig directly (standalone)
      gigs.owner_id = (select auth.uid())
      OR
      -- User owns the project (project gigs)
      projects.owner_id = (select auth.uid())
      OR
      -- User has a role on the gig
      EXISTS (
        SELECT 1 FROM public.gig_roles
        WHERE gig_roles.gig_id = gigs.id
        AND gig_roles.musician_id = (select auth.uid())
      )
    )
  )
);

-- INSERT: Consolidated policy for adding gig files
CREATE POLICY "Users can insert gig files"
ON public.gig_files
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.gigs
    LEFT JOIN public.projects ON gigs.project_id = projects.id
    WHERE gigs.id = gig_files.gig_id
    AND (
      gigs.owner_id = (select auth.uid())
      OR
      projects.owner_id = (select auth.uid())
    )
  )
);

-- UPDATE: Consolidated policy for updating gig files
CREATE POLICY "Users can update gig files"
ON public.gig_files
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.gigs
    LEFT JOIN public.projects ON gigs.project_id = projects.id
    WHERE gigs.id = gig_files.gig_id
    AND (
      gigs.owner_id = (select auth.uid())
      OR
      projects.owner_id = (select auth.uid())
    )
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.gigs
    LEFT JOIN public.projects ON gigs.project_id = projects.id
    WHERE gigs.id = gig_files.gig_id
    AND (
      gigs.owner_id = (select auth.uid())
      OR
      projects.owner_id = (select auth.uid())
    )
  )
);

-- DELETE: Consolidated policy for deleting gig files
CREATE POLICY "Users can delete gig files"
ON public.gig_files
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.gigs
    LEFT JOIN public.projects ON gigs.project_id = projects.id
    WHERE gigs.id = gig_files.gig_id
    AND (
      gigs.owner_id = (select auth.uid())
      OR
      projects.owner_id = (select auth.uid())
    )
  )
);

-- ============================================================================
-- FIX 6: GIG_INVITATIONS TABLE
-- ============================================================================
-- ISSUE: Multiple permissive policies for SELECT (4 role warnings) + auth.uid() optimization
-- SOLUTION: Consolidate manager and user view policies into one
-- NOTE: This table uses email-based invitations, not direct user_id references

DROP POLICY IF EXISTS "Managers can view invitations for their gigs" ON public.gig_invitations;
DROP POLICY IF EXISTS "Users can view their invitations" ON public.gig_invitations;
DROP POLICY IF EXISTS "Managers can create invitations for their projects" ON public.gig_invitations;
DROP POLICY IF EXISTS "Users can update their invitations" ON public.gig_invitations;

-- SELECT: Consolidated policy (managers OR invited users)
CREATE POLICY "Users can view gig invitations"
ON public.gig_invitations
FOR SELECT
USING (
  -- User is the invited musician (email matches their auth email)
  email = (SELECT email FROM auth.users WHERE id = (select auth.uid()))
  OR
  -- User manages the gig (project owner or gig owner)
  EXISTS (
    SELECT 1 FROM public.gigs
    LEFT JOIN public.projects ON gigs.project_id = projects.id
    WHERE gigs.id = gig_invitations.gig_id
    AND (
      gigs.owner_id = (select auth.uid())
      OR
      projects.owner_id = (select auth.uid())
    )
  )
);

-- INSERT: Managers can create invitations
CREATE POLICY "Users can create gig invitations"
ON public.gig_invitations
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.gigs
    LEFT JOIN public.projects ON gigs.project_id = projects.id
    WHERE gigs.id = gig_invitations.gig_id
    AND (
      gigs.owner_id = (select auth.uid())
      OR
      projects.owner_id = (select auth.uid())
    )
  )
);

-- UPDATE: Invited users can update their own invitations
CREATE POLICY "Users can update their own invitations"
ON public.gig_invitations
FOR UPDATE
TO authenticated
USING (email = (SELECT email FROM auth.users WHERE id = (select auth.uid())));

-- ============================================================================
-- FIX 7: GIG_ROLE_STATUS_HISTORY TABLE (1 policy)
-- ============================================================================

DROP POLICY IF EXISTS "Users can view status history for accessible roles" ON public.gig_role_status_history;

CREATE POLICY "Users can view status history for accessible roles"
ON public.gig_role_status_history
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.gig_roles
    INNER JOIN public.gigs ON gig_roles.gig_id = gigs.id
    LEFT JOIN public.projects ON gigs.project_id = projects.id
    WHERE gig_roles.id = gig_role_status_history.gig_role_id
    AND (
      -- User is the musician
      gig_roles.musician_id = (select auth.uid())
      OR
      -- User owns the gig
      gigs.owner_id = (select auth.uid())
      OR
      -- User owns the project
      projects.owner_id = (select auth.uid())
    )
  )
);

-- ============================================================================
-- FIX 8: MUSICIAN_CONTACTS TABLE (4 policies)
-- ============================================================================

DROP POLICY IF EXISTS "Users can view their own contacts" ON public.musician_contacts;
DROP POLICY IF EXISTS "Users can create their own contacts" ON public.musician_contacts;
DROP POLICY IF EXISTS "Users can update their own contacts" ON public.musician_contacts;
DROP POLICY IF EXISTS "Users can delete their own contacts" ON public.musician_contacts;

CREATE POLICY "Users can view their own contacts"
ON public.musician_contacts
FOR SELECT
TO authenticated
USING (user_id = (select auth.uid()));

CREATE POLICY "Users can create their own contacts"
ON public.musician_contacts
FOR INSERT
TO authenticated
WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Users can update their own contacts"
ON public.musician_contacts
FOR UPDATE
TO authenticated
USING (user_id = (select auth.uid()));

CREATE POLICY "Users can delete their own contacts"
ON public.musician_contacts
FOR DELETE
TO authenticated
USING (user_id = (select auth.uid()));

-- ============================================================================
-- FIX 9: CALENDAR_CONNECTIONS TABLE (4 policies)
-- ============================================================================

DROP POLICY IF EXISTS "Users can view their own calendar connections" ON public.calendar_connections;
DROP POLICY IF EXISTS "Users can insert their own calendar connections" ON public.calendar_connections;
DROP POLICY IF EXISTS "Users can update their own calendar connections" ON public.calendar_connections;
DROP POLICY IF EXISTS "Users can delete their own calendar connections" ON public.calendar_connections;

CREATE POLICY "Users can view their own calendar connections"
ON public.calendar_connections
FOR SELECT
TO authenticated
USING (user_id = (select auth.uid()));

CREATE POLICY "Users can insert their own calendar connections"
ON public.calendar_connections
FOR INSERT
TO authenticated
WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Users can update their own calendar connections"
ON public.calendar_connections
FOR UPDATE
TO authenticated
USING (user_id = (select auth.uid()));

CREATE POLICY "Users can delete their own calendar connections"
ON public.calendar_connections
FOR DELETE
TO authenticated
USING (user_id = (select auth.uid()));

-- ============================================================================
-- FIX 10: CALENDAR_SYNC_LOG TABLE (2 policies)
-- ============================================================================
-- NOTE: This table has connection_id (not user_id), so we check through calendar_connections

DROP POLICY IF EXISTS "Users can view their own sync log" ON public.calendar_sync_log;
DROP POLICY IF EXISTS "Users can insert their own sync log" ON public.calendar_sync_log;

-- Users can view sync log for their own calendar connections
CREATE POLICY "Users can view their own sync log"
ON public.calendar_sync_log
FOR SELECT
TO authenticated
USING (
  connection_id IN (
    SELECT id FROM public.calendar_connections 
    WHERE user_id = (select auth.uid())
  )
);

-- Users can insert sync log for their own calendar connections
CREATE POLICY "Users can insert their own sync log"
ON public.calendar_sync_log
FOR INSERT
TO authenticated
WITH CHECK (
  connection_id IN (
    SELECT id FROM public.calendar_connections 
    WHERE user_id = (select auth.uid())
  )
);

-- ============================================================================
-- VERIFICATION
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '✓ RLS Performance Optimization Complete!';
  RAISE NOTICE '';
  RAISE NOTICE 'Fixed Issues:';
  RAISE NOTICE '  - 43 auth_rls_initplan warnings (auth.uid() now wrapped in subqueries)';
  RAISE NOTICE '  - 8 multiple_permissive_policies warnings (consolidated duplicate policies)';
  RAISE NOTICE '';
  RAISE NOTICE 'Tables Updated:';
  RAISE NOTICE '  - profiles (3 policies)';
  RAISE NOTICE '  - projects (4 policies)';
  RAISE NOTICE '  - gigs (4 policies)';
  RAISE NOTICE '  - setlist_items (4 policies)';
  RAISE NOTICE '  - gig_files (8 → 4 policies, consolidated)';
  RAISE NOTICE '  - gig_invitations (4 → 3 policies, consolidated)';
  RAISE NOTICE '  - gig_role_status_history (1 policy)';
  RAISE NOTICE '  - musician_contacts (4 policies)';
  RAISE NOTICE '  - calendar_connections (4 policies)';
  RAISE NOTICE '  - calendar_sync_log (2 policies)';
  RAISE NOTICE '';
  RAISE NOTICE 'Performance Impact: Queries on large tables will be significantly faster';
  RAISE NOTICE 'Check Supabase dashboard to verify warnings are resolved.';
END $$;

SELECT 'Migration complete - RLS performance optimized!' AS status;
