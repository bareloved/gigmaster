"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { generateSlug } from "@/lib/gigpack/utils";
import { GigPack, LineupMember, GigScheduleItem, GigMaterial, PackingChecklistItem, SetlistSection, GigPackTheme, PosterSkin } from "@/lib/gigpack/types";
// Note: createNotification from lib/api uses browser client, but we're on server
// So we'll insert notifications directly using the server supabase client
import { isArchivedStatus } from "@/lib/types/shared";
import { SupabaseClient } from "@supabase/supabase-js";

// ============================================
// HELPER FUNCTIONS FOR PARALLEL OPERATIONS
// ============================================

/**
 * Smart merge for schedule items - only deletes removed items, upserts rest
 */
async function smartMergeScheduleItems(
  supabase: SupabaseClient,
  gigId: string,
  newItems: GigScheduleItem[] | null | undefined
) {
  // Fetch existing items
  const { data: existing } = await supabase
    .from("gig_schedule_items")
    .select("id")
    .eq("gig_id", gigId);

  const existingIds = new Set(existing?.map(e => e.id) || []);
  const newIds = new Set(newItems?.filter(n => n.id).map(n => n.id) || []);

  // Delete items that are no longer in the list
  const toDelete = [...existingIds].filter(id => !newIds.has(id));
  if (toDelete.length > 0) {
    await supabase.from("gig_schedule_items").delete().in("id", toDelete);
  }

  // Upsert remaining items
  if (newItems && newItems.length > 0) {
    const toUpsert = newItems.map((item, i) => ({
      id: item.id || undefined,
      gig_id: gigId,
      time: item.time || "",
      label: item.label,
      sort_order: i,
    }));

    const { error } = await supabase.from("gig_schedule_items").upsert(toUpsert, {
      onConflict: "id",
      ignoreDuplicates: false
    });
    if (error) throw new Error(`Failed to upsert schedule: ${error.message}`);
  }
}

/**
 * Smart merge for materials - only deletes removed items, upserts rest
 */
async function smartMergeMaterials(
  supabase: SupabaseClient,
  gigId: string,
  newItems: GigMaterial[] | null | undefined
) {
  // Fetch existing items
  const { data: existing } = await supabase
    .from("gig_materials")
    .select("id")
    .eq("gig_id", gigId);

  const existingIds = new Set(existing?.map(e => e.id) || []);
  const newIds = new Set(newItems?.filter(n => n.id).map(n => n.id) || []);

  // Delete items that are no longer in the list
  const toDelete = [...existingIds].filter(id => !newIds.has(id));
  if (toDelete.length > 0) {
    await supabase.from("gig_materials").delete().in("id", toDelete);
  }

  // Upsert remaining items
  if (newItems && newItems.length > 0) {
    const toUpsert = newItems.map((item, i) => ({
      id: item.id || undefined,
      gig_id: gigId,
      label: item.label,
      url: item.url,
      kind: item.kind,
      sort_order: i,
    }));

    const { error } = await supabase.from("gig_materials").upsert(toUpsert, {
      onConflict: "id",
      ignoreDuplicates: false
    });
    if (error) throw new Error(`Failed to upsert materials: ${error.message}`);
  }
}

/**
 * Smart merge for packing items - only deletes removed items, upserts rest
 */
async function smartMergePackingItems(
  supabase: SupabaseClient,
  gigId: string,
  newItems: PackingChecklistItem[] | null | undefined
) {
  // Fetch existing items
  const { data: existing } = await supabase
    .from("gig_packing_items")
    .select("id")
    .eq("gig_id", gigId);

  const existingIds = new Set(existing?.map(e => e.id) || []);
  const newIds = new Set(newItems?.filter(n => n.id).map(n => n.id) || []);

  // Delete items that are no longer in the list
  const toDelete = [...existingIds].filter(id => !newIds.has(id));
  if (toDelete.length > 0) {
    await supabase.from("gig_packing_items").delete().in("id", toDelete);
  }

  // Upsert remaining items
  if (newItems && newItems.length > 0) {
    const toUpsert = newItems.map((item, i) => ({
      id: item.id || undefined,
      gig_id: gigId,
      label: item.label,
      sort_order: i,
    }));

    const { error } = await supabase.from("gig_packing_items").upsert(toUpsert, {
      onConflict: "id",
      ignoreDuplicates: false
    });
    if (error) throw new Error(`Failed to upsert packing items: ${error.message}`);
  }
}

