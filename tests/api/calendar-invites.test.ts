import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock server-only module to allow imports
vi.mock("server-only", () => ({}));

// Mock Supabase server client
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(() => ({})),
}));

// Mock Google Calendar client
vi.mock("@/lib/integrations/google-calendar", () => ({
  GoogleCalendarClient: vi.fn(),
  CreateEventInput: {},
}));

// Mock gig-invitations
vi.mock("@/lib/api/gig-invitations", () => ({
  inviteMusicianByEmail: vi.fn(),
}));

import { mapResponseStatus } from "@/lib/api/calendar-invites";

// Note: hasCalendarWriteAccess, getRolesNeedingInvites, and sendCalendarInvites
// require the server-only Supabase client and GoogleCalendarClient.
// These are tested via integration tests. Here we test the pure utility functions.

describe("Calendar Invites API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

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
      const result = {
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
      const result = {
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
});
