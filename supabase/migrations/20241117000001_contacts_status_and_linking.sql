-- =====================================================
-- Migration: Contacts Status & User Linking
-- Date: November 17, 2024
-- Description: Add status tracking and user linking to
--              musician_contacts for "My Circle" system
-- =====================================================

-- Add status column to track contact lifecycle
ALTER TABLE musician_contacts 
ADD COLUMN status TEXT DEFAULT 'local_only' 
  CHECK (status IN ('local_only', 'invited', 'active_user'));

-- Add linked_user_id to connect contacts to real user accounts
ALTER TABLE musician_contacts 
ADD COLUMN linked_user_id UUID REFERENCES profiles(id) ON DELETE SET NULL;

-- Create indexes for performance
CREATE INDEX idx_contacts_linked_user ON musician_contacts(linked_user_id);
CREATE INDEX idx_contacts_status ON musician_contacts(user_id, status);

-- Backfill: Identify contacts that are already active users
-- (contacts that appear in gig_roles with a musician_id)
UPDATE musician_contacts mc
SET 
  status = 'active_user',
  linked_user_id = gr.musician_id
FROM (
  SELECT DISTINCT 
    contact_id, 
    musician_id
  FROM gig_roles
  WHERE contact_id IS NOT NULL 
    AND musician_id IS NOT NULL
) gr
WHERE mc.id = gr.contact_id;

-- Add comment explaining the status field
COMMENT ON COLUMN musician_contacts.status IS 'Contact lifecycle: local_only (created locally, no invite), invited (invite sent, waiting for signup), active_user (linked to real user account)';
COMMENT ON COLUMN musician_contacts.linked_user_id IS 'References profiles.id when the contact has signed up and linked their account';

