import { describe, it, expect, vi, beforeEach } from "vitest";
import { createChainableMock } from "../mocks/supabase";

// Mock server-only module (prevents "cannot be imported from Client Component" error)
vi.mock("server-only", () => ({}));

// Mock supabase server client
const mockSupabase = {
  from: vi.fn(),
};

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => mockSupabase),
}));

// Mock the Google Calendar integrations
vi.mock("@/lib/integrations/google-calendar", () => ({
  GoogleCalendarClient: vi.fn(),
  parseGoogleDateTime: vi.fn((dateTime: string | undefined, date: string | undefined) => {
    if (dateTime) {
      const d = new Date(dateTime);
      return {
        date: d.toISOString().split("T")[0],
        time: d.toTimeString().slice(0, 5),
      };
    }
    return { date: date || "", time: null };
  }),
}));

// Mock parse-schedule
vi.mock("@/lib/utils/parse-schedule", () => ({
  parseScheduleFromDescription: vi.fn((desc: string | undefined) => ({
    schedule: desc ? "18:00 Soundcheck" : null,
    remainingText: desc ? "Some notes" : "",
  })),
  extractScheduleItemsAsJson: vi.fn((schedule: string | null) => {
    if (!schedule) return [];
    return [{ time: "18:00", label: "Soundcheck" }];
  }),
}));

// Mock match-attendees (should NOT be called)
vi.mock("@/lib/utils/match-attendees", () => ({
  matchAttendeesToUsers: vi.fn(),
  mapResponseStatus: vi.fn(),
}));

import { importCalendarEventAsGig } from "@/lib/api/calendar-google";
import { matchAttendeesToUsers } from "@/lib/utils/match-attendees";

const mockEvent = {
  id: "google-event-123",
  summary: "Jazz Gig at Blue Note",
  description: "18:00 Soundcheck\nBring charts",
  location: "Blue Note Jazz Club, NYC",
  htmlLink: "https://calendar.google.com/event?id=google-event-123",
  start: { dateTime: "2024-12-15T20:00:00+02:00" },
  end: { dateTime: "2024-12-15T23:00:00+02:00" },
  attendees: [
    { email: "other@example.com", displayName: "Other Person", responseStatus: "accepted" as const },
  ],
  status: "confirmed",
};

