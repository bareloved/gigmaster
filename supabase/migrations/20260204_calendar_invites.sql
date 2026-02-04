-- Google Calendar Invitations Schema
-- Adds support for sending calendar invites to lineup members

-- Add columns to calendar_connections for write access tracking
ALTER TABLE calendar_connections
ADD COLUMN IF NOT EXISTS write_access BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS send_invites_enabled BOOLEAN DEFAULT false;

-- Add columns to gig_roles for tracking calendar invitations
ALTER TABLE gig_roles
ADD COLUMN IF NOT EXISTS google_calendar_event_id TEXT,
ADD COLUMN IF NOT EXISTS invitation_method TEXT,
ADD COLUMN IF NOT EXISTS invitation_sent_at TIMESTAMPTZ;

-- Create index for looking up roles by calendar event
CREATE INDEX IF NOT EXISTS idx_gig_roles_calendar_event
ON gig_roles(google_calendar_event_id)
WHERE google_calendar_event_id IS NOT NULL;

-- Create table for webhook channel management
CREATE TABLE IF NOT EXISTS google_calendar_watches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  gig_id UUID NOT NULL REFERENCES gigs(id) ON DELETE CASCADE,
  calendar_event_id TEXT NOT NULL,
  channel_id TEXT NOT NULL UNIQUE,
  resource_id TEXT NOT NULL,
  expiration TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(gig_id, calendar_event_id)
);

-- Indexes for webhook management
CREATE INDEX idx_gcw_user ON google_calendar_watches(user_id);
CREATE INDEX idx_gcw_expiration ON google_calendar_watches(expiration);
CREATE INDEX idx_gcw_channel ON google_calendar_watches(channel_id);

-- RLS for google_calendar_watches
ALTER TABLE google_calendar_watches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own calendar watches"
  ON google_calendar_watches FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own calendar watches"
  ON google_calendar_watches FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own calendar watches"
  ON google_calendar_watches FOR DELETE
  USING (auth.uid() = user_id);

-- Comments
COMMENT ON COLUMN calendar_connections.write_access IS 'Whether user has granted write access for creating calendar events';
COMMENT ON COLUMN calendar_connections.send_invites_enabled IS 'Whether user has enabled sending calendar invites to lineup members';
COMMENT ON COLUMN gig_roles.google_calendar_event_id IS 'Google Calendar event ID if invited via calendar';
COMMENT ON COLUMN gig_roles.invitation_method IS 'How invitation was sent: google_calendar, email, or null';
COMMENT ON COLUMN gig_roles.invitation_sent_at IS 'When the invitation was sent';
COMMENT ON TABLE google_calendar_watches IS 'Tracks Google Calendar webhook channels for response sync';
