import { createClient } from '@/lib/supabase/client';
import type { PlayerMoneySummary, PlayerMoneyGig } from '@/lib/types/shared';

/**
 * Player Money API
 * Functions for querying financial data for musicians/players
 */

/**
 * Get summary statistics for player money
 * @param userId - The musician's user ID
 * @param dateRange - Optional date range filter { from: 'YYYY-MM-DD', to: 'YYYY-MM-DD' }
 */
export async function getPlayerMoneySummary(
  userId: string,
  dateRange?: { from: string; to: string }
): Promise<PlayerMoneySummary> {
  const supabase = createClient();

  let query = supabase
    .from('gig_roles')
    .select('agreed_fee, is_paid, gigs!inner(date)')
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

  data.forEach((item: any) => {
    const fee = item.agreed_fee || 0;

    if (item.is_paid) {
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
      is_paid,
      paid_at,
      gigs!inner(
        id,
        title,
        date,
        projects(name)
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
  return data
    .map((item: any) => ({
      id: item.gigs.id,
      date: item.gigs.date,
      gigTitle: item.gigs.title,
      projectName: item.gigs.projects.name,
      roleName: item.role_name,
      agreedFee: item.agreed_fee,
      isPaid: item.is_paid,
      paidAt: item.paid_at,
      currency: 'ILS', // Default to ILS until currency field is added to database
    }))
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

