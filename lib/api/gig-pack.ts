import { createClient } from '@/lib/supabase/client';
import type { GigPack, LineupMember, GigScheduleItem, GigMaterial, GigPackTheme, PosterSkin } from '@/lib/gigpack/types';
import type { GigPackData, ScheduleNoteItem } from '@/lib/types/shared';

// Type definitions for database join results
interface GigScheduleItemRow {
  id: string;
  time: string | null;
  label: string;
  sort_order: number | null;
}

interface GigRoleRow {
  id: string;
  role_name: string;
  musician_name: string | null;
  musician_id: string | null;
  contact_id: string | null;
  invitation_status: string | null;
  sort_order: number | null;
  contact: { email: string | null; phone: string | null } | null;
}

interface GigMaterialRow {
  id: string;
  label: string;
  url: string;
  kind: string;
  sort_order: number | null;
}

interface GigPackingItemRow {
  id: string;
  label: string;
  sort_order: number | null;
}

interface SetlistItemRow {
  id: string;
  title: string;
  artist: string | null;
  key: string | null;
  tempo: string | null;
  notes: string | null;
  sort_order: number;
}

interface GigOwnerProfile {
  id: string;
  name: string | null;
}

interface GigContactRow {
  id: string;
  label: string;
  name: string;
  phone: string | null;
  email: string | null;
  source_type: string;
  source_id: string | null;
  sort_order: number;
}

/**
 * Gig Pack API
 * Fetches all data needed for the GigPack view
 */

/**
 * Get full GigPack data for the GigPackLayout view
 * @param gigId - The gig ID
 */
