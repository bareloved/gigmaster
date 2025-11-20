/**
 * Musician Contacts API
 * 
 * Personal musician contacts database with smart learning and autocomplete.
 * Contacts are automatically created/updated when musicians are added to gigs.
 */

import { createClient } from '@/lib/supabase/client';
import type { 
  MusicianContact, 
  MusicianContactInsert, 
  MusicianContactUpdate,
  MusicianContactWithStats
} from '@/lib/types/shared';

// ============================================================================
// CORE CRUD OPERATIONS
// ============================================================================

/**
 * List all contacts for the current user
 * Sorted by most recently worked together
 */
export async function listMyContacts(): Promise<MusicianContact[]> {
  const supabase = createClient();
  
  // Get current user
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error('Not authenticated');
  }
  
  const { data, error } = await supabase
    .from('musician_contacts')
    .select('*')
    .eq('user_id', user.id)
    .order('last_worked_date', { ascending: false, nullsFirst: false })
    .order('contact_name', { ascending: true });
  
  if (error) {
    console.error('Error fetching contacts:', error);
    throw new Error(error.message || 'Failed to fetch contacts');
  }
  
  return data || [];
}

/**
 * Get a single contact by ID
 */
export async function getContact(contactId: string): Promise<MusicianContact | null> {
  const supabase = createClient();
  
  const { data, error } = await supabase
    .from('musician_contacts')
    .select('*')
    .eq('id', contactId)
    .maybeSingle();
  
  if (error) {
    console.error('Error fetching contact:', error);
    throw new Error(error.message || 'Failed to fetch contact');
  }
  
  return data;
}

/**
 * Create a new contact
 */
export async function createContact(
  data: Omit<MusicianContactInsert, 'user_id' | 'id' | 'created_at' | 'updated_at'>
): Promise<MusicianContact> {
  const supabase = createClient();
  
  // Get current user
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error('Not authenticated');
  }
  
  const { data: contact, error } = await supabase
    .from('musician_contacts')
    .insert({ ...data, user_id: user.id })
    .select()
    .single();
  
  if (error) {
    console.error('Error creating contact:', error);
    throw new Error(error.message || 'Failed to create contact');
  }
  
  return contact;
}

/**
 * Update an existing contact
 */
export async function updateContact(
  contactId: string, 
  data: MusicianContactUpdate
): Promise<MusicianContact> {
  const supabase = createClient();
  
  const { data: contact, error } = await supabase
    .from('musician_contacts')
    .update(data)
    .eq('id', contactId)
    .select()
    .single();
  
  if (error) {
    console.error('Error updating contact:', error);
    throw new Error(error.message || 'Failed to update contact');
  }
  
  return contact;
}

/**
 * Delete a contact
 */
export async function deleteContact(contactId: string): Promise<void> {
  const supabase = createClient();
  
  const { error } = await supabase
    .from('musician_contacts')
    .delete()
    .eq('id', contactId);
  
  if (error) {
    console.error('Error deleting contact:', error);
    throw new Error(error.message || 'Failed to delete contact');
  }
}

// ============================================================================
// SEARCH & AUTOCOMPLETE
// ============================================================================

/**
 * Search contacts with fuzzy matching and stats
 * Returns contacts sorted by relevance and frequency
 * 
 * @param userId - Current user ID
 * @param query - Search query (name)
 * @param limit - Maximum number of results (default: 10)
 */
export async function searchContacts(
  userId: string,
  query: string = '',
  limit: number = 10
): Promise<MusicianContactWithStats[]> {
  const supabase = createClient();
  
  // Build the query
  let queryBuilder = supabase
    .from('musician_contacts')
    .select('*')
    .eq('user_id', userId);
  
  // Apply fuzzy search if query provided
  if (query.trim()) {
    queryBuilder = queryBuilder.ilike('contact_name', `%${query.trim()}%`);
  }
  
  // Sort by frequency, recency, then name
  const { data, error } = await queryBuilder
    .order('times_worked_together', { ascending: false })
    .order('last_worked_date', { ascending: false, nullsFirst: false })
    .order('contact_name', { ascending: true })
    .limit(limit);
  
  if (error) {
    console.error('Error searching contacts:', error);
    throw new Error(error.message || 'Failed to search contacts');
  }
  
  // Add computed stats
  const contactsWithStats: MusicianContactWithStats[] = (data || []).map(contact => ({
    ...contact,
    gigsCount: contact.times_worked_together,
    mostCommonRole: contact.default_roles && contact.default_roles.length > 0 
      ? contact.default_roles[0] 
      : null,
  }));
  
  return contactsWithStats;
}

// ============================================================================
// SMART LEARNING SYSTEM
// ============================================================================

/**
 * Get or create a contact by name
 * If contact doesn't exist, creates it with provided details
 * 
 * @param userId - Current user ID
 * @param musicianName - Name of the musician
 * @param email - Optional email address
 * @param phone - Optional phone number
 * @returns The found or created contact
 */
