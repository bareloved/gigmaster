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
 * List all feedback submissions with user info
 * Returns newest first
 */
export async function listFeedback(): Promise<Feedback[]> {
  const supabase = createClient();

  // First get all feedback
  const { data: feedbackData, error: feedbackError } = await supabase
    .from('feedback')
    .select('*')
    .order('created_at', { ascending: false });

  if (feedbackError) throw feedbackError;
  if (!feedbackData || feedbackData.length === 0) return [];

  // Get unique user IDs
  const userIds = [...new Set(feedbackData.map((f) => f.user_id).filter(Boolean))] as string[];

  // Fetch profiles for these users
  let profilesMap: Record<string, { email: string | null; name: string | null }> = {};
  if (userIds.length > 0) {
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, email, name')
      .in('id', userIds);

    if (profiles) {
      profilesMap = Object.fromEntries(
        profiles.map((p) => [p.id, { email: p.email, name: p.name }])
      );
    }
  }

  // Merge feedback with profile data
  return feedbackData.map((f) => ({
    ...f,
    user_email: f.user_id ? profilesMap[f.user_id]?.email : null,
    user_name: f.user_id ? profilesMap[f.user_id]?.name : null,
  }));
}

/**
 * Delete a feedback entry
 */
export async function deleteFeedback(id: string): Promise<void> {
  const supabase = createClient();

  const { error } = await supabase
    .from('feedback')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

/**
 * Toggle resolved status for a feedback entry
 */
export async function toggleFeedbackResolved(
  id: string,
  resolved: boolean
): Promise<Feedback> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('feedback')
    .update({ resolved })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}
