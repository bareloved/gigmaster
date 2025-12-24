-- Seed Script: Create a test gig with all related data
-- Run this SQL in Supabase SQL Editor to create test data for the GigPack editor
-- Replace {USER_ID} with an actual user ID from your profiles table

-- Usage:
-- 1. Get a user ID: SELECT id FROM profiles LIMIT 1;
-- 2. Replace {USER_ID} below with that ID
-- 3. Run in Supabase SQL Editor

-- For convenience, this script uses a variable approach
DO $$
DECLARE
    v_user_id UUID;
    v_gig_id UUID;
    v_section_id UUID;
    v_share_token TEXT;
BEGIN
    -- Get the first user ID (modify this query if you want a specific user)
    SELECT id INTO v_user_id FROM auth.users LIMIT 1;
    
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'No users found. Please create a user first.';
    END IF;

    -- Generate IDs
    v_gig_id := gen_random_uuid();
    v_section_id := gen_random_uuid();
    v_share_token := encode(gen_random_bytes(16), 'hex');

    -- 1. Create the gig
    INSERT INTO gigs (
        id,
        owner_id,
        title,
        date,
        call_time,
        on_stage_time,
        venue_name,
        venue_address,
        venue_maps_url,
        location_name,
        location_address,
        band_name,
        gig_type,
        theme,
        poster_skin,
        accent_color,
        dress_code,
        backline_notes,
        parking_notes,
        setlist,
        status
    ) VALUES (
        v_gig_id,
        v_user_id,
        'Test GigPack Wedding',
        (CURRENT_DATE + INTERVAL '7 days')::timestamptz,
        '16:00',
        '20:00',
        'The Grand Ballroom',
        '123 Wedding Ave, Tel Aviv',
        'https://maps.google.com/?q=Tel+Aviv',
        'The Grand Ballroom',
        '123 Wedding Ave, Tel Aviv',
        'The Funky Band',
        'wedding',
        'vintage_poster',
        'paper',
        '#F97316',
        'Black tie, elegant',
        'Grand piano provided. Bring your own in-ears.',
        'VIP parking in basement. Load-in via service entrance.',
        'Set 1:\n- Happy\n- Uptown Funk\n- Billie Jean\n\nSet 2:\n- Thinking Out Loud\n- Perfect\n- All of Me',
        'draft'
    );

    -- 2. Create schedule items
    INSERT INTO gig_schedule_items (gig_id, time, label, sort_order) VALUES
        (v_gig_id, '16:00', 'Arrival & Load-in', 0),
        (v_gig_id, '17:00', 'Soundcheck', 1),
        (v_gig_id, '18:00', 'Dinner (provided)', 2),
        (v_gig_id, '19:30', 'Ceremony Music', 3),
        (v_gig_id, '20:00', 'First Dance', 4),
        (v_gig_id, '20:30', 'Party Set 1', 5),
        (v_gig_id, '21:30', 'Break', 6),
        (v_gig_id, '22:00', 'Party Set 2', 7),
        (v_gig_id, '23:30', 'Last Song', 8);

    -- 3. Create gig roles (lineup)
    INSERT INTO gig_roles (gig_id, role_name, musician_name, musician_id, invitation_status, sort_order) VALUES
        (v_gig_id, 'Keys/MD', 'You', v_user_id, 'accepted', 0),
        (v_gig_id, 'Guitar', 'John Guitarist', NULL, 'invited', 1),
        (v_gig_id, 'Bass', 'Jane Bassist', NULL, 'accepted', 2),
        (v_gig_id, 'Drums', 'Bob Drummer', NULL, 'pending', 3),
        (v_gig_id, 'Vocals', 'Sarah Singer', NULL, 'accepted', 4);

    -- 4. Create setlist section
    INSERT INTO setlist_sections (id, gig_id, name, sort_order) VALUES
        (v_section_id, v_gig_id, 'Set 1', 0);

    -- 5. Create setlist items
    INSERT INTO setlist_items (section_id, title, artist, key, tempo, notes, sort_order) VALUES
        (v_section_id, 'Happy', 'Pharrell Williams', 'F', '160', 'Open with energy!', 0),
        (v_section_id, 'Uptown Funk', 'Bruno Mars', 'Dm', '115', 'Extended outro', 1),
        (v_section_id, 'Billie Jean', 'Michael Jackson', 'F#m', '117', 'Guitar solo section', 2),
        (v_section_id, 'Thinking Out Loud', 'Ed Sheeran', 'D', '79', 'First slow dance', 3),
        (v_section_id, 'Perfect', 'Ed Sheeran', 'Ab', '63', 'Bride requested', 4);

    -- 6. Create materials (links)
    INSERT INTO gig_materials (gig_id, label, url, kind, sort_order) VALUES
        (v_gig_id, 'Rehearsal Recording - Jan 15', 'https://drive.google.com/example1', 'rehearsal', 0),
        (v_gig_id, 'Charts Folder', 'https://drive.google.com/charts', 'charts', 1),
        (v_gig_id, 'Wedding Song Reference', 'https://youtube.com/example', 'reference', 2);

    -- 7. Create packing items
    INSERT INTO gig_packing_items (gig_id, label, sort_order) VALUES
        (v_gig_id, 'In-ear monitors', 0),
        (v_gig_id, 'Sustain pedal', 1),
        (v_gig_id, 'Music stand', 2),
        (v_gig_id, 'iPad with charts', 3),
        (v_gig_id, 'Black dress shirt', 4),
        (v_gig_id, 'Extra cables', 5);

    -- 8. Create public share
    INSERT INTO gig_shares (token, gig_id, is_active, expires_at) VALUES
        (v_share_token, v_gig_id, true, (CURRENT_DATE + INTERVAL '30 days')::timestamptz);

    -- Output results
    RAISE NOTICE 'Test gig created successfully!';
    RAISE NOTICE 'Gig ID: %', v_gig_id;
    RAISE NOTICE 'Share Token: %', v_share_token;
    RAISE NOTICE 'User ID: %', v_user_id;

END $$;

-- Query to verify data was created:
-- SELECT g.title, g.date, 
--        (SELECT COUNT(*) FROM gig_schedule_items WHERE gig_id = g.id) as schedule_count,
--        (SELECT COUNT(*) FROM gig_roles WHERE gig_id = g.id) as roles_count,
--        (SELECT COUNT(*) FROM gig_materials WHERE gig_id = g.id) as materials_count,
--        (SELECT COUNT(*) FROM gig_packing_items WHERE gig_id = g.id) as packing_count,
--        (SELECT token FROM gig_shares WHERE gig_id = g.id LIMIT 1) as share_token
-- FROM gigs g
-- WHERE g.title = 'Test GigPack Wedding';

