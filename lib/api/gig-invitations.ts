/**
 * Gig Invitations API
 *
 * Handles email invitation flow for musicians:
 * - Invite musicians by email with magic links
 * - Accept/decline invitations
 * - Link musicians to gig roles upon acceptance
 */

import { createClient } from '@/lib/supabase/client';
import type { GigInvitation } from '@/lib/types/shared';
import { generateWhatsAppInviteLink } from '@/lib/utils/whatsapp';
import { createNotification } from './notifications';

// Type definitions for database join results
interface GigOwnerProfile {
  id: string;
  name: string | null;
}

interface GigRoleGigDetails {
  id: string;
  title: string;
  date: string | null;
  start_time: string | null;
  location_name?: string | null;
  owner_id: string;
  owner: GigOwnerProfile | null;
}

interface GigRoleWithGig {
  id: string;
  gig_id: string;
  role_name: string;
  contact_id?: string | null;
  invitation_status?: string | null;
  gigs: GigRoleGigDetails | GigRoleGigDetails[];
}

interface RoleWithGigForNotification {
  gig_id: string;
  role_name: string;
  gigs: {
    id: string;
    title: string;
    owner_id: string;
  };
}

interface InvitationEmailRole {
  gig_id: string;
  role_name: string;
  gigs: GigRoleGigDetails | GigRoleGigDetails[];
}

/**
 * Generate secure random token for magic links
 */
function generateToken(): string {
  // Generate 32 bytes of random data and convert to hex
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * Invite a musician to a gig role via email
 * Creates invitation record and sends magic link
 */
export async function inviteMusicianByEmail(
  gigRoleId: string,
  email: string
): Promise<GigInvitation> {
  const supabase = createClient();
  
  // Get gig details for the role
  const { data: role, error: roleError } = await supabase
    .from('gig_roles')
    .select(`
      id,
      gig_id,
      role_name,
      gigs!inner (
        id,
        title,
        date,
        start_time,
        owner_id,
        owner:profiles(
          id,
          name
        )
      )
    `)
    .eq('id', gigRoleId)
    .single();
    
  if (roleError) {
    console.error('Error fetching role:', {
      error: roleError,
      code: roleError.code,
      message: roleError.message,
      details: roleError.details,
      hint: roleError.hint,
      gigRoleId,
    });
    throw new Error(`Failed to fetch role details: ${roleError.message || JSON.stringify(roleError)}`);
  }
  
  // Generate token and expiration (7 days from now)
  const token = generateToken();
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);
  
  // Create invitation
  const { data: invitation, error: inviteError } = await supabase
    .from('gig_invitations')
    .insert({
      gig_id: role.gig_id,
      gig_role_id: gigRoleId,
      email,
      token,
      expires_at: expiresAt.toISOString(),
      status: 'pending',
    })
    .select()
    .single();
    
  if (inviteError) {
    console.error('Error creating invitation:', {
      error: inviteError,
      code: inviteError.code,
      message: inviteError.message,
      details: inviteError.details,
      hint: inviteError.hint,
    });
    throw new Error(`Failed to create invitation: ${inviteError.message || JSON.stringify(inviteError)}`);
  }
  
  // Send email with magic link
  await sendInvitationEmail(email, token, role);
  
  // Check if user exists with this email and send in-app notification
  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('email', email)
    .single();
  
  if (profile) {
    // User exists, send them an in-app notification
    const gig = (Array.isArray(role.gigs) ? role.gigs[0] : role.gigs) as GigRoleGigDetails;
    const hostName = gig.owner?.name || null;

    await createNotification({
      user_id: profile.id,
      type: 'invitation_received',
      title: `Invitation: ${gig.title}`,
      message: `You've been invited to play ${role.role_name}${hostName ? ` for ${hostName}` : ''}`,
      link: `/gigs/${gig.id}/pack`,
      gig_id: gig.id,
      gig_role_id: gigRoleId,
    });
  }
  
  return invitation as GigInvitation;
}

