import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/types/database';
import type {
  GigScheduleItem,
  LineupMember,
  GigMaterial,
  GigMaterialKind,
  PackingChecklistItem,
  SetlistSection,
} from '@/lib/gigpack/types';

// ── Shared row types (superset of fields from both callers) ─────────────

export interface ScheduleItemRow {
  id: string;
  time: string | null;
  label: string;
  sort_order: number | null;
}

export interface RoleRow {
  id?: string;
  role_name: string | null;
  musician_name: string | null;
  musician_id: string | null;
  contact_id: string | null;
  notes?: string | null;
  sort_order: number | null;
  invitation_status: string | null;
  agreed_fee?: number | null;
  contact: { email: string | null; phone: string | null } | null;
}

export interface MaterialRow {
  id: string;
  label: string;
  url: string;
  kind: string;
  sort_order: number | null;
}

export interface PackingItemRow {
  id: string;
  label: string;
  sort_order: number | null;
}

export interface SetlistItemRow {
  id: string;
  title: string;
  artist: string | null;
  key: string | null;
  tempo: string | null;
  notes: string | null;
  reference_url?: string | null;
  sort_order: number;
}

export interface SetlistSectionRow {
  id: string;
  name: string;
  sort_order: number;
  items: SetlistItemRow[];
}

// ── Transform functions ─────────────────────────────────────────────────

export function transformScheduleItems(rows: ScheduleItemRow[]): GigScheduleItem[] {
  return rows
    .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))
    .map((item) => ({
      id: item.id,
      time: item.time,
      label: item.label,
    }));
}

type ProfileInfo = {
  id: string;
  name: string | null;
  avatar_url: string | null;
  email: string | null;
  phone: string | null;
};

export async function transformLineup(
  supabase: SupabaseClient<Database>,
  roles: RoleRow[]
): Promise<LineupMember[]> {
  const sorted = [...roles].sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));

  // Batch-fetch profiles by ID or by name
  const musicianIds = sorted
    .map((r) => r.musician_id)
    .filter((id): id is string => !!id);
  const unlinkedNames = sorted
    .filter((r) => !r.musician_id && !r.contact_id && r.musician_name)
    .map((r) => r.musician_name!);

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
    if (profiles) {
      for (const p of profiles) {
        if (p.name) profileByName[p.name] = p;
      }
    }
  }

  return sorted.map((r) => {
    const profile = r.musician_id
      ? profileById[r.musician_id]
      : r.musician_name
        ? profileByName[r.musician_name]
        : null;
    return {
      role: r.role_name || undefined,
      name: r.musician_name || undefined,
      notes: r.notes || undefined,
      invitationStatus: r.invitation_status || undefined,
      gigRoleId: r.id || undefined,
      userId: r.musician_id || undefined,
      contactId: r.contact_id || undefined,
      agreedFee: r.agreed_fee ?? undefined,
      email: profile?.email || r.contact?.email || undefined,
      phone: profile?.phone || r.contact?.phone || undefined,
      avatarUrl: profile?.avatar_url || undefined,
    };
  });
}

export function transformMaterials(rows: MaterialRow[]): GigMaterial[] {
  return rows
    .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))
    .map((m) => ({
      id: m.id,
      label: m.label,
      url: m.url,
      kind: (m.kind || 'other') as GigMaterialKind,
    }));
}

export function transformPackingChecklist(rows: PackingItemRow[]): PackingChecklistItem[] {
  return rows
    .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))
    .map((item) => ({
      id: item.id,
      label: item.label,
    }));
}

export function transformSetlistStructured(sections: SetlistSectionRow[]): SetlistSection[] {
  return sections
    .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))
    .map((section) => ({
      id: section.id,
      name: section.name,
      songs: (section.items || [])
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
    }));
}
