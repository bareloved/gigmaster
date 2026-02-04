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

/**
 * Result from duplicating a gig, includes counts of copied items
 */
export interface DuplicateGigResult {
  gig: Awaited<ReturnType<typeof getGig>>;
  counts: {
    roles: number;
    setlistSections: number;
    setlistItems: number;
    scheduleItems: number;
    materials: number;
  };
}

/**
 * Duplicates a gig with all its related data
 * @param sourceGigId - The ID of the gig to duplicate
 * @param newTitle - Optional title for the new gig (defaults to "Copy of {original}")
 * @param newDate - Optional date for the new gig (defaults to same as original)
 */
export async function duplicateGig(
  sourceGigId: string,
  newTitle?: string,
  newDate?: string
): Promise<DuplicateGigResult> {
  const supabase = createClient();

  // Verify user is authenticated
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError) throw new Error(`Authentication failed: ${authError.message}`);
  if (!user) throw new Error("Not authenticated. Please sign in again.");

  // Fetch the source gig
  const { data: sourceGig, error: gigError } = await supabase
    .from("gigs")
    .select("*")
    .eq("id", sourceGigId)
    .single();

  if (gigError) throw new Error(gigError.message || "Failed to fetch source gig");
  if (!sourceGig) throw new Error("Source gig not found");

  // Fetch related data in parallel
  const [rolesResult, sectionsResult, scheduleResult, materialsResult] = await Promise.all([
    supabase
      .from("gig_roles")
      .select("*")
      .eq("gig_id", sourceGigId)
      .order("sort_order", { ascending: true }),
    supabase
      .from("setlist_sections")
      .select(`
        *,
        setlist_items(*)
      `)
      .eq("gig_id", sourceGigId)
      .order("sort_order", { ascending: true }),
    supabase
      .from("gig_schedule_items")
      .select("*")
      .eq("gig_id", sourceGigId)
      .order("sort_order", { ascending: true }),
    supabase
      .from("gig_materials")
      .select("*")
      .eq("gig_id", sourceGigId)
      .order("sort_order", { ascending: true }),
  ]);

  // Create the new gig
  const { data: newGig, error: createError } = await supabase
    .from("gigs")
    .insert({
      // Copy most fields from source
      title: newTitle || `Copy of ${sourceGig.title}`,
      date: newDate || sourceGig.date,
      start_time: sourceGig.start_time,
      end_time: sourceGig.end_time,
      call_time: sourceGig.call_time,
      on_stage_time: sourceGig.on_stage_time,
      location_name: sourceGig.location_name,
      location_address: sourceGig.location_address,
      venue_name: sourceGig.venue_name,
      venue_address: sourceGig.venue_address,
      venue_maps_url: sourceGig.venue_maps_url,
      project_id: sourceGig.project_id,
      band_id: sourceGig.band_id,
      band_name: sourceGig.band_name,
      band_logo_url: sourceGig.band_logo_url,
      hero_image_url: sourceGig.hero_image_url,
      accent_color: sourceGig.accent_color,
      poster_skin: sourceGig.poster_skin,
      gig_type: sourceGig.gig_type,
      theme: sourceGig.theme,
      dress_code: sourceGig.dress_code,
      setlist: sourceGig.setlist,
      setlist_pdf_url: sourceGig.setlist_pdf_url,
      internal_notes: sourceGig.internal_notes,
      backline_notes: sourceGig.backline_notes,
      parking_notes: sourceGig.parking_notes,
      payment_notes: sourceGig.payment_notes,
      client_fee: sourceGig.client_fee,
      currency: sourceGig.currency,
      notes: sourceGig.notes,
      schedule: sourceGig.schedule,
      schedule_notes: sourceGig.schedule_notes,
      // Reset status to draft
      status: "draft",
      // Clear external calendar fields (this is a new gig)
      external_calendar_event_id: null,
      external_calendar_provider: null,
      external_event_url: null,
      imported_from_calendar: false,
      is_external: false,
      // Set owner to current user
      owner_id: user.id,
    })
    .select()
    .single();

  if (createError) throw new Error(createError.message || "Failed to create duplicate gig");
  if (!newGig) throw new Error("Failed to create duplicate gig");

  const newGigId = newGig.id;
  const counts = {
    roles: 0,
    setlistSections: 0,
    setlistItems: 0,
    scheduleItems: 0,
    materials: 0,
  };

  // Copy gig roles (reset invitation and payment status)
  const roles = rolesResult.data || [];
  if (roles.length > 0) {
    const rolesToInsert = roles.map((role) => ({
      gig_id: newGigId,
      role_name: role.role_name,
      musician_name: role.musician_name,
      musician_id: role.musician_id,
      contact_id: role.contact_id,
      agreed_fee: role.agreed_fee,
      currency: role.currency,
      notes: role.notes,
      sort_order: role.sort_order,
      // Reset statuses
      invitation_status: "pending",
      payment_status: "pending",
      is_paid: false,
      paid_amount: null,
      paid_at: null,
      player_notes: null,
      status: null,
      status_changed_at: null,
      status_changed_by: null,
    }));

    const { error: rolesError } = await supabase
      .from("gig_roles")
      .insert(rolesToInsert);

    if (rolesError) {
      console.error("Failed to copy roles:", rolesError);
    } else {
      counts.roles = rolesToInsert.length;
    }
  }

  // Copy setlist sections and items
  const sections = sectionsResult.data || [];
  if (sections.length > 0) {
    for (const section of sections) {
      // Create the section
      const { data: newSection, error: sectionError } = await supabase
        .from("setlist_sections")
        .insert({
          gig_id: newGigId,
          name: section.name,
          sort_order: section.sort_order,
        })
        .select()
        .single();

      if (sectionError) {
        console.error("Failed to copy section:", sectionError);
        continue;
      }

      counts.setlistSections++;

      // Copy items for this section
      const items = (section.setlist_items as Array<{
        title: string;
        artist: string | null;
        key: string | null;
        tempo: string | null;
        notes: string | null;
        reference_url: string | null;
        is_medley: boolean | null;
        sort_order: number | null;
      }>) || [];

      if (items.length > 0) {
        const itemsToInsert = items.map((item) => ({
          section_id: newSection.id,
          title: item.title,
          artist: item.artist,
          key: item.key,
          tempo: item.tempo,
          notes: item.notes,
          reference_url: item.reference_url,
          is_medley: item.is_medley,
          sort_order: item.sort_order,
        }));

        const { error: itemsError } = await supabase
          .from("setlist_items")
          .insert(itemsToInsert);

        if (itemsError) {
          console.error("Failed to copy setlist items:", itemsError);
        } else {
          counts.setlistItems += itemsToInsert.length;
        }
      }
    }
  }

  // Copy schedule items
  const scheduleItems = scheduleResult.data || [];
  if (scheduleItems.length > 0) {
    const scheduleToInsert = scheduleItems.map((item) => ({
      gig_id: newGigId,
      time: item.time,
      label: item.label,
      sort_order: item.sort_order,
    }));

    const { error: scheduleError } = await supabase
      .from("gig_schedule_items")
      .insert(scheduleToInsert);

    if (scheduleError) {
      console.error("Failed to copy schedule items:", scheduleError);
    } else {
      counts.scheduleItems = scheduleToInsert.length;
    }
  }

  // Copy materials/files
  const materials = materialsResult.data || [];
  if (materials.length > 0) {
    const materialsToInsert = materials.map((material) => ({
      gig_id: newGigId,
      label: material.label,
      url: material.url,
      kind: material.kind,
      sort_order: material.sort_order,
    }));

    const { error: materialsError } = await supabase
      .from("gig_materials")
      .insert(materialsToInsert);

    if (materialsError) {
      console.error("Failed to copy materials:", materialsError);
    } else {
      counts.materials = materialsToInsert.length;
    }
  }

  // Return the new gig with counts
  const finalGig = await getGig(newGigId);
  return { gig: finalGig, counts };
}
