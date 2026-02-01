import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { GigPack, GigPackTheme, PosterSkin, GigMaterialKind } from "@/lib/gigpack/types";
import { isArchivedStatus } from "@/lib/types/shared";

// Type definitions for database join results
interface GigRoleRow {
  id: string;
  role_name: string;
  musician_name: string | null;
  notes: string | null;
}

interface SetlistItemRow {
  id: string;
  title: string;
  artist: string | null;
  key: string | null;
  tempo: string | null;
  notes: string | null;
}

interface SetlistSectionRow {
  id: string;
  name: string;
  setlist_items: SetlistItemRow[];
}

interface PackingItemRow {
  id: string;
  label: string;
}

interface MaterialRow {
  id: string;
  label: string;
  url: string;
  kind: string;
}

interface ScheduleItemRow {
  id: string;
  time: string | null;
  label: string;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: gigId } = await params;
  
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: gig, error } = await supabase
    .from("gigs")
    .select(`
      *,
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
    .eq("id", gigId)
    .single();

  if (error || !gig) {
    return NextResponse.json({ error: "Gig not found" }, { status: 404 });
  }

  // Map to GigPack type (same mapping as getGigPackFull)
  const gigPack: GigPack = {
    id: gig.id,
    owner_id: gig.owner_id || "",
    title: gig.title,
    status: gig.status,
    band_id: gig.project_id,
    band_name: gig.band_name,
    date: gig.date ? gig.date.split('T')[0] : null,
    call_time: gig.call_time,
    on_stage_time: gig.on_stage_time,
    venue_name: gig.location_name || gig.venue_name,
    venue_address: gig.location_address || gig.venue_address,
    venue_maps_url: gig.venue_maps_url,
    lineup: (gig.gig_roles as GigRoleRow[] | null)?.map((r) => ({
      role: r.role_name,
      name: r.musician_name,
      notes: r.notes
    })) || [],
    setlist: gig.setlist,
    setlist_pdf_url: gig.setlist_pdf_url || null,
    setlist_structured: (gig.setlist_sections as SetlistSectionRow[] | null)?.map((s) => ({
      id: s.id,
      name: s.name,
      songs: (s.setlist_items as SetlistItemRow[])?.map((song) => ({
        id: song.id,
        title: song.title,
        artist: song.artist,
        key: song.key,
        tempo: song.tempo,
        notes: song.notes,
      })) || []
    })) || [],
    dress_code: gig.dress_code,
    backline_notes: gig.backline_notes,
    parking_notes: gig.parking_notes,
    payment_notes: gig.payment_notes,
    internal_notes: gig.internal_notes,
    public_slug: gig.gig_shares?.[0]?.token || "",
    theme: (gig.theme as GigPackTheme) || null,
    is_archived: isArchivedStatus(gig.status),
    created_at: gig.created_at || new Date().toISOString(),
    updated_at: gig.updated_at || new Date().toISOString(),
    band_logo_url: gig.band_logo_url,
    hero_image_url: gig.hero_image_url,
    accent_color: gig.accent_color,
    poster_skin: (gig.poster_skin as PosterSkin) || null,
    packing_checklist: (gig.gig_packing_items as PackingItemRow[] | null)?.map((i) => ({
      id: i.id,
      label: i.label
    })) || [],
    gig_type: gig.gig_type,
    materials: (gig.gig_materials as MaterialRow[] | null)?.map((m) => ({
      id: m.id,
      label: m.label,
      url: m.url,
      kind: m.kind as GigMaterialKind
    })) || [],
    schedule: (gig.gig_schedule_items as ScheduleItemRow[] | null)?.map((s) => ({
      id: s.id,
      time: s.time,
      label: s.label
    })) || []
  };

  return NextResponse.json(gigPack);
}