describe("importCalendarEventAsGig", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates gig with is_external=true and status=confirmed", async () => {
    // Mock: check for existing import (no duplicate)
    const selectDuplicate = createChainableMock({ data: null, error: null });
    // Mock: insert gig
    const insertGig = createChainableMock({ data: { id: "new-gig-id" }, error: null });
    // Mock: insert gig_role
    const insertRole = createChainableMock({ data: null, error: null });
    // Mock: get connection
    const getConnection = createChainableMock({ data: { id: "conn-1" }, error: null });
    // Mock: insert sync log
    const insertLog = createChainableMock({ data: null, error: null });

    let callCount = 0;
    mockSupabase.from.mockImplementation((table: string) => {
      if (table === "gigs" && callCount === 0) {
        callCount++;
        return selectDuplicate;
      }
      if (table === "gigs" && callCount === 1) {
        callCount++;
        return insertGig;
      }
      if (table === "gig_roles") return insertRole;
      if (table === "calendar_connections") return getConnection;
      if (table === "calendar_sync_log") return insertLog;
      return createChainableMock({ data: null, error: null });
    });

    const result = await importCalendarEventAsGig("user-123", mockEvent);

    expect(result).toBe("new-gig-id");

    // Verify gig was inserted with correct fields
    const gigInsertCall = insertGig.insert;
    expect(gigInsertCall).toHaveBeenCalled();
    const gigData = gigInsertCall.mock.calls[0][0];
    expect(gigData.is_external).toBe(true);
    expect(gigData.status).toBe("confirmed");
    expect(gigData.owner_id).toBe("user-123");
    expect(gigData.external_calendar_event_id).toBe("google-event-123");
    expect(gigData.external_event_url).toBe("https://calendar.google.com/event?id=google-event-123");
  });

  it("creates exactly ONE gig_role for the importer with invitation_status=accepted", async () => {
    const selectDuplicate = createChainableMock({ data: null, error: null });
    const insertGig = createChainableMock({ data: { id: "new-gig-id" }, error: null });
    const insertRole = createChainableMock({ data: null, error: null });
    const getConnection = createChainableMock({ data: { id: "conn-1" }, error: null });
    const insertLog = createChainableMock({ data: null, error: null });

    let callCount = 0;
    mockSupabase.from.mockImplementation((table: string) => {
      if (table === "gigs" && callCount === 0) {
        callCount++;
        return selectDuplicate;
      }
      if (table === "gigs" && callCount === 1) {
        callCount++;
        return insertGig;
      }
      if (table === "gig_roles") return insertRole;
      if (table === "calendar_connections") return getConnection;
      if (table === "calendar_sync_log") return insertLog;
      return createChainableMock({ data: null, error: null });
    });

    await importCalendarEventAsGig("user-123", mockEvent);

    // Verify exactly one role created
    expect(insertRole.insert).toHaveBeenCalledTimes(1);
    const roleData = insertRole.insert.mock.calls[0][0];
    expect(roleData.musician_id).toBe("user-123");
    expect(roleData.invitation_status).toBe("accepted");
    expect(roleData.role_name).toBe("Musician");
  });

  it("does NOT create roles for attendees", async () => {
    const selectDuplicate = createChainableMock({ data: null, error: null });
    const insertGig = createChainableMock({ data: { id: "new-gig-id" }, error: null });
    const insertRole = createChainableMock({ data: null, error: null });
    const getConnection = createChainableMock({ data: { id: "conn-1" }, error: null });
    const insertLog = createChainableMock({ data: null, error: null });

    let callCount = 0;
    mockSupabase.from.mockImplementation((table: string) => {
      if (table === "gigs" && callCount === 0) {
        callCount++;
        return selectDuplicate;
      }
      if (table === "gigs" && callCount === 1) {
        callCount++;
        return insertGig;
      }
      if (table === "gig_roles") return insertRole;
      if (table === "calendar_connections") return getConnection;
      if (table === "calendar_sync_log") return insertLog;
      return createChainableMock({ data: null, error: null });
    });

    await importCalendarEventAsGig("user-123", mockEvent);

    // matchAttendeesToUsers should NOT be called
    expect(matchAttendeesToUsers).not.toHaveBeenCalled();

    // Only one role insert (for the importer)
    expect(insertRole.insert).toHaveBeenCalledTimes(1);
  });

  it("stores schedule_notes as JSONB array", async () => {
    const selectDuplicate = createChainableMock({ data: null, error: null });
    const insertGig = createChainableMock({ data: { id: "new-gig-id" }, error: null });
    const insertRole = createChainableMock({ data: null, error: null });
    const getConnection = createChainableMock({ data: { id: "conn-1" }, error: null });
    const insertLog = createChainableMock({ data: null, error: null });

    let callCount = 0;
    mockSupabase.from.mockImplementation((table: string) => {
      if (table === "gigs" && callCount === 0) {
        callCount++;
        return selectDuplicate;
      }
      if (table === "gigs" && callCount === 1) {
        callCount++;
        return insertGig;
      }
      if (table === "gig_roles") return insertRole;
      if (table === "calendar_connections") return getConnection;
      if (table === "calendar_sync_log") return insertLog;
      return createChainableMock({ data: null, error: null });
    });

    await importCalendarEventAsGig("user-123", mockEvent);

    const gigData = insertGig.insert.mock.calls[0][0];
    expect(gigData.schedule_notes).toEqual([{ time: "18:00", label: "Soundcheck" }]);
  });

  it("detects duplicate import and returns existing gig ID", async () => {
    // Mock: check for existing import finds a duplicate
    const selectDuplicate = createChainableMock({
      data: { id: "existing-gig-id" },
      error: null,
    });

    mockSupabase.from.mockImplementation((table: string) => {
      if (table === "gigs") return selectDuplicate;
      return createChainableMock({ data: null, error: null });
    });

    const result = await importCalendarEventAsGig("user-123", mockEvent);
    expect(result).toBe("existing-gig-id");
  });
});
