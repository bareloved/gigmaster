-- Migration: save_gig_pack stored procedure
-- Purpose: Single atomic RPC to save entire gig pack (gig + all related items)
-- Performance: Reduces 18+ network calls to 1 call
-- Security: Uses SECURITY INVOKER to respect RLS policies
--
-- WARNING: The "projects" table and "project_id" column were DROPPED.
-- The FK column on gigs is "band_id" (references bands.id). NEVER use project_id.

-- Drop all known signatures so re-running is safe
DROP FUNCTION IF EXISTS save_gig_pack(jsonb, jsonb, jsonb, jsonb, jsonb, jsonb, text, boolean, uuid);
DROP FUNCTION IF EXISTS save_gig_pack(jsonb, jsonb, jsonb, jsonb, jsonb, jsonb, jsonb, text, boolean, uuid);

CREATE OR REPLACE FUNCTION save_gig_pack(
  p_gig JSONB,                    -- Main gig fields
  p_schedule JSONB DEFAULT '[]',  -- Array of schedule items
  p_materials JSONB DEFAULT '[]', -- Array of materials
  p_packing JSONB DEFAULT '[]',   -- Array of packing items
  p_setlist JSONB DEFAULT '[]',   -- Array of setlist sections with songs
  p_roles JSONB DEFAULT '[]',     -- Array of lineup roles
  p_contacts JSONB DEFAULT '[]',  -- Array of gig contacts
  p_share_token TEXT DEFAULT NULL, -- Share token/slug
  p_is_editing BOOLEAN DEFAULT FALSE,
  p_gig_id UUID DEFAULT NULL      -- Only for editing existing gigs
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY INVOKER  -- CRITICAL: Ensures RLS policies are respected
SET search_path = public
AS $$
DECLARE
  v_gig_id UUID;
  v_user_id UUID;
  v_existing_ids UUID[];
  v_new_ids UUID[];
  v_to_delete UUID[];
  v_section_record RECORD;
  v_section_id UUID;
  v_section_idx INT;
  v_result JSONB;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User not authenticated';
  END IF;

  -- Acquire advisory lock to prevent concurrent saves to same gig
  IF p_gig_id IS NOT NULL THEN
    PERFORM pg_advisory_xact_lock(hashtext(p_gig_id::text));
  END IF;

  -- ========================================
  -- STEP 1: Upsert main gig
  -- ========================================
  BEGIN
    IF p_is_editing AND p_gig_id IS NOT NULL THEN
      UPDATE gigs SET
        title = COALESCE(p_gig->>'title', title),
        date = COALESCE((p_gig->>'date')::timestamptz, date),
        band_id = CASE WHEN p_gig ? 'band_id' THEN (p_gig->>'band_id')::uuid ELSE band_id END,
        band_name = COALESCE(p_gig->>'band_name', band_name),
        call_time = p_gig->>'call_time',
        on_stage_time = p_gig->>'on_stage_time',
        start_time = COALESCE(p_gig->>'on_stage_time', p_gig->>'call_time')::time,
        location_name = p_gig->>'venue_name',
        venue_name = p_gig->>'venue_name',
        location_address = p_gig->>'venue_address',
        venue_address = p_gig->>'venue_address',
        venue_maps_url = p_gig->>'venue_maps_url',
        hero_image_url = p_gig->>'hero_image_url',
        band_logo_url = p_gig->>'band_logo_url',
        gig_type = p_gig->>'gig_type',
        theme = p_gig->>'theme',
        poster_skin = p_gig->>'poster_skin',
        accent_color = p_gig->>'accent_color',
        dress_code = p_gig->>'dress_code',
        backline_notes = p_gig->>'backline_notes',
        parking_notes = p_gig->>'parking_notes',
        setlist = p_gig->>'setlist',
        setlist_pdf_url = p_gig->>'setlist_pdf_url',
        internal_notes = p_gig->>'internal_notes',
        payment_notes = p_gig->>'payment_notes',
        updated_at = now()
      WHERE id = p_gig_id
      RETURNING id INTO v_gig_id;

      IF v_gig_id IS NULL THEN
        RAISE EXCEPTION 'Gig not found or access denied (id: %)', p_gig_id;
      END IF;
    ELSE
      INSERT INTO gigs (
        title, date, band_id, band_name, call_time, on_stage_time, start_time,
        location_name, venue_name, location_address, venue_address, venue_maps_url,
        hero_image_url, band_logo_url, gig_type, theme, poster_skin, accent_color,
        dress_code, backline_notes, parking_notes, setlist, setlist_pdf_url, internal_notes, payment_notes,
        owner_id, created_at, updated_at
      ) VALUES (
        p_gig->>'title',
        COALESCE((p_gig->>'date')::timestamptz, now()),
        (p_gig->>'band_id')::uuid,
        p_gig->>'band_name',
        p_gig->>'call_time',
        p_gig->>'on_stage_time',
        COALESCE(p_gig->>'on_stage_time', p_gig->>'call_time')::time,
        p_gig->>'venue_name',
        p_gig->>'venue_name',
        p_gig->>'venue_address',
        p_gig->>'venue_address',
        p_gig->>'venue_maps_url',
        p_gig->>'hero_image_url',
        p_gig->>'band_logo_url',
        p_gig->>'gig_type',
        p_gig->>'theme',
        p_gig->>'poster_skin',
        p_gig->>'accent_color',
        p_gig->>'dress_code',
        p_gig->>'backline_notes',
        p_gig->>'parking_notes',
        p_gig->>'setlist',
        p_gig->>'setlist_pdf_url',
        p_gig->>'internal_notes',
        p_gig->>'payment_notes',
        v_user_id,
        now(),
        now()
      )
      RETURNING id INTO v_gig_id;
    END IF;
  EXCEPTION
    WHEN unique_violation THEN
      RAISE EXCEPTION 'Gig save failed (step 1): Duplicate key violation';
    WHEN foreign_key_violation THEN
      RAISE EXCEPTION 'Gig save failed (step 1): Invalid band reference';
    WHEN OTHERS THEN
      RAISE EXCEPTION 'Gig save failed (step 1): %', SQLERRM;
  END;

  -- ========================================
  -- STEP 2: Smart merge schedule items (BULK)
  -- ========================================
  BEGIN
    SELECT array_agg(id) INTO v_existing_ids
    FROM gig_schedule_items WHERE gig_id = v_gig_id;

    SELECT array_agg((item->>'id')::uuid) INTO v_new_ids
    FROM jsonb_array_elements(p_schedule) AS item
    WHERE item->>'id' IS NOT NULL AND item->>'id' != '';

    IF v_existing_ids IS NOT NULL AND array_length(v_existing_ids, 1) > 0 THEN
      SELECT array_agg(id) INTO v_to_delete
      FROM unnest(v_existing_ids) AS id
      WHERE id != ALL(COALESCE(v_new_ids, ARRAY[]::uuid[]));
      IF v_to_delete IS NOT NULL AND array_length(v_to_delete, 1) > 0 THEN
        DELETE FROM gig_schedule_items WHERE id = ANY(v_to_delete);
      END IF;
    END IF;

    IF jsonb_array_length(p_schedule) > 0 THEN
      INSERT INTO gig_schedule_items (id, gig_id, time, label, sort_order)
      SELECT
        COALESCE((item->>'id')::uuid, gen_random_uuid()),
        v_gig_id,
        COALESCE(item->>'time', ''),
        item->>'label',
        idx - 1
      FROM jsonb_array_elements(p_schedule) WITH ORDINALITY AS t(item, idx)
      ON CONFLICT (id) DO UPDATE SET
        time = EXCLUDED.time,
        label = EXCLUDED.label,
        sort_order = EXCLUDED.sort_order;
    END IF;
  EXCEPTION
    WHEN OTHERS THEN
      RAISE EXCEPTION 'Gig save failed (step 2 - schedule): %', SQLERRM;
  END;

  -- ========================================
  -- STEP 3: Smart merge materials (BULK)
  -- ========================================
  BEGIN
    SELECT array_agg(id) INTO v_existing_ids
    FROM gig_materials WHERE gig_id = v_gig_id;

    SELECT array_agg((item->>'id')::uuid) INTO v_new_ids
    FROM jsonb_array_elements(p_materials) AS item
    WHERE item->>'id' IS NOT NULL AND item->>'id' != '';

    IF v_existing_ids IS NOT NULL AND array_length(v_existing_ids, 1) > 0 THEN
      SELECT array_agg(id) INTO v_to_delete
      FROM unnest(v_existing_ids) AS id
      WHERE id != ALL(COALESCE(v_new_ids, ARRAY[]::uuid[]));
      IF v_to_delete IS NOT NULL AND array_length(v_to_delete, 1) > 0 THEN
        DELETE FROM gig_materials WHERE id = ANY(v_to_delete);
      END IF;
    END IF;

    IF jsonb_array_length(p_materials) > 0 THEN
      INSERT INTO gig_materials (id, gig_id, label, url, kind, sort_order)
      SELECT
        COALESCE((item->>'id')::uuid, gen_random_uuid()),
        v_gig_id,
        item->>'label',
        item->>'url',
        item->>'kind',
        idx - 1
      FROM jsonb_array_elements(p_materials) WITH ORDINALITY AS t(item, idx)
      ON CONFLICT (id) DO UPDATE SET
        label = EXCLUDED.label,
        url = EXCLUDED.url,
        kind = EXCLUDED.kind,
        sort_order = EXCLUDED.sort_order;
    END IF;
  EXCEPTION
    WHEN OTHERS THEN
      RAISE EXCEPTION 'Gig save failed (step 3 - materials): %', SQLERRM;
  END;

  -- ========================================
  -- STEP 4: Smart merge packing items (BULK)
  -- ========================================
  BEGIN
    SELECT array_agg(id) INTO v_existing_ids
    FROM gig_packing_items WHERE gig_id = v_gig_id;

    SELECT array_agg((item->>'id')::uuid) INTO v_new_ids
    FROM jsonb_array_elements(p_packing) AS item
    WHERE item->>'id' IS NOT NULL AND item->>'id' != '';

    IF v_existing_ids IS NOT NULL AND array_length(v_existing_ids, 1) > 0 THEN
      SELECT array_agg(id) INTO v_to_delete
      FROM unnest(v_existing_ids) AS id
      WHERE id != ALL(COALESCE(v_new_ids, ARRAY[]::uuid[]));
      IF v_to_delete IS NOT NULL AND array_length(v_to_delete, 1) > 0 THEN
        DELETE FROM gig_packing_items WHERE id = ANY(v_to_delete);
      END IF;
    END IF;

    IF jsonb_array_length(p_packing) > 0 THEN
      INSERT INTO gig_packing_items (id, gig_id, label, sort_order)
      SELECT
        COALESCE((item->>'id')::uuid, gen_random_uuid()),
        v_gig_id,
        item->>'label',
        idx - 1
      FROM jsonb_array_elements(p_packing) WITH ORDINALITY AS t(item, idx)
      ON CONFLICT (id) DO UPDATE SET
        label = EXCLUDED.label,
        sort_order = EXCLUDED.sort_order;
    END IF;
  EXCEPTION
    WHEN OTHERS THEN
      RAISE EXCEPTION 'Gig save failed (step 4 - packing): %', SQLERRM;
  END;

  -- ========================================
  -- STEP 5: Handle setlist sections + songs
  -- ========================================
  BEGIN
    DELETE FROM setlist_sections WHERE gig_id = v_gig_id;

    IF jsonb_array_length(p_setlist) > 0 THEN
      v_section_idx := 0;
      FOR v_section_record IN SELECT * FROM jsonb_array_elements(p_setlist) LOOP
        INSERT INTO setlist_sections (gig_id, name, sort_order)
        VALUES (v_gig_id, v_section_record.value->>'name', v_section_idx)
        RETURNING id INTO v_section_id;

        IF jsonb_array_length(COALESCE(v_section_record.value->'songs', '[]'::jsonb)) > 0 THEN
          INSERT INTO setlist_items (section_id, title, artist, key, tempo, notes, reference_url, sort_order)
          SELECT
            v_section_id,
            song->>'title',
            song->>'artist',
            song->>'key',
            song->>'tempo',
            song->>'notes',
            COALESCE(song->>'referenceUrl', song->>'reference_url'),
            idx - 1
          FROM jsonb_array_elements(v_section_record.value->'songs') WITH ORDINALITY AS t(song, idx);
        END IF;

        v_section_idx := v_section_idx + 1;
      END LOOP;
    END IF;
  EXCEPTION
    WHEN OTHERS THEN
      RAISE EXCEPTION 'Gig save failed (step 5 - setlist): %', SQLERRM;
  END;

  -- ========================================
  -- STEP 6: Handle gig roles (special merge logic)
  -- ========================================
  BEGIN
    IF jsonb_array_length(p_roles) > 0 THEN
      IF p_is_editing THEN
        UPDATE gig_roles gr SET
          role_name = item->>'role',
          musician_name = item->>'name',
          notes = item->>'notes'
        FROM jsonb_array_elements(p_roles) AS item
        WHERE gr.id = (item->>'gigRoleId')::uuid
          AND gr.gig_id = v_gig_id;

        INSERT INTO gig_roles (gig_id, role_name, musician_name, musician_id, contact_id, notes, sort_order, invitation_status)
        SELECT
          v_gig_id,
          item->>'role',
          item->>'name',
          COALESCE(NULLIF(item->>'userId', ''), NULLIF(item->>'linkedUserId', ''))::uuid,
          NULLIF(item->>'contactId', '')::uuid,
          item->>'notes',
          idx - 1 + COALESCE((SELECT COUNT(*) FROM gig_roles WHERE gig_id = v_gig_id), 0)::int,
          CASE
            WHEN COALESCE(NULLIF(item->>'userId', ''), NULLIF(item->>'linkedUserId', '')) IS NOT NULL
            THEN 'invited'
            ELSE 'pending'
          END
        FROM jsonb_array_elements(p_roles) WITH ORDINALITY AS t(item, idx)
        WHERE (item->>'gigRoleId' IS NULL OR item->>'gigRoleId' = '')
          AND NOT EXISTS (
            SELECT 1 FROM gig_roles gr
            WHERE gr.gig_id = v_gig_id
              AND (
                (COALESCE(NULLIF(item->>'userId', ''), NULLIF(item->>'linkedUserId', '')) IS NOT NULL
                 AND gr.musician_id = COALESCE(NULLIF(item->>'userId', ''), NULLIF(item->>'linkedUserId', ''))::uuid)
                OR
                (COALESCE(NULLIF(item->>'userId', ''), NULLIF(item->>'linkedUserId', '')) IS NULL
                 AND gr.role_name = item->>'role'
                 AND COALESCE(gr.musician_name, '') = COALESCE(item->>'name', ''))
              )
          );
      ELSE
        INSERT INTO gig_roles (gig_id, role_name, musician_name, musician_id, contact_id, notes, sort_order, invitation_status)
        SELECT
          v_gig_id,
          item->>'role',
          item->>'name',
          COALESCE(NULLIF(item->>'userId', ''), NULLIF(item->>'linkedUserId', ''))::uuid,
          NULLIF(item->>'contactId', '')::uuid,
          item->>'notes',
          idx - 1,
          CASE
            WHEN COALESCE(NULLIF(item->>'userId', ''), NULLIF(item->>'linkedUserId', '')) IS NOT NULL
            THEN 'invited'
            ELSE 'pending'
          END
        FROM jsonb_array_elements(p_roles) WITH ORDINALITY AS t(item, idx)
        WHERE item->>'role' IS NOT NULL;
      END IF;
    END IF;
  EXCEPTION
    WHEN OTHERS THEN
      RAISE EXCEPTION 'Gig save failed (step 6 - roles): %', SQLERRM;
  END;

  -- ========================================
  -- STEP 7: Smart merge gig contacts (BULK)
  -- ========================================
  BEGIN
    SELECT array_agg(id) INTO v_existing_ids
    FROM gig_contacts WHERE gig_id = v_gig_id;

    SELECT array_agg((item->>'id')::uuid) INTO v_new_ids
    FROM jsonb_array_elements(p_contacts) AS item
    WHERE item->>'id' IS NOT NULL AND item->>'id' != '';

    IF v_existing_ids IS NOT NULL AND array_length(v_existing_ids, 1) > 0 THEN
      SELECT array_agg(id) INTO v_to_delete
      FROM unnest(v_existing_ids) AS id
      WHERE id != ALL(COALESCE(v_new_ids, ARRAY[]::uuid[]));
      IF v_to_delete IS NOT NULL AND array_length(v_to_delete, 1) > 0 THEN
        DELETE FROM gig_contacts WHERE id = ANY(v_to_delete);
      END IF;
    END IF;

    IF jsonb_array_length(p_contacts) > 0 THEN
      INSERT INTO gig_contacts (id, gig_id, label, name, phone, email, sort_order)
      SELECT
        COALESCE((item->>'id')::uuid, gen_random_uuid()),
        v_gig_id,
        COALESCE(item->>'label', ''),
        COALESCE(item->>'name', ''),
        NULLIF(item->>'phone', ''),
        NULLIF(item->>'email', ''),
        idx - 1
      FROM jsonb_array_elements(p_contacts) WITH ORDINALITY AS t(item, idx)
      ON CONFLICT (id) DO UPDATE SET
        label = EXCLUDED.label,
        name = EXCLUDED.name,
        phone = EXCLUDED.phone,
        email = EXCLUDED.email,
        sort_order = EXCLUDED.sort_order;
    END IF;
  EXCEPTION
    WHEN OTHERS THEN
      RAISE EXCEPTION 'Gig save failed (step 7 - contacts): %', SQLERRM;
  END;

  -- ========================================
  -- STEP 8: Handle gig shares
  -- ========================================
  BEGIN
    IF p_share_token IS NOT NULL AND p_share_token != '' THEN
      INSERT INTO gig_shares (token, gig_id, is_active)
      VALUES (p_share_token, v_gig_id, true)
      ON CONFLICT (token) DO UPDATE SET
        gig_id = EXCLUDED.gig_id,
        is_active = true;
    END IF;
  EXCEPTION
    WHEN OTHERS THEN
      RAISE EXCEPTION 'Gig save failed (step 8 - shares): %', SQLERRM;
  END;

  -- Return result
  v_result := jsonb_build_object(
    'id', v_gig_id,
    'public_slug', p_share_token
  );

  RETURN v_result;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION save_gig_pack TO authenticated;

COMMENT ON FUNCTION save_gig_pack IS 'Atomic RPC to save entire gig pack (gig + schedule, materials, packing, setlist, roles, contacts, shares) in a single transaction.';
