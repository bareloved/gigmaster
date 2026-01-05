-- Migration: Add Missing Foreign Key Indexes
-- Created: 2024-11-18
-- Purpose: Fix unindexed foreign key warnings from Supabase performance advisor
--
-- ISSUE: Foreign keys without indexes can cause slow queries, especially for:
-- - JOIN operations
-- - CASCADE DELETE operations
-- - Referential integrity checks
--
-- Adding indexes to these foreign key columns will improve query performance.

-- ============================================================================
-- 1. GIG_ROLE_STATUS_HISTORY - changed_by foreign key
-- ============================================================================
-- This tracks who changed a gig role status
-- Will be queried when viewing status history or filtering by who made changes

CREATE INDEX IF NOT EXISTS idx_gig_role_status_history_changed_by 
ON public.gig_role_status_history(changed_by);

COMMENT ON INDEX idx_gig_role_status_history_changed_by IS 
'Index on changed_by foreign key for efficient joins and filtering by user who made changes';

-- ============================================================================
-- 2. GIG_ROLES - status_changed_by foreign key
-- ============================================================================
-- This tracks who last changed the status of a gig role
-- Will be queried when viewing role details or auditing changes

CREATE INDEX IF NOT EXISTS idx_gig_roles_status_changed_by 
ON public.gig_roles(status_changed_by);

COMMENT ON INDEX idx_gig_roles_status_changed_by IS 
'Index on status_changed_by foreign key for efficient joins and filtering by last modifier';

-- ============================================================================
-- 3. NOTIFICATIONS - gig_id foreign key
-- ============================================================================
-- Notifications are often queried by gig (e.g., "show all notifications for this gig")
-- This index will speed up those queries and cascade deletes when gigs are deleted

CREATE INDEX IF NOT EXISTS idx_notifications_gig_id 
ON public.notifications(gig_id);

COMMENT ON INDEX idx_notifications_gig_id IS 
'Index on gig_id foreign key for efficient filtering of notifications by gig';

-- ============================================================================
-- 4. NOTIFICATIONS - gig_role_id foreign key
-- ============================================================================
-- Notifications can be related to specific gig roles (e.g., role assignment notifications)
-- This index will speed up queries filtering by role and cascade deletes

CREATE INDEX IF NOT EXISTS idx_notifications_gig_role_id 
ON public.notifications(gig_role_id);

COMMENT ON INDEX idx_notifications_gig_role_id IS 
'Index on gig_role_id foreign key for efficient filtering of notifications by role';

-- ============================================================================
-- 5. NOTIFICATIONS - project_id foreign key
-- ============================================================================
-- Notifications can be related to projects (e.g., project-level notifications)
-- This index will speed up queries filtering by project and cascade deletes

CREATE INDEX IF NOT EXISTS idx_notifications_project_id 
ON public.notifications(project_id);

COMMENT ON INDEX idx_notifications_project_id IS 
'Index on project_id foreign key for efficient filtering of notifications by project';

-- ============================================================================
-- VERIFICATION
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '✓ Foreign Key Indexes Added!';
  RAISE NOTICE '';
  RAISE NOTICE 'Indexes Created:';
  RAISE NOTICE '  1. gig_role_status_history.changed_by';
  RAISE NOTICE '  2. gig_roles.status_changed_by';
  RAISE NOTICE '  3. notifications.gig_id';
  RAISE NOTICE '  4. notifications.gig_role_id';
  RAISE NOTICE '  5. notifications.project_id';
  RAISE NOTICE '';
  RAISE NOTICE 'Benefits:';
  RAISE NOTICE '  - Faster JOIN operations on these foreign keys';
  RAISE NOTICE '  - Faster CASCADE DELETE operations';
  RAISE NOTICE '  - Improved referential integrity check performance';
  RAISE NOTICE '';
  RAISE NOTICE 'Check Supabase dashboard to verify unindexed_foreign_keys warnings are resolved.';
END $$;

SELECT 'Migration complete - Foreign key indexes added!' AS status;

