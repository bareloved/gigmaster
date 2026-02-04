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
 * Note: The database table is called gig_materials but we alias it as GigFile for legacy code compatibility
 */
export type GigFile = Database['public']['Tables']['gig_materials']['Row'];
export type GigFileInsert = Database['public']['Tables']['gig_materials']['Insert'];
export type GigFileUpdate = Database['public']['Tables']['gig_materials']['Update'];

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
 * Check if a gig status represents an archived/inactive state.
 * Centralizes the logic to prevent inconsistencies across the codebase.
 */
export function isArchivedStatus(status: GigStatus | string | null | undefined): boolean {
  return status === 'cancelled' || status === 'completed';
}

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
  gigsCount: number | null;
  mostCommonRole: string | null;
}

/**
 * Gig Readiness (per musician per gig)
 * Tracks individual preparation status for a gig
 */
export interface GigReadiness {
  id: string;
  gigId: string;
  musicianId: string;
  songsTotal: number;
  songsLearned: number;
  chartsReady: boolean;
  soundsReady: boolean;
  travelChecked: boolean;
  gearPacked: boolean;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export type GigReadinessInsert = Omit<GigReadiness, 'id' | 'createdAt' | 'updatedAt'>;
export type GigReadinessUpdate = Partial<Omit<GigReadiness, 'id' | 'gigId' | 'musicianId' | 'createdAt' | 'updatedAt'>>;

/**
 * Calculated readiness score breakdown
 */
export interface ReadinessScore {
  overall: number;        // 0-100
  songs: number;          // 0-100
  charts: number;         // 0-100
  sounds: number;         // 0-100
  travel: number;         // 0-100
  gear: number;           // 0-100
}

/**
 * Setlist Learning Status (per musician per song)
 * Tracks individual musician's learning progress for setlist items
 */
export interface SetlistLearningStatus {
  id: string;
  setlistItemId: string;
  musicianId: string;
  learned: boolean;
  lastPracticedAt: string | null;
  practiceCount: number;
  difficulty: 'easy' | 'medium' | 'hard' | null;
  priority: 'low' | 'medium' | 'high';
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export type SetlistLearningStatusInsert = Omit<SetlistLearningStatus, 'id' | 'createdAt' | 'updatedAt'>;
export type SetlistLearningStatusUpdate = Partial<Omit<SetlistLearningStatus, 'id' | 'setlistItemId' | 'musicianId' | 'createdAt' | 'updatedAt'>>;

/**
 * Practice item for dashboard "Practice Focus" widget
 * Combines setlist item with learning status
 */
export interface PracticeItem {
  setlistItemId: string;
  songTitle: string;
  gigId: string;
  gigTitle: string;
  gigDate: string;
  hostName: string | null;
  key: string | null;
  bpm: number | null;
  learned: boolean;
  difficulty: 'easy' | 'medium' | 'hard' | null;
  priority: 'low' | 'medium' | 'high';
  lastPracticedAt: string | null;
  daysUntilGig: number;
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

  // External gig info
  isExternal: boolean;
  externalEventUrl: string | null;
  scheduleNotes: ScheduleNoteItem[] | null;
  
  // Host info (gig owner)
  host: {
    id: string;
    name: string;
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
    roleName: string | null;
    musicianName: string | null;
    invitationStatus: string;
  }[];
  
  // Current user's role and money info (if they're playing)
  userRole: {
    roleId: string;
    roleName: string | null;
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
  gigTitle: string;
  date: string;
  startTime: string | null;
  endTime: string | null;
  callTime: string | null;
  locationName: string | null;
  status: string | null;
  isManager: boolean;
  isPlayer: boolean;
  isExternal?: boolean;
  playerRoleName?: string | null;
  playerGigRoleId?: string | null;
  invitationStatus?: string | null;
  hostId: string | null;
  hostName: string | null;
  heroImageUrl?: string | null;
  gigType?: string | null;
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
  hostId: string | null;
  hostName: string | null;
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

// ============================================================================
// EXTERNAL GIG & CALENDAR IMPORT TYPES
// ============================================================================

/**
 * Schedule item for structured schedule display (stored as JSONB in schedule_notes)
 */
export interface ScheduleNoteItem {
  time: string;      // e.g., "17:00" or "5:00 PM"
  label: string;     // e.g., "Load-in", "Soundcheck"
  notes?: string;    // Optional additional details
}

/**
 * Personal earnings tracking (stored on gig_roles)
 */
export interface PersonalEarnings {
  amount: number | null;
  currency: string;
  notes: string | null;
  paidAt: string | null;
}

/**
 * Calendar refresh diff - shows what changed since last import
 */
export interface CalendarRefreshDiff {
  hasChanges: boolean;
  changes: {
    field: string;
    oldValue: string | null;
    newValue: string | null;
  }[];
}

/**
 * System User - Public profile for user search
 */
export interface SystemUser {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  main_instrument: string | null;
  avatar_url: string | null;
  created_at: string;
}

/**
 * Gig Contact - People musicians can contact about the gig
 */
export interface GigContact {
  id: string;
  gigId: string;
  label: string;
  name: string;
  phone: string | null;
  email: string | null;
  sourceType: 'manual' | 'lineup' | 'contact';
  sourceId: string | null;
  sortOrder: number;
  createdAt: string;
}

export type GigContactInsert = Omit<GigContact, 'id' | 'createdAt'>;
export type GigContactUpdate = Partial<Omit<GigContact, 'id' | 'gigId' | 'createdAt'>>;

/**
 * Feedback - User feedback submissions
 */
export type FeedbackCategory = 'bug' | 'feature' | 'general';

export interface Feedback {
  id: string;
  category: string; // FeedbackCategory but comes as string from DB
  message: string;
  user_id: string | null;
  created_at: string;
  resolved: boolean;
  // Manually joined profile data
  user_email?: string | null;
  user_name?: string | null;
}

export interface FeedbackInsert {
  category?: FeedbackCategory;
  message: string;
  user_id?: string | null;
}

