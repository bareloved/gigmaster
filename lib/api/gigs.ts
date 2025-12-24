import { createClient } from "@/lib/supabase/client";
import type { Gig, GigInsert, GigUpdate } from "@/lib/types/shared";
import { createNotification } from "./notifications";

export async function createGig(data: Omit<GigInsert, "id" | "created_at" | "updated_at">) {
  const supabase = createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError) throw new Error(`Authentication failed: ${authError.message}`);
  if (!user) throw new Error("Not authenticated. Please sign in again.");

  const { data: gig, error } = await supabase
    .from("gigs")
    .insert({
      ...data,
      owner_id: user.id,
    })
    .select()
    .single();

  if (error) throw new Error(error.message || "Failed to create gig");
  return gig;
}

export async function getGig(gigId: string) {
  const supabase = createClient();

  const { data: gig, error } = await supabase
    .from("gigs")
    .select(`
      *,
      owner:profiles!gigs_owner_profiles_fkey (
        id,
        name
      )
    `)
    .eq("id", gigId)
    .single();

  // Handle case where gig doesn't exist (404) or access denied (403/406)
  if (error) {
    // If gig not found or access denied, return null instead of throwing
    if (error.code === 'PGRST116' || error.code === 'PGRST301' || error.message?.includes('No rows') || error.message?.includes('violates row-level security')) {
      return null;
    }
    throw new Error(error.message || "Failed to fetch gig");
  }
  return gig;
}

export async function updateGig(gigId: string, data: GigUpdate) {
  const supabase = createClient();

  // Get current gig to check if key details changed
  const { data: currentGig } = await supabase
    .from("gigs")
    .select("date, start_time, end_time, location_name, location_address, title")
    .eq("id", gigId)
    .single();

  const { data: gig, error } = await supabase
    .from("gigs")
    .update(data)
    .eq("id", gigId)
    .select()
    .single();

  if (error) throw new Error(error.message || "Failed to update gig");
  
  // Check if important details changed (date, time, or location)
  const importantFieldsChanged = currentGig && (
    (data.date && data.date !== currentGig.date) ||
    (data.start_time && data.start_time !== currentGig.start_time) ||
    (data.end_time && data.end_time !== currentGig.end_time) ||
    (data.location_name && data.location_name !== currentGig.location_name) ||
    (data.location_address && data.location_address !== currentGig.location_address)
  );
  
  // If important fields changed, notify all musicians who have been invited (not pending)
  if (importantFieldsChanged) {
    const { data: roles } = await supabase
      .from('gig_roles')
      .select('musician_id')
      .eq('gig_id', gigId)
      .neq('invitation_status', 'pending') // Don't notify pending roles (not yet invited)
      .not('musician_id', 'is', null);
    
    if (roles && roles.length > 0) {
      // Send notifications to all invited musicians
      for (const role of roles) {
        await createNotification({
          user_id: role.musician_id!,
          type: 'gig_updated',
          title: `Gig updated: ${currentGig.title}`,
          message: 'Date, time, or location has changed. Check the details!',
          link_url: `/gigs/${gigId}/pack`,
          gig_id: gigId,
        });
      }
    }
  }
  
  return gig;
}

export async function deleteGig(gigId: string) {
  const supabase = createClient();

  // Get gig details and invited musicians before deletion
  const { data: gig } = await supabase
    .from("gigs")
    .select(`
      title,
      gig_roles!inner (
        musician_id,
        invitation_status
      )
    `)
    .eq("id", gigId)
    .neq("gig_roles.invitation_status", "pending") // Only notify invited musicians (not pending)
    .single();
  
  // Notify all invited musicians before deleting
  if (gig) {
    const roles = gig.gig_roles as any[];
    if (roles && roles.length > 0) {
      for (const role of roles) {
        if (role.musician_id) {
          await createNotification({
            user_id: role.musician_id,
            type: 'gig_cancelled',
            title: `Gig cancelled: ${gig.title}`,
            message: 'This gig has been cancelled',
            link_url: `/dashboard`,
          });
        }
      }
    }
  }

  const { error } = await supabase
    .from("gigs")
    .delete()
    .eq("id", gigId);

  if (error) throw new Error(error.message || "Failed to delete gig");
}
