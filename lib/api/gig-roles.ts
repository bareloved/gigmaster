import { createClient } from "@/lib/supabase/client";
import type {
  GigRole,
  GigRoleInsert,
  GigRoleUpdate,
  MusicianSuggestion
} from "@/lib/types/shared";
import {
  getOrCreateContact,
  incrementContactUsage,
  findContactByName
} from "@/lib/api/musician-contacts";
import { createNotification } from "./notifications";

// Type definitions for database join results
interface GigRoleWithGig {
  musician_name: string | null;
  role_name: string | null;
  gigs: {
    owner_id: string;
  };
}

interface GigRoleWithGigDetails {
  id: string;
  gigs: {
    id: string;
    title: string;
    date: string | null;
  } | null;
}

interface GigConflictRole {
  id: string;
  gigs: {
    id: string;
    title: string;
    date: string;
    start_time: string | null;
    end_time: string | null;
    location_name: string | null;
  };
}

interface BulkAcceptRole {
  id: string;
  role_name: string | null;
  gigs: {
    id: string;
    title: string;
    owner_id: string;
  };
}

export async function listRolesForGig(gigId: string): Promise<GigRole[]> {
  const supabase = createClient();

  const { data: roles, error } = await supabase
    .from("gig_roles")
    .select("*")
    .eq("gig_id", gigId)
    .order("created_at", { ascending: true });

  // If error is due to gig not existing (404/403), return empty array
  // This can happen if the gig was just deleted
  if (error) {
    // Check if it's a permission/not found error (gig doesn't exist or user can't access it)
    if (error.code === 'PGRST116' || error.message?.includes('violates row-level security') || error.message?.includes('No rows')) {
      return [];
    }
    throw new Error(error.message || "Failed to fetch gig roles");
  }
  return roles || [];
}

export async function addRoleToGig(data: Omit<GigRoleInsert, "id" | "created_at" | "updated_at">): Promise<GigRole> {
  const supabase = createClient();

  // Get current user for contact management
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  // Insert the role
  const { data: role, error } = await supabase
    .from("gig_roles")
    .insert(data)
    .select()
    .single();

  if (error) throw new Error(error.message || "Failed to add role");

  // PERFORMANCE: Return immediately for fast UX
  // Handle contact linking in background (fire-and-forget)
  if (role.musician_name?.trim()) {
    linkContactToRole(user.id, role).catch(err => {
      console.error("Background contact linking failed:", err);
    });
  }

  return role;
}

/**
 * Background function to link/create contacts after role creation
 * Runs async to not block the UI
 */
async function linkContactToRole(userId: string, role: GigRole): Promise<void> {
  const supabase = createClient();

  let contactId = role.contact_id;

  // If no contact_id provided, try to find or create contact
  if (!contactId && role.musician_name) {
    // Try to find existing contact by name
    const existingContact = await findContactByName(userId, role.musician_name);

    if (existingContact) {
      contactId = existingContact.id;
    } else {
      // Create new contact
      const newContact = await getOrCreateContact(userId, role.musician_name);
      contactId = newContact.id;
    }

    // Update the role with the contact_id
    await supabase
      .from("gig_roles")
      .update({ contact_id: contactId })
      .eq("id", role.id);
  }

  // Increment usage stats for the contact
  if (contactId && role.role_name) {
    await incrementContactUsage(contactId, role.role_name, role.agreed_fee);
  }
}

export async function updateRole(roleId: string, data: GigRoleUpdate): Promise<GigRole> {
  const supabase = createClient();

  const { data: role, error } = await supabase
    .from("gig_roles")
    .update(data)
    .eq("id", roleId)
    .select()
    .single();

  if (error) throw new Error(error.message || "Failed to update role");

  return role;
}

export async function deleteRole(roleId: string): Promise<void> {
  const supabase = createClient();

  const { error } = await supabase
    .from("gig_roles")
    .delete()
    .eq("id", roleId);

  if (error) throw new Error(error.message || "Failed to delete role");
}

