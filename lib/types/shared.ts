/**
 * Shared Types for API Layer
 * 
 * This file contains all TypeScript types used across the API layer.
 * These types are mobile-ready and can be shared between web and React Native apps.
 * 
 * All types are derived from the Supabase database schema and extended with
 * application-specific interfaces for API responses.
 */

import type { Database } from '@/lib/types/database';

// ============================================================================
// DATABASE TABLE TYPES
// ============================================================================

/**
 * Gigs
 */
export type Gig = Database['public']['Tables']['gigs']['Row'];
export type GigInsert = Database['public']['Tables']['gigs']['Insert'];
export type GigUpdate = Database['public']['Tables']['gigs']['Update'];

/**
 * Projects
 */
export type Project = Database['public']['Tables']['projects']['Row'];
export type ProjectInsert = Database['public']['Tables']['projects']['Insert'];
export type ProjectUpdate = Database['public']['Tables']['projects']['Update'];

/**
 * Gig Roles (Lineup/Musicians)
 */
export type GigRole = Database['public']['Tables']['gig_roles']['Row'];
export type GigRoleInsert = Database['public']['Tables']['gig_roles']['Insert'];
export type GigRoleUpdate = Database['public']['Tables']['gig_roles']['Update'];

/**
 * Setlist Items
 */
export type SetlistItem = Database['public']['Tables']['setlist_items']['Row'];
export type SetlistItemInsert = Database['public']['Tables']['setlist_items']['Insert'];
export type SetlistItemUpdate = Database['public']['Tables']['setlist_items']['Update'];

/**
 * Gig Files (Resources)
 */
export type GigFile = Database['public']['Tables']['gig_files']['Row'];
export type GigFileInsert = Database['public']['Tables']['gig_files']['Insert'];
export type GigFileUpdate = Database['public']['Tables']['gig_files']['Update'];

/**
 * Profiles
 */
export type Profile = Database['public']['Tables']['profiles']['Row'];
export type ProfileInsert = Database['public']['Tables']['profiles']['Insert'];
export type ProfileUpdate = Database['public']['Tables']['profiles']['Update'];

/**
 * Gig Invitations
 */
export type GigInvitation = Database['public']['Tables']['gig_invitations']['Row'];
export type GigInvitationInsert = Database['public']['Tables']['gig_invitations']['Insert'];
export type GigInvitationUpdate = Database['public']['Tables']['gig_invitations']['Update'];

/**
 * Gig Role Status History
 */
export type GigRoleStatusHistory = Database['public']['Tables']['gig_role_status_history']['Row'];
export type GigRoleStatusHistoryInsert = Database['public']['Tables']['gig_role_status_history']['Insert'];
export type GigRoleStatusHistoryUpdate = Database['public']['Tables']['gig_role_status_history']['Update'];

/**
 * Musician Contacts
 */
export type MusicianContact = Database['public']['Tables']['musician_contacts']['Row'];
export type MusicianContactInsert = Database['public']['Tables']['musician_contacts']['Insert'];
export type MusicianContactUpdate = Database['public']['Tables']['musician_contacts']['Update'];

// ============================================================================
// APPLICATION-SPECIFIC TYPES
// ============================================================================

/**
 * Contact status lifecycle
 */
export type ContactStatus = 
  | 'local_only'  // Created locally, no invite sent
  | 'invited'     // Invite sent, waiting for signup
  | 'active_user'; // Linked to real user account

/**
 * Invitation status for gig roles
 */
export type InvitationStatus = 
  | 'pending'      // Added to role, but invitation not sent yet
  | 'invited'      // Invitation sent
  | 'accepted' 
  | 'declined'
  | 'tentative'
  | 'needs_sub' 
  | 'replaced';

/**
 * Gig status workflow
 * Represents the lifecycle of the gig itself, not invitation state.
 * For invitation tracking, see invitation_status on gig_roles.
 */
export type GigStatus = 
  | 'draft'             // Gig created, roles being added
  | 'confirmed'         // Gig confirmed, ready to go
  | 'completed'         // Gig completed
  | 'cancelled';        // Gig cancelled

/**
 * Invitation email status
 */