/**
 * Batch insert setlist sections and songs (delete existing, insert fresh)
 * Uses batch operations instead of sequential loops
 */
async function handleSetlistSections(
  supabase: SupabaseClient,
  gigId: string,
  sections: SetlistSection[] | null | undefined
) {
  // Delete existing sections (cascade deletes songs)
  await supabase.from("setlist_sections").delete().eq("gig_id", gigId);

  if (!sections || sections.length === 0) return;

  // Batch insert all sections at once
  const sectionsToInsert = sections.map((s, i) => ({
    gig_id: gigId,
    name: s.name,
    sort_order: i
  }));

  const { data: insertedSections, error: sectionsError } = await supabase
    .from("setlist_sections")
    .insert(sectionsToInsert)
    .select("id, sort_order");

  if (sectionsError) throw new Error(`Failed to insert sections: ${sectionsError.message}`);

  // Batch insert all songs at once
  const allSongs = sections.flatMap((section, sectionIdx) => {
    const sectionId = insertedSections?.find(s => s.sort_order === sectionIdx)?.id;
    if (!sectionId || !section.songs || section.songs.length === 0) return [];

    return section.songs.map((song, songIdx) => ({
      section_id: sectionId,
      title: song.title,
      artist: song.artist || null,
      key: song.key || null,
      tempo: song.tempo || null,
      notes: song.notes || null,
      reference_url: song.referenceUrl || null,
      sort_order: songIdx
    }));
  });

  if (allSongs.length > 0) {
    const { error: songsError } = await supabase.from("setlist_items").insert(allSongs);
    if (songsError) throw new Error(`Failed to insert songs: ${songsError.message}`);
  }
}

/**
 * Handle gig shares - check and upsert
 */
async function handleGigShares(
  supabase: SupabaseClient,
  gigId: string,
  slug: string
) {
  if (!slug) return;

  const { data: existing } = await supabase
    .from("gig_shares")
    .select("token")
    .eq("gig_id", gigId)
    .single();

  if (!existing) {
    await supabase.from("gig_shares").insert({
      gig_id: gigId,
      token: slug,
      is_active: true
    });
  } else if (existing.token !== slug) {
    await supabase.from("gig_shares").update({ token: slug }).eq("gig_id", gigId);
  }
}

/**
 * Handle gig roles with smart merge and notifications
 * - Sets musician_id when user ID is provided
 * - Sets invitation_status to 'invited' for system users
 * - Sends notifications to invited users
 */
