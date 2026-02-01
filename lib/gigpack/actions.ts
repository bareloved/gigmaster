"use server";

import { createClient } from "@/lib/supabase/server";
import { GigPack } from "@/lib/types/gigpack";
import { revalidatePath } from "next/cache";
import type { Database } from "@/lib/types/database";

export async function saveGigPack(data: Partial<GigPack>, isEditing: boolean) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Unauthorized");
  }

  // 1. Prepare Gig Payload
  // Map GigPack fields to Ensemble 'gigs' table columns
  type GigsInsert = Database['public']['Tables']['gigs']['Insert'];
  const gigPayload: Record<string, unknown> = {
    title: data.title,
    project_id: data.band_id || null, // Map band_id -> project_id
    date: data.date,
    call_time: data.call_time,
    on_stage_time: data.on_stage_time,
    location_name: data.venue_name, // Map venue_name -> location_name
    location_address: data.venue_address, // Map venue_address -> location_address
    venue_maps_url: data.venue_maps_url,
    status: "confirmed", // Default to confirmed or draft? GigPack doesn't explicitly toggle status in form?
    // GigPack specific fields (assuming columns added)
    theme: data.theme,
    poster_skin: data.poster_skin,
    accent_color: data.accent_color,
    dress_code: data.dress_code,
    backline_notes: data.backline_notes,
    parking_notes: data.parking_notes,
    payment_notes: data.payment_notes,
    internal_notes: data.internal_notes,
    gig_type: data.gig_type,
    band_logo_url: data.band_logo_url,
    hero_image_url: data.hero_image_url,
    setlist: data.setlist, // Legacy text setlist
    updated_at: new Date().toISOString(),
  };

  if (!isEditing) {
    gigPayload.owner_id = user.id;
    gigPayload.created_at = new Date().toISOString();
  }

  // 2. Upsert Gig
  let gigId = data.id;
  let error;

  if (isEditing && gigId) {
    const { error: updateError } = await supabase
      .from("gigs")
      .update(gigPayload as GigsInsert)
      .eq("id", gigId);
    error = updateError;
  } else {
    const { data: newGig, error: insertError } = await supabase
      .from("gigs")
      .insert(gigPayload as GigsInsert)
      .select("id")
      .single();
    if (newGig) gigId = newGig.id;
    error = insertError;
  }

  if (error) throw new Error(`Failed to save gig: ${error.message}`);
  if (!gigId) throw new Error("Failed to get gig ID");

  // 3. Handle Relations (Delete existing and re-insert for simplicity, or smart diff)
  // For MVP "Exact UI", we can just replace children.

  // 3.1 Schedule
  if (data.schedule) {
    await supabase.from("gig_schedule_items").delete().eq("gig_id", gigId);
    if (data.schedule.length > 0) {
      const items = data.schedule
        .filter((item) => item.time !== null) // Filter out items without time
        .map((item, i) => ({
          gig_id: gigId,
          time: item.time as string, // Safe after filter
          label: item.label,
          sort_order: i,
        }));
      if (items.length > 0) {
        await supabase.from("gig_schedule_items").insert(items);
      }
    }
  }

  // 3.2 Materials
  if (data.materials) {
    await supabase.from("gig_materials").delete().eq("gig_id", gigId);
    if (data.materials.length > 0) {
      const items = data.materials.map((item, i) => ({
        gig_id: gigId,
        label: item.label,
        url: item.url,
        kind: item.kind,
        sort_order: i,
      }));
      await supabase.from("gig_materials").insert(items);
    }
  }

  // 3.3 Packing Checklist
  if (data.packing_checklist) {
    await supabase.from("gig_packing_items").delete().eq("gig_id", gigId);
    if (data.packing_checklist.length > 0) {
      const items = data.packing_checklist.map((item, i) => ({
        gig_id: gigId,
        label: item.label,
        sort_order: i,
      }));
      await supabase.from("gig_packing_items").insert(items);
    }
  }

  // 3.4 Structured Setlist
  if (data.setlist_structured) {
    // Delete existing sections (cascade deletes items)
    await supabase.from("setlist_sections").delete().eq("gig_id", gigId);
    
    for (const [sectionIndex, section] of data.setlist_structured.entries()) {
      const { data: newSection } = await supabase
        .from("setlist_sections")
        .insert({
          gig_id: gigId,
          name: section.name,
          sort_order: sectionIndex,
        })
        .select("id")
        .single();

      if (newSection && section.songs.length > 0) {
        const songs = section.songs.map((song, songIndex) => ({
          section_id: newSection.id,
          title: song.title,
          artist: song.artist,
          key: song.key,
          tempo: song.tempo,
          notes: song.notes,
          reference_url: song.referenceUrl,
          sort_order: songIndex,
        }));
        await supabase.from("setlist_items").insert(songs);
      }
    }
  }

  // 3.5 Lineup / Roles
  // This is trickier because we might want to preserve user associations if they exist.
  // For now, we'll do a simple sync: 
  // - If role has ID, update it.
  // - If role is new, insert it.
  // - If role is missing from data, delete it? 
  // "gig-editor-panel" sends the FULL lineup. So we can sync.
  
  if (data.lineup) {
    // Fetch existing roles
    const { data: existingRoles } = await supabase
      .from("gig_roles")
      .select("id, role_name")
      .eq("gig_id", gigId);
    
    // We'll just delete all and re-create for the "Editor" mode to be safe/simple for now,
    // BUT this destroys payment status/invitations.
    // BETTER: Smart diff.
    
    // Actually, the `LineupMember` type in UI doesn't usually have `id`.
    // If the UI doesn't track IDs, we can't update.
    // The GigPack editor UI (`gig-editor-panel.tsx`) uses `LineupMember` which is `{ role, name, notes }`.
    // It does NOT track `id`.
    // This implies the GigPack editor DESTROYS and RECREATES roles on save.
    // This is dangerous for Ensemble which tracks payments/invites on roles.
    
    // COMPROMISE:
    // We will ONLY touch roles if the user explicitly changed them?
    // OR, we try to match by role_name?
    // Since this is the "GigPack Editor Port", and GigPack was simple, I will implement the simple behavior 
    // BUT I will try to preserve existing roles if they match `role_name`.
    
    // Strategy:
    // 1. Get existing roles.
    // 2. Iterate incoming lineup.
    // 3. If incoming role matches an existing role (by name), update it (name, notes). Mark as processed.
    // 4. If incoming role is new, insert it.
    // 5. Delete any existing roles that were NOT processed (removed from UI).
    
    const existing = existingRoles || [];
    const processedIds = new Set<string>();
    
    for (const [index, member] of data.lineup.entries()) {
      // Try to find a match
      // We match by role_name AND where we haven't matched yet.
      const match = existing.find(r => r.role_name === member.role && !processedIds.has(r.id));
      
      if (match) {
        // Update
        await supabase.from("gig_roles").update({
          musician_name: member.name, // Text field
          notes: member.notes,
          sort_order: index
        }).eq("id", match.id);
        processedIds.add(match.id);
      } else {
        // Insert
        await supabase.from("gig_roles").insert({
          gig_id: gigId,
          role_name: member.role,
          musician_name: member.name,
          notes: member.notes,
          sort_order: index,
          status: "pending" // Default
        });
      }
    }
    
    // Delete unmatched
    const toDelete = existing.filter(r => !processedIds.has(r.id));
    if (toDelete.length > 0) {
      await supabase.from("gig_roles").delete().in("id", toDelete.map(r => r.id));
    }
  }

  revalidatePath("/gigpacks");
  revalidatePath("/gigs");
  revalidatePath(`/gigs/${gigId}`);
  
  return await supabase.from("gigs").select("*").eq("id", gigId).single();
}

export async function deleteGigPack(gigId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  await supabase.from("gigs").delete().eq("id", gigId);
  revalidatePath("/gigpacks");
  revalidatePath("/gigs");
}

