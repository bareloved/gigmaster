-- ============================================================================
-- Update Dashboard Gigs RPC Functions with Payment Fields
-- ============================================================================
-- Adds: call_time, band_id, band_name, agreed_fee, player_currency,
--        is_paid, paid_at, payment_method, expected_payment_date,
--        personal_earnings_amount, personal_earnings_currency, is_external
-- WARNING: Do NOT reference project_id — that column is DEAD.

-- Drop old functions first (return type changed)
DROP FUNCTION IF EXISTS list_dashboard_gigs(UUID, DATE, DATE, INTEGER, INTEGER);
DROP FUNCTION IF EXISTS list_past_gigs(UUID, INTEGER, INTEGER);

CREATE OR REPLACE FUNCTION list_dashboard_gigs(
  p_user_id UUID,
  p_from_date DATE,
  p_to_date DATE,
  p_limit INTEGER DEFAULT 20,
  p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
  gig_id UUID,
  gig_title TEXT,
  date DATE,
  start_time TIME,
  end_time TIME,
  call_time TIME,
  location_name TEXT,
  status TEXT,
  is_manager BOOLEAN,
  is_player BOOLEAN,
  player_role_name TEXT,
  player_gig_role_id UUID,
  invitation_status TEXT,
  payment_status TEXT,
  host_name TEXT,
  host_id UUID,
  total_count BIGINT,
  gig_type TEXT,
  hero_image_url TEXT,
  role_stats JSONB,
  band_id UUID,
  band_name TEXT,
  agreed_fee NUMERIC,
  player_currency TEXT,
  is_paid BOOLEAN,
  paid_at TIMESTAMPTZ,
  payment_method TEXT,
  expected_payment_date DATE,
  personal_earnings_amount NUMERIC,
  personal_earnings_currency TEXT,
  is_external BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total_count BIGINT;
BEGIN
  -- First, get total count for pagination metadata
  SELECT COUNT(DISTINCT g.id) INTO v_total_count
  FROM gigs g
  LEFT JOIN gig_roles gr ON gr.gig_id = g.id
    AND gr.musician_id = p_user_id
    AND gr.invitation_status NOT IN ('pending', 'declined')
  WHERE g.date::DATE >= p_from_date
    AND g.date::DATE <= p_to_date
    AND g.deleted_at IS NULL
    AND (
      g.owner_id = p_user_id
      OR gr.musician_id IS NOT NULL
    );

  -- Return paginated results with all metadata
  RETURN QUERY
  WITH user_gigs AS (
    SELECT DISTINCT ON (g.id)
      g.id AS ug_gig_id,
      g.title AS ug_title,
      g.date::DATE AS ug_date,
      g.start_time AS ug_start_time,
      g.end_time AS ug_end_time,
      g.call_time AS ug_call_time,
      g.location_name AS ug_location_name,
      g.status AS ug_status,
      g.owner_id AS ug_owner_id,
      g.gig_type AS ug_gig_type,
      g.hero_image_url AS ug_hero_image_url,
      g.band_id AS ug_band_id,
      g.is_external AS ug_is_external,
      CASE WHEN g.is_external THEN FALSE ELSE (g.owner_id = p_user_id) END AS ug_is_mgr,
      gr.id AS ug_role_id,
      gr.role_name AS ug_role_name,
      gr.invitation_status AS ug_inv_status,
      gr.payment_status AS ug_pay_status,
      gr.agreed_fee AS ug_agreed_fee,
      gr.currency AS ug_currency,
      gr.is_paid AS ug_is_paid,
      gr.paid_at AS ug_paid_at,
      gr.payment_method AS ug_payment_method,
      gr.expected_payment_date AS ug_expected_payment_date,
      gr.personal_earnings_amount AS ug_pe_amount,
      gr.personal_earnings_currency AS ug_pe_currency,
      CASE WHEN g.is_external THEN TRUE
           ELSE (gr.musician_id = p_user_id AND gr.invitation_status NOT IN ('pending', 'declined'))
      END AS ug_is_plyr
    FROM gigs g
    LEFT JOIN gig_roles gr ON gr.gig_id = g.id
      AND gr.musician_id = p_user_id
      AND gr.invitation_status NOT IN ('pending', 'declined')
    WHERE g.date::DATE >= p_from_date
      AND g.date::DATE <= p_to_date
      AND g.deleted_at IS NULL
      AND (
        g.owner_id = p_user_id
        OR (gr.musician_id = p_user_id AND gr.invitation_status NOT IN ('pending', 'declined'))
      )
    ORDER BY g.id, gr.sort_order ASC NULLS LAST
  ),
  role_statistics AS (
    SELECT
      gr2.gig_id AS rs_gig_id,
      jsonb_build_object(
        'total', COUNT(*),
        'invited', COUNT(*) FILTER (WHERE gr2.invitation_status = 'invited'),
        'accepted', COUNT(*) FILTER (WHERE gr2.invitation_status = 'accepted'),
        'declined', COUNT(*) FILTER (WHERE gr2.invitation_status = 'declined'),
        'pending', COUNT(*) FILTER (WHERE gr2.invitation_status = 'pending')
      ) AS rs_stats
    FROM gig_roles gr2
    GROUP BY gr2.gig_id
  )
  SELECT
    ug.ug_gig_id,
    ug.ug_title,
    ug.ug_date,
    ug.ug_start_time,
    ug.ug_end_time,
    ug.ug_call_time,
    ug.ug_location_name,
    ug.ug_status,
    ug.ug_is_mgr,
    COALESCE(ug.ug_is_plyr, FALSE),
    ug.ug_role_name,
    ug.ug_role_id,
    ug.ug_inv_status,
    ug.ug_pay_status,
    p.name,
    ug.ug_owner_id,
    v_total_count,
    ug.ug_gig_type,
    ug.ug_hero_image_url,
    CASE WHEN ug.ug_is_mgr THEN rs.rs_stats ELSE NULL END,
    ug.ug_band_id,
    b.name,
    ug.ug_agreed_fee,
    ug.ug_currency,
    ug.ug_is_paid,
    ug.ug_paid_at,
    ug.ug_payment_method,
    ug.ug_expected_payment_date,
    ug.ug_pe_amount,
    ug.ug_pe_currency,
    COALESCE(ug.ug_is_external, FALSE)
  FROM user_gigs ug
  LEFT JOIN profiles p ON p.id = ug.ug_owner_id
  LEFT JOIN role_statistics rs ON rs.rs_gig_id = ug.ug_gig_id
  LEFT JOIN bands b ON b.id = ug.ug_band_id
  ORDER BY ug.ug_date ASC, ug.ug_start_time ASC NULLS LAST
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;

-- Function: list_past_gigs (updated with payment fields)
CREATE OR REPLACE FUNCTION list_past_gigs(
  p_user_id UUID,
  p_limit INTEGER DEFAULT 20,
  p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
  gig_id UUID,
  gig_title TEXT,
  date DATE,
  start_time TIME,
  end_time TIME,
  call_time TIME,
  location_name TEXT,
  status TEXT,
  is_manager BOOLEAN,
  is_player BOOLEAN,
  player_role_name TEXT,
  player_gig_role_id UUID,
  invitation_status TEXT,
  payment_status TEXT,
  host_name TEXT,
  host_id UUID,
  total_count BIGINT,
  gig_type TEXT,
  hero_image_url TEXT,
  band_id UUID,
  band_name TEXT,
  agreed_fee NUMERIC,
  player_currency TEXT,
  is_paid BOOLEAN,
  paid_at TIMESTAMPTZ,
  payment_method TEXT,
  expected_payment_date DATE,
  personal_earnings_amount NUMERIC,
  personal_earnings_currency TEXT,
  is_external BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total_count BIGINT;
  v_today DATE := CURRENT_DATE;
BEGIN
  -- Get total count
  SELECT COUNT(DISTINCT g.id) INTO v_total_count
  FROM gigs g
  LEFT JOIN gig_roles gr ON gr.gig_id = g.id
    AND gr.musician_id = p_user_id
    AND gr.invitation_status NOT IN ('pending', 'declined')
  WHERE g.date::DATE < v_today
    AND g.deleted_at IS NULL
    AND (
      g.owner_id = p_user_id
      OR gr.musician_id IS NOT NULL
    );

  -- Return paginated results
  RETURN QUERY
  WITH user_gigs AS (
    SELECT DISTINCT ON (g.id)
      g.id AS ug_gig_id,
      g.title AS ug_title,
      g.date::DATE AS ug_date,
      g.start_time AS ug_start_time,
      g.end_time AS ug_end_time,
      g.call_time AS ug_call_time,
      g.location_name AS ug_location_name,
      g.status AS ug_status,
      g.owner_id AS ug_owner_id,
      g.gig_type AS ug_gig_type,
      g.hero_image_url AS ug_hero_image_url,
      g.band_id AS ug_band_id,
      g.is_external AS ug_is_external,
      CASE WHEN g.is_external THEN FALSE ELSE (g.owner_id = p_user_id) END AS ug_is_mgr,
      gr.id AS ug_role_id,
      gr.role_name AS ug_role_name,
      gr.invitation_status AS ug_inv_status,
      gr.payment_status AS ug_pay_status,
      gr.agreed_fee AS ug_agreed_fee,
      gr.currency AS ug_currency,
      gr.is_paid AS ug_is_paid,
      gr.paid_at AS ug_paid_at,
      gr.payment_method AS ug_payment_method,
      gr.expected_payment_date AS ug_expected_payment_date,
      gr.personal_earnings_amount AS ug_pe_amount,
      gr.personal_earnings_currency AS ug_pe_currency,
      CASE WHEN g.is_external THEN TRUE
           ELSE (gr.musician_id = p_user_id AND gr.invitation_status NOT IN ('pending', 'declined'))
      END AS ug_is_plyr
    FROM gigs g
    LEFT JOIN gig_roles gr ON gr.gig_id = g.id
      AND gr.musician_id = p_user_id
      AND gr.invitation_status NOT IN ('pending', 'declined')
    WHERE g.date::DATE < v_today
      AND g.deleted_at IS NULL
      AND (
        g.owner_id = p_user_id
        OR (gr.musician_id = p_user_id AND gr.invitation_status NOT IN ('pending', 'declined'))
      )
    ORDER BY g.id, gr.sort_order ASC NULLS LAST
  )
  SELECT
    ug.ug_gig_id,
    ug.ug_title,
    ug.ug_date,
    ug.ug_start_time,
    ug.ug_end_time,
    ug.ug_call_time,
    ug.ug_location_name,
    ug.ug_status,
    ug.ug_is_mgr,
    COALESCE(ug.ug_is_plyr, FALSE),
    ug.ug_role_name,
    ug.ug_role_id,
    ug.ug_inv_status,
    ug.ug_pay_status,
    p.name,
    ug.ug_owner_id,
    v_total_count,
    ug.ug_gig_type,
    ug.ug_hero_image_url,
    ug.ug_band_id,
    b.name,
    ug.ug_agreed_fee,
    ug.ug_currency,
    ug.ug_is_paid,
    ug.ug_paid_at,
    ug.ug_payment_method,
    ug.ug_expected_payment_date,
    ug.ug_pe_amount,
    ug.ug_pe_currency,
    COALESCE(ug.ug_is_external, FALSE)
  FROM user_gigs ug
  LEFT JOIN profiles p ON p.id = ug.ug_owner_id
  LEFT JOIN bands b ON b.id = ug.ug_band_id
  ORDER BY ug.ug_date DESC, ug.ug_start_time DESC NULLS LAST
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;

-- Grant execute permissions (signature changed, re-grant)
GRANT EXECUTE ON FUNCTION list_dashboard_gigs(UUID, DATE, DATE, INTEGER, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION list_past_gigs(UUID, INTEGER, INTEGER) TO authenticated;