/** Recent musician data for quick-add suggestions */
export interface RecentMusician {
  name: string;
  role: string;
  userId?: string;
  contactId?: string;
  linkedUserId?: string | null;
  lastGigDate: string;
  timesWorkedTogether: number;
}

/**
 * Get recent musicians from the user's gig history
 * Returns musicians sorted by most recent gig date, then by frequency
 */
export async function getRecentMusicians(limit: number = 10): Promise<RecentMusician[]> {
  const supabase = createClient();

  // Get current user
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  // Fetch roles from user's gigs with gig date info
  const { data: roles, error } = await supabase
    .from("gig_roles")
    .select(`
      musician_name,
      role_name,
      musician_id,
      contact_id,
      gigs!inner(
        owner_id,
        date
      )
    `)
    .eq("gigs.owner_id", user.id)
    .not("musician_name", "is", null)
    .order("gigs(date)", { ascending: false });

  if (error) throw new Error(error.message || "Failed to fetch recent musicians");

  // Group by musician name and aggregate data
  const musicianMap = new Map<string, RecentMusician>();

  interface RoleWithGig {
    musician_name: string | null;
    role_name: string | null;
    musician_id: string | null;
    contact_id: string | null;
    gigs: { owner_id: string; date: string | null };
  }

  (roles as RoleWithGig[] | null)?.forEach((role) => {
    const name = role.musician_name?.trim();
    if (!name) return;

    const gigDate = role.gigs?.date || "";

    if (musicianMap.has(name)) {
      const existing = musicianMap.get(name)!;
      existing.timesWorkedTogether++;
      // Keep the most recent date
      if (gigDate > existing.lastGigDate) {
        existing.lastGigDate = gigDate;
      }
      // Prefer linked user/contact IDs if we don't have them yet
      if (!existing.userId && role.musician_id) {
        existing.userId = role.musician_id;
      }
      if (!existing.contactId && role.contact_id) {
        existing.contactId = role.contact_id;
      }
    } else {
      musicianMap.set(name, {
        name,
        role: role.role_name || "",
        userId: role.musician_id || undefined,
        contactId: role.contact_id || undefined,
        linkedUserId: role.musician_id || null,
        lastGigDate: gigDate,
        timesWorkedTogether: 1,
      });
    }
  });

  // Sort by most recent gig date first, then by frequency
  return Array.from(musicianMap.values())
    .sort((a, b) => {
      // First sort by date (most recent first)
      const dateCompare = b.lastGigDate.localeCompare(a.lastGigDate);
      if (dateCompare !== 0) return dateCompare;
      // Then by frequency
      return b.timesWorkedTogether - a.timesWorkedTogether;
    })
    .slice(0, limit);
}

export async function searchMusicianNames(query: string = ""): Promise<MusicianSuggestion[]> {
  const supabase = createClient();

  // Get current user
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  // Fetch all roles for user's gigs (via gigs they own)
  const { data: roles, error } = await supabase
    .from("gig_roles")
    .select(`
      musician_name,
      role_name,
      gigs!inner(
        owner_id
      )
    `)
    .eq("gigs.owner_id", user.id)
    .not("musician_name", "is", null);

  if (error) throw new Error(error.message || "Failed to fetch musician names");

  // Group by musician name and aggregate data
  const musicianMap = new Map<string, MusicianSuggestion>();

  (roles as GigRoleWithGig[] | null)?.forEach((role) => {
    const name = role.musician_name?.trim();
    if (!name) return;

    // Filter by query if provided
    if (query && !name.toLowerCase().includes(query.toLowerCase())) return;

    if (musicianMap.has(name)) {
      const existing = musicianMap.get(name)!;
      existing.count++;
      if (role.role_name && !existing.roles.includes(role.role_name)) {
        existing.roles.push(role.role_name);
      }
    } else {
      musicianMap.set(name, {
        name,
        count: 1,
        roles: role.role_name ? [role.role_name] : [],
        lastUsed: new Date().toISOString(),
      });
    }
  });

  // Convert to array and sort by frequency (count) then recency
  return Array.from(musicianMap.values()).sort((a, b) => {
    if (b.count !== a.count) return b.count - a.count;
    return new Date(b.lastUsed).getTime() - new Date(a.lastUsed).getTime();
  });
}

