import { createClient } from "@/lib/supabase/client";
import type { GigInsert, GigUpdate } from "@/lib/types/shared";
import { createNotification } from "./notifications";

export async function createGig(data: Omit<GigInsert, "id" | "created_at" | "updated_at" | "owner_id">) {
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

  const { data: gig, error } = await supabase
    .from("gigs")
    .update(data)
    .eq("id", gigId)
    .select()
    .single();

  if (error) throw new Error(error.message || "Failed to update gig");

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
        id,
        musician_id,
        invitation_status
      )
    `)
    .eq("id", gigId)
    .neq("gig_roles.invitation_status", "pending") // Only notify invited musicians (not pending)
    .single();

  // Notify all invited musicians before deleting
  if (gig) {
    const roles = gig.gig_roles as Array<{ id: string; musician_id: string | null }>;
    if (roles && roles.length > 0) {
      for (const role of roles) {
        if (role.musician_id) {
          await createNotification({
            user_id: role.musician_id,
            type: 'gig_cancelled',
            title: `Gig cancelled: ${gig.title}`,
            message: 'This gig has been cancelled',
            link: `/dashboard`,
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
