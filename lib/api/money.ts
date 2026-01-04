import { createClient } from '@/lib/supabase/client';
import type { 
  MyEarningsGig, 
  MyEarningsSummary, 
  PayoutRow,
  PaymentStatus,
  PaymentStatusUpdate 
} from '@/lib/types/shared';

/**
 * Get My Earnings data for current user
 * Filtered by year and optional month
 */
export async function getMyEarnings(
  year: number,
  month?: number | null
): Promise<{ gigs: MyEarningsGig[]; summary: MyEarningsSummary }> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  // Build date range for filtering
  const dateFrom = month 
    ? `${year}-${String(month).padStart(2, '0')}-01`
    : `${year}-01-01`;
  
  // Calculate the last day of the month correctly
  const dateTo = month
    ? (() => {
        const lastDay = new Date(year, month, 0).getDate(); // Get last day of month
        return `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
      })()
    : `${year}-12-31`;

  // Query gig_roles with joins
  const { data: roles, error } = await supabase
    .from('gig_roles')
    .select(`
      id,
      role_name,
      agreed_fee,
      payment_status,
      paid_amount,
      paid_at,
      currency,
      gigs!inner(
        id,
        title,
        date,
        location_name,
        owner_id,
        owner:profiles!gigs_owner_profiles_fkey(
          name
        )
      )
    `)
    .eq('musician_id', user.id)
    .not('agreed_fee', 'is', null)
    .gte('gigs.date', dateFrom)
    .lte('gigs.date', dateTo);

  if (error) throw error;

  // Transform to MyEarningsGig[]
  const gigs: MyEarningsGig[] = (roles || []).map((r: any) => ({
    gigRoleId: r.id,
    gigId: r.gigs.id,
    gigTitle: r.gigs.title,
    hostName: r.gigs.owner?.name || null,
    date: r.gigs.date,
    roleName: r.role_name,
    locationName: r.gigs.location_name,
    feeAmount: r.agreed_fee,
    currency: r.currency || 'ILS',
    paymentStatus: r.payment_status as PaymentStatus,
    paidAmount: r.paid_amount,
    paidDate: r.paid_at,
  }));

  // Sort by date descending (most recent first)
  gigs.sort((a, b) => b.date.localeCompare(a.date));

  // Calculate summary (from filtered data)
  const currentDate = new Date();
  const thisMonth = currentDate.getMonth() + 1;
  const thisYear = currentDate.getFullYear();

  let thisMonthGross = 0;
  let unpaidGross = 0;
  let paidGross = 0;

  gigs.forEach(g => {
    const fee = g.feeAmount || 0;
    const gigDate = new Date(g.date);
    const gigMonth = gigDate.getMonth() + 1;
    const gigYear = gigDate.getFullYear();

    // This month (current month only)
    if (gigYear === thisYear && gigMonth === thisMonth) {
      thisMonthGross += fee;
    }

    // Unpaid (pending, overdue, or partial unpaid amount)
    if (g.paymentStatus === 'pending' || g.paymentStatus === 'overdue') {
      unpaidGross += fee;
    } else if (g.paymentStatus === 'partial') {
      unpaidGross += (fee - (g.paidAmount || 0));
    }

    // Paid (fully paid or partial paid amount)
    if (g.paymentStatus === 'paid') {
      paidGross += (g.paidAmount || fee);
    } else if (g.paymentStatus === 'partial') {
      paidGross += (g.paidAmount || 0);
    }
  });

  return {
    gigs,
    summary: {
      unpaidGross,
      paidGross,
      thisMonthGross,
      currency: 'ILS',
    },
  };
}

/**
 * Get Payouts data for gigs managed by current user
 * Filtered by year, optional month, optional project, optional status
 */
export async function getPayouts(
  year: number,
  month?: number | null,
  statusFilter?: PaymentStatus | null
): Promise<PayoutRow[]> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  // Build date range
  const dateFrom = month 
    ? `${year}-${String(month).padStart(2, '0')}-01`
    : `${year}-01-01`;
  
  // Calculate the last day of the month correctly
  const dateTo = month
    ? (() => {
        const lastDay = new Date(year, month, 0).getDate(); // Get last day of month
        return `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
      })()
    : `${year}-12-31`;

  // Query gig_roles for gigs where user is project owner
  let query = supabase
    .from('gig_roles')
    .select(`
      id,
      musician_id,
      musician_name,
      role_name,
      agreed_fee,
      payment_status,
      paid_amount,
      paid_at,
      currency,
      gigs!inner(
        id,
        title,
        date,
        owner_id
      )
    `)
    .eq('gigs.owner_id', user.id)
    .not('agreed_fee', 'is', null)
    .gte('gigs.date', dateFrom)
    .lte('gigs.date', dateTo);

  // Apply status filter
  if (statusFilter) {
    query = query.eq('payment_status', statusFilter);
  }

  const { data: roles, error } = await query;
  if (error) throw error;

  // Transform to PayoutRow[]
  const payouts = (roles || []).map((r: any) => ({
    gigRoleId: r.id,
    gigId: r.gigs.id,
    gigTitle: r.gigs.title,
    hostName: null,
    date: r.gigs.date,
    musicianId: r.musician_id,
    musicianName: r.musician_name,
    roleName: r.role_name,
    feeAmount: r.agreed_fee,
    currency: r.currency || 'ILS',
    paymentStatus: r.payment_status as PaymentStatus,
    paidAmount: r.paid_amount,
    paidDate: r.paid_at,
  }));

  // Sort by date descending (most recent first)
  payouts.sort((a, b) => b.date.localeCompare(a.date));

  return payouts;
}

/**
 * Update payment status for a gig role
 * Checks authorization: either musician themselves or gig manager
 */
export async function updatePaymentStatus(
  update: PaymentStatusUpdate
): Promise<void> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  // Fetch role with gig/project to check authorization
  const { data: role, error: fetchError } = await supabase
    .from('gig_roles')
    .select(`
      id,
      musician_id,
      agreed_fee,
      gigs!inner(
        owner_id
      )
    `)
    .eq('id', update.gigRoleId)
    .single();

  if (fetchError || !role) throw new Error('Role not found');

  const isMusician = role.musician_id === user.id;
  const isManager = (role.gigs as any).owner_id === user.id;

  if (!isMusician && !isManager) {
    throw new Error('Not authorized to update this payment');
  }

  // Build update object
  const updateData: any = {
    payment_status: update.paymentStatus,
  };

  // Auto-fill paid_amount for 'paid' status
  if (update.paymentStatus === 'paid') {
    updateData.paid_amount = update.paidAmount ?? role.agreed_fee;
    updateData.paid_at = update.paidDate ?? new Date().toISOString();
  } else if (update.paymentStatus === 'partial') {
    updateData.paid_amount = update.paidAmount;
    updateData.paid_at = update.paidDate ?? new Date().toISOString();
  } else {
    // pending or overdue: clear paid fields
    updateData.paid_amount = null;
    updateData.paid_at = null;
  }

  // Update
  const { error: updateError } = await supabase
    .from('gig_roles')
    .update(updateData)
    .eq('id', update.gigRoleId);

  if (updateError) throw updateError;
}

/**
 * Check if user is a manager (owns at least one project)
 */
export async function checkIsManager(userId: string): Promise<boolean> {
  const supabase = createClient();
  const { data } = await supabase
    .from('gigs')
    .select('id')
    .eq('owner_id', userId)
    .limit(1);
  return (data?.length || 0) > 0;
}