export async function getGigPackFull(gigId: string): Promise<GigPack | null> {
  const supabase = createClient();

  // Fetch gig with all related data
  const { data: gig, error: gigError } = await supabase
    .from('gigs')
    .select(`
      *,
      owner:profiles!gigs_owner_profiles_fkey(
        id,
        name
      ),
      gig_schedule_items(
        id,
        time,
        label,
        sort_order
      ),
      gig_materials(
        id,
        label,
        url,
        kind,
        sort_order
      ),
      gig_packing_items(
        id,
        label,
        sort_order
      ),
      gig_shares(
        token
      ),
      gig_roles(
        id,
        role_name,
        musician_name,
        musician_id,
        contact_id,
        invitation_status,
        sort_order,
        contact:musician_contacts(
          email,
          phone
        )
      ),
      gig_contacts(
        id,
        label,
        name,
        phone,
        email,
        source_type,
        source_id,
        sort_order
      )
    `)
    .eq('id', gigId)
    .single();

  if (gigError) {
    console.error('Error fetching gig:', gigError);
    return null;
  }

  if (!gig) return null;

  // Fetch setlist from setlist_sections > setlist_items
  const { data: setlistSections } = await supabase
    .from('setlist_sections')
    .select(`
      id,
      name,
      sort_order,
      setlist_items(
        id,
        title,
        artist,
        key,
        tempo,
        notes,
        sort_order
      )
    `)
    .eq('gig_id', gigId)
    .order('sort_order', { ascending: true });

  // Transform schedule items from gig_schedule_items table
  let schedule: GigScheduleItem[] = ((gig.gig_schedule_items as GigScheduleItemRow[]) || [])
    .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))
    .map((item) => ({
      id: item.id,
      time: item.time,
      label: item.label,
    }));

  // Fallback: if no table schedule items but schedule_notes JSONB exists (external gigs),
  // use those for display
  if (schedule.length === 0 && gig.schedule_notes && Array.isArray(gig.schedule_notes)) {
    schedule = (gig.schedule_notes as Array<{ time: string; label: string }>).map((item, i) => ({
      id: `sn-${i}`,
      time: item.time || null,
      label: item.label,
    }));
  }

  // For external gigs: append end_time as a schedule entry if it exists
  // and isn't already represented in the schedule
  if (gig.is_external && gig.end_time) {
    const endTimeStr = typeof gig.end_time === 'string'
      ? gig.end_time.substring(0, 5)  // "HH:MM:SS" → "HH:MM"
      : null;
    if (endTimeStr && !schedule.some(item => item.time === endTimeStr)) {
      schedule.push({
        id: 'end-time',
        time: endTimeStr,
        label: 'End',
      });
    }
  }

  // Transform lineup from gig_roles
  const roles = ((gig.gig_roles as GigRoleRow[]) || [])
    .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));

  // Batch-fetch profiles for musicians by ID or by name fallback
  const musicianIds = roles
    .map((r) => r.musician_id)
    .filter((id): id is string => !!id);
  const unlinkedNames = roles
    .filter((r) => !r.musician_id && !r.contact_id && r.musician_name)
    .map((r) => r.musician_name!);

  type ProfileInfo = { id: string; name: string | null; avatar_url: string | null; email: string | null; phone: string | null };
  const profileById: Record<string, ProfileInfo> = {};
  const profileByName: Record<string, ProfileInfo> = {};

  // Fetch profiles by ID
  if (musicianIds.length > 0) {
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, name, avatar_url, email, phone')
      .in('id', musicianIds);
    if (profiles) {
      for (const p of profiles) profileById[p.id] = p;
    }
  }

  // Fetch profiles by name for unlinked roles
  if (unlinkedNames.length > 0) {
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, name, avatar_url, email, phone')
      .in('name', unlinkedNames);
    if (profiles) {
      for (const p of profiles) {
        if (p.name) profileByName[p.name] = p;
      }
    }
  }

  const lineup: LineupMember[] = roles.map((role) => {
    const profile = role.musician_id
      ? profileById[role.musician_id]
      : (role.musician_name ? profileByName[role.musician_name] : null);
    return {
      role: role.role_name,
      name: role.musician_name || undefined,
      notes: undefined,
      invitationStatus: role.invitation_status || undefined,
      gigRoleId: role.id,
      userId: role.musician_id || undefined,
      contactId: role.contact_id || undefined,
      email: profile?.email || role.contact?.email || undefined,
      phone: profile?.phone || role.contact?.phone || undefined,
      avatarUrl: profile?.avatar_url || undefined,
    };
  });

  // Transform materials
  const materials: GigMaterial[] = ((gig.gig_materials as GigMaterialRow[]) || [])
    .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))
    .map((m) => ({
      id: m.id,
      label: m.label,
      url: m.url,
      kind: (m.kind || 'other') as GigMaterial['kind'],
    }));

  // Transform contacts
  const contacts = ((gig.gig_contacts as GigContactRow[]) || [])
    .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))
    .map((c) => ({
      id: c.id,
      gigId: gig.id,
      label: c.label,
      name: c.name,
      phone: c.phone,
      email: c.email,
      sourceType: c.source_type as 'manual' | 'lineup' | 'contact',
      sourceId: c.source_id,
      sortOrder: c.sort_order,
      createdAt: '', // Not fetched, not needed for display
    }));

  // Transform packing items
  const packingChecklist = ((gig.gig_packing_items as GigPackingItemRow[]) || [])
    .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))
    .map((item) => ({
      id: item.id,
      label: item.label,
    }));

  // Build setlist text from structured setlist or use raw text
  let setlistText = gig.setlist || '';
  const setlistStructured = setlistSections?.map((section) => ({
    id: section.id,
    name: section.name,
    songs: ((section.setlist_items as SetlistItemRow[]) || [])
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((item) => ({
        id: item.id,
        title: item.title,
        artist: item.artist || undefined,
        key: item.key || undefined,
        tempo: item.tempo || undefined,
        notes: item.notes || undefined,
      })),
  })) || null;

  // If we have structured setlist but no text, generate text from structure
  if (!setlistText && setlistStructured && setlistStructured.length > 0) {
    const lines: string[] = [];
    for (const section of setlistStructured) {
      for (const song of section.songs) {
        let line = song.title;
        if (song.artist) line += ` - ${song.artist}`;
        if (song.key) line += ` | ${song.key}`;
        if (song.tempo) line += ` ${song.tempo} BPM`;
        lines.push(line);
      }
    }
    setlistText = lines.join('\n');
  }

  // Get share token
  const shareToken = (gig.gig_shares as Array<{ token: string }>)?.[0]?.token || null;

  // owner_id is required for GigPack type
  if (!gig.owner_id) {
    console.error('Gig has no owner_id:', gig.id);
    return null;
  }

  const gigPack: GigPack = {
    id: gig.id,
    owner_id: gig.owner_id,
    title: gig.title,
    status: gig.status || null,
    band_id: gig.band_id || null,
    band_name: gig.band_name || null,
    date: gig.date || new Date().toISOString(),
    call_time: gig.call_time || (gig.start_time ? String(gig.start_time).substring(0, 5) : null),
    on_stage_time: gig.on_stage_time || null,
    venue_name: gig.venue_name || gig.location_name || null,
    venue_address: gig.venue_address || gig.location_address || null,
    venue_maps_url: gig.venue_maps_url || null,
    lineup: lineup.length > 0 ? lineup : null,
    setlist: setlistText || null,
    setlist_pdf_url: gig.setlist_pdf_url || null,
    setlist_structured: setlistStructured,
    dress_code: gig.dress_code || null,
    backline_notes: gig.backline_notes || null,
    parking_notes: gig.parking_notes || null,
    payment_notes: gig.payment_notes || null,
    notes: gig.notes || null,
    internal_notes: gig.internal_notes || null,
    public_slug: shareToken || gig.id,
    theme: (gig.theme as GigPackTheme) || 'minimal',
    is_archived: gig.status === 'cancelled',
    created_at: gig.created_at || new Date().toISOString(),
    updated_at: gig.updated_at || new Date().toISOString(),
    band_logo_url: gig.band_logo_url || null,
    hero_image_url: gig.hero_image_url || null,
    accent_color: gig.accent_color || null,
    poster_skin: (gig.poster_skin as PosterSkin) || 'clean',
    packing_checklist: packingChecklist.length > 0 ? packingChecklist : null,
    gig_type: gig.gig_type || null,
    materials: materials.length > 0 ? materials : null,
    contacts: contacts.length > 0 ? contacts : null,
    schedule: schedule.length > 0 ? schedule : null,
    is_external: gig.is_external ?? false,
    external_event_url: gig.external_event_url ?? null,
    schedule_notes: (gig.schedule_notes as Array<{ time: string; label: string; notes?: string }> | null) ?? null,
  };

  return gigPack;
}

