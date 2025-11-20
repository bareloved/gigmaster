import { createClient } from '@/lib/supabase/client';
import type { GigPackData } from '@/lib/types/shared';

/**
 * Gig Pack API
 * Fetches all data needed for the mobile-friendly "Gig Pack" view
 */

/**
 * Get all data for the Gig Pack view
 * @param gigId - The gig ID
 * @param userId - The current user's ID
 */
export async function getGigPack(
  gigId: string,
  userId: string
): Promise<GigPackData> {
  const supabase = createClient();

  // Fetch gig with project
  const { data: gig, error: gigError } = await supabase
    .from('gigs')
    .select(
      `
      id,
      title,
      date,
      start_time,
      end_time,
      location_name,
      location_address,
      status,
      notes,
      schedule,
      project_id,
      projects(
        id,
        name,
        cover_image_url,
        owner_id,
        is_personal,
        owner:profiles!projects_owner_id_fkey(
          name
        )
      )
    `
    )
    .eq('id', gigId)
    .single();

  if (gigError) {
    console.error('Error fetching gig:', gigError);
    throw gigError;
  }

  if (!gig) {
    throw new Error('Gig not found');
  }

  // Fetch setlist
  const { data: setlist, error: setlistError } = await supabase
    .from('setlist_items')
    .select('id, position, title, key, bpm, notes')
    .eq('gig_id', gigId)
    .order('position', { ascending: true });

  if (setlistError) {
    console.error('Error fetching setlist:', setlistError);
    throw setlistError;
  }

  // Fetch resources/files
  const { data: resources, error: resourcesError } = await supabase
    .from('gig_files')
    .select('id, label, url, type')
    .eq('gig_id', gigId)
    .order('created_at', { ascending: true });

  if (resourcesError) {
    console.error('Error fetching resources:', resourcesError);
    throw resourcesError;
  }

  // Fetch people (lineup)
  const { data: people, error: peopleError } = await supabase
    .from('gig_roles')
    .select('id, role_name, musician_name, invitation_status')
    .eq('gig_id', gigId)
    .order('created_at', { ascending: true });

  if (peopleError) {
    console.error('Error fetching people:', peopleError);
    throw peopleError;
  }

  // Fetch current user's role (if they have one and it's not pending)
  // Note: RLS will prevent access if role is pending, but we filter here too for clarity
  const { data: userRole, error: userRoleError } = await supabase
    .from('gig_roles')
    .select('id, role_name, invitation_status, agreed_fee, is_paid, paid_at, notes, player_notes')
    .eq('gig_id', gigId)
    .eq('musician_id', userId)
    .neq('invitation_status', 'pending') // Don't show role details for pending invitations
    .maybeSingle();

  if (userRoleError) {
    console.error('Error fetching user role:', userRoleError);
    // Don't throw - user might not have a role
  }

  // Transform the data
  return {
    id: gig.id,
    title: gig.title,
    date: gig.date,
    startTime: gig.start_time,
    endTime: gig.end_time,
    locationName: gig.location_name,
    locationAddress: gig.location_address,
    status: gig.status,
    notes: gig.notes,
    schedule: gig.schedule,
    project: gig.projects
      ? {
          id: gig.projects.id,
          name: gig.projects.name,
          coverImageUrl: gig.projects.cover_image_url,
          ownerId: gig.projects.owner_id,
          ownerName: gig.projects.owner?.name || 'Unknown',
          isPersonal: gig.projects.is_personal,
        }
      : null,
    setlist: setlist || [],
    resources: resources || [],
    people: (people || []).map(person => ({
      id: person.id,
      roleName: person.role_name,
      musicianName: person.musician_name,
      invitationStatus: person.invitation_status,
    })),
    userRole: userRole
      ? {
          roleId: userRole.id,
          roleName: userRole.role_name,
          invitationStatus: userRole.invitation_status,
          agreedFee: userRole.agreed_fee,
          isPaid: userRole.is_paid,
          paidAt: userRole.paid_at,
          currency: 'ILS', // Default to ILS until currency field is added to database
          notes: userRole.notes,
          playerNotes: userRole.player_notes,
        }
      : null,
  };
}

