/**
 * Users API
 * 
 * Search and access system users (all registered profiles)
 * Public access - anyone can search anyone (Facebook-style)
 */

import { createClient } from '@/lib/supabase/client';

export interface SystemUser {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  main_instrument: string | null;
  avatar_url: string | null;
  created_at: string;
}

/**
 * Search all users in the system
 * Public - anyone can search anyone (like Facebook)
 * 
 * @param query - Search query (name or email)
 * @returns Array of matching users
 */
export async function searchSystemUsers(query: string): Promise<SystemUser[]> {
  const supabase = createClient();
  
  if (!query || query.length < 2) return [];
  
  const { data, error } = await supabase
    .from('profiles')
    .select('id, name, email, phone, main_instrument, avatar_url, created_at')
    .or(`name.ilike.%${query}%,email.ilike.%${query}%`)
    .order('name', { ascending: true })
    .limit(20);
  
  if (error) {
    console.error('Error searching system users:', error);
    return [];
  }
  
  return data || [];
}

/**
 * Get user by ID for direct add
 * 
 * @param userId - User ID to fetch
 * @returns User data or null if not found
 */
export async function getUserById(userId: string): Promise<SystemUser | null> {
  const supabase = createClient();
  
  const { data, error } = await supabase
    .from('profiles')
    .select('id, name, email, phone, main_instrument, avatar_url, created_at')
    .eq('id', userId)
    .single();
  
  if (error) {
    console.error('Error fetching user:', error);
    return null;
  }
  
  return data;
}