async function handleGigRoles(
  supabase: SupabaseClient,
  gigId: string,
  lineup: LineupMember[] | null | undefined,
  isEditing: boolean,
  gigTitle?: string
) {
  if (!lineup || lineup.length === 0) return;

  // Helper to get effective user ID (either direct userId or linkedUserId from contact)
  const getEffectiveUserId = (member: LineupMember): string | null => {
    return member.userId || member.linkedUserId || null;
  };

  if (isEditing) {
    // When editing: don't delete existing roles (preserves musician_id, contact_id, fees, etc.)
    // Only add NEW roles that don't already exist
    const { data: existingRoles } = await supabase
      .from("gig_roles")
      .select("role_name, musician_name")
      .eq("gig_id", gigId);

    // Create set of existing role+name combinations for quick lookup
    const existingSet = new Set(
      (existingRoles || []).map(r => `${r.role_name}::${r.musician_name || ''}`)
    );

    // Filter to only new roles that don't exist yet
    const newRoles = lineup.filter(member =>
      member.role && !existingSet.has(`${member.role}::${member.name || ''}`)
    );

    if (newRoles.length > 0) {
      const rolesToInsert = newRoles.map((member, index) => {
        const effectiveUserId = getEffectiveUserId(member);
        return {
          gig_id: gigId,
          role_name: member.role,
          musician_name: member.name || null,
          musician_id: effectiveUserId,
          contact_id: member.contactId || null,
          notes: member.notes || null,
          sort_order: (existingRoles?.length || 0) + index,
          // Set to 'invited' if we have a user ID, otherwise 'pending'
          invitation_status: effectiveUserId ? 'invited' : 'pending',
        };
      });

      const { data: insertedRoles, error } = await supabase
        .from("gig_roles")
        .insert(rolesToInsert)
        .select("id, musician_id, role_name");

      if (error) throw new Error(`Failed to insert roles: ${error.message}`);

      // Send notifications to users who were added (using server client directly)
      if (insertedRoles) {
        const rolesWithUsers = insertedRoles.filter(role => role.musician_id);
        if (rolesWithUsers.length > 0) {
          const notifications = rolesWithUsers.map(role => ({
            user_id: role.musician_id!,
            type: 'invitation_received',
            title: `Invitation: ${gigTitle || 'New Gig'}`,
            message: `You've been invited as ${role.role_name}`,
            link: `/gigs/${gigId}/pack`,
            gig_id: gigId,
            gig_role_id: role.id,
          }));

          const { error: notifError } = await supabase
            .from('notifications')
            .insert(notifications);

          if (notifError) {
            console.error("Failed to create notifications:", notifError);
          }
        }
      }
    }
  } else {
    // When creating new gig: insert all roles
    const rolesToInsert = lineup.map((member, index) => {
      const effectiveUserId = getEffectiveUserId(member);
      return {
        gig_id: gigId,
        role_name: member.role,
        musician_name: member.name || null,
        musician_id: effectiveUserId,
        contact_id: member.contactId || null,
        notes: member.notes || null,
        sort_order: index,
        invitation_status: effectiveUserId ? 'invited' : 'pending',
      };
    });

    const { data: insertedRoles, error } = await supabase
      .from("gig_roles")
      .insert(rolesToInsert)
      .select("id, musician_id, role_name");

    if (error) throw new Error(`Failed to insert roles: ${error.message}`);

    // Send notifications to users who were added (using server client directly)
    if (insertedRoles) {
      const rolesWithUsers = insertedRoles.filter(role => role.musician_id);
      if (rolesWithUsers.length > 0) {
        const notifications = rolesWithUsers.map(role => ({
          user_id: role.musician_id!,
          type: 'invitation_received',
          title: `Invitation: ${gigTitle || 'New Gig'}`,
          message: `You've been invited as ${role.role_name}`,
          link: `/gigs/${gigId}/pack`,
          gig_id: gigId,
          gig_role_id: role.id,
        }));

        const { error: notifError } = await supabase
          .from('notifications')
          .insert(notifications);

        if (notifError) {
          console.error("Failed to create notifications:", notifError);
        }
      }
    }
  }
}

/**
 * Fire-and-forget: Send invitation notifications to newly added users
 * Called after RPC save to notify users who were added to the gig
 * Uses unique constraint (user_id, gig_id, type) to prevent duplicates -
 * we simply try to insert for all users, and the DB ignores duplicates
 */
