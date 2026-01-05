import { createAdminClient } from "@/lib/supabase/admin";
import { GigPack, GigPackTheme, PosterSkin } from "@/lib/gigpack/types";

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
        roles:gig_roles(*),
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
    band_id: gig.project_id,
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
    updated_at: gig.updated_at,
    created_at: gig.created_at,
    accent_color: gig.accent_color,
    is_archived: gig.status === 'archived',
    public_slug: token,

    theme: (gig.theme || "minimal") as GigPackTheme,
    poster_skin: (gig.poster_skin || "clean") as PosterSkin,

    schedule: (gig.schedule || [])
      .sort((a: any, b: any) => (a.sort_order || 0) - (b.sort_order || 0))
      .map((s: any) => ({
        id: s.id,
        time: s.time,
        label: s.label,
      })),

    lineup: (gig.roles || [])
      .sort((a: any, b: any) => (a.sort_order || 0) - (b.sort_order || 0))
      .map((r: any) => ({
        role: r.role_name,
        name: r.musician_name,
        notes: r.notes,
      })),

    setlist: gig.setlist, // Flat text

    setlist_structured: (gig.setlist_sections || [])
      .sort((a: any, b: any) => (a.sort_order || 0) - (b.sort_order || 0))
      .map((section: any) => ({
        id: section.id,
        name: section.name,
        songs: (section.items || [])
          .sort((a: any, b: any) => (a.sort_order || 0) - (b.sort_order || 0))
          .map((item: any) => ({
            id: item.id,
            title: item.title,
            artist: item.artist,
            key: item.key,
            tempo: item.tempo,
            notes: item.notes,
            referenceUrl: item.reference_url,
          })),
      })),

    materials: (gig.materials || [])
      .sort((a: any, b: any) => (a.sort_order || 0) - (b.sort_order || 0))
      .map((m: any) => ({
        id: m.id,
        label: m.label,
        url: m.url,
        kind: m.kind as any,
      })),

    packing_checklist: (gig.packing || [])
      .sort((a: any, b: any) => (a.sort_order || 0) - (b.sort_order || 0))
      .map((p: any) => ({
        id: p.id,
        label: p.label,
      })),

    dress_code: gig.dress_code,
    backline_notes: gig.backline_notes,
    parking_notes: gig.parking_notes,
    payment_notes: null, // Not in DB
  };

  return dto;
}
