-- Calendar Integration Phase 1.5 - Google Calendar OAuth
-- Stores OAuth connections and tracks imported events

-- Calendar connections table (OAuth tokens and metadata)
CREATE TABLE calendar_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL DEFAULT 'google',
  provider_calendar_id TEXT NOT NULL,
  access_token TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  token_expires_at TIMESTAMPTZ NOT NULL,
  sync_enabled BOOLEAN DEFAULT TRUE,
  last_synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, provider)
);

-- Calendar sync log (track imported events)
CREATE TABLE calendar_sync_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  connection_id UUID NOT NULL REFERENCES calendar_connections(id) ON DELETE CASCADE,
  external_event_id TEXT NOT NULL,
  gig_id UUID REFERENCES gigs(id) ON DELETE SET NULL,
  sync_direction TEXT NOT NULL, -- 'import' for Phase 1.5
  synced_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(connection_id, external_event_id)
);

-- Add calendar integration fields to gigs table
ALTER TABLE gigs ADD COLUMN external_calendar_event_id TEXT;
ALTER TABLE gigs ADD COLUMN external_calendar_provider TEXT;
ALTER TABLE gigs ADD COLUMN imported_from_calendar BOOLEAN DEFAULT FALSE;

-- Indexes for performance
CREATE INDEX idx_calendar_connections_user ON calendar_connections(user_id);
CREATE INDEX idx_calendar_connections_provider ON calendar_connections(provider);
CREATE INDEX idx_calendar_sync_log_connection ON calendar_sync_log(connection_id);
CREATE INDEX idx_calendar_sync_log_external_event ON calendar_sync_log(external_event_id);
CREATE INDEX idx_calendar_sync_log_gig ON calendar_sync_log(gig_id);
CREATE INDEX idx_gigs_external_event ON gigs(external_calendar_event_id);

-- RLS Policies for calendar_connections
ALTER TABLE calendar_connections ENABLE ROW LEVEL SECURITY;

-- Users can read their own calendar connections
CREATE POLICY "Users can view their own calendar connections"
  ON calendar_connections FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own calendar connections
CREATE POLICY "Users can insert their own calendar connections"
  ON calendar_connections FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own calendar connections
CREATE POLICY "Users can update their own calendar connections"
  ON calendar_connections FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own calendar connections
CREATE POLICY "Users can delete their own calendar connections"
  ON calendar_connections FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for calendar_sync_log
ALTER TABLE calendar_sync_log ENABLE ROW LEVEL SECURITY;

-- Users can view sync log for their own connections
CREATE POLICY "Users can view their own sync log"
  ON calendar_sync_log FOR SELECT
  USING (
    connection_id IN (
      SELECT id FROM calendar_connections WHERE user_id = auth.uid()
    )
  );

-- Users can insert sync log for their own connections
CREATE POLICY "Users can insert their own sync log"
  ON calendar_sync_log FOR INSERT
  WITH CHECK (
    connection_id IN (
      SELECT id FROM calendar_connections WHERE user_id = auth.uid()
    )
  );

-- Comments for documentation
COMMENT ON TABLE calendar_connections IS 'Stores OAuth connections to external calendar providers (Google Calendar)';
COMMENT ON COLUMN calendar_connections.access_token IS 'OAuth access token (should be encrypted at rest in production)';
COMMENT ON COLUMN calendar_connections.refresh_token IS 'OAuth refresh token (should be encrypted at rest in production)';
COMMENT ON COLUMN calendar_connections.token_expires_at IS 'When the access token expires (typically 1 hour)';
COMMENT ON COLUMN calendar_connections.sync_enabled IS 'Whether automatic sync is enabled for this connection';

COMMENT ON TABLE calendar_sync_log IS 'Tracks which calendar events have been imported as gigs';
COMMENT ON COLUMN calendar_sync_log.sync_direction IS 'Direction of sync: import (calendar → gig) for Phase 1.5';

COMMENT ON COLUMN gigs.external_calendar_event_id IS 'ID of the original calendar event if imported';
COMMENT ON COLUMN gigs.external_calendar_provider IS 'Provider of the original event (e.g., google)';
COMMENT ON COLUMN gigs.imported_from_calendar IS 'Whether this gig was imported from an external calendar';