async function sendInvitationNotifications(
  supabase: SupabaseClient,
  gigId: string,
  lineup: LineupMember[] | null | undefined,
  gigTitle?: string
) {
  // Note: Notifications are now primarily created in the save_gig_pack RPC function.
  // This function serves as a backup for edge cases.
  if (!lineup || lineup.length === 0) return;

  try {
    const userIdsInLineup = lineup
      .filter(m => m.userId || m.linkedUserId)
      .map(m => m.userId || m.linkedUserId)
      .filter((id): id is string => !!id);

    if (userIdsInLineup.length === 0) return;

    const { data: roles } = await supabase
      .from('gig_roles')
      .select('id, musician_id, role_name')
      .eq('gig_id', gigId)
      .in('musician_id', userIdsInLineup);

    if (!roles || roles.length === 0) return;

    const notifications = roles.map(role => ({
      user_id: role.musician_id!,
      type: 'invitation_received',
      title: `Invitation: ${gigTitle || 'New Gig'}`,
      message: `You've been invited as ${role.role_name}`,
      link: `/gigs/${gigId}/pack`,
      gig_id: gigId,
      gig_role_id: role.id,
    }));

    // Insert with unique constraint handling - duplicates are silently ignored
    const { error: notifError } = await supabase
      .from('notifications')
      .insert(notifications);

    if (notifError && !notifError.message?.includes('duplicate') && notifError.code !== '23505') {
      console.error("Failed to create invitation notifications:", notifError);
    }
  } catch (err) {
    console.error("Exception in sendInvitationNotifications:", err);
  }
}

/**
 * Fire-and-forget: Detect important changes and notify musicians
 * Runs in background, doesn't block save response
 */
async function detectChangesAndNotify(
  supabase: SupabaseClient,
  gigId: string,
  newData: Partial<GigPack>,
  dateValue: string | undefined
) {
  try {
    // Fetch current gig state to compare
    const { data: currentGig } = await supabase
      .from("gigs")
      .select("title, date, call_time, on_stage_time, venue_name, location_name, venue_address, location_address")
      .eq("id", gigId)
      .single();

    if (!currentGig) return;

    const importantFieldsChanged =
      (newData.title && newData.title !== currentGig.title) ||
      (dateValue && new Date(dateValue).toISOString().split('T')[0] !== new Date(currentGig.date).toISOString().split('T')[0]) ||
      (newData.call_time && newData.call_time !== currentGig.call_time) ||
      (newData.on_stage_time && newData.on_stage_time !== currentGig.on_stage_time) ||
      (newData.venue_name && (newData.venue_name !== currentGig.venue_name && newData.venue_name !== currentGig.location_name)) ||
      (newData.venue_address && (newData.venue_address !== currentGig.venue_address && newData.venue_address !== currentGig.location_address));

    if (!importantFieldsChanged) return;

    // Fetch invited musicians
    const { data: roles } = await supabase
      .from('gig_roles')
      .select('musician_id')
      .eq('gig_id', gigId)
      .neq('invitation_status', 'pending')
      .not('musician_id', 'is', null);

    if (!roles || roles.length === 0) return;

    // Insert notifications directly using server client
    const notifications = roles.map(role => ({
      user_id: role.musician_id!,
      type: 'gig_updated',
      title: `Gig Updated: ${newData.title || currentGig.title}`,
      message: 'Important details (date, time, or location) have changed. Please check the gig pack.',
      link: `/gigs/${gigId}/pack`,
      gig_id: gigId,
    }));

    const { error: notifError } = await supabase
      .from('notifications')
      .insert(notifications);

    if (notifError) {
      console.error("Failed to send update notifications:", notifError);
    }
  } catch (err) {
    console.error("Failed to send update notifications:", err);
  }
}