/**
 * Invite a musician to a gig role via WhatsApp
 * Creates invitation record and returns WhatsApp link with pre-filled message
 */
export async function inviteViaWhatsApp(
  gigRoleId: string,
  phone: string
): Promise<{ invitation: GigInvitation; whatsappLink: string }> {
  const supabase = createClient();
  
  // Get gig details for the role
  const { data: role, error: roleError } = await supabase
    .from('gig_roles')
    .select(`
      id,
      gig_id,
      role_name,
      gigs!inner (
        id,
        title,
        date,
        start_time,
        location_name,
        owner_id,
        owner:profiles(
          id,
          name
        )
      )
    `)
    .eq('id', gigRoleId)
    .single();
    
  if (roleError) {
    console.error('Error fetching role:', roleError);
    throw new Error(`Failed to fetch role details: ${roleError.message}`);
  }
  
  // Generate token and expiration (7 days from now)
  const token = generateToken();
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);
  
  // Create invitation (using phone as email for now - it's just a contact field)
  const { data: invitation, error: inviteError } = await supabase
    .from('gig_invitations')
    .insert({
      gig_id: role.gig_id,
      gig_role_id: gigRoleId,
      email: phone, // Store phone in email field for now (or use a generic placeholder)
      token,
      expires_at: expiresAt.toISOString(),
      status: 'pending',
    })
    .select()
    .single();
    
  if (inviteError) {
    console.error('Error creating invitation:', inviteError);
    throw new Error(`Failed to create invitation: ${inviteError.message}`);
  }
  
  // Build magic link
  const baseUrl = typeof window !== 'undefined' 
    ? window.location.origin 
    : process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  
  const magicLink = `${baseUrl}/invitations/accept?token=${token}`;
  
  // Get gig details from role
  const gig = Array.isArray(role.gigs) ? role.gigs[0] : role.gigs;
  const hostName = gig?.owner?.name || null;
  
  // Generate WhatsApp deep link
  const whatsappLink = generateWhatsAppInviteLink(
    phone,
    gig?.title || 'Gig',
    hostName || 'Host',
    role.role_name,
    magicLink
  );
  
  // Check if user exists with this phone and send in-app notification
  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('phone', phone)
    .single();
  
  if (profile) {
    // User exists, send them an in-app notification
    await createNotification({
      user_id: profile.id,
      type: 'invitation_received',
      title: `Invitation: ${gig?.title}`,
      message: `You've been invited to play ${role.role_name}${hostName ? ` by ${hostName}` : ''}`,
      link: `/gigs/${gig?.id}/pack`,
      gig_id: gig?.id,
      gig_role_id: gigRoleId,
    });
  }
  
  return {
    invitation: invitation as GigInvitation,
    whatsappLink,
  };
}

/**
 * Accept an invitation via magic link token
 * Links the current user to the gig role
 * Also links contact to user account if applicable (Phase 4)
 */
