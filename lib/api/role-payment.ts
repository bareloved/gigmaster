import { createClient } from '@/lib/supabase/client';

export interface RolePaymentData {
  agreedFee: number | null;
  currency: string;
  paymentMethod: string | null;
  expectedPaymentDate: string | null;
  isPaid: boolean;
  paidAt: string | null;
}

export interface RolePaymentDefaults {
  current: RolePaymentData | null;
  lastGig: { agreedFee: number; currency: string; paymentMethod: string | null } | null;
  bandDefaults: { defaultFee: number | null; defaultCurrency: string | null; defaultPaymentMethod: string | null } | null;
}

/**
 * Fetch band-level payment defaults (fee, currency, method).
 * Used by local mode when no roleId exists yet.
 */
export async function getBandPaymentDefaults(
  bandId: string
): Promise<{ defaultFee: number | null; defaultCurrency: string | null; defaultPaymentMethod: string | null } | null> {
  const supabase = createClient();

  const { data: band } = await supabase
    .from('bands')
    .select('default_fee, default_currency, default_payment_method')
    .eq('id', bandId)
    .single();

  if (!band || (band.default_fee == null && band.default_payment_method == null)) {
    return null;
  }

  return {
    defaultFee: band.default_fee,
    defaultCurrency: band.default_currency,
    defaultPaymentMethod: band.default_payment_method,
  };
}

/**
 * Fetch payment defaults for a role: existing data, last-gig history, band defaults.
 */
export async function getRolePaymentDefaults(
  roleId: string,
  bandId: string | null
): Promise<RolePaymentDefaults> {
  const supabase = createClient();

  // 1. Current role payment data
  const { data: role } = await supabase
    .from('gig_roles')
    .select('agreed_fee, currency, payment_method, expected_payment_date, is_paid, paid_at, musician_id, gig_id')
    .eq('id', roleId)
    .single();

  const current: RolePaymentData | null = role?.agreed_fee != null
    ? {
        agreedFee: role.agreed_fee,
        currency: role.currency || 'ILS',
        paymentMethod: role.payment_method,
        expectedPaymentDate: role.expected_payment_date,
        isPaid: role.is_paid ?? false,
        paidAt: role.paid_at,
      }
    : null;

  // 2. Last gig with same musician + same band
  let lastGig: RolePaymentDefaults['lastGig'] = null;
  if (!current && role?.musician_id && bandId) {
    const { data: history } = await supabase
      .from('gig_roles')
      .select('agreed_fee, currency, payment_method, gigs!inner(date, band_id)')
      .eq('musician_id', role.musician_id)
      .not('agreed_fee', 'is', null)
      .neq('gig_id', role.gig_id)
      .order('gigs(date)', { ascending: false })
      .limit(10);

    // Filter client-side for matching band_id (Supabase can't filter nested joins easily)
    const match = (history || []).find(
      (r: Record<string, unknown>) => (r.gigs as Record<string, unknown> | null)?.band_id === bandId
    );
    if (match) {
      lastGig = {
        agreedFee: match.agreed_fee!,
        currency: match.currency || 'ILS',
        paymentMethod: match.payment_method,
      };
    }
  }

  // 3. Band defaults
  let bandDefaults: RolePaymentDefaults['bandDefaults'] = null;
  if (!current && !lastGig && bandId) {
    const { data: band } = await supabase
      .from('bands')
      .select('default_fee, default_currency, default_payment_method')
      .eq('id', bandId)
      .single();

    if (band && (band.default_fee != null || band.default_payment_method != null)) {
      bandDefaults = {
        defaultFee: band.default_fee,
        defaultCurrency: band.default_currency,
        defaultPaymentMethod: band.default_payment_method,
      };
    }
  }

  return { current, lastGig, bandDefaults };
}

/**
 * Update payment fields on a single gig_role.
 */
export async function updateRolePayment(
  roleId: string,
  data: RolePaymentData
): Promise<void> {
  const supabase = createClient();

  const { error } = await supabase
    .from('gig_roles')
    .update({
      agreed_fee: data.agreedFee,
      currency: data.currency,
      payment_method: data.paymentMethod,
      expected_payment_date: data.expectedPaymentDate,
      is_paid: data.isPaid,
      paid_at: data.paidAt,
    })
    .eq('id', roleId);

  if (error) throw error;
}

/**
 * Bulk set payment on all roles for a gig that don't already have agreed_fee.
 */
export async function bulkSetPayment(
  gigId: string,
  data: Omit<RolePaymentData, 'isPaid' | 'paidAt'>
): Promise<number> {
  const supabase = createClient();

  // Get roles without payment data
  const { data: roles, error: fetchError } = await supabase
    .from('gig_roles')
    .select('id')
    .eq('gig_id', gigId)
    .is('agreed_fee', null);

  if (fetchError) throw fetchError;
  if (!roles || roles.length === 0) return 0;

  const { error } = await supabase
    .from('gig_roles')
    .update({
      agreed_fee: data.agreedFee,
      currency: data.currency,
      payment_method: data.paymentMethod,
      expected_payment_date: data.expectedPaymentDate,
    })
    .eq('gig_id', gigId)
    .is('agreed_fee', null);

  if (error) throw error;
  return roles.length;
}
