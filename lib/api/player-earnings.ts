import { createClient } from '@/lib/supabase/client';
import type { EarningsSummary, BandEarnings, EarningsGig } from '@/lib/types/shared';

type Period = 'this-month' | 'last-month' | 'this-year' | 'last-year';

function getDateRange(period: Period): { from: string; to: string } {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth(); // 0-indexed

  switch (period) {
    case 'this-month': {
      const from = new Date(year, month, 1);
      const to = new Date(year, month + 1, 0); // last day of month
      return { from: from.toISOString().split('T')[0], to: to.toISOString().split('T')[0] };
    }
    case 'last-month': {
      const from = new Date(year, month - 1, 1);
      const to = new Date(year, month, 0);
      return { from: from.toISOString().split('T')[0], to: to.toISOString().split('T')[0] };
    }
    case 'this-year': {
      const from = new Date(year, 0, 1);
      const to = new Date(year, 11, 31);
      return { from: from.toISOString().split('T')[0], to: to.toISOString().split('T')[0] };
    }
    case 'last-year': {
      const from = new Date(year - 1, 0, 1);
      const to = new Date(year - 1, 11, 31);
      return { from: from.toISOString().split('T')[0], to: to.toISOString().split('T')[0] };
    }
  }
}

interface RoleWithGig {
  agreed_fee: number | null;
  currency: string | null;
  is_paid: boolean | null;
  paid_at: string | null;
  payment_method: string | null;
  expected_payment_date: string | null;
  personal_earnings_amount: number | null;
  personal_earnings_currency: string | null;
  gigs: {
    id: string;
    title: string;
    date: string;
    band_id: string | null;
    bands: { name: string } | null;
  };
}

async function fetchRolesForPeriod(userId: string, period: Period): Promise<RoleWithGig[]> {
  const supabase = createClient();
  const { from, to } = getDateRange(period);

  const { data, error } = await supabase
    .from('gig_roles')
    .select(`
      agreed_fee,
      currency,
      is_paid,
      paid_at,
      payment_method,
      expected_payment_date,
      personal_earnings_amount,
      personal_earnings_currency,
      gigs!inner(
        id,
        title,
        date,
        band_id,
        bands(name)
      )
    `)
    .eq('musician_id', userId)
    .gte('gigs.date', from)
    .lte('gigs.date', to)
    .is('gigs.deleted_at', null);

  if (error) throw error;

  // Filter out roles where gigs is null (inner join should prevent this, but be safe)
  return (data || []).filter(r => r.gigs != null) as unknown as RoleWithGig[];
}

function getAmount(role: RoleWithGig): number | null {
  return role.agreed_fee ?? role.personal_earnings_amount;
}

function getCurrency(role: RoleWithGig): string {
  if (role.agreed_fee != null) return role.currency || 'ILS';
  return role.personal_earnings_currency || 'ILS';
}

/**
 * Get earnings summary for a player
 * Returns totals for this month, last month, this year, last year
 */
export async function getEarningsSummary(userId: string): Promise<EarningsSummary> {
  const [thisMonthRoles, lastMonthRoles, thisYearRoles, lastYearRoles] = await Promise.all([
    fetchRolesForPeriod(userId, 'this-month'),
    fetchRolesForPeriod(userId, 'last-month'),
    fetchRolesForPeriod(userId, 'this-year'),
    fetchRolesForPeriod(userId, 'last-year'),
  ]);

  const summarize = (roles: RoleWithGig[]) => {
    let total = 0;
    let gigCount = 0;
    for (const role of roles) {
      const amount = getAmount(role);
      if (amount != null) {
        total += amount;
        gigCount++;
      }
    }
    return { total, gigCount, currency: 'ILS' };
  };

  const thisMonth = summarize(thisMonthRoles);
  const pending = thisMonthRoles
    .filter(r => r.agreed_fee != null && !r.is_paid)
    .reduce((sum, r) => sum + (r.agreed_fee || 0), 0);

  return {
    thisMonth: { ...thisMonth, pending },
    lastMonth: summarize(lastMonthRoles),
    thisYear: summarize(thisYearRoles),
    lastYear: summarize(lastYearRoles),
  };
}

/**
 * Get earnings breakdown by band
 */
export async function getEarningsByBand(
  userId: string,
  period: Period
): Promise<BandEarnings[]> {
  const roles = await fetchRolesForPeriod(userId, period);

  const bandMap = new Map<string | null, { bandName: string | null; total: number; gigCount: number }>();

  for (const role of roles) {
    const amount = getAmount(role);
    if (amount == null) continue;

    const bandId = role.gigs.band_id;
    const bandName = role.gigs.bands?.name || null;

    const existing = bandMap.get(bandId);
    if (existing) {
      existing.total += amount;
      existing.gigCount++;
    } else {
      bandMap.set(bandId, { bandName, total: amount, gigCount: 1 });
    }
  }

  return Array.from(bandMap.entries())
    .map(([bandId, data]) => ({
      bandId,
      bandName: data.bandName,
      total: data.total,
      gigCount: data.gigCount,
      currency: 'ILS',
    }))
    .sort((a, b) => b.total - a.total);
}

/**
 * Get earnings gig list for a period
 */
export async function getEarningsGigList(
  userId: string,
  period: Period
): Promise<EarningsGig[]> {
  const roles = await fetchRolesForPeriod(userId, period);

  return roles
    .map((role) => {
      const amount = getAmount(role);
      return {
        gigId: role.gigs.id,
        gigTitle: role.gigs.title,
        date: role.gigs.date,
        bandName: role.gigs.bands?.name || null,
        amount,
        currency: getCurrency(role),
        isPaid: role.is_paid ?? false,
        paidAt: role.paid_at,
        expectedPaymentDate: role.expected_payment_date,
        paymentMethod: role.payment_method,
        hasEarningsData: amount != null,
      };
    })
    .sort((a, b) => b.date.localeCompare(a.date));
}
