import { createAdminClient } from "@/lib/supabase/admin";
import { GigPack, GigPackTheme, PosterSkin, GigMaterialKind } from "@/lib/gigpack/types";
import { isArchivedStatus } from "@/lib/types/shared";

// Type definitions for database join results
interface ScheduleItemRow {
  id: string;
  time: string | null;
  label: string;
  sort_order: number | null;
}

interface RoleRow {
  role_name: string | null;
  musician_name: string | null;
  musician_id: string | null;
  contact_id: string | null;
  notes: string | null;
  sort_order: number | null;
  invitation_status: string | null;
  contact: { email: string | null; phone: string | null } | null;
}

interface SetlistItemRow {
  id: string;
  title: string;
  artist: string | null;
  key: string | null;
  tempo: string | null;
  notes: string | null;
  reference_url: string | null;
  sort_order: number;
}

interface SetlistSectionRow {
  id: string;
  name: string;
  sort_order: number;
  items: SetlistItemRow[];
}

interface MaterialRow {
  id: string;
  label: string;
  url: string;
  kind: string;
  sort_order: number | null;
}

interface PackingRow {
  id: string;
  label: string;
  sort_order: number | null;
}

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
    updated_at: gig.updated_at,
    created_at: gig.created_at,
    accent_color: gig.accent_color,
    status: gig.status,
    is_archived: isArchivedStatus(gig.status),
    public_slug: token,

    theme: (gig.theme || "minimal") as GigPackTheme,
    poster_skin: (gig.poster_skin || "clean") as PosterSkin,

    schedule: ((gig.schedule || []) as ScheduleItemRow[])
      .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))
      .map((s) => ({
        id: s.id,
        time: s.time,
        label: s.label,
      })),

    lineup: await (async () => {
      const roles = ((gig.roles || []) as RoleRow[])
        .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));

      // Batch-fetch profiles by ID or by name
      const musicianIds = roles.map((r) => r.musician_id).filter((id): id is string => !!id);
      const unlinkedNames = roles
        .filter((r) => !r.musician_id && !r.contact_id && r.musician_name)
        .map((r) => r.musician_name!);

      type ProfileInfo = { id: string; name: string | null; avatar_url: string | null; email: string | null; phone: string | null };
      const profileById: Record<string, ProfileInfo> = {};
      const profileByName: Record<string, ProfileInfo> = {};

      if (musicianIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, name, avatar_url, email, phone')
          .in('id', musicianIds);
        if (profiles) for (const p of profiles) profileById[p.id] = p;
      }

      if (unlinkedNames.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, name, avatar_url, email, phone')
          .in('name', unlinkedNames);
        if (profiles) for (const p of profiles) { if (p.name) profileByName[p.name] = p; }
      }

      return roles.map((r) => {
        const profile = r.musician_id
          ? profileById[r.musician_id]
          : (r.musician_name ? profileByName[r.musician_name] : null);
        return {
          role: r.role_name || undefined,
          name: r.musician_name || undefined,
          notes: r.notes || undefined,
          email: profile?.email || r.contact?.email || undefined,
          phone: profile?.phone || r.contact?.phone || undefined,
          avatarUrl: profile?.avatar_url || undefined,
          invitationStatus: r.invitation_status || undefined,
        };
      });
    })(),

    setlist: gig.setlist, // Flat text
    setlist_pdf_url: gig.setlist_pdf_url
      ? `/api/gigpack/${token}/setlist-pdf`
      : null,

    setlist_structured: ((gig.setlist_sections || []) as SetlistSectionRow[])
      .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))
      .map((section) => ({
        id: section.id,
        name: section.name,
        songs: ((section.items || []) as SetlistItemRow[])
          .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))
          .map((item) => ({
            id: item.id,
            title: item.title,
            artist: item.artist || undefined,
            key: item.key || undefined,
            tempo: item.tempo || undefined,
            notes: item.notes || undefined,
            referenceUrl: item.reference_url || undefined,
          })),
      })),

    materials: ((gig.materials || []) as MaterialRow[])
      .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))
      .map((m) => ({
        id: m.id,
        label: m.label,
        url: m.url,
        kind: m.kind as GigMaterialKind,
      })),

    packing_checklist: ((gig.packing || []) as PackingRow[])
      .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))
      .map((p) => ({
        id: p.id,
        label: p.label,
      })),

    dress_code: gig.dress_code,
    backline_notes: gig.backline_notes,
    parking_notes: gig.parking_notes,
    payment_notes: null, // Not in DB
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
