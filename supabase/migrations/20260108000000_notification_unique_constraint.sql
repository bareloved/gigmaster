-- ============================================================================
-- ADD UNIQUE CONSTRAINT TO PREVENT DUPLICATE INVITATION NOTIFICATIONS
-- ============================================================================
--
-- Problem: When saving a gig multiple times, invitation notifications were being
-- sent repeatedly because we couldn't reliably track which users had already
-- been notified (RLS prevents checking other users' notifications).
--
-- Solution: Add a unique constraint on (user_id, gig_id, type) so that duplicate
-- notifications are prevented at the database level. The application can use
-- INSERT ... ON CONFLICT DO NOTHING to safely attempt inserts.
--
-- Created: 2026-01-08
-- ============================================================================

-- Add unique constraint to prevent duplicate notifications per user/gig/type
-- This allows us to safely INSERT ... ON CONFLICT DO NOTHING
CREATE UNIQUE INDEX IF NOT EXISTS idx_notifications_unique_user_gig_type
ON notifications(user_id, gig_id, type)
WHERE gig_id IS NOT NULL;

-- Add comment explaining the constraint
COMMENT ON INDEX idx_notifications_unique_user_gig_type IS
'Prevents duplicate notifications of the same type for a user on a specific gig. Used with ON CONFLICT DO NOTHING.';
