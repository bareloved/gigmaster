-- Change the default value of invitation_status from 'invited' to 'pending'
-- This allows managers to manually control when invitations are sent via "Invite All" button

ALTER TABLE gig_roles 
ALTER COLUMN invitation_status SET DEFAULT 'pending';