// ============================================================================
// PLAYER SELF-SERVICE FUNCTIONS
// ============================================================================

/**
 * Update player's invitation status from their perspective
 * Keeps declined status as 'declined' for proper tracking
 *
 * PERFORMANCE: Optimized to minimize DB round-trips
 * - Single query to fetch role + gig data for validation
 * - Parallel operations where possible
 * - Fire-and-forget for non-critical operations (history, notifications)
 */
export async function updateMyInvitationStatus(
  roleId: string,
  status: 'accepted' | 'declined' | 'tentative' | 'needs_sub',
  notes?: string
): Promise<void> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  // Single query: fetch role with all data needed for validation AND notification
  const { data: role, error: fetchError } = await supabase
    .from('gig_roles')
    .select(`
      musician_id,
      invitation_status,
      role_name,
      gigs!inner (
        id,
        title,
        owner_id
      )
    `)
    .eq('id', roleId)
    .single();

  if (fetchError || !role) {
    throw new Error('Role not found');
  }

  if (role.musician_id !== user.id) {
    throw new Error('Not authorized to update this role');
  }

  // Check if role was replaced (for re-accept flow)
  if (role.invitation_status === 'replaced') {
    throw new Error("This spot has already been filled. Ask the host if they want to re-invite you.");
  }

  const oldStatus = role.invitation_status;
  const gig = role.gigs as { id: string; title: string; owner_id: string };

  // Update role status - this is the critical operation
  const { error: updateError } = await supabase
    .from('gig_roles')
    .update({
      invitation_status: status,
      status_changed_at: new Date().toISOString(),
      status_changed_by: user.id,
    })
    .eq('id', roleId);

  if (updateError) {
    console.error('Error updating role status:', updateError);
    throw new Error('Failed to update status');
  }

  // FIRE-AND-FORGET: Record history and notify manager asynchronously
  // These don't block the user response
  notifyManagerAsync(supabase, {
    roleId,
    roleName: role.role_name || 'team member',
    gig,
    userId: user.id,
    oldStatus,
    newStatus: status,
    notes,
  }).catch(err => {
    console.error('Background notification failed:', err?.message || err);
  });
}

/**
 * Background function to handle status history and manager notifications
 * Runs async to not block the user response
 */
async function notifyManagerAsync(
  supabase: ReturnType<typeof createClient>,
  params: {
    roleId: string;
    roleName: string;
    gig: { id: string; title: string; owner_id: string };
    userId: string;
    oldStatus: string | null;
    newStatus: string;
    notes?: string;
  }
): Promise<void> {
  const { roleId, roleName, gig, userId, oldStatus, newStatus, notes } = params;
  const managerId = gig.owner_id;

  // Run history recording and profile fetch in parallel
  const [, profileResult] = await Promise.all([
    // Record status change history
    recordStatusChange(roleId, oldStatus, newStatus, userId, notes),
    // Get user's name for notification
    supabase.from('profiles').select('name').eq('id', userId).single(),
  ]);

  const userName = profileResult.data?.name || 'A musician';

  // Only notify manager if they exist, status warrants it, and it's not a self-action
  if (!managerId || managerId === userId) return;

  let notificationData: { title: string; message: string } | null = null;

  if (newStatus === 'accepted') {
    notificationData = {
      title: `${userName} accepted`,
      message: `${userName} accepted their role as ${roleName} in ${gig.title}`,
    };
  } else if (newStatus === 'declined') {
    notificationData = {
      title: `${userName} declined`,
      message: `${userName} declined their role as ${roleName} in ${gig.title}`,
    };
  } else if (newStatus === 'needs_sub') {
    notificationData = {
      title: `${userName} needs a sub`,
      message: `${userName} needs a sub for their role as ${roleName} in ${gig.title}`,
    };
  }

  if (notificationData) {
    await createNotification({
      user_id: managerId,
      type: 'status_changed',
      ...notificationData,
      link: `/gigs/${gig.id}`,
      gig_id: gig.id,
      gig_role_id: roleId,
    });
  }
}

