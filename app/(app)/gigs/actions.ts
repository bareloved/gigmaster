"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { generateSlug } from "@/lib/gigpack/utils";
import { GigPack, LineupMember, GigScheduleItem, GigMaterial, PackingChecklistItem, SetlistSection, GigPackTheme, PosterSkin } from "@/lib/gigpack/types";
import { createNotification } from "@/lib/api/notifications";

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
    status: gig.status || "active",
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
      notes: r.notes
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
    is_archived: gig.status === 'archived',
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

export async function saveGigPack(
  data: Partial<GigPack>,
  isEditing: boolean,
  gigId?: string
): Promise<{ id: string; publicSlug: string }> {
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
    // For existing gigs, fetch the current slug if not provided
    if (isEditing && gigId && !publicSlug) {
      const { data: existingShare } = await supabase
        .from("gig_shares")
        .select("token")
        .eq("gig_id", gigId)
        .single();

      if (existingShare?.token) {
        publicSlug = existingShare.token;
      }
    }

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

    // Check for changes and notify musicians if needed (only when editing)
    if (isEditing && gigId) {
      // Fetch current gig state to compare
      const { data: currentGig } = await supabase
        .from("gigs")
        .select("title, date, call_time, on_stage_time, venue_name, location_name, venue_address, location_address")
        .eq("id", gigId)
        .single();

      if (currentGig) {
        const importantFieldsChanged =
          (data.title && data.title !== currentGig.title) ||
          (dateValue && new Date(dateValue).toISOString().split('T')[0] !== new Date(currentGig.date).toISOString().split('T')[0]) || // Compare dates only
          (data.call_time && data.call_time !== currentGig.call_time) ||
          (data.on_stage_time && data.on_stage_time !== currentGig.on_stage_time) ||
          (data.venue_name && (data.venue_name !== currentGig.venue_name && data.venue_name !== currentGig.location_name)) ||
          (data.venue_address && (data.venue_address !== currentGig.venue_address && data.venue_address !== currentGig.location_address));

        if (importantFieldsChanged) {
          // Fetch invited musicians
          const { data: roles } = await supabase
            .from('gig_roles')
            .select('musician_id')
            .eq('gig_id', gigId)
            .neq('invitation_status', 'pending')
            .not('musician_id', 'is', null);

          if (roles && roles.length > 0) {
            // Notify each musician
            const notificationPromises = roles.map(role =>
              createNotification({
                user_id: role.musician_id!,
                type: 'gig_updated',
                title: `Gig Updated: ${data.title || currentGig.title}`,
                message: 'Important details (date, time, or location) have changed. Please check the gig pack.',
                link: `/gigs/${gigId}/pack`, // Assuming this is the correct link for the new pack view, or /p/{slug}
              })
            );

            // Execute all notifications (don't await to avoid slowing down the response)
            Promise.all(notificationPromises).catch(err =>
              console.error("Failed to send update notifications:", err)
            );
          }
        }
      }
    }

    // 1. Upsert Gig
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

    // Prepare slug for new gigs
    if (!publicSlug) {
      publicSlug = generateSlug(data.title);
    }

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

    if (!finalGigId) throw new Error("Failed to get gig ID");

    // 2. Handle Related Items (Delete all and insert new)
    // This is not efficient but safe for full sync logic of the editor.

    // Roles / Lineup
    await supabase.from("gig_roles").delete().eq("gig_id", finalGigId);
    if (data.lineup && data.lineup.length > 0) {
      const rolesToInsert = data.lineup.map((member, index) => ({
        gig_id: finalGigId!,
        role_name: member.role,
        musician_name: member.name || null,
        notes: member.notes || null,
        sort_order: index,
        invitation_status: 'pending',
      }));
      const { error } = await supabase.from("gig_roles").insert(rolesToInsert);
      if (error) console.error("Error inserting roles:", error);
    }

    // Schedule
    await supabase.from("gig_schedule_items").delete().eq("gig_id", finalGigId);
    if (data.schedule && data.schedule.length > 0) {
      const scheduleToInsert = data.schedule.map((item, index) => ({
        gig_id: finalGigId!,
        time: item.time || "",
        label: item.label,
        sort_order: index,
      }));
      const { error } = await supabase.from("gig_schedule_items").insert(scheduleToInsert);
      if (error) console.error("Error inserting schedule:", error);
    }

    // Materials
    await supabase.from("gig_materials").delete().eq("gig_id", finalGigId);
    if (data.materials && data.materials.length > 0) {
      const materialsToInsert = data.materials.map((item, index) => ({
        gig_id: finalGigId!,
        label: item.label,
        url: item.url,
        kind: item.kind,
        sort_order: index,
      }));
      const { error } = await supabase.from("gig_materials").insert(materialsToInsert);
      if (error) console.error("Error inserting materials:", error);
    }

    // Packing Checklist
    await supabase.from("gig_packing_items").delete().eq("gig_id", finalGigId);
    if (data.packing_checklist && data.packing_checklist.length > 0) {
      const packingToInsert = data.packing_checklist.map((item, index) => ({
        gig_id: finalGigId!,
        label: item.label,
        sort_order: index,
      }));
      const { error } = await supabase.from("gig_packing_items").insert(packingToInsert);
      if (error) console.error("Error inserting packing items:", error);
    }

    // Setlist Structured (Optional - if we want to use sections)
    if (data.setlist_structured && data.setlist_structured.length > 0) {
      // Delete existing sections (cascade deletes items)
      await supabase.from("setlist_sections").delete().eq("gig_id", finalGigId);

      for (const [sectionIndex, section] of data.setlist_structured.entries()) {
        const { data: sectionData, error: sectionError } = await supabase
          .from("setlist_sections")
          .insert({
            gig_id: finalGigId!,
            name: section.name,
            sort_order: sectionIndex
          })
          .select("id")
          .single();

        if (sectionError || !sectionData) continue;

        if (section.songs && section.songs.length > 0) {
          const songsToInsert = section.songs.map((song, songIndex) => ({
            section_id: sectionData.id,
            title: song.title,
            artist: song.artist || null,
            key: song.key || null,
            tempo: song.tempo || null,
            notes: song.notes || null,
            sort_order: songIndex
          }));
          await supabase.from("setlist_items").insert(songsToInsert);
        }
      }
    }

    // Public Share Token (ensure it exists)
    if (publicSlug) {
      const { data: existingShare } = await supabase
        .from("gig_shares")
        .select("token")
        .eq("gig_id", finalGigId)
        .single();

      if (!existingShare) {
        await supabase.from("gig_shares").insert({
          gig_id: finalGigId,
          token: publicSlug,
          is_active: true
        });
      } else if (existingShare.token !== publicSlug) {
        await supabase.from("gig_shares").update({ token: publicSlug }).eq("gig_id", finalGigId);
      }
    }

    revalidatePath("/gigs");
    revalidatePath(`/gigs/${finalGigId}`);

    return { id: finalGigId, publicSlug };

  } catch (error) {
    console.error("Error saving gig:", error);
    throw error;
  }
}
