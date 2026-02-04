/**
 * Feedback API
 *
 * Handles user feedback submissions:
 * - Submit feedback (bug reports, feature requests, general)
 * - List all feedback (for admin review)
 */

import { createClient } from '@/lib/supabase/client';
import type { Feedback, FeedbackInsert } from '@/lib/types/shared';

/**
 * Submit feedback from a user
 * Works for both authenticated and anonymous users
 */
export async function submitFeedback(
  data: Omit<FeedbackInsert, 'user_id'>
): Promise<Feedback> {
  const supabase = createClient();

  // Get current user if logged in (optional)
  const { data: { user } } = await supabase.auth.getUser();

  const { data: feedback, error } = await supabase
    .from('feedback')
    .insert({
      category: data.category || 'general',
      message: data.message,
      user_id: user?.id || null,
    })
    .select()
    .single();

  if (error) throw error;
  return feedback;
}

/**
 * List all feedback submissions
 * Returns newest first
 */
export async function listFeedback(): Promise<Feedback[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('feedback')
    .select(`
      *,
      profiles:user_id (
        email,
        name
      )
    `)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}
