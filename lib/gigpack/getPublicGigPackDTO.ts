import { createAdminClient } from "@/lib/supabase/admin";
import { GigPack, GigPackTheme, PosterSkin } from "@/lib/gigpack/types";
import { isArchivedStatus } from "@/lib/types/shared";
import {
  transformScheduleItems,
  transformLineup,
  transformMaterials,
  transformPackingChecklist,
  transformSetlistStructured,
} from "./transforms";
import type {
  ScheduleItemRow,
  RoleRow,
  MaterialRow,
  PackingItemRow,
  SetlistSectionRow,
} from "./transforms";

// Helper type for public DTO (subset of GigPack)
export type PublicGigPackDTO = Omit<GigPack, "internal_notes" | "owner_id">;

export async function getPublicGigPackDTO(token: string): Promise<PublicGigPackDTO | null> {
  const supabase = createAdminClient();

  const { data: share, error } = await supabase
    .from("gig_shares")
    .select(`
      *,
      gig:gigs (
        *,
        schedule:gig_schedule_items(*),
        roles:gig_roles(*, contact:musician_contacts(email, phone)),
        setlist_sections:setlist_sections(
          *,
          items:setlist_items(*)
        ),
        materials:gig_materials(*),
        packing:gig_packing_items(*)
      )
    `)
    .eq("token", token)
    .eq("is_active", true)
    .single();

  if (error) {
    console.error("Error fetching gig pack:", error);
    return null;
  }

  if (!share || !share.gig) {
    return null;
  }

  if (share.expires_at && new Date(share.expires_at) < new Date()) {
    return null;
  }

  const gig = share.gig;

  // Transform to DTO
  const dto: PublicGigPackDTO = {
    id: gig.id,
    title: gig.title,
    band_id: gig.band_id,
    date: gig.date,
    call_time: gig.call_time,
    on_stage_time: gig.on_stage_time,
    venue_name: gig.location_name || gig.venue_name,
    venue_address: gig.location_address || gig.venue_address,
    venue_maps_url: gig.venue_maps_url,
    // cover_image_path is Ensemble name, hero_image_url is GigPack name
    hero_image_url: gig.hero_image_url || gig.cover_image_path,
    band_name: gig.band_name,
    band_logo_url: gig.band_logo_url,
    gig_type: gig.gig_type,
    updated_at: gig.updated_at || new Date().toISOString(),
    created_at: gig.created_at || new Date().toISOString(),
    accent_color: gig.accent_color,
    status: gig.status,
    is_archived: isArchivedStatus(gig.status),
    public_slug: token,

    theme: (gig.theme || "minimal") as GigPackTheme,
    poster_skin: (gig.poster_skin || "clean") as PosterSkin,

    schedule: transformScheduleItems((gig.schedule || []) as ScheduleItemRow[]),

    lineup: await transformLineup(supabase, (gig.roles || []) as RoleRow[]),

    setlist: gig.setlist, // Flat text
    setlist_pdf_url: gig.setlist_pdf_url
      ? `/api/gigpack/${token}/setlist-pdf`
      : null,

    setlist_structured: transformSetlistStructured(
      (gig.setlist_sections || []) as SetlistSectionRow[]
    ),

    materials: transformMaterials((gig.materials || []) as MaterialRow[]),

    packing_checklist: transformPackingChecklist((gig.packing || []) as PackingItemRow[]),

    dress_code: gig.dress_code,
    backline_notes: gig.backline_notes,
    parking_notes: gig.parking_notes,
    notes: gig.notes,
    payment_notes: null,
    contacts: null, // Contacts not exposed in public share

    // Pre-fetch activity for public view (no auth available client-side)
    activity: await (async () => {
      const { data: activityRows } = await supabase
        .from('gig_activity_log')
        .select('id, gig_id, user_id, activity_type, description, metadata, created_at, user:user_id(name, avatar_url)')
        .eq('gig_id', gig.id)
        .order('created_at', { ascending: false })
        .limit(10);
      return (activityRows || []).map((a: Record<string, unknown>) => ({
        id: a.id as string,
        gig_id: a.gig_id as string,
        user_id: a.user_id as string | null,
        activity_type: a.activity_type as string,
        description: a.description as string,
        metadata: (a.metadata || {}) as Record<string, unknown>,
        created_at: a.created_at as string,
        user: a.user as { name: string | null; avatar_url: string | null } | undefined,
      }));
    })(),
  };

  return dto;
}