export async function getGig(id: string): Promise<GigPack | null> {
  const supabase = await createClient();

  const { data: gig, error } = await supabase
    .from("gigs")
    .select(`
      *,
      owner:profiles!gigs_owner_profiles_fkey(name),
      gig_roles(*),
      gig_schedule_items(*),
      gig_materials(*),
      gig_packing_items(*),
      gig_shares(token),
      setlist_sections(
        *,
        setlist_items(*)
      )
    `)
    .eq("id", id)
    .single();

  if (error || !gig) return null;

  // Map to GigPack type
  const gigPack: GigPack = {
    id: gig.id,
    owner_id: gig.owner_id || "",
    owner_name: (gig.owner as any)?.name || null,
    title: gig.title,
    status: gig.status || "draft",
    band_id: gig.project_id,
    band_name: gig.band_name,
    date: gig.date ? gig.date.split('T')[0] : null, // Extract date portion from ISO timestamp
    call_time: gig.call_time,
    on_stage_time: gig.on_stage_time || gig.start_time, // Fallback to start_time for migration
    venue_name: gig.location_name || gig.venue_name,
    venue_address: gig.location_address || gig.venue_address,
    venue_maps_url: gig.venue_maps_url,
    lineup: gig.gig_roles?.map((r: any) => ({
      role: r.role_name,
      name: r.musician_name,
      notes: r.notes,
      invitationStatus: r.invitation_status || undefined,
      gigRoleId: r.id,
      userId: r.musician_id || undefined,
    })) || [],
    setlist: gig.setlist,
    setlist_structured: gig.setlist_sections?.map((s: any) => ({
      id: s.id,
      name: s.name,
      songs: s.setlist_items?.map((song: any) => ({
        id: song.id,
        title: song.title,
        artist: song.artist,
        key: song.key,
        tempo: song.tempo,
        notes: song.notes,
        referenceUrl: song.reference_url
      })) || []
    })) || [],
    dress_code: gig.dress_code,
    backline_notes: gig.backline_notes,
    parking_notes: gig.parking_notes,
    payment_notes: gig.payment_notes,
    internal_notes: gig.internal_notes,
    public_slug: gig.gig_shares?.[0]?.token || "",
    theme: gig.theme as GigPackTheme,
    is_archived: isArchivedStatus(gig.status),
    created_at: gig.created_at || new Date().toISOString(),
    updated_at: gig.updated_at || new Date().toISOString(),
    band_logo_url: gig.band_logo_url,
    hero_image_url: gig.hero_image_url,
    accent_color: gig.accent_color,
    poster_skin: gig.poster_skin as PosterSkin,
    packing_checklist: gig.gig_packing_items?.map((i: any) => ({
      id: i.id,
      label: i.label
    })) || [],
    gig_type: gig.gig_type,
    materials: gig.gig_materials?.map((m: any) => ({
      id: m.id,
      label: m.label,
      url: m.url,
      kind: m.kind
    })) || [],
    schedule: gig.gig_schedule_items?.map((s: any) => ({
      id: s.id,
      time: s.time,
      label: s.label
    })) || []
  };

  return gigPack;
}

// Feature flag: Use RPC for atomic single-call save (set to false to use legacy multi-call approach)
// RPC now handles userId/linkedUserId for musician_id and sends notifications after save
const USE_RPC_SAVE = true;

/**
 * Main save function - routes to RPC or legacy based on feature flag
 */
export async function saveGigPack(
  data: Partial<GigPack>,
  isEditing: boolean,
  gigId?: string
): Promise<{ id: string; publicSlug: string }> {
  if (USE_RPC_SAVE) {
    return saveGigPackRPC(data, isEditing, gigId);
  } else {
    return saveGigPackLegacy(data, isEditing, gigId);
  }
}

/**
 * NEW: Single RPC call that saves everything atomically
 * Reduces 18+ network calls to 1 call
 * Sends notifications to invited users after RPC completes (fire-and-forget)
 */