/**
 * Update player's personal notes for a role
 */
export async function updateMyPlayerNotes(
  roleId: string,
  notes: string
): Promise<void> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');
  
  const { error } = await supabase
    .from('gig_roles')
    .update({ player_notes: notes })
    .eq('id', roleId)
    .eq('musician_id', user.id);
    
  if (error) {
    console.error('Error updating player notes:', error);
    throw new Error('Failed to update notes');
  }
}

/**
 * Get pending invitations for current user
 */
export async function getMyPendingInvitations(
  userId: string
): Promise<GigRole[]> {
  const supabase = createClient();
  
  const { data, error } = await supabase
    .from('gig_roles')
    .select(`
      *,
      gigs!inner (
        id,
        title,
        date,
        start_time,
        end_time,
        location_name
      )
    `)
    .eq('musician_id', userId)
    .eq('invitation_status', 'invited')
    .gte('gigs.date', new Date().toISOString().split('T')[0]);
    
  if (error) {
    console.error('Error fetching pending invitations:', error);
    throw new Error('Failed to fetch pending invitations');
  }

  // Sort by date ascending (soonest first) in JavaScript
  const sorted = ((data || []) as GigRoleWithGigDetails[]).sort((a, b) => {
    const dateA = a.gigs?.date || '';
    const dateB = b.gigs?.date || '';
    return dateA.localeCompare(dateB);
  });

  return sorted as unknown as GigRole[];
}

/**
 * Get declined invitations for current user
 */
export async function getMyDeclinedInvitations(
  userId: string
): Promise<GigRole[]> {
  const supabase = createClient();
  
  const { data, error } = await supabase
    .from('gig_roles')
    .select(`
      *,
      gigs!inner (
        id,
        title,
        date,
        start_time,
        end_time,
        location_name,
        location_address
      )
    `)
    .eq('musician_id', userId)
    .eq('invitation_status', 'declined')
    .gte('gigs.date', new Date().toISOString().split('T')[0]);
    
  if (error) {
    console.error('Error fetching declined invitations:', error);
    throw new Error('Failed to fetch declined invitations');
  }

  // Sort by date ascending (soonest first) in JavaScript
  const sorted = ((data || []) as GigRoleWithGigDetails[]).sort((a, b) => {
    const dateA = a.gigs?.date || '';
    const dateB = b.gigs?.date || '';
    return dateA.localeCompare(dateB);
  });

  return sorted as unknown as GigRole[];
}

/**
 * Accept multiple invitations at once (bulk action)
 */
export async function acceptMultipleInvitations(
  roleIds: string[]
): Promise<void> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  // Update all roles
  const { error } = await supabase
    .from('gig_roles')
    .update({
      invitation_status: 'accepted',
      status_changed_at: new Date().toISOString(),
      status_changed_by: user.id,
    })
    .in('id', roleIds)
    .eq('musician_id', user.id);

  if (error) {
    console.error('Error accepting invitations:', error);
    throw new Error('Failed to accept invitations');
  }

  // Record history for each (in parallel)
  await Promise.all(
    roleIds.map(roleId =>
      recordStatusChange(roleId, 'invited', 'accepted', user.id, 'Bulk accept')
    )
  );

  // Notify managers about each acceptance (fire-and-forget)
  try {
    // Get role details with gig info
    const { data: roles } = await supabase
      .from('gig_roles')
      .select(`
        id,
        role_name,
        gigs!inner (id, title, owner_id)
      `)
      .in('id', roleIds);

    if (roles && roles.length > 0) {
      // Get user name
      const { data: profile } = await supabase
        .from('profiles')
        .select('name')
        .eq('id', user.id)
        .single();

      const userName = profile?.name || 'A musician';

      // Group by manager to avoid duplicate notifications
      type GigInfo = { id: string; title: string; owner_id: string };
      const managerNotifications = new Map<string, { gig: GigInfo; roles: string[] }>();

      for (const role of (roles as BulkAcceptRole[])) {
        const gig = role.gigs;
        const managerId = gig?.owner_id;
        if (managerId && managerId !== user.id) {
          if (!managerNotifications.has(managerId)) {
            managerNotifications.set(managerId, { gig, roles: [] });
          }
          managerNotifications.get(managerId)!.roles.push(role.role_name || 'team member');
        }
      }

      // Send notifications
      for (const [managerId, data] of managerNotifications) {
        const rolesList = data.roles.join(', ');
        await createNotification({
          user_id: managerId,
          type: 'status_changed',
          title: `${userName} accepted`,
          message: `${userName} accepted their roles (${rolesList}) in ${data.gig.title}`,
          link: `/gigs/${data.gig.id}`,
          gig_id: data.gig.id,
        });
      }
    }
  } catch (notifyError) {
    console.error('Error notifying managers about bulk acceptance:', notifyError);
    // Don't fail - notifications are secondary
  }
}

