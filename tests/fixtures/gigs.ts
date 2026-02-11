import type { Gig, GigRole } from "@/lib/types/shared";

/**
 * Mock gig with all common fields populated
 */
export const mockGig: Gig = {
  id: "test-gig-id-123",
  title: "Jazz Night at Blue Note",
  date: "2024-12-15",
  start_time: "20:00",
  end_time: "23:00",
  call_time: "19:00",
  on_stage_time: "20:30",
  location_name: "Blue Note Jazz Club",
  location_address: "131 W 3rd St, New York, NY 10012",
  venue_name: "Blue Note",
  venue_address: "131 W 3rd St, New York, NY 10012",
  venue_maps_url: null,
  status: "confirmed",
  owner_id: "test-user-id-123",
  band_id: null,
  band_name: "The Jazz Quartet",
  band_logo_url: null,
  hero_image_url: null,
  cover_image_path: null,
  accent_color: null,
  poster_skin: null,
  gig_type: "club",
  theme: null,
  dress_code: "Smart casual",
  setlist: null,
  setlist_pdf_url: null,
  internal_notes: "Sound check at 18:00",
  backline_notes: "House piano available",
  parking_notes: "Street parking only",
  payment_notes: null,
  client_fee: 2000,
  currency: "USD",
  notes: null,
  schedule: null,
  schedule_notes: null,
  external_calendar_event_id: null,
  external_calendar_provider: null,
  external_event_url: null,
  google_calendar_event_id: null,
  imported_from_calendar: false,
  is_external: false,
  deleted_at: null,
  created_at: "2024-01-01T00:00:00Z",
  updated_at: "2024-01-01T00:00:00Z",
};

/**
 * Mock gig with minimal fields (for creation tests)
 */
export const mockMinimalGig: Partial<Gig> = {
  title: "Quick Gig",
  date: "2024-12-20",
};

/**
 * Mock gig role (lineup member)
 */
export const mockGigRole: GigRole = {
  id: "test-role-id-123",
  gig_id: "test-gig-id-123",
  role_name: "Keys",
  musician_name: "John Doe",
  musician_id: "test-user-id-456",
  contact_id: null,
  invitation_status: "accepted",
  invitation_method: null,
  invitation_sent_at: null,
  google_calendar_event_id: null,
  payment_status: "pending",
  agreed_fee: 500,
  currency: "USD",
  paid_amount: null,
  paid_at: null,
  notes: null,
  player_notes: null,
  sort_order: 0,
  status_changed_at: null,
  status_changed_by: null,
  status: null,
  user_id: null,
  is_paid: false,
  personal_earnings_amount: null,
  personal_earnings_currency: "ILS",
  personal_earnings_notes: null,
  personal_earnings_paid_at: null,
};

/**
 * Mock gig role with pending invitation
 */
export const mockPendingRole: GigRole = {
  ...mockGigRole,
  id: "test-role-id-pending",
  invitation_status: "pending",
  musician_id: null,
};

/**
 * Mock gig with owner profile joined (as returned by getGig)
 */
export const mockGigWithOwner = {
  ...mockGig,
  owner: {
    id: "test-user-id-123",
    name: "Test User",
  },
};

/**
 * Creates a mock gig with custom overrides
 */
export function createMockGig(overrides: Partial<Gig> = {}): Gig {
  return {
    ...mockGig,
    id: `gig-${Date.now()}`,
    ...overrides,
  };
}

/**
 * Creates a mock gig role with custom overrides
 */
export function createMockGigRole(overrides: Partial<GigRole> = {}): GigRole {
  return {
    ...mockGigRole,
    id: `role-${Date.now()}`,
    ...overrides,
  };
}

/**
 * Mock contact from My Circle
 */
export const mockContact = {
  id: "contact-id-123",
  user_id: "current-user-id",
  contact_name: "Jane Smith",
  email: "jane@example.com",
  phone: "+1234567890",
  primary_instrument: "Piano",
  default_roles: ["Keys", "Synth"],
  default_fee: 400,
  status: "local_only" as const,
  linked_user_id: null,
  times_worked_together: 5,
  last_worked_date: "2024-11-01",
  created_at: "2024-01-01T00:00:00Z",
  updated_at: "2024-01-01T00:00:00Z",
  gigsCount: 5,
  mostCommonRole: "Keys",
  notes: null,
};

/**
 * Mock system user (registered user)
 */
export const mockSystemUser = {
  id: "system-user-id-456",
  name: "Alice Johnson",
  email: "alice@example.com",
  avatar_url: "https://example.com/avatar.jpg",
  main_instrument: "Drums",
  phone: null,
  created_at: "2024-01-01T00:00:00Z",
};