async function saveGigPackRPC(
  data: Partial<GigPack>,
  isEditing: boolean,
  gigId?: string
): Promise<{ id: string; publicSlug: string }> {
  const startTime = performance.now();

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("User not authenticated");
  }

  if (!data.title) {
    throw new Error("Title is required");
  }

  // Prepare slug for new gigs
  let publicSlug = data.public_slug || "";
  if (!publicSlug) {
    publicSlug = generateSlug(data.title);
  }

  // Convert date string to full ISO timestamp if provided
  let dateValue: string | undefined = undefined;
  if (data.date) {
    if (data.date.length === 10) {
      dateValue = `${data.date}T00:00:00.000Z`;
    } else {
      dateValue = data.date;
    }
  }

  try {
    // Build the gig object for RPC
    const gigPayload = {
      title: data.title,
      date: dateValue || new Date().toISOString(),
      project_id: data.band_id || null,
      band_name: data.band_name || null,
      call_time: data.call_time || null,
      on_stage_time: data.on_stage_time || null,
      venue_name: data.venue_name || null,
      venue_address: data.venue_address || null,
      venue_maps_url: data.venue_maps_url || null,
      hero_image_url: data.hero_image_url || null,
      band_logo_url: data.band_logo_url || null,
      gig_type: data.gig_type || null,
      theme: data.theme || null,
      poster_skin: data.poster_skin || null,
      accent_color: data.accent_color || null,
      dress_code: data.dress_code || null,
      backline_notes: data.backline_notes || null,
      parking_notes: data.parking_notes || null,
      setlist: data.setlist || null,
      internal_notes: data.internal_notes || null,
      payment_notes: data.payment_notes || null,
    };

    // Single RPC call - everything happens server-side in one transaction
     
    const { data: result, error } = await supabase.rpc('save_gig_pack', {
      p_gig: gigPayload,
      p_schedule: data.schedule || [],
      p_materials: data.materials || [],
      p_packing: data.packing_checklist || [],
      p_setlist: data.setlist_structured || [],
      p_roles: data.lineup || [],
      p_share_token: publicSlug || undefined,
      p_is_editing: isEditing,
      p_gig_id: gigId || undefined,
    } as any);

    if (error) {
      console.error('[GIG_SAVE_RPC] Error:', error);
      throw new Error(error.message);
    }

    // Cast result to expected shape
    const rpcResult = result as { id: string; public_slug: string } | null;
    const finalGigId = rpcResult?.id;
    const finalSlug = rpcResult?.public_slug || publicSlug;

    if (!finalGigId) {
      throw new Error("RPC did not return gig ID");
    }

    // Fire-and-forget: Send notifications to newly invited users
    // The function checks existing notifications to only notify NEW users
    sendInvitationNotifications(supabase, finalGigId, data.lineup, data.title).catch(err =>
      console.error("Background invitation notification error:", err)
    );

    // Fire-and-forget: Detect changes and notify musicians (doesn't block response)
    if (isEditing && gigId) {
      detectChangesAndNotify(supabase, gigId, data, dateValue).catch(err =>
        console.error("Background notification error:", err)
      );
    }

    revalidatePath("/gigs");
    revalidatePath(`/gigs/${finalGigId}`);

    // Log timing information
    const totalTime = performance.now() - startTime;
    console.log(`[GIG_SAVE_RPC] ${isEditing ? 'Edit' : 'Create'} completed:`, {
      gigId: finalGigId,
      total: `${totalTime.toFixed(0)}ms`,
      method: 'RPC (single call)',
    });

    return { id: finalGigId, publicSlug: finalSlug };

  } catch (error) {
    console.error("[GIG_SAVE_RPC] Error saving gig:", error);
    throw error;
  }
}

/**
 * LEGACY: Multi-call approach with Promise.all parallelization
 * Kept as fallback if RPC has issues
 */
