import type { GigPack } from "./types";

/**
 * Transforms a source GigPack for duplication.
 * Returns a new GigPack suitable for pre-filling the gig editor as a "new" gig.
 *
 * - Title prefixed with "Copy of"
 * - Lineup: keeps role/name/contact info, clears gigRoleId and invitationStatus
 * - Schedule/Materials/Packing: generates fresh IDs (so save creates new DB rows)
 * - Excludes: id, owner_id, public_slug, created_at, updated_at, status, external fields, contacts, activity
 */
export function prepareGigForDuplication(source: GigPack): Partial<GigPack> {
  return {
    title: `Copy of ${source.title}`,
    band_id: source.band_id,
    band_name: source.band_name,
    // Normalize date to yyyy-MM-dd (getGigPackFull returns full ISO timestamp)
    date: source.date ? source.date.split("T")[0] : null,
    call_time: source.call_time,
    on_stage_time: source.on_stage_time,
    venue_name: source.venue_name,
    venue_address: source.venue_address,
    venue_maps_url: source.venue_maps_url,
    dress_code: source.dress_code,
    backline_notes: source.backline_notes,
    parking_notes: source.parking_notes,
    payment_notes: source.payment_notes,
    internal_notes: source.internal_notes,
    gig_type: source.gig_type,
    theme: source.theme,
    setlist: source.setlist,
    setlist_pdf_url: source.setlist_pdf_url,
    // Branding
    band_logo_url: source.band_logo_url,
    hero_image_url: source.hero_image_url,
    accent_color: source.accent_color,
    poster_skin: source.poster_skin,
    // Lineup — keep role/name/contact, clear gigRoleId and invitationStatus
    lineup: source.lineup?.map((member) => ({
      ...member,
      gigRoleId: undefined,
      invitationStatus: undefined,
    })) ?? null,
    // Structured setlist — fresh IDs for sections and songs
    setlist_structured: source.setlist_structured?.map((section) => ({
      ...section,
      id: crypto.randomUUID(),
      songs: section.songs.map((song) => ({
        ...song,
        id: crypto.randomUUID(),
      })),
    })) ?? null,
    // Schedule — fresh IDs
    schedule: source.schedule?.map((item) => ({
      ...item,
      id: crypto.randomUUID(),
    })) ?? null,
    // Materials — fresh IDs
    materials: source.materials?.map((material) => ({
      ...material,
      id: crypto.randomUUID(),
    })) ?? null,
    // Packing checklist — fresh IDs
    packing_checklist: source.packing_checklist?.map((item) => ({
      ...item,
      id: crypto.randomUUID(),
    })) ?? null,
  };
}