/**
 * Get data for the Gig Pack view (original format for player view)
 * @param gigId - The gig ID
 * @param userId - The current user's ID
 */
export async function getGigPack(
  gigId: string,
  userId: string
): Promise<GigPackData> {
  const supabase = createClient();

  // Fetch gig with related data
  const { data: gig, error: gigError } = await supabase
    .from('gigs')
    .select(`
      id,
      title,
      date,
      call_time,
      on_stage_time,
      start_time,
      end_time,
      location_name,
      location_address,
      venue_name,
      venue_address,
      venue_maps_url,
      status,
      internal_notes,
      setlist,
      dress_code,
      backline_notes,
      parking_notes,
      payment_notes,
      gig_type,
      theme,
      poster_skin,
      accent_color,
      band_logo_url,
      hero_image_url,
      band_name,
      owner_id,
      is_external,
      external_event_url,
      schedule_notes,
      owner:profiles!gigs_owner_profiles_fkey(
        id,
        name
      ),
      gig_schedule_items(
        id,
        time,
        label,
        sort_order
      ),
      gig_materials(
        id,
        label,
        url,
        kind,
        sort_order
      ),
      gig_packing_items(
        id,
        label,
        sort_order
      ),
      gig_shares(
        token
      )
    `)
    .eq('id', gigId)
    .single();

  if (gigError) {
    console.error('Error fetching gig:', gigError);
    throw gigError;
  }

  if (!gig) {
    throw new Error('Gig not found');
  }

  // Fetch setlist from setlist_sections > setlist_items
  const { data: setlistSections, error: setlistError } = await supabase
    .from('setlist_sections')
    .select(`
      id,
      name,
      sort_order,
      setlist_items(
        id,
        title,
        artist,
        key,
        tempo,
        notes,
        sort_order
      )
    `)
    .eq('gig_id', gigId)
    .order('sort_order', { ascending: true });

  if (setlistError) {
    console.error('Error fetching setlist:', setlistError);
    // Don't throw - setlist is optional
  }

  // Fetch people (lineup)
  const { data: people, error: peopleError } = await supabase
    .from('gig_roles')
    .select('id, role_name, musician_name, invitation_status, sort_order')
    .eq('gig_id', gigId)
    .order('sort_order', { ascending: true });

  if (peopleError) {
    console.error('Error fetching people:', peopleError);
    throw peopleError;
  }

  // Fetch current user's role (if they have one)
  const { data: userRole, error: userRoleError } = await supabase
    .from('gig_roles')
    .select('id, role_name, invitation_status, agreed_fee, payment_status, paid_at, notes, player_notes, currency')
    .eq('gig_id', gigId)
    .eq('musician_id', userId)
    .maybeSingle();

  if (userRoleError) {
    console.error('Error fetching user role:', userRoleError);
    // Don't throw - user might not have a role
  }

  // Transform structured setlist to flat list with position
  const flatSetlist: Array<{
    id: string;
    position: number;
    title: string;
    key: string | null;
    bpm: number | null;
    notes: string | null;
  }> = [];

  let position = 1;
  if (setlistSections) {
    for (const section of setlistSections) {
      const items = (section.setlist_items as SetlistItemRow[]) || [];
      for (const item of items.sort((a, b) => a.sort_order - b.sort_order)) {
        flatSetlist.push({
          id: item.id,
          position: position++,
          title: item.title,
          key: item.key,
          bpm: item.tempo ? parseInt(item.tempo, 10) || null : null,
          notes: item.notes,
        });
      }
    }
  }

  // Parse simple setlist text if no structured setlist exists
  if (flatSetlist.length === 0 && gig.setlist) {
    const lines = gig.setlist.split('\n').filter((line: string) => line.trim());
    lines.forEach((line: string, index: number) => {
      flatSetlist.push({
        id: `text-${index}`,
        position: index + 1,
        title: line.trim(),
        key: null,
        bpm: null,
        notes: null,
      });
    });
  }

  // Transform schedule items
  const scheduleItems = ((gig.gig_schedule_items as GigScheduleItemRow[]) || [])
    .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))
    .map((item) => ({
      time: item.time,
      label: item.label,
    }));

  // Build schedule text from items
  const scheduleText = scheduleItems.length > 0
    ? scheduleItems.map((item: { time: string | null; label: string }) => 
        item.time ? `${item.time} - ${item.label}` : item.label
      ).join('\n')
    : null;

  // Transform materials/resources
  const resources = ((gig.gig_materials as GigMaterialRow[]) || [])
    .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))
    .map((m) => ({
      id: m.id,
      label: m.label,
      url: m.url,
      type: m.kind,
    }));

  // Transform the data
  return {
    id: gig.id,
    title: gig.title,
    date: gig.date,
    startTime: gig.call_time || gig.start_time,
    endTime: gig.on_stage_time || gig.end_time,
    locationName: gig.venue_name || gig.location_name,
    locationAddress: gig.venue_address || gig.location_address,
    status: gig.status || 'confirmed',
    notes: gig.internal_notes,
    schedule: scheduleText,
    isExternal: gig.is_external ?? false,
    externalEventUrl: gig.external_event_url ?? null,
    scheduleNotes: (gig.schedule_notes as ScheduleNoteItem[] | null) ?? null,
    host: gig.owner
      ? {
          id: (gig.owner as GigOwnerProfile).id,
          name: (gig.owner as GigOwnerProfile).name || 'Unknown',
        }
      : null,
    setlist: flatSetlist,
    resources: resources,
    people: (people || []).map(person => ({
      id: person.id,
      roleName: person.role_name,
      musicianName: person.musician_name,
      invitationStatus: person.invitation_status || 'pending',
    })),
    userRole: userRole
      ? {
          roleId: userRole.id,
          roleName: userRole.role_name,
          invitationStatus: userRole.invitation_status || 'pending',
          agreedFee: userRole.agreed_fee,
          isPaid: userRole.payment_status === 'paid',
          paidAt: userRole.paid_at,
          currency: userRole.currency || 'ILS',
          notes: userRole.notes,
          playerNotes: userRole.player_notes,
        }
      : null,
  };
}
