/**
 * Notifications API
 * 
 * Handles in-app notifications for users:
 * - Fetch notifications (recent, unread count)
 * - Mark as read/unread
 * - Delete notifications
 * - Real-time subscription to new notifications
 * - Create notifications (triggered by other API functions)
 */

import { createClient } from '@/lib/supabase/client';
import type { Notification, NotificationInsert } from '@/lib/types/shared';

/**
 * Get notifications for the current user
 * Returns most recent first, with optional limit
 */
export async function getMyNotifications(
  userId: string,
  limit: number = 50
): Promise<Notification[]> {
  const supabase = createClient();
  
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);
  
  if (error) throw error;
  return data || [];
}

/**
 * Get unread notification count for badge
 */
export async function getUnreadCount(userId: string): Promise<number> {
  const supabase = createClient();
  
  const { count, error } = await supabase
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .is('read_at', null)
    .is('archived_at', null);

  if (error) throw error;
  return count || 0;
}

/**
 * Mark a notification as read
 */
export async function markAsRead(notificationId: string): Promise<void> {
  const supabase = createClient();
  
  const { error } = await supabase
    .from('notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('id', notificationId);
  
  if (error) throw error;
}

/**
 * Mark all notifications as read for a user
 */
export async function markAllAsRead(userId: string): Promise<void> {
  const supabase = createClient();
  
  const { error } = await supabase
    .from('notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('user_id', userId)
    .is('read_at', null);
  
  if (error) throw error;
}

/**
 * Delete a notification
 */
export async function deleteNotification(notificationId: string): Promise<void> {
  const supabase = createClient();
  
  const { error } = await supabase
    .from('notifications')
    .delete()
    .eq('id', notificationId);
  
  if (error) throw error;
}

/**
 * Clear all notifications for a user
 */
export async function clearAllNotifications(userId: string): Promise<void> {
  const supabase = createClient();

  const { error } = await supabase
    .from('notifications')
    .delete()
    .eq('user_id', userId);

  if (error) throw error;
}

/**
 * Archive a single notification (moves it to the Archive tab)
 */
export async function archiveNotification(notificationId: string): Promise<void> {
  const supabase = createClient();

  const { error } = await supabase
    .from('notifications')
    .update({ archived_at: new Date().toISOString() })
    .eq('id', notificationId);

  if (error) throw error;
}

/**
 * Archive all non-archived notifications for a user
 */
export async function archiveAllNotifications(userId: string): Promise<void> {
  const supabase = createClient();

  const { error } = await supabase
    .from('notifications')
    .update({ archived_at: new Date().toISOString() })
    .eq('user_id', userId)
    .is('archived_at', null);

  if (error) throw error;
}

/**
 * Create a notification
 * Used by other API functions to trigger notifications.
 *
 * Uses a database function to handle the partial unique index on
 * (user_id, gig_id, type) WHERE gig_id IS NOT NULL. When a duplicate exists,
 * the notification is updated with the new title/message and marked unread.
 *
 * Note: This function logs errors but doesn't throw them.
 * Notifications should never break primary workflows.
 */
export async function createNotification(
  data: NotificationInsert
): Promise<void> {
  const supabase = createClient();

  const { error } = await supabase.rpc('create_or_update_notification', {
    p_user_id: data.user_id,
    p_type: data.type,
    p_title: data.title,
    p_message: data.message ?? undefined,
    p_link: data.link ?? undefined,
    p_gig_id: data.gig_id ?? undefined,
    p_gig_role_id: data.gig_role_id ?? undefined,
    p_metadata: data.metadata ?? undefined,
  });

  if (error) {
    console.error('Failed to create notification:', {
      message: error.message,
      code: error.code,
      details: error.details,
      hint: error.hint,
    });
  }
}

/**
 * Subscribe to real-time notification updates
 * Returns cleanup function to unsubscribe
 * 
 * @param userId - User ID to subscribe to
 * @param onNotification - Callback when new notification arrives
 * @returns Cleanup function to unsubscribe
 */
export function subscribeToNotifications(
  userId: string,
  onNotification: (notification: Notification) => void
): () => void {
  const supabase = createClient();
  
  const channel = supabase
    .channel(`notifications:${userId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${userId}`
      },
      (payload) => {
        onNotification(payload.new as Notification);
      }
    )
    .subscribe();
  
  return () => {
    supabase.removeChannel(channel);
  };
}

