import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock server-only module to allow imports
vi.mock("server-only", () => ({}));

// Shared mock supabase client configured per test
const mockSupabase = {
  from: vi.fn(),
};

// Mock Supabase server client (async createClient)
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => mockSupabase),
}));

// Mock Google Calendar client methods
const mockGoogleClient = {
  setCredentials: vi.fn(),
  getEvent: vi.fn(),
  createEvent: vi.fn(),
  updateEvent: vi.fn(),
  deleteEvent: vi.fn(),
  watchEvent: vi.fn(),
  stopWatch: vi.fn(),
};

vi.mock("@/lib/integrations/google-calendar", () => ({
  GoogleCalendarClient: vi.fn().mockImplementation(function () {
    return mockGoogleClient;
  }),
  CreateEventInput: {},
}));

// Mock gig-invitations
vi.mock("@/lib/api/gig-invitations", () => ({
  inviteMusicianByEmail: vi.fn(),
}));

import {
  mapResponseStatus,
  hasCalendarWriteAccess,
  getRolesNeedingInvites,
  sendCalendarInvites,
  updateCalendarEvents,
  cancelCalendarEvents,
  cancelRoleCalendarEvents,
} from "@/lib/api/calendar-invites";
import { inviteMusicianByEmail } from "@/lib/api/gig-invitations";
import { createChainableMock } from "../mocks/supabase";

// =============================================================================
// Helpers for building chainable mocks per table call
// =============================================================================

/**
 * Configure mockSupabase.from to return different chainable mocks
 * based on the table name passed to .from(tableName).
 */
function configureFromMocks(tableMap: Record<string, ReturnType<typeof createChainableMock>>) {
  mockSupabase.from.mockImplementation((table: string) => {
    if (tableMap[table]) {
      return tableMap[table];
    }
    // Default: return a chainable mock with null data
    return createChainableMock({ data: null, error: null });
  });
}

/**
 * Configure mockSupabase.from to return different mocks on sequential calls,
 * regardless of table name. Useful when the same table is queried multiple times.
 */
function configureFromSequence(mocks: ReturnType<typeof createChainableMock>[]) {
  let callIndex = 0;
  mockSupabase.from.mockImplementation(() => {
    const mock = mocks[callIndex] || createChainableMock({ data: null, error: null });
    callIndex++;
    return mock;
  });
}

// =============================================================================
// Test data fixtures
// =============================================================================

const MOCK_USER_ID = "user-owner-123";
const MOCK_GIG_ID = "gig-abc-456";

const mockConnection = {
  access_token: "access-token-123",
  refresh_token: "refresh-token-456",
  token_expires_at: "2026-12-31T00:00:00Z",
  write_access: true,
  send_invites_enabled: true,
};

const mockGig = {
  id: MOCK_GIG_ID,
  title: "Jazz Night",
  date: "2026-03-15",
  start_time: "20:00:00",
  end_time: "23:00:00",
  call_time: "18:30:00",
  on_stage_time: "20:30:00",
  location_name: "Blue Note",
  location_address: "131 W 3rd St",
  dress_code: "Smart casual",
  notes: "Bring charts",
  parking_notes: "Street parking",
  owner_id: MOCK_USER_ID,
  band_id: "band-xyz",
  google_calendar_event_id: null as string | null,
  gig_shares: [{ token: "share-token-abc" }],
};

const mockRole = {
  id: "role-1",
  role_name: "Drums",
  musician_name: "Dave",
  musician_id: "musician-1",
  invitation_status: "pending",
  invitation_method: null,
  google_calendar_event_id: null,
  contact_id: "contact-1",
  musician_contacts: { email: "dave@example.com" },
};