export async function acceptInvitation(token: string): Promise<void> {
  const supabase = createClient();
  
  // Get invitation with role details (including contact_id)
  const { data: invitation, error: invError } = await supabase
    .from('gig_invitations')
    .select(`
      *,
      gig_roles (
        id,
        invitation_status,
        gig_id,
        contact_id
      )
    `)
    .eq('token', token)
    .single();
    
  if (invError || !invitation) {
    console.error('Error fetching invitation:', invError);
    throw new Error('Invalid or expired invitation');
  }
  
  // Validate invitation
  if (invitation.status !== 'pending') {
    throw new Error('Invitation already processed');
  }
  
  if (new Date(invitation.expires_at) < new Date()) {
    throw new Error('Invitation expired');
  }
  
  // Get current user
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error('Must be logged in to accept invitation');
  }
  
  // Phase 4: Link contact to user account if this role has a contact
  const gigRole = invitation.gig_roles as GigRoleWithGig | null;
  if (gigRole?.contact_id) {
    try {
      // Update contact: link to user and set status to active_user
      const { error: contactError } = await supabase
        .from('musician_contacts')
        .update({
          linked_user_id: user.id,
          status: 'active_user',
        })
        .eq('id', gigRole.contact_id);
      
      if (contactError) {
        console.error('Error linking contact to user:', contactError);
        // Don't fail the whole acceptance, just log it
      } else {
        // Update ALL gig_roles that reference this contact to also have the user_id
        const { error: bulkUpdateError } = await supabase
          .from('gig_roles')
          .update({ musician_id: user.id })
          .eq('contact_id', gigRole.contact_id)
          .is('musician_id', null); // Only update roles that don't have a musician yet
        
        if (bulkUpdateError) {
          console.error('Error bulk updating gig roles:', bulkUpdateError);
          // Don't fail, just log
        }
      }
    } catch (contactLinkError) {
      console.error('Error in contact linking process:', contactLinkError);
      // Continue with invitation acceptance even if contact linking fails
    }
  }
  
  // Update invitation status
  const { error: updateInvError } = await supabase
    .from('gig_invitations')
    .update({
      status: 'accepted',
      accepted_at: new Date().toISOString(),
    })
    .eq('id', invitation.id);
    
  if (updateInvError) {
    console.error('Error updating invitation:', updateInvError);
    throw new Error('Failed to update invitation');
  }
  
  // Link musician to role (this specific role)
  const { error: roleError } = await supabase
    .from('gig_roles')
    .update({
      musician_id: user.id,
      invitation_status: 'accepted',
      status_changed_at: new Date().toISOString(),
      status_changed_by: user.id,
    })
    .eq('id', invitation.gig_role_id);
    
  if (roleError) {
    console.error('Error updating role:', roleError);
    throw new Error('Failed to link musician to role');
  }
  
  // Record status change in history
  await recordStatusChange(
    invitation.gig_role_id,
    'invited',
    'accepted',
    user.id,
    'Accepted via email invitation'
  );

  // Notify the gig manager about the acceptance
  try {
    const { data: roleData } = await supabase
      .from('gig_roles')
      .select(`
        gig_id,
        role_name,
        gigs!inner (id, title, owner_id)
      `)
      .eq('id', invitation.gig_role_id)
      .single();

    if (roleData) {
      const gig = roleData.gigs as RoleWithGigForNotification['gigs'];
      const managerId = gig?.owner_id;

      // Get user name
      const { data: profile } = await supabase
        .from('profiles')
        .select('name')
        .eq('id', user.id)
        .single();

      const userName = profile?.name || 'A musician';

      if (managerId && managerId !== user.id) {
        await createNotification({
          user_id: managerId,
          type: 'status_changed',
          title: `${userName} accepted`,
          message: `${userName} accepted their role as ${roleData.role_name} in ${gig.title}`,
          link: `/gigs/${gig.id}`,
          gig_id: gig.id,
          gig_role_id: invitation.gig_role_id,
        });
      }
    }
  } catch (notifyError) {
    console.error('Error notifying manager about acceptance:', notifyError);
    // Don't fail the acceptance - notification is secondary
  }
}

/**
 * Decline an invitation via magic link token
 */
