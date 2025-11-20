-- Migrate gigs with status 'invitations_sent' to appropriate status
-- This removes 'invitations_sent' as a gig status in favor of clear separation
-- between gig lifecycle status and per-musician participation status

-- If gig has accepted roles → 'confirmed', otherwise → 'draft'
UPDATE gigs
SET status = CASE
  WHEN EXISTS (
    SELECT 1 FROM gig_roles 
    WHERE gig_roles.gig_id = gigs.id 
    AND gig_roles.invitation_status = 'accepted'
  ) THEN 'confirmed'
  ELSE 'draft'
END
WHERE status = 'invitations_sent';

-- Add comment documenting the change
COMMENT ON COLUMN gigs.status IS 'Gig lifecycle status: draft, confirmed, completed, cancelled. Does not track invitation state (see gig_roles.invitation_status instead).';

