-- =====================================================
-- Migration: Musician Contacts System
-- Date: November 17, 2024
-- Description: Personal musician contacts database with
--              smart learning and auto-population
-- =====================================================

-- Create musician_contacts table
CREATE TABLE musician_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  contact_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  primary_instrument TEXT,
  default_roles TEXT[],
  default_fee NUMERIC(10, 2),
  notes TEXT,
  times_worked_together INT DEFAULT 0,
  last_worked_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_contacts_user_id ON musician_contacts(user_id);
CREATE INDEX idx_contacts_name ON musician_contacts USING gin(to_tsvector('english', contact_name));
CREATE INDEX idx_contacts_last_worked ON musician_contacts(user_id, last_worked_date DESC NULLS LAST);

-- RLS Policies
ALTER TABLE musician_contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own contacts"
  ON musician_contacts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own contacts"
  ON musician_contacts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own contacts"
  ON musician_contacts FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own contacts"
  ON musician_contacts FOR DELETE
  USING (auth.uid() = user_id);

-- Link gig_roles to contacts
ALTER TABLE gig_roles 
ADD COLUMN contact_id UUID REFERENCES musician_contacts(id) ON DELETE SET NULL;

CREATE INDEX idx_gig_roles_contact_id ON gig_roles(contact_id);

-- Success message
COMMENT ON TABLE musician_contacts IS 'Personal musician contacts database for quick invite and smart learning';

