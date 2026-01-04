-- Migration: Invitations & Player Confirmations System
-- Created: 2024-11-16
-- Step 1 of Future Roadmap

-- ============================================================================
-- 1. GIG INVITATIONS TABLE
-- ============================================================================

CREATE TABLE gig_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gig_id UUID NOT NULL REFERENCES gigs(id) ON DELETE CASCADE,
  gig_role_id UUID NOT NULL REFERENCES gig_roles(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'expired')),
  token TEXT UNIQUE NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE gig_invitations IS 'Email invitations for musicians to join gigs';
COMMENT ON COLUMN gig_invitations.token IS 'Secure token for magic link authentication';
COMMENT ON COLUMN gig_invitations.status IS 'Invitation status: pending, accepted, declined, expired';

-- ============================================================================
-- 2. EXTEND GIG_ROLES FOR PLAYER FEATURES
-- ============================================================================

-- Add musician_id to link roles to users
ALTER TABLE gig_roles ADD COLUMN IF NOT EXISTS musician_id UUID REFERENCES auth.users(id);

-- Add player-specific fields
ALTER TABLE gig_roles ADD COLUMN IF NOT EXISTS player_notes TEXT;
ALTER TABLE gig_roles ADD COLUMN IF NOT EXISTS status_changed_at TIMESTAMPTZ;
ALTER TABLE gig_roles ADD COLUMN IF NOT EXISTS status_changed_by UUID REFERENCES auth.users(id);

COMMENT ON COLUMN gig_roles.musician_id IS 'User ID of musician assigned to this role';
COMMENT ON COLUMN gig_roles.player_notes IS 'Private notes for the musician (only visible to them)';
COMMENT ON COLUMN gig_roles.status_changed_at IS 'Timestamp of last status change';
COMMENT ON COLUMN gig_roles.status_changed_by IS 'User ID who made the last status change';

-- ============================================================================
-- 3. STATUS CHANGE HISTORY TABLE (AUDIT LOG)
-- ============================================================================

CREATE TABLE gig_role_status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gig_role_id UUID NOT NULL REFERENCES gig_roles(id) ON DELETE CASCADE,
  old_status TEXT,
  new_status TEXT NOT NULL,
  changed_by UUID REFERENCES auth.users(id),
  changed_at TIMESTAMPTZ DEFAULT NOW(),
  notes TEXT
);

COMMENT ON TABLE gig_role_status_history IS 'Audit log of all role status changes';
COMMENT ON COLUMN gig_role_status_history.notes IS 'Optional reason or notes for the status change';

-- ============================================================================
-- 4. INDEXES FOR PERFORMANCE
-- ============================================================================

-- Invitations table indexes
CREATE INDEX idx_gig_invitations_token ON gig_invitations(token);
CREATE INDEX idx_gig_invitations_email ON gig_invitations(email);
CREATE INDEX idx_gig_invitations_gig ON gig_invitations(gig_id);
CREATE INDEX idx_gig_invitations_role ON gig_invitations(gig_role_id);
CREATE INDEX idx_gig_invitations_status ON gig_invitations(status) WHERE status = 'pending';

-- Gig roles indexes (for musician queries)
CREATE INDEX idx_gig_roles_musician ON gig_roles(musician_id) WHERE musician_id IS NOT NULL;
CREATE INDEX idx_gig_roles_musician_status ON gig_roles(musician_id, invitation_status);

-- Status history indexes
CREATE INDEX idx_gig_role_status_history_role ON gig_role_status_history(gig_role_id);
CREATE INDEX idx_gig_role_status_history_changed_at ON gig_role_status_history(changed_at DESC);

-- ============================================================================
-- 5. ROW LEVEL SECURITY POLICIES
-- ============================================================================

-- Enable RLS on gig_invitations
ALTER TABLE gig_invitations ENABLE ROW LEVEL SECURITY;

-- Managers can create invitations for their projects
CREATE POLICY "Managers can create invitations for their projects"
  ON gig_invitations FOR INSERT
  WITH CHECK (
    gig_id IN (
      SELECT g.id FROM gigs g
      JOIN projects p ON g.project_id = p.id
      WHERE p.owner_id = auth.uid()
    )
  );

-- Users can view invitations sent to their email OR for their projects
CREATE POLICY "Users can view their invitations"
  ON gig_invitations FOR SELECT
  USING (
    email = (SELECT email FROM auth.users WHERE id = auth.uid())
    OR gig_id IN (
      SELECT g.id FROM gigs g
      JOIN projects p ON g.project_id = p.id
      WHERE p.owner_id = auth.uid()
    )
  );

-- Users can update invitations sent to their email
CREATE POLICY "Users can update their invitations"
  ON gig_invitations FOR UPDATE
  USING (
    email = (SELECT email FROM auth.users WHERE id = auth.uid())
  );

-- Managers can view all invitations for their gigs
CREATE POLICY "Managers can view invitations for their gigs"
  ON gig_invitations FOR SELECT
  USING (
    gig_id IN (
      SELECT g.id FROM gigs g
      JOIN projects p ON g.project_id = p.id
      WHERE p.owner_id = auth.uid()
    )
  );

-- Enable RLS on gig_role_status_history
ALTER TABLE gig_role_status_history ENABLE ROW LEVEL SECURITY;

-- Users can view status history for their roles or their projects
CREATE POLICY "Users can view status history for accessible roles"
  ON gig_role_status_history FOR SELECT
  USING (
    gig_role_id IN (
      SELECT gr.id FROM gig_roles gr
      WHERE gr.musician_id = auth.uid()
      OR gr.gig_id IN (
        SELECT g.id FROM gigs g
        JOIN projects p ON g.project_id = p.id
        WHERE p.owner_id = auth.uid()
      )
    )
  );

-- Anyone can insert status history (system-generated)
CREATE POLICY "Users can create status history"
  ON gig_role_status_history FOR INSERT
  WITH CHECK (true);

-- Update existing gig_roles RLS to allow musicians to update their own status
-- First, drop existing UPDATE policy if it exists
DROP POLICY IF EXISTS "Project owners can update gig roles" ON gig_roles;

-- Recreate with additional permission for musicians
CREATE POLICY "Project owners and musicians can update roles"
  ON gig_roles FOR UPDATE
  USING (
    gig_id IN (
      SELECT g.id FROM gigs g
      JOIN projects p ON g.project_id = p.id
      WHERE p.owner_id = auth.uid()
    )
    OR musician_id = auth.uid()
  )
  WITH CHECK (
    gig_id IN (
      SELECT g.id FROM gigs g
      JOIN projects p ON g.project_id = p.id
      WHERE p.owner_id = auth.uid()
    )
    OR musician_id = auth.uid()
  );

-- ============================================================================
-- 6. HELPER FUNCTIONS (OPTIONAL)
-- ============================================================================

-- Function to automatically expire old invitations
CREATE OR REPLACE FUNCTION expire_old_invitations()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE gig_invitations
  SET status = 'expired'
  WHERE status = 'pending'
    AND expires_at < NOW();
END;
$$;

COMMENT ON FUNCTION expire_old_invitations IS 'Marks pending invitations as expired if past expiration date';

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

-- Verify tables exist
DO $$
BEGIN
  ASSERT (SELECT COUNT(*) FROM information_schema.tables WHERE table_name = 'gig_invitations') = 1,
    'gig_invitations table not created';
  ASSERT (SELECT COUNT(*) FROM information_schema.tables WHERE table_name = 'gig_role_status_history') = 1,
    'gig_role_status_history table not created';
  
  RAISE NOTICE 'Migration completed successfully';
END $$;