export async function declineInvitation(
  token: string, 
  reason?: string
): Promise<void> {
  const supabase = createClient();
  
  // Get invitation
  const { data: invitation, error: invError } = await supabase
    .from('gig_invitations')
    .select('*')
    .eq('token', token)
    .single();
    
  if (invError || !invitation) {
    console.error('Error fetching invitation:', invError);
    throw new Error('Invalid invitation');
  }
  
  // Get current user
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error('Must be logged in to decline invitation');
  }
  
  // Update invitation status
  const { error: updateInvError } = await supabase
    .from('gig_invitations')
    .update({ status: 'declined' })
    .eq('id', invitation.id);
    
  if (updateInvError) {
    console.error('Error updating invitation:', updateInvError);
    throw new Error('Failed to update invitation');
  }
  
  // Update role status to needs_sub (auto-triggered on decline)
  const { error: roleError } = await supabase
    .from('gig_roles')
    .update({
      invitation_status: 'needs_sub',
      status_changed_at: new Date().toISOString(),
      status_changed_by: user.id,
    })
    .eq('id', invitation.gig_role_id);
    
  if (roleError) {
    console.error('Error updating role:', roleError);
    throw new Error('Failed to update role');
  }
  
  // Record status change in history
  await recordStatusChange(
    invitation.gig_role_id,
    'invited',
    'needs_sub',
    user.id,
    reason || 'Declined via email invitation'
  );

  // Notify the gig manager about the decline
  try {
    const { data: roleData } = await supabase
      .from('gig_roles')
      .select(`
        gig_id,
        role_name,
        gigs!inner (id, title, owner_id)
      `)
      .eq('id', invitation.gig_role_id)
      .single();

    if (roleData) {
      const gig = roleData.gigs as RoleWithGigForNotification['gigs'];
      const managerId = gig?.owner_id;

      // Get user name
      const { data: profile } = await supabase
        .from('profiles')
        .select('name')
        .eq('id', user.id)
        .single();

      const userName = profile?.name || 'A musician';

      if (managerId && managerId !== user.id) {
        await createNotification({
          user_id: managerId,
          type: 'status_changed',
          title: `${userName} needs a sub`,
          message: `${userName} declined their role as ${roleData.role_name} in ${gig.title}`,
          link: `/gigs/${gig.id}`,
          gig_id: gig.id,
          gig_role_id: invitation.gig_role_id,
        });
      }
    }
  } catch (notifyError) {
    console.error('Error notifying manager about decline:', notifyError);
    // Don't fail the decline - notification is secondary
  }
}

/**
 * Record a status change in the history table
 */
async function recordStatusChange(
  roleId: string,
  oldStatus: string | null,
  newStatus: string,
  userId: string,
  notes?: string
): Promise<void> {
  const supabase = createClient();
  
  const { error } = await supabase
    .from('gig_role_status_history')
    .insert({
      gig_role_id: roleId,
      old_status: oldStatus,
      new_status: newStatus,
      changed_by: userId,
      notes,
    });
    
  if (error) {
    console.error('Error recording status history:', error);
    // Don't throw - this is nice-to-have audit trail
  }
}

/**
 * Send invitation email with magic link via Resend
 */
async function sendInvitationEmail(
  email: string,
  token: string,
  role: InvitationEmailRole
): Promise<void> {
  // Build invitation link
  const baseUrl = typeof window !== 'undefined' 
    ? window.location.origin 
    : process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  
  const inviteLink = `${baseUrl}/invitations/accept?token=${token}`;
  
  // Get gig details from role
  const gig = Array.isArray(role.gigs) ? role.gigs[0] : role.gigs;
  const hostName = gig?.owner?.name || null;
  
  // Send email via API route
  try {
    const response = await fetch('/api/send-invitation', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to: email,
        inviteLink,
        gigTitle: gig?.title,
        hostName,
        roleName: role.role_name,
        gigDate: gig?.date,
        gigTime: gig?.start_time,
        locationName: gig?.location_name,
      }),
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Failed to send invitation email:', {
        status: response.status,
        statusText: response.statusText,
        body: errorText,
      });
      throw new Error(`Failed to send invitation email: ${response.status} ${response.statusText} - ${errorText}`);
    }
    
    await response.json(); // Consume response
  } catch (error) {
    console.error('Error in sendInvitationEmail:', {
      error,
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });
    throw error;
  }
}

/**
 * Get invitations for a specific gig (manager view)
 */
export async function getGigInvitations(gigId: string): Promise<GigInvitation[]> {
  const supabase = createClient();
  
  const { data, error } = await supabase
    .from('gig_invitations')
    .select(`
      *,
      gig_roles (
        id,
        role_name,
        musician_name
      )
    `)
    .eq('gig_id', gigId)
    .order('created_at', { ascending: false });
    
  if (error) {
    console.error('Error fetching gig invitations:', error);
    throw new Error('Failed to fetch invitations');
  }
  
  return data as GigInvitation[];
}

/**
 * Export recordStatusChange for use in other API modules
 */
export { recordStatusChange };

