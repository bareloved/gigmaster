import { describe, it, expect, vi, beforeEach } from "vitest";
import { createChainableMock } from "../mocks/supabase";

// Mock server-only module
vi.mock("server-only", () => ({}));

// Mock supabase server client
const mockSupabase = {
  from: vi.fn(),
};

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => mockSupabase),
}));

// Mock Google Calendar client
const mockGetEvent = vi.fn();
vi.mock("@/lib/integrations/google-calendar", () => {
  return {
    GoogleCalendarClient: class {
      setCredentials = vi.fn();
      getEvent = mockGetEvent;
    },
    parseGoogleDateTime: (dateTime: string | undefined, date: string | undefined) => {
      if (dateTime) {
        const d = new Date(dateTime);
        return {
          date: d.toISOString().split("T")[0],
          time: d.toTimeString().slice(0, 5),
        };
      }
      return { date: date || "", time: null };
    },
  };
});

// Mock parse-schedule
vi.mock("@/lib/utils/parse-schedule", () => ({
  parseScheduleFromDescription: vi.fn((desc: string | undefined) => ({
    schedule: desc ? "18:00 Soundcheck" : null,
    remainingText: desc ? "Some notes" : "",
  })),
  extractScheduleItemsAsJson: vi.fn(() => [{ time: "18:00", label: "Soundcheck" }]),
}));

import { refreshExternalGig } from "@/lib/api/calendar-google";

const mockGig = {
  id: "gig-123",
  title: "Jazz Night",
  date: "2024-12-15",
  start_time: "20:00",
  end_time: "23:00",
  location_name: "Blue Note",
  is_external: true,
  external_calendar_event_id: "google-event-123",
  external_calendar_provider: "google",
  owner_id: "user-123",
  notes: "Old notes",
  schedule: "18:00 Soundcheck",
};

const mockCalendarEvent = {
  id: "google-event-123",
  summary: "Jazz Night - UPDATED",
  description: "18:00 Soundcheck\nNew notes",
  location: "Blue Note - NEW ROOM",
  htmlLink: "https://calendar.google.com/event?id=google-event-123",
  start: { dateTime: "2024-12-15T20:00:00+02:00" },
  end: { dateTime: "2024-12-16T00:00:00+02:00" },
  status: "confirmed",
};

describe("refreshExternalGig", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns diff of changed fields", async () => {
    const selectGig = createChainableMock({ data: mockGig, error: null });
    const selectRole = createChainableMock({ data: { id: "role-1" }, error: null });
    const selectConn = createChainableMock({
      data: {
        access_token: "token",
        refresh_token: "refresh",
        token_expires_at: new Date(Date.now() + 3600000).toISOString(),
      },
      error: null,
    });

    mockSupabase.from.mockImplementation((table: string) => {
      if (table === "gigs") return selectGig;
      if (table === "gig_roles") return selectRole;
      if (table === "calendar_connections") return selectConn;
      return createChainableMock({ data: null, error: null });
    });

    mockGetEvent.mockResolvedValue(mockCalendarEvent);

    const result = await refreshExternalGig("gig-123", "user-123", false);

    expect(result.hasChanges).toBe(true);
    expect(result.changes.length).toBeGreaterThan(0);
    // Title changed
    expect(result.changes.find(c => c.field === "title")).toEqual({
      field: "title",
      oldValue: "Jazz Night",
      newValue: "Jazz Night - UPDATED",
    });
    // Location changed
    expect(result.changes.find(c => c.field === "location_name")).toEqual({
      field: "location_name",
      oldValue: "Blue Note",
      newValue: "Blue Note - NEW ROOM",
    });
  });

  it("fails if gig is not external", async () => {
    const selectGig = createChainableMock({
      data: { ...mockGig, is_external: false },
      error: null,
    });

    mockSupabase.from.mockImplementation((table: string) => {
      if (table === "gigs") return selectGig;
      return createChainableMock({ data: null, error: null });
    });

    await expect(refreshExternalGig("gig-123", "user-123", false)).rejects.toThrow(
      "not an external gig"
    );
  });

  it("returns no changes when event is unchanged", async () => {
    // Parse what times the mock parseGoogleDateTime would return
    const startParsed = new Date("2024-12-15T20:00:00+02:00").toTimeString().slice(0, 5);
    const endParsed = new Date("2024-12-15T23:00:00+02:00").toTimeString().slice(0, 5);
    const dateParsed = new Date("2024-12-15T20:00:00+02:00").toISOString().split("T")[0];

    // Use matching gig data for this test
    // call_time is also compared (against startParsed), so include it
    const matchingGig = {
      ...mockGig,
      date: dateParsed,
      start_time: startParsed,
      end_time: endParsed,
      call_time: startParsed,
      notes: "Some notes",
      schedule: "18:00 Soundcheck",
    };

    const unchangedEvent = {
      ...mockCalendarEvent,
      summary: "Jazz Night",
      location: "Blue Note",
      start: { dateTime: "2024-12-15T20:00:00+02:00" },
      end: { dateTime: "2024-12-15T23:00:00+02:00" },
    };

    const selectGig = createChainableMock({ data: matchingGig, error: null });
    const selectRole = createChainableMock({ data: { id: "role-1" }, error: null });
    const selectConn = createChainableMock({
      data: {
        access_token: "token",
        refresh_token: "refresh",
        token_expires_at: new Date(Date.now() + 3600000).toISOString(),
      },
      error: null,
    });

    mockSupabase.from.mockImplementation((table: string) => {
      if (table === "gigs") return selectGig;
      if (table === "gig_roles") return selectRole;
      if (table === "calendar_connections") return selectConn;
      return createChainableMock({ data: null, error: null });
    });

    mockGetEvent.mockResolvedValue(unchangedEvent);

    const result = await refreshExternalGig("gig-123", "user-123", false);

    expect(result.hasChanges).toBe(false);
    expect(result.changes).toHaveLength(0);
  });
});
