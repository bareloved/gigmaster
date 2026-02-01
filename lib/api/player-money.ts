import { createClient } from '@/lib/supabase/client';
import type { PlayerMoneySummary, PlayerMoneyGig } from '@/lib/types/shared';

// Type definitions for database rows
interface SummaryRow {
  agreed_fee: number | null;
  payment_status: string | null;
  gigs: { date: string };
}

interface GigPaymentRow {
  id: string;
  role_name: string;
  agreed_fee: number | null;
  payment_status: string | null;
  paid_at: string | null;
  gigs: {
    id: string;
    title: string;
    date: string;
    owner: { name: string | null } | null;
  };
}

/**
 * Player Money API
 * Functions for querying financial data for musicians/players
 * 
 * @deprecated This module is deprecated. Use lib/api/money.ts instead.
 * These functions are kept for backward compatibility during transition.
 */

/**
 * Get summary statistics for player money
 * @param userId - The musician's user ID
 * @param dateRange - Optional date range filter { from: 'YYYY-MM-DD', to: 'YYYY-MM-DD' }
 * @deprecated Use getMyEarnings from lib/api/money.ts instead
 */
export async function getPlayerMoneySummary(
  userId: string,
  dateRange?: { from: string; to: string }
): Promise<PlayerMoneySummary> {
  const supabase = createClient();

  let query = supabase
    .from('gig_roles')
    .select('agreed_fee, payment_status, gigs!inner(date)')
    .eq('musician_id', userId)
    .neq('invitation_status', 'pending') // Exclude pending roles (not yet invited)
    .not('agreed_fee', 'is', null);

  // Apply date range filter if provided
  if (dateRange) {
    query = query
      .gte('gigs.date', dateRange.from)
      .lte('gigs.date', dateRange.to);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching player money summary:', error);
    throw error;
  }

  if (!data || data.length === 0) {
    return {
      totalEarned: 0,
      totalUnpaid: 0,
      gigCount: 0,
      currency: 'ILS',
    };
  }

  // Calculate totals
  let totalEarned = 0;
  let totalUnpaid = 0;

  (data as SummaryRow[]).forEach((item) => {
    const fee = item.agreed_fee || 0;

    if (item.payment_status === 'paid') {
      totalEarned += fee;
    } else {
      totalUnpaid += fee;
    }
  });

  return {
    totalEarned,
    totalUnpaid,
    gigCount: data.length,
    currency: 'ILS', // Default to ILS until currency field is added to database
  };
}

/**
 * Get list of gigs with payment details for a player
 * @param userId - The musician's user ID
 * @param dateRange - Optional date range filter
 * @param limit - Maximum number of gigs to return (default: 50)
 * @deprecated Use getMyEarnings from lib/api/money.ts instead
 */
export async function getPlayerMoneyGigs(
  userId: string,
  dateRange?: { from: string; to: string },
  limit: number = 50
): Promise<PlayerMoneyGig[]> {
  const supabase = createClient();

  let query = supabase
    .from('gig_roles')
    .select(
      `
      id,
      role_name,
      agreed_fee,
      payment_status,
      paid_at,
      gigs!inner(
        id,
        title,
        date,
        owner_id,
        owner:profiles!gigs_owner_profiles_fkey(name)
      )
    `
    )
    .eq('musician_id', userId)
    .neq('invitation_status', 'pending') // Exclude pending roles (not yet invited)
    .limit(limit);

  // Apply date range filter if provided
  if (dateRange) {
    query = query
      .gte('gigs.date', dateRange.from)
      .lte('gigs.date', dateRange.to);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching player money gigs:', error);
    throw error;
  }

  if (!data) {
    return [];
  }

  // Transform the data to a flatter structure and sort by date descending
  return (data as GigPaymentRow[])
    .map((item) => ({
      id: item.gigs.id,
      date: item.gigs.date,
      gigTitle: item.gigs.title,
      hostName: item.gigs.owner?.name || null,
      roleName: item.role_name,
      agreedFee: item.agreed_fee,
      isPaid: item.payment_status === 'paid',
      paidAt: item.paid_at,
      currency: 'ILS', // Default to ILS until currency field is added to database
    }))
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

