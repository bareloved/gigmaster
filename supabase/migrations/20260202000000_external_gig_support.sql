-- Add calendar import and external gig support columns to gigs table
-- Some of these columns were referenced in code but never created in the database

-- Calendar import tracking columns (already referenced by import code)
ALTER TABLE public.gigs
  ADD COLUMN IF NOT EXISTS external_calendar_event_id text,
  ADD COLUMN IF NOT EXISTS external_calendar_provider text,
  ADD COLUMN IF NOT EXISTS imported_from_calendar boolean NOT NULL DEFAULT false;

-- Notes and schedule columns (already referenced by import code)
ALTER TABLE public.gigs
  ADD COLUMN IF NOT EXISTS notes text,
  ADD COLUMN IF NOT EXISTS schedule text;

-- New external gig support columns
ALTER TABLE public.gigs
  ADD COLUMN IF NOT EXISTS is_external boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS external_event_url text,
  ADD COLUMN IF NOT EXISTS schedule_notes jsonb;

-- Add index for efficient external gig lookups during refresh
CREATE INDEX IF NOT EXISTS idx_gigs_external_lookup
  ON public.gigs (external_calendar_provider, external_calendar_event_id)
  WHERE is_external = true;

-- Add index for duplicate detection during import
CREATE INDEX IF NOT EXISTS idx_gigs_calendar_event_id
  ON public.gigs (external_calendar_event_id)
  WHERE external_calendar_event_id IS NOT NULL;

-- Add constraint: if is_external = true, external_calendar_event_id must be non-null
ALTER TABLE public.gigs
  ADD CONSTRAINT chk_external_gig_has_event_id
  CHECK (is_external = false OR external_calendar_event_id IS NOT NULL);

-- Comments for documentation
COMMENT ON COLUMN public.gigs.is_external IS 'True for gigs imported from external calendars where user is participant, not manager';
COMMENT ON COLUMN public.gigs.schedule_notes IS 'Structured schedule parsed from calendar description: [{time, label, notes}]';
COMMENT ON COLUMN public.gigs.external_event_url IS 'URL link back to original calendar event';
COMMENT ON COLUMN public.gigs.external_calendar_event_id IS 'ID of the event in the external calendar system';
COMMENT ON COLUMN public.gigs.external_calendar_provider IS 'Calendar provider name (e.g., google)';
COMMENT ON COLUMN public.gigs.imported_from_calendar IS 'Whether this gig was imported from an external calendar';