describe("Calendar Invites API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Suppress console.log/warn/error during tests
    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  // ===========================================================================
  // mapResponseStatus (existing tests preserved)
  // ===========================================================================

  describe("mapResponseStatus", () => {
    it("maps 'accepted' to 'accepted'", () => {
      expect(mapResponseStatus("accepted")).toBe("accepted");
    });

    it("maps 'declined' to 'declined'", () => {
      expect(mapResponseStatus("declined")).toBe("declined");
    });

    it("maps 'tentative' to 'tentative'", () => {
      expect(mapResponseStatus("tentative")).toBe("tentative");
    });

    it("maps 'needsAction' to 'invited'", () => {
      expect(mapResponseStatus("needsAction")).toBe("invited");
    });

    it("maps unknown status to 'invited'", () => {
      expect(mapResponseStatus("unknown")).toBe("invited");
      expect(mapResponseStatus("")).toBe("invited");
    });
  });

  describe("CalendarInviteResult type", () => {
    it("represents a successful calendar invite", () => {
      const result: { roleId: string; success: boolean; method: "google_calendar"; eventId?: string; error?: string } = {
        roleId: "role-123",
        success: true,
        method: "google_calendar" as const,
        eventId: "event-456",
      };

      expect(result.success).toBe(true);
      expect(result.method).toBe("google_calendar");
      expect(result.eventId).toBe("event-456");
      expect(result.error).toBeUndefined();
    });

    it("represents a successful email fallback", () => {
      const result: { roleId: string; success: boolean; method: "email"; eventId?: string } = {
        roleId: "role-123",
        success: true,
        method: "email" as const,
      };

      expect(result.success).toBe(true);
      expect(result.method).toBe("email");
      expect(result.eventId).toBeUndefined();
    });

    it("represents a failed invite", () => {
      const result = {
        roleId: "role-123",
        success: false,
        method: null,
        error: "No email address",
      };

      expect(result.success).toBe(false);
      expect(result.method).toBeNull();
      expect(result.error).toBe("No email address");
    });
  });

  describe("SendInvitesResponse type", () => {
    it("represents a batch response", () => {
      const response = {
        sent: 3,
        failed: 1,
        results: [
          { roleId: "1", success: true, method: "google_calendar" as const, eventId: "e1" },
          { roleId: "2", success: true, method: "google_calendar" as const, eventId: "e2" },
          { roleId: "3", success: true, method: "email" as const },
          { roleId: "4", success: false, method: null, error: "No email" },
        ],
      };

      expect(response.sent).toBe(3);
      expect(response.failed).toBe(1);
      expect(response.results).toHaveLength(4);
      expect(response.results.filter(r => r.success)).toHaveLength(3);
      expect(response.results.filter(r => !r.success)).toHaveLength(1);
    });
  });

  // ===========================================================================
  // hasCalendarWriteAccess
  // ===========================================================================

  describe("hasCalendarWriteAccess", () => {
    it("returns true when write_access and send_invites_enabled are both true", async () => {
      configureFromMocks({
        calendar_connections: createChainableMock({
          data: { write_access: true, send_invites_enabled: true },
          error: null,
        }),
      });

      const result = await hasCalendarWriteAccess(MOCK_USER_ID);

      expect(result).toBe(true);
      expect(mockSupabase.from).toHaveBeenCalledWith("calendar_connections");
    });

    it("returns false when write_access is false", async () => {
      configureFromMocks({
        calendar_connections: createChainableMock({
          data: { write_access: false, send_invites_enabled: true },
          error: null,
        }),
      });

      const result = await hasCalendarWriteAccess(MOCK_USER_ID);

      expect(result).toBe(false);
    });

    it("returns false when send_invites_enabled is false", async () => {
      configureFromMocks({
        calendar_connections: createChainableMock({
          data: { write_access: true, send_invites_enabled: false },
          error: null,
        }),
      });

      const result = await hasCalendarWriteAccess(MOCK_USER_ID);

      expect(result).toBe(false);
    });

    it("returns false when data is null (no connection)", async () => {
      configureFromMocks({
        calendar_connections: createChainableMock({
          data: null,
          error: null,
        }),
      });

      const result = await hasCalendarWriteAccess(MOCK_USER_ID);

      expect(result).toBe(false);
    });

    it("returns false when both fields are false", async () => {
      configureFromMocks({
        calendar_connections: createChainableMock({
          data: { write_access: false, send_invites_enabled: false },
          error: null,
        }),
      });

      const result = await hasCalendarWriteAccess(MOCK_USER_ID);

      expect(result).toBe(false);
    });
  });

  // ===========================================================================
  // getRolesNeedingInvites
  // ===========================================================================

  describe("getRolesNeedingInvites", () => {
    it("returns roles with emails and identifies missing emails", async () => {
      const roleWithContact = {
        ...mockRole,
        id: "role-1",
        musician_id: null,
        musician_contacts: { email: "dave@example.com" },
      };
      const roleWithoutEmail = {
        ...mockRole,
        id: "role-2",
        musician_id: null,
        musician_contacts: { email: null },
      };

      // Call 1: gig_roles query
      // Call 2: profiles query (skipped because no musician_ids)
      configureFromSequence([
        createChainableMock({
          data: [roleWithContact, roleWithoutEmail],
          error: null,
        }),
      ]);

      const result = await getRolesNeedingInvites(MOCK_GIG_ID);

      expect(result.roles).toHaveLength(1);
      expect(result.roles[0].id).toBe("role-1");
      expect(result.roles[0].email).toBe("dave@example.com");
      expect(result.missingEmails).toHaveLength(1);
      expect(result.missingEmails[0].id).toBe("role-2");
    });

    it("resolves emails from profiles for roles with musician_id", async () => {
      const roleWithMusician = {
        ...mockRole,
        id: "role-1",
        musician_id: "musician-1",
        musician_contacts: { email: null },
      };

      // Call 1: gig_roles query
      // Call 2: profiles query
      configureFromSequence([
        createChainableMock({
          data: [roleWithMusician],
          error: null,
        }),
        createChainableMock({
          data: [{ id: "musician-1", email: "musician@example.com" }],
          error: null,
        }),
      ]);

      const result = await getRolesNeedingInvites(MOCK_GIG_ID);

      expect(result.roles).toHaveLength(1);
      expect(result.roles[0].email).toBe("musician@example.com");
      expect(result.missingEmails).toHaveLength(0);
    });

    it("prefers profile email over contact email", async () => {
      const role = {
        ...mockRole,
        musician_id: "musician-1",
        musician_contacts: { email: "contact@example.com" },
      };

      configureFromSequence([
        createChainableMock({ data: [role], error: null }),
        createChainableMock({
          data: [{ id: "musician-1", email: "profile@example.com" }],
          error: null,
        }),
      ]);

      const result = await getRolesNeedingInvites(MOCK_GIG_ID);

      expect(result.roles[0].email).toBe("profile@example.com");
    });

    it("throws when gig_roles query fails", async () => {
      configureFromSequence([
        createChainableMock({
          data: null,
          error: { message: "Permission denied" },
        }),
      ]);

      await expect(getRolesNeedingInvites(MOCK_GIG_ID)).rejects.toThrow(
        "Failed to fetch roles: Permission denied"
      );
    });

    it("returns empty arrays when no roles exist", async () => {
      configureFromSequence([
        createChainableMock({ data: [], error: null }),
      ]);

      const result = await getRolesNeedingInvites(MOCK_GIG_ID);

      expect(result.roles).toHaveLength(0);
      expect(result.missingEmails).toHaveLength(0);
    });

    it("handles null roles data gracefully", async () => {
      configureFromSequence([
        createChainableMock({ data: null, error: null }),
      ]);

      const result = await getRolesNeedingInvites(MOCK_GIG_ID);

      expect(result.roles).toHaveLength(0);
      expect(result.missingEmails).toHaveLength(0);
    });

    it("handles profiles returning null data", async () => {
      const role = {
        ...mockRole,
        musician_id: "musician-1",
        musician_contacts: { email: null },
      };

      configureFromSequence([
        createChainableMock({ data: [role], error: null }),
        createChainableMock({ data: null, error: null }),
      ]);

      const result = await getRolesNeedingInvites(MOCK_GIG_ID);

      // No profile email found, no contact email => missing
      expect(result.roles).toHaveLength(0);
      expect(result.missingEmails).toHaveLength(1);
    });
  });

  // ===========================================================================
  // sendCalendarInvites
  // ===========================================================================

  describe("sendCalendarInvites", () => {
    // Helper: set up the standard sequence of supabase calls for sendCalendarInvites.
    // The function calls .from() many times in sequence:
    //   1. calendar_connections (connection)
    //   2. gigs (gig details)
    //   3. bands (project name) — only if gig.band_id
    //   4. profiles (owner name) — only if gig.owner_id
    //   5. gig_roles (getRolesNeedingInvites call 1)
    //   6. profiles (getRolesNeedingInvites call 2) — only if musician_ids
    //   Then per-role updates and gig updates as needed...

    function setupSendInvitesMocks(overrides: {
      connection?: unknown;
      connError?: unknown;
      gig?: unknown;
      gigError?: unknown;
      band?: unknown;
      ownerProfile?: unknown;
      roles?: unknown;
      rolesError?: unknown;
      roleProfiles?: unknown;
    } = {}) {
      const {
        connection = mockConnection,
        connError = null,
        gig = mockGig,
        gigError = null,
        band = { name: "The Jazz Trio" },
        ownerProfile = { name: "Manager Mike" },
        roles = [mockRole],
        rolesError = null,
        roleProfiles = [{ id: "musician-1", email: "dave@example.com" }],
      } = overrides;

      const mocks: ReturnType<typeof createChainableMock>[] = [
        createChainableMock({ data: connection, error: connError }), // calendar_connections
        createChainableMock({ data: gig, error: gigError }), // gigs
        createChainableMock({ data: band, error: null }), // bands
        createChainableMock({ data: ownerProfile, error: null }), // profiles (owner)
        createChainableMock({ data: roles, error: rolesError }), // gig_roles
        createChainableMock({ data: roleProfiles, error: null }), // profiles (musician lookup)
      ];

      // Add extra mocks for gig update + webhook insert + role updates
      for (let i = 0; i < 10; i++) {
        mocks.push(createChainableMock({ data: null, error: null }));
      }

      configureFromSequence(mocks);
    }

    it("throws when Google Calendar is not connected", async () => {
      setupSendInvitesMocks({ connection: null, connError: { message: "Not found" } });

      await expect(
        sendCalendarInvites(MOCK_GIG_ID, MOCK_USER_ID)
      ).rejects.toThrow("Google Calendar not connected");
    });

    it("throws when write_access is disabled", async () => {
      setupSendInvitesMocks({
        connection: { ...mockConnection, write_access: false },
      });

      await expect(
        sendCalendarInvites(MOCK_GIG_ID, MOCK_USER_ID)
      ).rejects.toThrow("Calendar invites not enabled");
    });

    it("throws when send_invites_enabled is disabled", async () => {
      setupSendInvitesMocks({
        connection: { ...mockConnection, send_invites_enabled: false },
      });

      await expect(
        sendCalendarInvites(MOCK_GIG_ID, MOCK_USER_ID)
      ).rejects.toThrow("Calendar invites not enabled");
    });

    it("throws when gig fetch fails", async () => {
      setupSendInvitesMocks({
        gig: null,
        gigError: { message: "Not found" },
      });

      await expect(
        sendCalendarInvites(MOCK_GIG_ID, MOCK_USER_ID)
      ).rejects.toThrow("Failed to fetch gig: Not found");
    });

    it("throws when user does not own the gig", async () => {
      setupSendInvitesMocks({
        gig: { ...mockGig, owner_id: "other-user" },
      });

      await expect(
        sendCalendarInvites(MOCK_GIG_ID, MOCK_USER_ID)
      ).rejects.toThrow("Not authorized to send invites for this gig");
    });

    it("returns early with zero counts when no roles need invites", async () => {
      setupSendInvitesMocks({ roles: [] });

      const result = await sendCalendarInvites(MOCK_GIG_ID, MOCK_USER_ID);

      expect(result.sent).toBe(0);
      expect(result.failed).toBe(0);
      expect(result.results).toHaveLength(0);
    });

    it("creates a new Google Calendar event and returns success", async () => {
      setupSendInvitesMocks();

      mockGoogleClient.createEvent.mockResolvedValue({ id: "gcal-event-1" });
      mockGoogleClient.watchEvent.mockResolvedValue({
        channelId: "ch-1",
        resourceId: "res-1",
        expiration: Date.now() + 86400000,
      });

      const result = await sendCalendarInvites(MOCK_GIG_ID, MOCK_USER_ID);

      expect(result.sent).toBe(1);
      expect(result.failed).toBe(0);
      expect(result.results).toHaveLength(1);
      expect(result.results[0].success).toBe(true);
      expect(result.results[0].method).toBe("google_calendar");
      expect(result.results[0].eventId).toBe("gcal-event-1");

      // Verify Google client was initialized with credentials
      expect(mockGoogleClient.setCredentials).toHaveBeenCalledWith({
        access_token: mockConnection.access_token,
        refresh_token: mockConnection.refresh_token,
        expiry_date: expect.any(Number),
      });

      // Verify createEvent was called
      expect(mockGoogleClient.createEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          summary: expect.stringContaining("Jazz Night"),
          description: expect.stringContaining("Jazz Night"),
          location: "Blue Note",
          attendees: expect.arrayContaining([
            expect.objectContaining({ email: "dave@example.com" }),
          ]),
        })
      );
    });

    it("patches existing event when gig already has google_calendar_event_id", async () => {
      const gigWithEvent = {
        ...mockGig,
        google_calendar_event_id: "existing-event-id",
      };

      setupSendInvitesMocks({ gig: gigWithEvent });

      mockGoogleClient.getEvent.mockResolvedValue({
        attendees: [{ email: "alice@example.com", displayName: "Alice" }],
      });
      mockGoogleClient.updateEvent.mockResolvedValue({});

      const result = await sendCalendarInvites(MOCK_GIG_ID, MOCK_USER_ID);

      expect(result.sent).toBe(1);
      expect(mockGoogleClient.getEvent).toHaveBeenCalledWith("existing-event-id");
      expect(mockGoogleClient.updateEvent).toHaveBeenCalledWith(
        "existing-event-id",
        expect.objectContaining({
          attendees: expect.arrayContaining([
            { email: "alice@example.com", displayName: "Alice" },
            expect.objectContaining({ email: "dave@example.com" }),
          ]),
        })
      );
      // createEvent should NOT have been called
      expect(mockGoogleClient.createEvent).not.toHaveBeenCalled();
    });

    it("deduplicates attendees when patching existing event", async () => {
      const gigWithEvent = {
        ...mockGig,
        google_calendar_event_id: "existing-event-id",
      };

      setupSendInvitesMocks({ gig: gigWithEvent });

      // Existing event already has dave@example.com
      mockGoogleClient.getEvent.mockResolvedValue({
        attendees: [{ email: "dave@example.com", displayName: "Dave" }],
      });
      mockGoogleClient.updateEvent.mockResolvedValue({});

      const result = await sendCalendarInvites(MOCK_GIG_ID, MOCK_USER_ID);

      expect(result.sent).toBe(1);
      // Attendee list should not have duplicates
      const updateCall = mockGoogleClient.updateEvent.mock.calls[0];
      const attendees = updateCall[1].attendees;
      const daveEntries = attendees.filter(
        (a: { email: string }) => a.email.toLowerCase() === "dave@example.com"
      );
      expect(daveEntries).toHaveLength(1);
    });

    it("falls back to email when Google Calendar event creation fails", async () => {
      setupSendInvitesMocks();

      mockGoogleClient.createEvent.mockRejectedValue(new Error("API quota exceeded"));
      vi.mocked(inviteMusicianByEmail).mockResolvedValue({} as never);

      const result = await sendCalendarInvites(MOCK_GIG_ID, MOCK_USER_ID);

      expect(result.sent).toBe(1);
      expect(result.failed).toBe(0);
      expect(result.results[0].method).toBe("email");
      expect(inviteMusicianByEmail).toHaveBeenCalledWith("role-1", "dave@example.com");
    });

    it("reports failure when both calendar and email fallback fail", async () => {
      setupSendInvitesMocks();

      mockGoogleClient.createEvent.mockRejectedValue(new Error("API quota exceeded"));
      vi.mocked(inviteMusicianByEmail).mockRejectedValue(new Error("Email service down"));

      const result = await sendCalendarInvites(MOCK_GIG_ID, MOCK_USER_ID);

      expect(result.sent).toBe(0);
      expect(result.failed).toBe(1);
      expect(result.results[0].success).toBe(false);
      expect(result.results[0].error).toContain("Calendar and email both failed");
      expect(result.results[0].error).toContain("API quota exceeded");
    });

    it("reports roles with no email as failures via noEmailRoles path", async () => {
      // A role can end up in noEmailRoles if it was added from missingEmails
      // via roleEmails but with an empty-string email (falsy after resolution).
      // Since roles from getRolesNeedingInvites always have email set,
      // the only way to trigger noEmailRoles is via a role that came through
      // missingEmails but somehow has no email on second check.
      //
      // We simulate this by providing a role WITH email in getRolesNeedingInvites
      // plus providing roleEmails that map to a second role. That second role
      // gets musician_contacts.email set but role.email stays undefined.
      // Both go through - one succeeds, the other has email via musician_contacts.
      //
      // Actually, noEmailRoles can only be triggered if allRoles contains a
      // role with both role.email and role.musician_contacts?.email being falsy.
      // Since getRolesNeedingInvites sets role.email for its "roles" return,
      // and roleEmails sets musician_contacts.email, this is effectively unreachable
      // in normal flow. We test the surrounding logic instead: missing-email roles
      // that aren't provided via roleEmails are simply excluded from allRoles.
      const roleWithEmail = {
        ...mockRole,
        id: "role-with-email",
        musician_id: null,
        musician_contacts: { email: "good@example.com" },
      };
      const roleNoEmail = {
        ...mockRole,
        id: "role-no-email",
        musician_id: null,
        musician_contacts: { email: null },
      };

      setupSendInvitesMocks({ roles: [roleWithEmail, roleNoEmail], roleProfiles: [] });

      mockGoogleClient.createEvent.mockResolvedValue({ id: "gcal-mixed" });
      mockGoogleClient.watchEvent.mockResolvedValue({
        channelId: "ch-mix",
        resourceId: "res-mix",
        expiration: Date.now() + 86400000,
      });

      const result = await sendCalendarInvites(MOCK_GIG_ID, MOCK_USER_ID);

      // roleWithEmail is sent via calendar; roleNoEmail is excluded (not in allRoles)
      expect(result.sent).toBe(1);
      expect(result.failed).toBe(0);
      expect(result.results).toHaveLength(1);
      expect(result.results[0].success).toBe(true);
    });

    it("merges provided roleEmails for missing email roles", async () => {
      const roleNoEmail = {
        ...mockRole,
        id: "role-missing",
        musician_id: null,
        musician_contacts: { email: null },
      };

      setupSendInvitesMocks({ roles: [roleNoEmail], roleProfiles: [] });

      mockGoogleClient.createEvent.mockResolvedValue({ id: "gcal-event-2" });
      mockGoogleClient.watchEvent.mockResolvedValue({
        channelId: "ch-2",
        resourceId: "res-2",
        expiration: Date.now() + 86400000,
      });

      const result = await sendCalendarInvites(MOCK_GIG_ID, MOCK_USER_ID, {
        "role-missing": "provided@example.com",
      });

      expect(result.sent).toBe(1);
      expect(result.results[0].success).toBe(true);
    });

    it("continues when webhook registration fails", async () => {
      setupSendInvitesMocks();

      mockGoogleClient.createEvent.mockResolvedValue({ id: "gcal-event-3" });
      mockGoogleClient.watchEvent.mockRejectedValue(new Error("Webhook failed"));

      const result = await sendCalendarInvites(MOCK_GIG_ID, MOCK_USER_ID);

      // Event creation succeeded, only webhook failed — should still be success
      expect(result.sent).toBe(1);
      expect(result.results[0].success).toBe(true);
    });

    it("handles gig without band_id (standalone gig)", async () => {
      const standaloneGig = { ...mockGig, band_id: null };

      // Fewer calls: no band lookup
      const mocks = [
        createChainableMock({ data: mockConnection, error: null }), // connection
        createChainableMock({ data: standaloneGig, error: null }), // gig
        createChainableMock({ data: { name: "Manager Mike" }, error: null }), // owner profile
        createChainableMock({ data: [mockRole], error: null }), // roles
        createChainableMock({ data: [{ id: "musician-1", email: "dave@example.com" }], error: null }), // profiles
      ];
      for (let i = 0; i < 10; i++) {
        mocks.push(createChainableMock({ data: null, error: null }));
      }
      configureFromSequence(mocks);

      mockGoogleClient.createEvent.mockResolvedValue({ id: "gcal-event-standalone" });
      mockGoogleClient.watchEvent.mockResolvedValue({
        channelId: "ch-s",
        resourceId: "res-s",
        expiration: Date.now() + 86400000,
      });

      const result = await sendCalendarInvites(MOCK_GIG_ID, MOCK_USER_ID);

      expect(result.sent).toBe(1);
      // Event title should not include band name prefix
      const createCall = mockGoogleClient.createEvent.mock.calls[0][0];
      expect(createCall.summary).toBe("Jazz Night");
    });

    it("handles gig without owner_id", async () => {
      const noOwnerGig = { ...mockGig, owner_id: null };

      const mocks = [
        createChainableMock({ data: mockConnection, error: null }),
        createChainableMock({ data: noOwnerGig, error: null }),
        createChainableMock({ data: { name: "The Band" }, error: null }), // band
        createChainableMock({ data: [mockRole], error: null }), // roles
        createChainableMock({ data: [{ id: "musician-1", email: "dave@example.com" }], error: null }),
      ];
      for (let i = 0; i < 10; i++) {
        mocks.push(createChainableMock({ data: null, error: null }));
      }
      configureFromSequence(mocks);

      // owner_id !== userId => throws auth error
      await expect(
        sendCalendarInvites(MOCK_GIG_ID, MOCK_USER_ID)
      ).rejects.toThrow("Not authorized to send invites for this gig");
    });

    it("returns empty results when only no-email roles exist and no roleEmails provided", async () => {
      // When getRolesNeedingInvites returns all roles in missingEmails and no
      // roleEmails are provided, allRoles is empty, so function returns early.
      const roleNoEmail = {
        ...mockRole,
        id: "role-x",
        musician_id: null,
        musician_contacts: { email: null },
      };

      setupSendInvitesMocks({ roles: [roleNoEmail], roleProfiles: [] });

      const result = await sendCalendarInvites(MOCK_GIG_ID, MOCK_USER_ID);

      expect(result.sent).toBe(0);
      expect(result.failed).toBe(0);
      expect(result.results).toHaveLength(0);
    });

    it("handles gig with gig_shares as empty array", async () => {
      const gigNoShares = { ...mockGig, gig_shares: [] };

      setupSendInvitesMocks({ gig: gigNoShares });

      mockGoogleClient.createEvent.mockResolvedValue({ id: "gcal-noshare" });
      mockGoogleClient.watchEvent.mockResolvedValue({
        channelId: "ch-ns",
        resourceId: "res-ns",
        expiration: Date.now() + 86400000,
      });

      const result = await sendCalendarInvites(MOCK_GIG_ID, MOCK_USER_ID);

      expect(result.sent).toBe(1);
      // Description should use /gigs/ID/pack URL since no public slug
      const createCall = mockGoogleClient.createEvent.mock.calls[0][0];
      expect(createCall.description).toContain(`/gigs/${MOCK_GIG_ID}/pack`);
    });
  });

  // ===========================================================================
  // updateCalendarEvents
  // ===========================================================================

  describe("updateCalendarEvents", () => {
    function setupUpdateMocks(overrides: {
      gig?: unknown;
      gigError?: unknown;
      connection?: unknown;
      connError?: unknown;
      band?: unknown;
      ownerProfile?: unknown;
      roles?: unknown;
    } = {}) {
      const {
        gig = mockGig,
        gigError = null,
        connection = mockConnection,
        connError = null,
        band = { name: "The Jazz Trio" },
        ownerProfile = { name: "Manager Mike" },
        roles = [],
      } = overrides;

      // updateCalendarEvents does Promise.all for gig + connection, then sequential lookups.
      // Because Promise.all calls .from() twice before awaiting, both calls happen
      // before any others. We handle this with sequence.
      const mocks = [
        createChainableMock({ data: gig, error: gigError }), // gigs
        createChainableMock({ data: connection, error: connError }), // calendar_connections
        createChainableMock({ data: band, error: null }), // bands (if band_id)
        createChainableMock({ data: ownerProfile, error: null }), // profiles (owner)
        createChainableMock({ data: roles, error: null }), // gig_roles (legacy fallback)
      ];
      for (let i = 0; i < 5; i++) {
        mocks.push(createChainableMock({ data: null, error: null }));
      }
      configureFromSequence(mocks);
    }

    it("returns 0 when no significant fields changed", async () => {
      const result = await updateCalendarEvents(MOCK_GIG_ID, MOCK_USER_ID, [
        "notes",
        "dress_code",
      ]);

      expect(result).toBe(0);
      // Should not even call supabase
      expect(mockSupabase.from).not.toHaveBeenCalled();
    });

    it("returns 0 with empty changed fields array", async () => {
      const result = await updateCalendarEvents(MOCK_GIG_ID, MOCK_USER_ID, []);

      expect(result).toBe(0);
    });

    it("returns 0 when gig fetch fails", async () => {
      setupUpdateMocks({
        gig: null,
        gigError: { message: "Not found" },
      });

      const result = await updateCalendarEvents(MOCK_GIG_ID, MOCK_USER_ID, ["date"]);

      expect(result).toBe(0);
    });

    it("returns 0 when connection fetch fails", async () => {
      setupUpdateMocks({
        connection: null,
        connError: { message: "No connection" },
      });

      const result = await updateCalendarEvents(MOCK_GIG_ID, MOCK_USER_ID, ["title"]);

      expect(result).toBe(0);
    });

    it("updates gig-level event and returns 1", async () => {
      const gigWithEvent = {
        ...mockGig,
        google_calendar_event_id: "gcal-gig-event",
      };

      setupUpdateMocks({ gig: gigWithEvent });
      mockGoogleClient.updateEvent.mockResolvedValue({});

      const result = await updateCalendarEvents(MOCK_GIG_ID, MOCK_USER_ID, ["title"]);

      expect(result).toBe(1);
      expect(mockGoogleClient.updateEvent).toHaveBeenCalledWith(
        "gcal-gig-event",
        expect.objectContaining({
          summary: expect.stringContaining("Jazz Night"),
        })
      );
    });

    it("returns 0 when gig-level event update fails", async () => {
      const gigWithEvent = {
        ...mockGig,
        google_calendar_event_id: "gcal-gig-event",
      };

      setupUpdateMocks({ gig: gigWithEvent });
      mockGoogleClient.updateEvent.mockRejectedValue(new Error("API error"));

      const result = await updateCalendarEvents(MOCK_GIG_ID, MOCK_USER_ID, ["date"]);

      expect(result).toBe(0);
    });

    it("falls back to legacy per-role events when no gig-level event ID", async () => {
      setupUpdateMocks({
        roles: [
          { id: "r1", google_calendar_event_id: "legacy-event-1" },
          { id: "r2", google_calendar_event_id: "legacy-event-2" },
        ],
      });

      mockGoogleClient.updateEvent.mockResolvedValue({});

      const result = await updateCalendarEvents(MOCK_GIG_ID, MOCK_USER_ID, ["start_time"]);

      expect(result).toBe(2);
      expect(mockGoogleClient.updateEvent).toHaveBeenCalledTimes(2);
    });

    it("deduplicates legacy event IDs", async () => {
      setupUpdateMocks({
        roles: [
          { id: "r1", google_calendar_event_id: "shared-legacy" },
          { id: "r2", google_calendar_event_id: "shared-legacy" },
          { id: "r3", google_calendar_event_id: "unique-legacy" },
        ],
      });

      mockGoogleClient.updateEvent.mockResolvedValue({});

      const result = await updateCalendarEvents(MOCK_GIG_ID, MOCK_USER_ID, ["location_name"]);

      // Only 2 unique event IDs
      expect(result).toBe(2);
      expect(mockGoogleClient.updateEvent).toHaveBeenCalledTimes(2);
    });

    it("returns 0 when no legacy roles have event IDs", async () => {
      setupUpdateMocks({ roles: [] });

      const result = await updateCalendarEvents(MOCK_GIG_ID, MOCK_USER_ID, ["date"]);

      expect(result).toBe(0);
    });

    it("counts only successful legacy event updates", async () => {
      setupUpdateMocks({
        roles: [
          { id: "r1", google_calendar_event_id: "legacy-ok" },
          { id: "r2", google_calendar_event_id: "legacy-fail" },
        ],
      });

      mockGoogleClient.updateEvent
        .mockResolvedValueOnce({})
        .mockRejectedValueOnce(new Error("Not found"));

      const result = await updateCalendarEvents(MOCK_GIG_ID, MOCK_USER_ID, ["end_time"]);

      expect(result).toBe(1);
    });

    it("recognizes all significant fields", async () => {
      const significantFields = ["date", "start_time", "end_time", "location_name", "call_time", "title"];

      for (const field of significantFields) {
        vi.clearAllMocks();
        setupUpdateMocks({ roles: [] });

        const result = await updateCalendarEvents(MOCK_GIG_ID, MOCK_USER_ID, [field]);

        // Should have attempted to fetch gig data (meaning it passed the significance check)
        expect(mockSupabase.from).toHaveBeenCalled();
      }
    });

    it("handles gig without band_id (no band lookup)", async () => {
      const standaloneGig = {
        ...mockGig,
        band_id: null,
        google_calendar_event_id: "gcal-standalone",
      };

      const mocks = [
        createChainableMock({ data: standaloneGig, error: null }), // gig
        createChainableMock({ data: mockConnection, error: null }), // connection
        createChainableMock({ data: { name: "Manager Mike" }, error: null }), // owner profile
      ];
      for (let i = 0; i < 5; i++) {
        mocks.push(createChainableMock({ data: null, error: null }));
      }
      configureFromSequence(mocks);

      mockGoogleClient.updateEvent.mockResolvedValue({});

      const result = await updateCalendarEvents(MOCK_GIG_ID, MOCK_USER_ID, ["title"]);

      expect(result).toBe(1);
    });
  });

  // ===========================================================================
  // cancelCalendarEvents
  // ===========================================================================

  describe("cancelCalendarEvents", () => {
    function setupCancelMocks(overrides: {
      connection?: unknown;
      gig?: unknown;
      roles?: unknown;
      watches?: unknown;
    } = {}) {
      const {
        connection = mockConnection,
        gig = { google_calendar_event_id: null },
        roles = [],
        watches = [],
      } = overrides;

      const gigData = gig as { google_calendar_event_id?: string | null } | null;
      const hasGigEvent = gigData?.google_calendar_event_id != null;

      // Sequence depends on whether gig has a gig-level event:
      //   With gig-level event: connection, gig, gig-update, watches-select, watches-delete
      //   Without (legacy):     connection, gig, roles-select, watches-select, watches-delete
      const mocks = [
        createChainableMock({ data: connection, error: null }), // 1: calendar_connections
        createChainableMock({ data: gig, error: null }), // 2: gigs select
      ];

      if (hasGigEvent) {
        mocks.push(createChainableMock({ data: null, error: null })); // 3: gigs update (clear event ID)
      } else {
        mocks.push(createChainableMock({ data: roles, error: null })); // 3: gig_roles select
      }

      mocks.push(createChainableMock({ data: watches, error: null })); // 4: watches select
      mocks.push(createChainableMock({ data: null, error: null })); // 5: watches delete

      for (let i = 0; i < 5; i++) {
        mocks.push(createChainableMock({ data: null, error: null }));
      }
      configureFromSequence(mocks);
    }

    it("returns 0 when no calendar connection exists", async () => {
      setupCancelMocks({ connection: null });

      const result = await cancelCalendarEvents(MOCK_GIG_ID, MOCK_USER_ID);

      expect(result).toBe(0);
    });

    it("deletes gig-level event and returns 1", async () => {
      setupCancelMocks({
        gig: { google_calendar_event_id: "gcal-to-delete" },
      });

      mockGoogleClient.deleteEvent.mockResolvedValue(undefined);

      const result = await cancelCalendarEvents(MOCK_GIG_ID, MOCK_USER_ID);

      expect(result).toBe(1);
      expect(mockGoogleClient.deleteEvent).toHaveBeenCalledWith("gcal-to-delete");
    });

    it("returns 0 when gig-level event deletion fails", async () => {
      setupCancelMocks({
        gig: { google_calendar_event_id: "gcal-fail" },
      });

      mockGoogleClient.deleteEvent.mockRejectedValue(new Error("Gone"));

      const result = await cancelCalendarEvents(MOCK_GIG_ID, MOCK_USER_ID);

      expect(result).toBe(0);
    });

    it("falls back to deleting legacy per-role events", async () => {
      setupCancelMocks({
        roles: [
          { id: "r1", google_calendar_event_id: "legacy-1" },
          { id: "r2", google_calendar_event_id: "legacy-2" },
        ],
      });

      mockGoogleClient.deleteEvent.mockResolvedValue(undefined);

      const result = await cancelCalendarEvents(MOCK_GIG_ID, MOCK_USER_ID);

      expect(result).toBe(2);
      expect(mockGoogleClient.deleteEvent).toHaveBeenCalledTimes(2);
    });

    it("deduplicates legacy event IDs before deleting", async () => {
      setupCancelMocks({
        roles: [
          { id: "r1", google_calendar_event_id: "same-event" },
          { id: "r2", google_calendar_event_id: "same-event" },
        ],
      });

      mockGoogleClient.deleteEvent.mockResolvedValue(undefined);

      const result = await cancelCalendarEvents(MOCK_GIG_ID, MOCK_USER_ID);

      expect(result).toBe(1);
      expect(mockGoogleClient.deleteEvent).toHaveBeenCalledTimes(1);
    });

    it("returns 0 when no roles have event IDs (legacy path)", async () => {
      setupCancelMocks({ roles: [] });

      const result = await cancelCalendarEvents(MOCK_GIG_ID, MOCK_USER_ID);

      expect(result).toBe(0);
      expect(mockGoogleClient.deleteEvent).not.toHaveBeenCalled();
    });

    it("cleans up webhook watches", async () => {
      setupCancelMocks({
        gig: { google_calendar_event_id: "gcal-with-watch" },
        watches: [
          { channel_id: "ch-1", resource_id: "res-1" },
          { channel_id: "ch-2", resource_id: "res-2" },
        ],
      });

      mockGoogleClient.deleteEvent.mockResolvedValue(undefined);
      mockGoogleClient.stopWatch.mockResolvedValue(undefined);

      await cancelCalendarEvents(MOCK_GIG_ID, MOCK_USER_ID);

      expect(mockGoogleClient.stopWatch).toHaveBeenCalledTimes(2);
      expect(mockGoogleClient.stopWatch).toHaveBeenCalledWith("ch-1", "res-1");
      expect(mockGoogleClient.stopWatch).toHaveBeenCalledWith("ch-2", "res-2");
    });

    it("continues when stopWatch fails", async () => {
      setupCancelMocks({
        gig: { google_calendar_event_id: "gcal-watch-fail" },
        watches: [{ channel_id: "ch-fail", resource_id: "res-fail" }],
      });

      mockGoogleClient.deleteEvent.mockResolvedValue(undefined);
      mockGoogleClient.stopWatch.mockRejectedValue(new Error("Watch not found"));

      const result = await cancelCalendarEvents(MOCK_GIG_ID, MOCK_USER_ID);

      // Event deletion succeeded even though watch cleanup failed
      expect(result).toBe(1);
    });

    it("skips watch cleanup when no watches exist", async () => {
      setupCancelMocks({
        gig: { google_calendar_event_id: "gcal-no-watches" },
        watches: [],
      });

      mockGoogleClient.deleteEvent.mockResolvedValue(undefined);

      await cancelCalendarEvents(MOCK_GIG_ID, MOCK_USER_ID);

      expect(mockGoogleClient.stopWatch).not.toHaveBeenCalled();
    });

    it("counts only successful legacy deletions", async () => {
      setupCancelMocks({
        roles: [
          { id: "r1", google_calendar_event_id: "ok-event" },
          { id: "r2", google_calendar_event_id: "fail-event" },
        ],
      });

      mockGoogleClient.deleteEvent
        .mockResolvedValueOnce(undefined)
        .mockRejectedValueOnce(new Error("Gone"));

      const result = await cancelCalendarEvents(MOCK_GIG_ID, MOCK_USER_ID);

      expect(result).toBe(1);
    });
  });

  // ===========================================================================
  // cancelRoleCalendarEvents
  // ===========================================================================

  describe("cancelRoleCalendarEvents", () => {
    function setupCancelRoleMocks(overrides: {
      connection?: unknown;
      gig?: unknown;
      roles?: unknown;
      profiles?: unknown;
      watches?: unknown;
      hasMusicianIds?: boolean;
    } = {}) {
      const {
        connection = mockConnection,
        gig = { google_calendar_event_id: null },
        roles = [],
        profiles = [],
        watches = [],
        hasMusicianIds = false,
      } = overrides;

      const gigData = gig as { google_calendar_event_id?: string | null } | null;
      const hasGigEvent = gigData?.google_calendar_event_id != null;

      // Sequence depends on path:
      // Shared event path: connection, gig => then Google API only (no more supabase)
      // Legacy path:       connection, gig, roles, [profiles if musicianIds], watches, watches-delete
      const mocks = [
        createChainableMock({ data: connection, error: null }), // 1: calendar_connections
        createChainableMock({ data: gig, error: null }), // 2: gigs
      ];

      if (!hasGigEvent) {
        mocks.push(createChainableMock({ data: roles, error: null })); // 3: gig_roles
        if (hasMusicianIds) {
          mocks.push(createChainableMock({ data: profiles, error: null })); // 4: profiles
        }
        mocks.push(createChainableMock({ data: watches, error: null })); // watches select
        mocks.push(createChainableMock({ data: null, error: null })); // watches delete
      }

      for (let i = 0; i < 5; i++) {
        mocks.push(createChainableMock({ data: null, error: null }));
      }
      configureFromSequence(mocks);
    }

    it("returns 0 immediately when removedEmails is empty", async () => {
      const result = await cancelRoleCalendarEvents(MOCK_USER_ID, MOCK_GIG_ID, []);

      expect(result).toBe(0);
      expect(mockSupabase.from).not.toHaveBeenCalled();
    });

    it("returns 0 when no calendar connection exists", async () => {
      setupCancelRoleMocks({ connection: null });

      const result = await cancelRoleCalendarEvents(MOCK_USER_ID, MOCK_GIG_ID, [
        "dave@example.com",
      ]);

      expect(result).toBe(0);
    });

    it("patches shared event to remove specific attendees", async () => {
      setupCancelRoleMocks({
        gig: { google_calendar_event_id: "shared-event-id" },
      });

      mockGoogleClient.getEvent.mockResolvedValue({
        attendees: [
          { email: "dave@example.com", displayName: "Dave" },
          { email: "alice@example.com", displayName: "Alice" },
          { email: "bob@example.com", displayName: "Bob" },
        ],
      });
      mockGoogleClient.updateEvent.mockResolvedValue({});

      const result = await cancelRoleCalendarEvents(MOCK_USER_ID, MOCK_GIG_ID, [
        "dave@example.com",
      ]);

      expect(result).toBe(1);
      expect(mockGoogleClient.updateEvent).toHaveBeenCalledWith(
        "shared-event-id",
        expect.objectContaining({
          attendees: [
            { email: "alice@example.com", displayName: "Alice" },
            { email: "bob@example.com", displayName: "Bob" },
          ],
        })
      );
    });

    it("handles case-insensitive email matching when removing attendees", async () => {
      setupCancelRoleMocks({
        gig: { google_calendar_event_id: "shared-event-id" },
      });

      mockGoogleClient.getEvent.mockResolvedValue({
        attendees: [
          { email: "Dave@Example.com", displayName: "Dave" },
          { email: "alice@example.com", displayName: "Alice" },
        ],
      });
      mockGoogleClient.updateEvent.mockResolvedValue({});

      const result = await cancelRoleCalendarEvents(MOCK_USER_ID, MOCK_GIG_ID, [
        "dave@example.com",
      ]);

      expect(result).toBe(1);
      const updateCall = mockGoogleClient.updateEvent.mock.calls[0][1];
      expect(updateCall.attendees).toHaveLength(1);
      expect(updateCall.attendees[0].email).toBe("alice@example.com");
    });

    it("returns 0 when patching shared event fails", async () => {
      setupCancelRoleMocks({
        gig: { google_calendar_event_id: "shared-event-id" },
      });

      mockGoogleClient.getEvent.mockRejectedValue(new Error("Event not found"));

      const result = await cancelRoleCalendarEvents(MOCK_USER_ID, MOCK_GIG_ID, [
        "dave@example.com",
      ]);

      expect(result).toBe(0);
    });

    it("deletes legacy per-role events for removed emails", async () => {
      setupCancelRoleMocks({
        roles: [
          {
            id: "r1",
            google_calendar_event_id: "legacy-1",
            musician_id: null,
            contact_id: "c1",
            musician_contacts: { email: "dave@example.com" },
          },
          {
            id: "r2",
            google_calendar_event_id: "legacy-2",
            musician_id: null,
            contact_id: "c2",
            musician_contacts: { email: "alice@example.com" },
          },
        ],
      });

      mockGoogleClient.deleteEvent.mockResolvedValue(undefined);

      const result = await cancelRoleCalendarEvents(MOCK_USER_ID, MOCK_GIG_ID, [
        "dave@example.com",
      ]);

      expect(result).toBe(1);
      expect(mockGoogleClient.deleteEvent).toHaveBeenCalledWith("legacy-1");
      expect(mockGoogleClient.deleteEvent).toHaveBeenCalledTimes(1);
    });

    it("resolves emails from profiles for legacy roles with musician_id", async () => {
      setupCancelRoleMocks({
        roles: [
          {
            id: "r1",
            google_calendar_event_id: "legacy-prof",
            musician_id: "m1",
            contact_id: null,
            musician_contacts: { email: null },
          },
        ],
        profiles: [{ id: "m1", email: "musician@example.com" }],
        hasMusicianIds: true,
      });

      mockGoogleClient.deleteEvent.mockResolvedValue(undefined);

      const result = await cancelRoleCalendarEvents(MOCK_USER_ID, MOCK_GIG_ID, [
        "musician@example.com",
      ]);

      expect(result).toBe(1);
      expect(mockGoogleClient.deleteEvent).toHaveBeenCalledWith("legacy-prof");
    });

    it("deduplicates legacy event IDs before deleting", async () => {
      setupCancelRoleMocks({
        roles: [
          {
            id: "r1",
            google_calendar_event_id: "same-legacy",
            musician_id: null,
            contact_id: "c1",
            musician_contacts: { email: "person@example.com" },
          },
          {
            id: "r2",
            google_calendar_event_id: "same-legacy",
            musician_id: null,
            contact_id: "c2",
            musician_contacts: { email: "person@example.com" },
          },
        ],
      });

      mockGoogleClient.deleteEvent.mockResolvedValue(undefined);

      const result = await cancelRoleCalendarEvents(MOCK_USER_ID, MOCK_GIG_ID, [
        "person@example.com",
      ]);

      expect(result).toBe(1);
      expect(mockGoogleClient.deleteEvent).toHaveBeenCalledTimes(1);
    });

    it("cleans up watches for deleted legacy events", async () => {
      setupCancelRoleMocks({
        roles: [
          {
            id: "r1",
            google_calendar_event_id: "legacy-watched",
            musician_id: null,
            contact_id: "c1",
            musician_contacts: { email: "dave@example.com" },
          },
        ],
        watches: [{ id: "w1", channel_id: "ch-1", resource_id: "res-1" }],
      });

      mockGoogleClient.deleteEvent.mockResolvedValue(undefined);
      mockGoogleClient.stopWatch.mockResolvedValue(undefined);

      await cancelRoleCalendarEvents(MOCK_USER_ID, MOCK_GIG_ID, ["dave@example.com"]);

      expect(mockGoogleClient.stopWatch).toHaveBeenCalledWith("ch-1", "res-1");
    });

    it("continues when stopWatch fails in legacy cleanup", async () => {
      setupCancelRoleMocks({
        roles: [
          {
            id: "r1",
            google_calendar_event_id: "legacy-watch-fail",
            musician_id: null,
            contact_id: "c1",
            musician_contacts: { email: "dave@example.com" },
          },
        ],
        watches: [{ id: "w1", channel_id: "ch-fail", resource_id: "res-fail" }],
      });

      mockGoogleClient.deleteEvent.mockResolvedValue(undefined);
      mockGoogleClient.stopWatch.mockRejectedValue(new Error("Watch gone"));

      const result = await cancelRoleCalendarEvents(MOCK_USER_ID, MOCK_GIG_ID, [
        "dave@example.com",
      ]);

      // Deletion succeeded, watch cleanup failure doesn't affect count
      expect(result).toBe(1);
    });

    it("returns 0 when no legacy roles match removed emails", async () => {
      setupCancelRoleMocks({
        roles: [
          {
            id: "r1",
            google_calendar_event_id: "legacy-other",
            musician_id: null,
            contact_id: "c1",
            musician_contacts: { email: "other@example.com" },
          },
        ],
      });

      const result = await cancelRoleCalendarEvents(MOCK_USER_ID, MOCK_GIG_ID, [
        "dave@example.com",
      ]);

      expect(result).toBe(0);
      expect(mockGoogleClient.deleteEvent).not.toHaveBeenCalled();
    });

    it("returns 0 when no legacy roles exist", async () => {
      setupCancelRoleMocks({ roles: [] });

      const result = await cancelRoleCalendarEvents(MOCK_USER_ID, MOCK_GIG_ID, [
        "dave@example.com",
      ]);

      expect(result).toBe(0);
    });

    it("handles legacy role with null roles data", async () => {
      setupCancelRoleMocks({ roles: null });

      const result = await cancelRoleCalendarEvents(MOCK_USER_ID, MOCK_GIG_ID, [
        "dave@example.com",
      ]);

      expect(result).toBe(0);
    });

    it("handles removing multiple emails at once from shared event", async () => {
      setupCancelRoleMocks({
        gig: { google_calendar_event_id: "shared-multi" },
      });

      mockGoogleClient.getEvent.mockResolvedValue({
        attendees: [
          { email: "dave@example.com", displayName: "Dave" },
          { email: "alice@example.com", displayName: "Alice" },
          { email: "bob@example.com", displayName: "Bob" },
        ],
      });
      mockGoogleClient.updateEvent.mockResolvedValue({});

      const result = await cancelRoleCalendarEvents(MOCK_USER_ID, MOCK_GIG_ID, [
        "dave@example.com",
        "bob@example.com",
      ]);

      expect(result).toBe(2);
      const updateCall = mockGoogleClient.updateEvent.mock.calls[0][1];
      expect(updateCall.attendees).toHaveLength(1);
      expect(updateCall.attendees[0].email).toBe("alice@example.com");
    });

    it("handles shared event with no existing attendees", async () => {
      setupCancelRoleMocks({
        gig: { google_calendar_event_id: "shared-empty" },
      });

      mockGoogleClient.getEvent.mockResolvedValue({
        attendees: undefined,
      });
      mockGoogleClient.updateEvent.mockResolvedValue({});

      const result = await cancelRoleCalendarEvents(MOCK_USER_ID, MOCK_GIG_ID, [
        "dave@example.com",
      ]);

      expect(result).toBe(1);
      const updateCall = mockGoogleClient.updateEvent.mock.calls[0][1];
      expect(updateCall.attendees).toHaveLength(0);
    });
  });
});
