import { createClient } from '@/lib/supabase/client';
import type { PersonalEarnings, PlayerPaymentInfo } from '@/lib/types/shared';

/**
 * Get personal earnings for the current user's role on a gig
 */
export async function getPersonalEarnings(gigId: string): Promise<{
  roleId: string;
  earnings: PersonalEarnings;
} | null> {
  const supabase = createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: role, error } = await supabase
    .from('gig_roles')
    .select('id, personal_earnings_amount, personal_earnings_currency, personal_earnings_notes, personal_earnings_paid_at, personal_earnings_payment_method')
    .eq('gig_id', gigId)
    .eq('musician_id', user.id)
    .maybeSingle();

  if (error || !role) return null;

  return {
    roleId: role.id,
    earnings: {
      amount: role.personal_earnings_amount,
      currency: role.personal_earnings_currency || 'ILS',
      notes: role.personal_earnings_notes,
      paidAt: role.personal_earnings_paid_at,
      paymentMethod: role.personal_earnings_payment_method,
    },
  };
}

/**
 * Get full payment info for current user's role on a gig
 * Combines manager-set payment fields with player-recorded earnings
 */
export async function getPlayerPaymentInfo(gigId: string): Promise<{
  roleId: string;
  payment: PlayerPaymentInfo;
} | null> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: role, error } = await supabase
    .from('gig_roles')
    .select(`
      id,
      agreed_fee,
      currency,
      is_paid,
      paid_at,
      payment_method,
      expected_payment_date,
      personal_earnings_amount,
      personal_earnings_currency,
      personal_earnings_notes,
      personal_earnings_paid_at,
      personal_earnings_payment_method
    `)
    .eq('gig_id', gigId)
    .eq('musician_id', user.id)
    .maybeSingle();

  if (error || !role) return null;

  return {
    roleId: role.id,
    payment: {
      agreedFee: role.agreed_fee,
      currency: role.currency || 'ILS',
      isPaid: role.is_paid ?? false,
      paidAt: role.paid_at,
      paymentMethod: role.payment_method,
      expectedPaymentDate: role.expected_payment_date,
      personalEarnings: {
        amount: role.personal_earnings_amount,
        currency: role.personal_earnings_currency || 'ILS',
        notes: role.personal_earnings_notes,
        paidAt: role.personal_earnings_paid_at,
        paymentMethod: role.personal_earnings_payment_method,
      },
    },
  };
}

/**
 * Update personal earnings for a gig role
 */
export async function updatePersonalEarnings(
  roleId: string,
  data: {
    amount: number | null;
    currency: string;
    notes: string | null;
    paidAt: string | null;
    paymentMethod: string | null;
  }
): Promise<void> {
  const supabase = createClient();

  const { error } = await supabase
    .from('gig_roles')
    .update({
      personal_earnings_amount: data.amount,
      personal_earnings_currency: data.currency,
      personal_earnings_notes: data.notes,
      personal_earnings_paid_at: data.paidAt,
      personal_earnings_payment_method: data.paymentMethod,
    })
    .eq('id', roleId);

  if (error) throw error;
}