export type GigInvitationStatus = 
  | 'pending' 
  | 'accepted' 
  | 'declined' 
  | 'expired';

/**
 * Musician suggestion (for autocomplete/search)
 */
export interface MusicianSuggestion {
  name: string;
  count: number;
  roles: string[];
  lastUsed: string;
}

/**
 * Musician contact with additional computed statistics
 * Used for enhanced autocomplete and search results
 */
export interface MusicianContactWithStats extends MusicianContact {
  gigsCount: number;
  mostCommonRole: string | null;
}

/**
 * Player money summary statistics
 */
export interface PlayerMoneySummary {
  totalEarned: number;
  totalUnpaid: number;
  gigCount: number;
  currency: string;
}

/**
 * Player money gig details
 */
export interface PlayerMoneyGig {
  id: string;
  date: string;
  gigTitle: string;
  projectName: string;
  roleName: string;
  agreedFee: number | null;
  isPaid: boolean;
  paidAt: string | null;
  currency: string;
}

/**
 * Gig Pack data structure (mobile-optimized view)
 * Contains all essential gig information in a single response
 */
export interface GigPackData {
  // Basic gig info
  id: string;
  title: string;
  date: string;
  startTime: string | null;
  endTime: string | null;
  locationName: string | null;
  locationAddress: string | null;
  status: string;
  notes: string | null;
  schedule: string | null;
  
  // Project info (all gigs now have a project)
  project: {
    id: string;
    name: string;
    coverImageUrl: string | null;
    ownerId: string;
    ownerName: string;
    isPersonal?: boolean;
  } | null;
  
  // Setlist
  setlist: {
    id: string;
    position: number;
    title: string;
    key: string | null;
    bpm: number | null;
    notes: string | null;
  }[];
  
  // Resources/Files
  resources: {
    id: string;
    label: string;
    url: string;
    type: string;
  }[];
  
  // People (lineup)
  people: {
    id: string;
    roleName: string;
    musicianName: string | null;
    invitationStatus: string;
  }[];
  
  // Current user's role and money info (if they're playing)
  userRole: {
    roleId: string;
    roleName: string;
    invitationStatus: string;
    agreedFee: number | null;
    isPaid: boolean;
    paidAt: string | null;
    currency: string;
    notes: string | null;
    playerNotes: string | null;
  } | null;
}

/**
 * Dashboard Gig - Unified view for dashboard
 * Shows whether user is manager, player, or both for each gig
 */
export interface DashboardGig {
  gigId: string;
  projectId: string | null;
  projectName: string | null;
  gigTitle: string;
  date: string;
  startTime: string | null;
  endTime: string | null;
  locationName: string | null;
  status: string | null;
  isManager: boolean;
  isPlayer: boolean;
  playerRoleName?: string | null;
  playerGigRoleId?: string | null;
  invitationStatus?: string | null;
  paymentStatus?: "paid" | "unpaid" | null;
  hostName: string | null;
  // Role statistics (for managers)
  roleStats?: {
    total: number;
    invited: number;
    accepted: number;
    declined: number;
    pending: number;
  } | null;
}

/**
 * Calendar Gig - For calendar view and ICS feed
 * Extended gig information for calendar displays
 */
export interface CalendarGig {
  id: string;
  title: string;
  projectId: string | null;
  projectName: string | null;
  date: string;
  startTime: string | null;
  endTime: string | null;
  locationName: string | null;
  locationAddress: string | null;
  isManager: boolean;
  isPlayer: boolean;
  roleName?: string | null;
  status: string | null;
}

/**
 * Notifications
 */
export type Notification = Database['public']['Tables']['notifications']['Row'];
export type NotificationInsert = Database['public']['Tables']['notifications']['Insert'];
export type NotificationUpdate = Database['public']['Tables']['notifications']['Update'];

export type NotificationType = 
  | 'invitation_received'
  | 'status_changed'
  | 'gig_updated'
  | 'gig_cancelled'
  | 'payment_received';

/**
 * System User - Public profile for user search
 */
export interface SystemUser {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  main_instrument: string | null;
  avatar_url: string | null;
  created_at: string;
}