async function saveGigPackLegacy(
  data: Partial<GigPack>,
  isEditing: boolean,
  gigId?: string
): Promise<{ id: string; publicSlug: string }> {
  const startTime = performance.now();
  const timings: Record<string, number> = {};

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("User not authenticated");
  }

  if (!data.title) {
    throw new Error("Title is required");
  }

  let finalGigId: string | undefined = gigId;
  // For existing gigs, use the provided slug. Only generate new slug for new gigs.
  let publicSlug = data.public_slug || "";

  try {
    // Convert date string to full ISO timestamp if provided
    let dateValue: string | undefined = undefined;
    if (data.date) {
      // If it's just a date string like "2025-01-15", convert to ISO timestamp
      if (data.date.length === 10) {
        dateValue = `${data.date}T00:00:00.000Z`;
      } else {
        dateValue = data.date;
      }
    }

    // Prepare slug for new gigs
    if (!publicSlug) {
      publicSlug = generateSlug(data.title);
    }

    // 1. Upsert Gig (must complete before related items)
    const gigData = {
      title: data.title,
      date: dateValue || new Date().toISOString(),
      project_id: data.band_id || null,
      band_name: data.band_name || null,
      call_time: data.call_time || null,
      on_stage_time: data.on_stage_time || null,
      start_time: data.on_stage_time || data.call_time || null, // Sync back to legacy column
      location_name: data.venue_name || null,
      venue_name: data.venue_name || null,
      location_address: data.venue_address || null,
      venue_address: data.venue_address || null,
      venue_maps_url: data.venue_maps_url || null,
      hero_image_url: data.hero_image_url || null,
      band_logo_url: data.band_logo_url || null,
      gig_type: data.gig_type || null,
      theme: data.theme || null,
      poster_skin: data.poster_skin || null,
      accent_color: data.accent_color || null,
      dress_code: data.dress_code || null,
      backline_notes: data.backline_notes || null,
      parking_notes: data.parking_notes || null,
      setlist: data.setlist || null,
      internal_notes: data.internal_notes || null,
      payment_notes: data.payment_notes || null,
      owner_id: user.id,
      updated_at: new Date().toISOString(),
    };

    const gigUpsertStart = performance.now();
    if (isEditing && gigId) {
      const { error } = await supabase
        .from("gigs")
        .update(gigData)
        .eq("id", gigId);

      if (error) throw error;
      finalGigId = gigId;
    } else {
      const { data: newGig, error } = await supabase
        .from("gigs")
        .insert(gigData)
        .select("id")
        .single();

      if (error) throw error;
      finalGigId = newGig.id;
    }
    timings.gigUpsert = performance.now() - gigUpsertStart;

    if (!finalGigId) throw new Error("Failed to get gig ID");

    // 2. Handle all related items IN PARALLEL for maximum performance
    // Smart merge preserves IDs, only deletes removed items, upserts the rest
    const relatedItemsStart = performance.now();
    await Promise.all([
      handleGigRoles(supabase, finalGigId, data.lineup, isEditing, data.title),
      smartMergeScheduleItems(supabase, finalGigId, data.schedule),
      smartMergeMaterials(supabase, finalGigId, data.materials),
      smartMergePackingItems(supabase, finalGigId, data.packing_checklist),
      handleSetlistSections(supabase, finalGigId, data.setlist_structured),
      handleGigShares(supabase, finalGigId, publicSlug),
    ]);
    timings.relatedItems = performance.now() - relatedItemsStart;

    // 3. Fire-and-forget: Detect changes and notify musicians (doesn't block response)
    if (isEditing && gigId) {
      detectChangesAndNotify(supabase, gigId, data, dateValue).catch(err =>
        console.error("Background notification error:", err)
      );
    }

    revalidatePath("/gigs");
    revalidatePath(`/gigs/${finalGigId}`);

    // Log timing information
    timings.total = performance.now() - startTime;
    console.log(`[GIG_SAVE_LEGACY] ${isEditing ? 'Edit' : 'Create'} completed:`, {
      gigId: finalGigId,
      gigUpsert: `${timings.gigUpsert?.toFixed(0)}ms`,
      relatedItems: `${timings.relatedItems?.toFixed(0)}ms`,
      total: `${timings.total.toFixed(0)}ms`,
      method: 'Legacy (multi-call)',
    });

    return { id: finalGigId, publicSlug };

  } catch (error) {
    console.error("Error saving gig:", error);
    throw error;
  }
}