/**
 * Check if a role has been replaced by another musician
 * Used to prevent re-acceptance of replaced roles
 */
export async function checkIfRoleReplaced(
  roleId: string
): Promise<boolean> {
  const supabase = createClient();
  
  const { data: role, error } = await supabase
    .from('gig_roles')
    .select('invitation_status')
    .eq('id', roleId)
    .single();
    
  if (error || !role) {
    return false;
  }
  
  return role.invitation_status === 'replaced';
}

/**
 * Check for gig conflicts for a user on a specific date/time
 */
export async function checkGigConflicts(
  userId: string,
  gigId: string,
  date: string,
  startTime: string,
  endTime: string
): Promise<GigConflictRole['gigs'][]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('gig_roles')
    .select(`
      id,
      gigs!inner (
        id,
        title,
        date,
        start_time,
        end_time,
        location_name
      )
    `)
    .eq('musician_id', userId)
    .eq('invitation_status', 'accepted')
    .eq('gigs.date', date)
    .neq('gig_id', gigId);

  if (error) {
    console.error('Error checking conflicts:', error);
    return [];
  }

  // Filter by time overlap
  const conflicts = ((data || []) as GigConflictRole[]).filter((role) => {
    const gig = role.gigs;
    if (!gig.start_time || !gig.end_time) return false;

    // Check if times overlap
    return (
      (startTime >= gig.start_time && startTime < gig.end_time) ||
      (endTime > gig.start_time && endTime <= gig.end_time) ||
      (startTime <= gig.start_time && endTime >= gig.end_time)
    );
  });

  return conflicts.map((r) => r.gigs);
}

/**
 * Add a system user directly to a gig role
 * Skips email invitation, links user immediately
 * Sends in-app notification
 */
export async function addSystemUserToGig(data: {
  gigId: string;
  userId: string;
  userName: string;
  roleName: string;
  agreedFee?: number | null;
}): Promise<GigRole> {
  const supabase = createClient();

  // Insert the role with musician_id already set and status 'invited'
  const { data: role, error } = await supabase
    .from('gig_roles')
    .insert({
      gig_id: data.gigId,
      musician_id: data.userId,
      musician_name: data.userName,
      role_name: data.roleName,
      agreed_fee: data.agreedFee,
      invitation_status: 'invited', // Notify user immediately when added
      payment_status: 'pending',
    })
    .select()
    .single();

  if (error) throw new Error(error.message || 'Failed to add user to gig');

  // Fetch gig title for notification
  const { data: gig } = await supabase
    .from('gigs')
    .select('title')
    .eq('id', data.gigId)
    .single();

  // Send notification to the invited user
  await createNotification({
    user_id: data.userId,
    type: 'invitation_received',
    title: `Invitation: ${gig?.title || 'New Gig'}`,
    message: `You've been invited as ${data.roleName}`,
    link: `/gigs/${data.gigId}/pack`,
    gig_id: data.gigId,
    gig_role_id: role.id,
  });

  return role;
}

/**
 * Invite all musicians for a gig
 * Updates all roles to 'invited' status and sends notifications
 * Note: Does NOT change gig status - gig status is independent of invitation state
 */