export async function getOrCreateContact(
  userId: string,
  musicianName: string,
  email?: string,
  phone?: string
): Promise<MusicianContact> {
  const supabase = createClient();
  
  // Try to find existing contact by name
  const { data: existing, error: searchError } = await supabase
    .from('musician_contacts')
    .select('*')
    .eq('user_id', userId)
    .ilike('contact_name', musicianName.trim())
    .maybeSingle();
  
  if (searchError && searchError.code !== 'PGRST116') {
    console.error('Error searching for contact:', searchError);
    throw new Error(searchError.message || 'Failed to search for contact');
  }
  
  // If contact exists, return it
  if (existing) {
    return existing;
  }
  
  // Create new contact
  const newContact: MusicianContactInsert = {
    user_id: userId,
    contact_name: musicianName.trim(),
    email: email || null,
    phone: phone || null,
    times_worked_together: 0,
  };
  
  const { data: created, error: createError } = await supabase
    .from('musician_contacts')
    .insert(newContact)
    .select()
    .single();
  
  if (createError) {
    console.error('Error creating contact:', createError);
    throw new Error(createError.message || 'Failed to create contact');
  }
  
  return created;
}

/**
 * Increment usage statistics for a contact
 * Updates times_worked_together, last_worked_date, and learns common role/fee
 * 
 * @param contactId - Contact ID
 * @param role - Role name for this gig
 * @param fee - Agreed fee for this gig (optional)
 */
export async function incrementContactUsage(
  contactId: string,
  role: string,
  fee: number | null
): Promise<void> {
  const supabase = createClient();
  
  // Get current contact data
  const { data: contact, error: fetchError } = await supabase
    .from('musician_contacts')
    .select('*')
    .eq('id', contactId)
    .single();
  
  if (fetchError) {
    console.error('Error fetching contact for update:', fetchError);
    throw new Error(fetchError.message || 'Failed to fetch contact');
  }
  
  // Update times worked and date
  const updates: MusicianContactUpdate = {
    times_worked_together: (contact.times_worked_together || 0) + 1,
    last_worked_date: new Date().toISOString(),
  };
  
  // Add role to default_roles if not already there
  const currentRoles = contact.default_roles || [];
  if (!currentRoles.includes(role)) {
    updates.default_roles = [...currentRoles, role];
  }
  
  // Update default fee if not set or if this fee is more common
  // For simplicity, we'll just set it if it's not set
  // A more sophisticated approach would track all fees and calculate the most common
  if (!contact.default_fee && fee !== null) {
    updates.default_fee = fee;
  }
  
  // Apply updates
  const { error: updateError } = await supabase
    .from('musician_contacts')
    .update(updates)
    .eq('id', contactId);
  
  if (updateError) {
    console.error('Error updating contact usage:', updateError);
    throw new Error(updateError.message || 'Failed to update contact usage');
  }
}

/**
 * Find contact by name (case-insensitive)
 * Used to link existing contacts when adding musicians to gigs
 * 
 * @param userId - Current user ID
 * @param musicianName - Name to search for
 * @returns Contact if found, null otherwise
 */
export async function findContactByName(
  userId: string,
  musicianName: string
): Promise<MusicianContact | null> {
  const supabase = createClient();
  
  const { data, error } = await supabase
    .from('musician_contacts')
    .select('*')
    .eq('user_id', userId)
    .ilike('contact_name', musicianName.trim())
    .maybeSingle();
  
  if (error && error.code !== 'PGRST116') {
    console.error('Error finding contact by name:', error);
    throw new Error(error.message || 'Failed to find contact');
  }
  
  return data;
}

// ============================================================================
// STATUS MANAGEMENT
// ============================================================================

/**
 * Update contact status (lifecycle tracking)
 * 
 * @param contactId - Contact ID
 * @param status - New status (local_only, invited, active_user)
 */
export async function updateContactStatus(
  contactId: string,
  status: 'local_only' | 'invited' | 'active_user'
): Promise<MusicianContact> {
  const supabase = createClient();
  
  const { data, error } = await supabase
    .from('musician_contacts')
    .update({ status })
    .eq('id', contactId)
    .select()
    .single();
  
  if (error) {
    console.error('Error updating contact status:', error);
    throw new Error(error.message || 'Failed to update contact status');
  }
  
  return data;
}

/**
 * Link contact to user account
 * Sets status to 'active_user' and links via linked_user_id
 * 
 * @param contactId - Contact ID
 * @param userId - User ID to link to
 */
export async function linkContactToUser(
  contactId: string,
  userId: string
): Promise<MusicianContact> {
  const supabase = createClient();
  
  const { data, error } = await supabase
    .from('musician_contacts')
    .update({ 
      status: 'active_user',
      linked_user_id: userId 
    })
    .eq('id', contactId)
    .select()
    .single();
  
  if (error) {
    console.error('Error linking contact to user:', error);
    throw new Error(error.message || 'Failed to link contact to user');
  }
  
  return data;
}

/**
 * Find contact by email or phone
 * Used to check if contact exists before creating new one
 * 
 * @param userId - Current user ID
 * @param email - Email to search for (optional)
 * @param phone - Phone to search for (optional)
 * @returns Contact if found, null otherwise
 */
export async function findContactByEmailOrPhone(
  userId: string,
  email?: string,
  phone?: string
): Promise<MusicianContact | null> {
  if (!email && !phone) {
    return null;
  }
  
  const supabase = createClient();
  
  let query = supabase
    .from('musician_contacts')
    .select('*')
    .eq('user_id', userId);
  
  // Build OR condition for email/phone
  if (email && phone) {
    query = query.or(`email.eq.${email},phone.eq.${phone}`);
  } else if (email) {
    query = query.eq('email', email);
  } else if (phone) {
    query = query.eq('phone', phone);
  }
  
  const { data, error } = await query.maybeSingle();
  
  if (error && error.code !== 'PGRST116') {
    console.error('Error finding contact by email/phone:', error);
    throw new Error(error.message || 'Failed to find contact');
  }
  
  return data;
}

