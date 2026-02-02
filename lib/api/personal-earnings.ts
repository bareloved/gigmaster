import { createClient } from '@/lib/supabase/client';
import type { PersonalEarnings } from '@/lib/types/shared';

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
    .select('id, personal_earnings_amount, personal_earnings_currency, personal_earnings_notes, personal_earnings_paid_at')
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
    })
    .eq('id', roleId);

  if (error) throw error;
}
