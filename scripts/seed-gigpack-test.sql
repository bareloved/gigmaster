-- Seed script for testing GigPack Editor & Public View
-- Run this in SQL Editor to populate a test gig

INSERT INTO gigs (
  title, 
  date, 
  owner_id, 
  venue_name, 
  venue_address, 
  status,
  theme,
  poster_skin,
  gig_type
) 
VALUES (
  'Test GigPack Show', 
  NOW() + INTERVAL '7 days', 
  auth.uid(), 
  'The Blue Note', 
  '131 W 3rd St, New York, NY', 
  'confirmed',
  'vintage',
  'paper',
  'club_show'
) 
RETURNING id;

-- Insert schedule items (Replace GIG_ID with actual ID)
-- INSERT INTO gig_schedule_items (gig_id, time, label) VALUES (GIG_ID, '18:00', 'Load In');

-- Insert roles
-- INSERT INTO gig_roles (gig_id, role_name, musician_name, invitation_status) VALUES (GIG_ID, 'Drums', 'John Bonham', 'pending');

-- Insert share token
-- INSERT INTO gig_shares (token, gig_id) VALUES ('test-gig-token', GIG_ID);

