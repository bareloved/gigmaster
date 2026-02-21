import { createClient } from "@/lib/supabase/client";
import type { Band } from "@/lib/types/gigpack";
import type { DashboardGig } from "@/lib/types/shared";

/**
 * Fetch all bands for the current user
 */
export async function listUserBands(): Promise<Band[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("bands")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message || "Failed to fetch bands");

  // Map database fields to Band interface
  return (data || []).map((b) => ({
    ...b,
    created_at: b.created_at as string, // View type is nullable but always has a value
    updated_at: b.updated_at as string, // View type is nullable but always has a value
    hero_image_url: b.hero_image_url || null,
    accent_color: b.accent_color || null,
    poster_skin: (b.poster_skin as "clean" | "paper" | "grain") || "clean",
    default_lineup: (b.default_lineup as Array<{ role: string; name?: string }>) || [],
  }));
}

/**
 * Fetch a single band by ID
 */
export async function getBand(bandId: string): Promise<Band | null> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("bands")
    .select("*")
    .eq("id", bandId)
    .single();

  if (error) {
    if (error.code === "PGRST116") return null; // Not found
    throw new Error(error.message || "Failed to fetch band");
  }

  return {
    ...data,
    created_at: data.created_at as string,
    updated_at: data.updated_at as string,
    hero_image_url: data.hero_image_url || null,
    accent_color: data.accent_color || null,
    poster_skin: (data.poster_skin as "clean" | "paper" | "grain") || "clean",
    default_lineup: (data.default_lineup as Array<{ role: string; name?: string }>) || [],
  };
}

/**
 * Fetch all gigs for a band, returning DashboardGig[] for reuse with DashboardGigItem.
 * Follows the same query + transform pattern as the dashboard fallback.
 * No date filtering — returns ALL gigs (past + future) for the band.
 */
export async function listBandGigs(bandId: string, userId: string): Promise<DashboardGig[]> {
  const supabase = createClient();

  const { data: allGigs, error } = await supabase
    .from("gigs")
    .select(`
      id,
      owner_id,
      title,
      date,
      start_time,
      end_time,
      call_time,
      location_name,
      status,
      hero_image_url,
      gig_type,
      is_external,
      band_id,
      owner:profiles!gigs_owner_profiles_fkey(
        id,
        name
      ),
      project:bands(
        name
      ),
      gig_roles (
        id,
        role_name,
        musician_name,
        invitation_status,
        payment_status,
        musician_id,
        agreed_fee,
        currency,
        is_paid,
        paid_at,
        payment_method,
        expected_payment_date,
        personal_earnings_amount,
        personal_earnings_currency
      )
    `)
    .eq("band_id", bandId)
    .is("deleted_at", null)
    .order("date", { ascending: false })
    .order("start_time", { ascending: false })
    .limit(200);

  if (error) {
    throw new Error(error.message || "Failed to fetch band gigs");
  }

  const gigs: DashboardGig[] = [];

  if (allGigs) {
    for (const gig of allGigs) {
      const roles = Array.isArray(gig.gig_roles) ? gig.gig_roles : [gig.gig_roles];
      const userRole = roles.find(r =>
        r?.musician_id === userId &&
        r?.invitation_status !== 'pending' &&
        r?.invitation_status !== 'declined'
      );

      const isExternalGig = gig.is_external ?? false;
      const isManager = isExternalGig ? false : gig.owner_id === userId;
      const isPlayer = isExternalGig ? true : !!userRole;

      if (!isManager && !isPlayer) continue;

      const ownerData = Array.isArray(gig.owner) ? gig.owner[0] : gig.owner;
      const hostName = ownerData?.name || null;
      const projectData = Array.isArray(gig.project) ? gig.project[0] : gig.project;
      const bandName = projectData?.name || null;

      let roleStats = null;
      if (isManager) {
        const total = roles.length;
        const invited = roles.filter(r => r?.invitation_status === 'invited').length;
        const accepted = roles.filter(r => r?.invitation_status === 'accepted').length;
        const declined = roles.filter(r => r?.invitation_status === 'declined').length;
        const pending = roles.filter(r => r?.invitation_status === 'pending').length;
        roleStats = { total, invited, accepted, declined, pending };
      }

      const acceptedMusicians = roles
        .filter(r => r?.invitation_status === 'accepted' && r?.musician_name)
        .map(r => ({ name: r.musician_name! }));

      gigs.push({
        gigId: gig.id,
        gigTitle: gig.title,
        date: gig.date,
        startTime: gig.start_time,
        endTime: gig.end_time,
        callTime: gig.call_time,
        locationName: gig.location_name,
        status: gig.status,
        isManager,
        isPlayer,
        isExternal: isExternalGig,
        playerRoleName: userRole?.role_name || null,
        playerGigRoleId: userRole?.id || null,
        invitationStatus: userRole?.invitation_status || null,
        hostId: gig.owner_id,
        hostName,
        bandId: gig.band_id,
        bandName,
        projectName: bandName,
        heroImageUrl: gig.hero_image_url,
        gigType: gig.gig_type,
        roleStats,
        acceptedMusicians,
        playerAgreedFee: userRole?.agreed_fee ?? null,
        playerCurrency: userRole?.currency ?? null,
        playerIsPaid: userRole?.is_paid ?? null,
        playerPaidAt: userRole?.paid_at ?? null,
        playerPaymentMethod: userRole?.payment_method ?? null,
        playerExpectedPaymentDate: userRole?.expected_payment_date ?? null,
        playerPersonalEarningsAmount: userRole?.personal_earnings_amount ?? null,
        playerPersonalEarningsCurrency: userRole?.personal_earnings_currency ?? null,
      });
    }
  }

  return gigs;
}

/**
 * Delete a band by ID
 */
export async function deleteBand(bandId: string): Promise<void> {
  const supabase = createClient();

  const { error } = await supabase
    .from("bands")
    .delete()
    .eq("id", bandId);

  if (error) throw new Error(error.message || "Failed to delete band");
}
