-- ============================================================================
-- NOTIFICATIONS SYSTEM
-- ============================================================================
-- 
-- In-app notification center with real-time updates
-- Supports core notification events: invitations, status changes, gig updates,
-- cancellations, and payments
--
-- Created: 2024-11-18
-- ============================================================================

-- Create notifications table
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN (
    'invitation_received',
    'status_changed',
    'gig_updated',
    'gig_cancelled',
    'payment_received'
  )),
  title TEXT NOT NULL,
  message TEXT,
  link_url TEXT,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Optional references for context
  gig_id UUID REFERENCES gigs(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  gig_role_id UUID REFERENCES gig_roles(id) ON DELETE CASCADE
);

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================

-- Fast unread count queries
CREATE INDEX idx_notifications_user_read ON notifications(user_id, read_at);

-- Fast recent notifications list (descending order)
CREATE INDEX idx_notifications_created ON notifications(created_at DESC);

-- Combined index for user's recent notifications
CREATE INDEX idx_notifications_user_created ON notifications(user_id, created_at DESC);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Users can view their own notifications
CREATE POLICY "Users can view their own notifications"
  ON notifications FOR SELECT
  USING (user_id = auth.uid());

-- Users can update their own notifications (mark as read)
CREATE POLICY "Users can update their own notifications"
  ON notifications FOR UPDATE
  USING (user_id = auth.uid());

-- Users can delete their own notifications
CREATE POLICY "Users can delete their own notifications"
  ON notifications FOR DELETE
  USING (user_id = auth.uid());

-- System can insert notifications (service role or authenticated users)
-- This allows API functions to create notifications for any user
CREATE POLICY "Service role can insert notifications"
  ON notifications FOR INSERT
  WITH CHECK (true);

-- ============================================================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON TABLE notifications IS 'In-app notifications for users about gigs, invitations, payments, etc.';
COMMENT ON COLUMN notifications.type IS 'Type of notification: invitation_received, status_changed, gig_updated, gig_cancelled, payment_received';
COMMENT ON COLUMN notifications.read_at IS 'Timestamp when notification was marked as read (null = unread)';
COMMENT ON COLUMN notifications.link_url IS 'URL to navigate to when notification is clicked';

