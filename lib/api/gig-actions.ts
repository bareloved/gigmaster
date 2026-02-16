import { createClient } from "@/lib/supabase/client";
import { createNotification } from "./notifications";
import type { InvitationStatus, GigStatus } from "@/lib/types/shared";

/**
 * Gig Actions API
 *
 * Quick actions for updating gig data from the dashboard:
 * - Accept/decline invitations
 * - Update gig status (for managers)
 */

// Re-export types for convenience
export type { InvitationStatus, GigStatus };

// ============================================================================
// INVITATION ACTIONS
// ============================================================================

/**
 * Accept a gig invitation
 */
export async function acceptInvitation(gigRoleId: string): Promise<void> {
  const supabase = createClient();

  const { error } = await supabase
    .from("gig_roles")
    .update({
      invitation_status: "accepted",
    })
    .eq("id", gigRoleId);

  if (error) {
    throw new Error(`Failed to accept invitation: ${error.message}`);
  }
}

/**
 * Decline a gig invitation
 */
export async function declineInvitation(gigRoleId: string): Promise<void> {
  const supabase = createClient();

  const { error } = await supabase
    .from("gig_roles")
    .update({
      invitation_status: "declined",
    })
    .eq("id", gigRoleId);

  if (error) {
    throw new Error(`Failed to decline invitation: ${error.message}`);
  }
}

// ============================================================================
// GIG STATUS ACTIONS (MANAGERS)
// ============================================================================

/**
 * Update gig status (for managers)
 */
export async function updateGigStatus(gigId: string, status: GigStatus): Promise<void> {
  const supabase = createClient();

  // Get current gig info and musicians before updating
  const { data: gig } = await supabase
    .from("gigs")
    .select(`
      title,
      gig_roles (
        musician_id
      )
    `)
    .eq("id", gigId)
    .single();

  const { error } = await supabase
    .from("gigs")
    .update({
      status,
      updated_at: new Date().toISOString(),
    })
    .eq("id", gigId);

  if (error) {
    throw new Error(`Failed to update gig status: ${error.message}`);
  }

  // Send notifications to musicians based on status change
  if (gig) {
    const roles = gig.gig_roles as Array<{ id: string; musician_id: string | null }>;
    if (roles && roles.length > 0) {
      for (const role of roles) {
        if (role.musician_id) {
          // Notify on confirmed status
          if (status === 'confirmed') {
            await createNotification({
              user_id: role.musician_id,
              type: 'gig_updated',
              title: `Gig confirmed: ${gig.title}`,
              message: 'This gig has been confirmed!',
              link: `/gigs/${gigId}/pack`,
              gig_id: gigId,
            });
          }
          
          // Notify on tentative status
          if (status === 'tentative') {
            await createNotification({
              user_id: role.musician_id,
              type: 'gig_updated',
              title: `Gig tentative: ${gig.title}`,
              message: 'This gig has been marked as tentative',
              link: `/gigs/${gigId}/pack`,
              gig_id: gigId,
            });
          }

          // Notify on cancelled status
          if (status === 'cancelled') {
            await createNotification({
              user_id: role.musician_id,
              type: 'gig_cancelled',
              title: `Gig cancelled: ${gig.title}`,
              message: 'This gig has been cancelled',
              link: `/gigs`,
              gig_id: gigId,
            });
          }
        }
      }
    }
  }
}

