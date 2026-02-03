import { createClient } from '@/lib/supabase/client';
import type { GigContact, GigContactInsert, GigContactUpdate } from '@/lib/types/shared';

/**
 * List all contacts for a gig
 */
export async function listGigContacts(gigId: string): Promise<GigContact[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('gig_contacts')
    .select('*')
    .eq('gig_id', gigId)
    .order('sort_order', { ascending: true });

  if (error) throw error;

  return (data || []).map(row => ({
    id: row.id,
    gigId: row.gig_id,
    label: row.label,
    name: row.name,
    phone: row.phone,
    email: row.email,
    sourceType: row.source_type as GigContact['sourceType'],
    sourceId: row.source_id,
    sortOrder: row.sort_order,
    createdAt: row.created_at,
  }));
}

/**
 * Create a new contact for a gig
 */
export async function createGigContact(data: GigContactInsert): Promise<GigContact> {
  const supabase = createClient();

  const { data: row, error } = await supabase
    .from('gig_contacts')
    .insert({
      gig_id: data.gigId,
      label: data.label,
      name: data.name,
      phone: data.phone,
      email: data.email,
      source_type: data.sourceType,
      source_id: data.sourceId,
      sort_order: data.sortOrder,
    })
    .select()
    .single();

  if (error) throw error;

  return {
    id: row.id,
    gigId: row.gig_id,
    label: row.label,
    name: row.name,
    phone: row.phone,
    email: row.email,
    sourceType: row.source_type as GigContact['sourceType'],
    sourceId: row.source_id,
    sortOrder: row.sort_order,
    createdAt: row.created_at,
  };
}

/**
 * Update an existing contact
 */
export async function updateGigContact(id: string, data: GigContactUpdate): Promise<GigContact> {
  const supabase = createClient();

  const updateData: Record<string, unknown> = {};
  if (data.label !== undefined) updateData.label = data.label;
  if (data.name !== undefined) updateData.name = data.name;
  if (data.phone !== undefined) updateData.phone = data.phone;
  if (data.email !== undefined) updateData.email = data.email;
  if (data.sourceType !== undefined) updateData.source_type = data.sourceType;
  if (data.sourceId !== undefined) updateData.source_id = data.sourceId;
  if (data.sortOrder !== undefined) updateData.sort_order = data.sortOrder;

  const { data: row, error } = await supabase
    .from('gig_contacts')
    .update(updateData)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;

  return {
    id: row.id,
    gigId: row.gig_id,
    label: row.label,
    name: row.name,
    phone: row.phone,
    email: row.email,
    sourceType: row.source_type as GigContact['sourceType'],
    sourceId: row.source_id,
    sortOrder: row.sort_order,
    createdAt: row.created_at,
  };
}

/**
 * Delete a contact
 */
export async function deleteGigContact(id: string): Promise<void> {
  const supabase = createClient();

  const { error } = await supabase
    .from('gig_contacts')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

/**
 * Reorder contacts for a gig
 */
export async function reorderGigContacts(gigId: string, orderedIds: string[]): Promise<void> {
  const supabase = createClient();

  // Update each contact's sort_order based on position in array
  const updates = orderedIds.map((id, index) =>
    supabase
      .from('gig_contacts')
      .update({ sort_order: index })
      .eq('id', id)
      .eq('gig_id', gigId)
  );

  const results = await Promise.all(updates);
  const errors = results.filter(r => r.error);
  if (errors.length > 0) throw errors[0].error;
}
