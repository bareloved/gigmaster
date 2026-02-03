-- Create gig_contacts table
CREATE TABLE IF NOT EXISTS gig_contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  gig_id uuid NOT NULL REFERENCES gigs(id) ON DELETE CASCADE,
  label text NOT NULL,
  name text NOT NULL,
  phone text,
  email text,
  source_type text NOT NULL DEFAULT 'manual' CHECK (source_type IN ('manual', 'lineup', 'contact')),
  source_id uuid,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT phone_or_email_required CHECK (phone IS NOT NULL OR email IS NOT NULL)
);

-- Index for gig_id lookups
CREATE INDEX idx_gig_contacts_gig_id ON gig_contacts(gig_id);

-- Enable RLS
ALTER TABLE gig_contacts ENABLE ROW LEVEL SECURITY;

-- RLS: Anyone who can view the gig can read contacts
CREATE POLICY "gig_contacts_select_policy" ON gig_contacts
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM gigs
      WHERE gigs.id = gig_contacts.gig_id
      AND (
        gigs.owner_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM gig_roles
          WHERE gig_roles.gig_id = gigs.id
          AND gig_roles.musician_id = auth.uid()
        )
      )
    )
  );

-- RLS: Only gig owner can insert
CREATE POLICY "gig_contacts_insert_policy" ON gig_contacts
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM gigs
      WHERE gigs.id = gig_contacts.gig_id
      AND gigs.owner_id = auth.uid()
    )
  );

-- RLS: Only gig owner can update
CREATE POLICY "gig_contacts_update_policy" ON gig_contacts
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM gigs
      WHERE gigs.id = gig_contacts.gig_id
      AND gigs.owner_id = auth.uid()
    )
  );

-- RLS: Only gig owner can delete
CREATE POLICY "gig_contacts_delete_policy" ON gig_contacts
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM gigs
      WHERE gigs.id = gig_contacts.gig_id
      AND gigs.owner_id = auth.uid()
    )
  );