export async function inviteAllMusicians(gigId: string): Promise<{ count: number }> {
  const supabase = createClient();

  // Get current user
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  // Get all roles for this gig that have musicians and are pending or invited
  // (invited might be old data from before we added pending state)
  const { data: roles, error: rolesError } = await supabase
    .from('gig_roles')
    .select('id, invitation_status, musician_id, musician_name, role_name')
    .eq('gig_id', gigId)
    .not('musician_name', 'is', null)
    .in('invitation_status', ['pending', 'invited']);

  if (rolesError) throw new Error(rolesError.message || 'Failed to fetch gig roles');

  const rolesToInvite = roles || [];
  
  if (rolesToInvite.length === 0) {
    throw new Error('No musicians to invite');
  }

  // Update all pending/invited roles to ensure they're marked as 'invited'
  // This handles both new 'pending' roles and old 'invited' roles
  const { error: updateError } = await supabase
    .from('gig_roles')
    .update({ invitation_status: 'invited' })
    .eq('gig_id', gigId)
    .in('invitation_status', ['pending', 'invited'])
    .not('musician_name', 'is', null);

  if (updateError) throw new Error(updateError.message || 'Failed to update role statuses');

  // Get gig details for notifications
  const { data: gig, error: gigFetchError } = await supabase
    .from('gigs')
    .select('id, title, date, start_time, location_name')
    .eq('id', gigId)
    .single();

  if (gigFetchError || !gig) {
    console.error('Failed to fetch gig for notifications:', gigFetchError);
    // Don't throw - invitations were sent, just notifications failed
    return { count: rolesToInvite.length };
  }

  // Send notifications to all musicians with musician_id (system users)
  // Non-system users (contact_id only) will receive email invitations instead
  const notificationPromises = rolesToInvite
    .filter(role => role.musician_id) // Only send to system users
    .map(role => 
      createNotification({
        user_id: role.musician_id!,
        type: 'invitation_received',
        title: `Invitation: ${gig.title}`,
        message: `You've been invited as ${role.role_name || 'a team member'}`,
        link: `/gigs/${gig.id}/pack`,
        gig_id: gig.id,
        gig_role_id: role.id,
      }).catch(err => {
        // Log but don't fail the whole operation
        console.error(`Failed to send notification to user ${role.musician_id}:`, err);
      })
    );

  await Promise.all(notificationPromises);

  return { count: rolesToInvite.length };
}

/**
 * Re-invite a musician who previously declined
 * Only callable by gig owner
 */
export async function reinviteMusician(
  roleId: string
): Promise<void> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');
  
  // Get role and check if current user is gig owner
  const { data: role, error: fetchError } = await supabase
    .from('gig_roles')
    .select(`
      id,
      invitation_status,
      musician_id,
      musician_name,
      role_name,
      gigs!inner (
        id,
        title,
        owner_id
      )
    `)
    .eq('id', roleId)
    .single();
    
  if (fetchError || !role) {
    throw new Error('Role not found');
  }

  const gig = role.gigs as { id: string; title: string; owner_id: string };
  const gigOwnerId = gig?.owner_id;
  
  if (gigOwnerId !== user.id) {
    throw new Error('Not authorized - only gig owner can re-invite musicians');
  }
  
  if (role.invitation_status !== 'declined') {
    throw new Error('Can only re-invite musicians who have declined');
  }
  
  // Update status to invited
  const { error: updateError } = await supabase
    .from('gig_roles')
    .update({
      invitation_status: 'invited',
      status_changed_at: new Date().toISOString(),
      status_changed_by: user.id,
    })
    .eq('id', roleId);
    
  if (updateError) {
    console.error('Error re-inviting musician:', updateError);
    throw new Error('Failed to re-invite musician');
  }
  
  // Record status change
  await recordStatusChange(roleId, 'declined', 'invited', user.id, 'Manager re-invited');
  
  // Send notification to musician if they have a user account
  if (role.musician_id) {
    await createNotification({
      user_id: role.musician_id,
      type: 'invitation_received',
      title: `Re-invitation: ${gig.title}`,
      message: `You've been re-invited as ${role.role_name || 'a team member'}. The host would like you to reconsider!`,
      link: `/gigs/${gig.id}/pack`,
      gig_id: gig.id,
      gig_role_id: roleId,
    });
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
