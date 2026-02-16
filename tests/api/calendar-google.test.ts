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

// Mock Google Calendar client methods
const mockListCalendars = vi.fn();
const mockListEvents = vi.fn();
const mockSetCredentials = vi.fn();
const mockRefreshAccessToken = vi.fn();
const mockGetEvent = vi.fn();

vi.mock("@/lib/integrations/google-calendar", () => {
  return {
    GoogleCalendarClient: class {
      setCredentials = mockSetCredentials;
      listCalendars = mockListCalendars;
      listEvents = mockListEvents;
      refreshAccessToken = mockRefreshAccessToken;
      getEvent = mockGetEvent;
    },
    parseGoogleDateTime: (
      dateTime: string | undefined,
      date: string | undefined
    ) => {
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
  parseScheduleFromDescription: vi.fn(
    (desc: string | undefined) => ({
      schedule: desc ? "18:00 Soundcheck" : null,
      remainingText: desc ? "Some notes" : "",
    })
  ),
  extractScheduleItemsAsJson: vi.fn(() => [
    { time: "18:00", label: "Soundcheck" },
  ]),
}));

// Mock calendar conflict check
const mockCheckGigConflicts = vi.fn();
vi.mock("@/lib/api/calendar", () => ({
  checkGigConflicts: (...args: unknown[]) => mockCheckGigConflicts(...args),
  timesOverlap: (
    start1: string,
    end1: string,
    start2: string,
    end2: string
  ): boolean => {
    const toMinutes = (time: string) => {
      const [hours, minutes] = time.split(":").map(Number);
      return hours * 60 + minutes;
    };
    const s1 = toMinutes(start1);
    const e1 = toMinutes(end1);
    const s2 = toMinutes(start2);
    const e2 = toMinutes(end2);
    return s1 < e2 && s2 < e1;
  },
}));

import {
  getCalendarConnection,
  disconnectGoogleCalendar,
  fetchUserCalendarList,
  saveSelectedCalendars,
  fetchGoogleCalendarEvents,
  importCalendarEventAsGig,
  checkAllConflicts,
} from "@/lib/api/calendar-google";

// ============================================================================
// Test Data
// ============================================================================

const USER_ID = "user-123";

const mockConnection = {
  id: "conn-1",
  provider: "google",
  sync_enabled: true,
  last_synced_at: "2024-12-01T00:00:00Z",
};

const mockTokenConnection = {
  access_token: "valid-access-token",
  refresh_token: "valid-refresh-token",
  token_expires_at: new Date(Date.now() + 3600000).toISOString(), // 1 hour from now
};

const mockExpiredTokenConnection = {
  access_token: "expired-access-token",
  refresh_token: "valid-refresh-token",
  token_expires_at: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
};

const mockCalendarEvent = {
  id: "google-event-1",
  summary: "Band Rehearsal",
  description: "18:00 Soundcheck\nBring your gear",
  location: "Studio A",
  htmlLink: "https://calendar.google.com/event?id=1",
  start: { dateTime: "2024-12-15T20:00:00+02:00" },
  end: { dateTime: "2024-12-15T23:00:00+02:00" },
  status: "confirmed",
};

// ============================================================================
// getCalendarConnection
// ============================================================================

describe("getCalendarConnection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns connection data when found", async () => {
    mockSupabase.from.mockReturnValue(
      createChainableMock({ data: mockConnection, error: null })
    );

    const result = await getCalendarConnection(USER_ID);

    expect(result).toEqual({
      id: "conn-1",
      provider: "google",
      syncEnabled: true,
      lastSyncedAt: "2024-12-01T00:00:00Z",
    });
    expect(mockSupabase.from).toHaveBeenCalledWith("calendar_connections");
  });

  it("returns null when no connection exists", async () => {
    mockSupabase.from.mockReturnValue(
      createChainableMock({ data: null, error: null })
    );

    const result = await getCalendarConnection(USER_ID);

    expect(result).toBeNull();
  });

  it("returns null on database error", async () => {
    mockSupabase.from.mockReturnValue(
      createChainableMock({
        data: null,
        error: { message: "Not found", code: "PGRST116" },
      })
    );

    const result = await getCalendarConnection(USER_ID);

    expect(result).toBeNull();
  });

  it("defaults syncEnabled to false when sync_enabled is null", async () => {
    mockSupabase.from.mockReturnValue(
      createChainableMock({
        data: { ...mockConnection, sync_enabled: null },
        error: null,
      })
    );

    const result = await getCalendarConnection(USER_ID);

    expect(result?.syncEnabled).toBe(false);
  });
});

// ============================================================================
// disconnectGoogleCalendar
// ============================================================================

describe("disconnectGoogleCalendar", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("deletes the calendar connection", async () => {
    const deleteMock = createChainableMock({ data: null, error: null });
    mockSupabase.from.mockReturnValue(deleteMock);

    await disconnectGoogleCalendar(USER_ID);

    expect(mockSupabase.from).toHaveBeenCalledWith("calendar_connections");
    expect(deleteMock.delete).toHaveBeenCalled();
  });

  it("throws on database error", async () => {
    mockSupabase.from.mockReturnValue(
      createChainableMock({
        data: null,
        error: { message: "Delete failed" },
      })
    );

    await expect(disconnectGoogleCalendar(USER_ID)).rejects.toThrow(
      "Delete failed"
    );
  });

  it("throws default message when error has no message", async () => {
    mockSupabase.from.mockReturnValue(
      createChainableMock({
        data: null,
        error: { message: "" },
      })
    );

    await expect(disconnectGoogleCalendar(USER_ID)).rejects.toThrow(
      "Failed to disconnect calendar"
    );
  });
});

// ============================================================================
// fetchUserCalendarList
// ============================================================================

describe("fetchUserCalendarList", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns calendar list with fresh token", async () => {
    const connData = {
      ...mockTokenConnection,
      selected_calendars: [
        { id: "cal-1", name: "Primary", color: "#000", primary: true },
      ],
    };

    mockSupabase.from.mockReturnValue(
      createChainableMock({ data: connData, error: null })
    );

    const mockCalendars = [
      { id: "cal-1", name: "Primary", color: "#4285f4", primary: true },
      { id: "cal-2", name: "Work", color: "#33b679", primary: false },
    ];
    mockListCalendars.mockResolvedValue(mockCalendars);

    const result = await fetchUserCalendarList(USER_ID);

    expect(result.calendars).toEqual(mockCalendars);
    expect(result.selectedCalendars).toEqual(connData.selected_calendars);
    expect(mockSetCredentials).toHaveBeenCalled();
  });

  it("throws when no connection found", async () => {
    mockSupabase.from.mockReturnValue(
      createChainableMock({ data: null, error: { message: "Not found" } })
    );

    await expect(fetchUserCalendarList(USER_ID)).rejects.toThrow(
      "Calendar not connected"
    );
  });

  it("refreshes token when expired", async () => {
    const connData = {
      ...mockExpiredTokenConnection,
      selected_calendars: null,
    };

    // First call: connection query; second call: update after refresh
    const selectMock = createChainableMock({ data: connData, error: null });
    const updateMock = createChainableMock({ data: null, error: null });

    mockSupabase.from.mockImplementation((table: string) => {
      if (table === "calendar_connections") {
        // Return select mock first call, update mock for subsequent
        return selectMock;
      }
      return createChainableMock({ data: null, error: null });
    });

    mockRefreshAccessToken.mockResolvedValue({
      access_token: "new-access-token",
      refresh_token: "valid-refresh-token",
      expiry_date: Date.now() + 7200000,
    });

    mockListCalendars.mockResolvedValue([]);

    const result = await fetchUserCalendarList(USER_ID);

    expect(mockRefreshAccessToken).toHaveBeenCalledWith(
      "valid-refresh-token"
    );
    expect(result.calendars).toEqual([]);
    expect(result.selectedCalendars).toBeNull();
  });

  it("deletes connection and throws token_revoked on invalid_grant", async () => {
    const connData = {
      ...mockExpiredTokenConnection,
      selected_calendars: null,
    };

    mockSupabase.from.mockReturnValue(
      createChainableMock({ data: connData, error: null })
    );

    mockRefreshAccessToken.mockRejectedValue(new Error("invalid_grant"));

    await expect(fetchUserCalendarList(USER_ID)).rejects.toThrow(
      "token_revoked"
    );
  });

  it("re-throws non-invalid_grant refresh errors", async () => {
    const connData = {
      ...mockExpiredTokenConnection,
      selected_calendars: null,
    };

    mockSupabase.from.mockReturnValue(
      createChainableMock({ data: connData, error: null })
    );

    mockRefreshAccessToken.mockRejectedValue(new Error("network error"));

    await expect(fetchUserCalendarList(USER_ID)).rejects.toThrow(
      "network error"
    );
  });
});

// ============================================================================
// saveSelectedCalendars
// ============================================================================

describe("saveSelectedCalendars", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("updates selected calendars", async () => {
    const updateMock = createChainableMock({ data: null, error: null });
    mockSupabase.from.mockReturnValue(updateMock);

    const calendars = [
      { id: "cal-1", name: "Primary", color: "#4285f4", primary: true },
    ];

    await saveSelectedCalendars(USER_ID, calendars);

    expect(mockSupabase.from).toHaveBeenCalledWith("calendar_connections");
    expect(updateMock.update).toHaveBeenCalledWith({
      selected_calendars: calendars,
    });
  });

  it("throws on database error", async () => {
    mockSupabase.from.mockReturnValue(
      createChainableMock({
        data: null,
        error: { message: "Update failed" },
      })
    );

    await expect(
      saveSelectedCalendars(USER_ID, [])
    ).rejects.toThrow("Update failed");
  });

  it("throws default message when error has no message", async () => {
    mockSupabase.from.mockReturnValue(
      createChainableMock({
        data: null,
        error: { message: "" },
      })
    );

    await expect(
      saveSelectedCalendars(USER_ID, [])
    ).rejects.toThrow("Failed to save selected calendars");
  });
});

// ============================================================================
// fetchGoogleCalendarEvents
// ============================================================================

describe("fetchGoogleCalendarEvents", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const from = new Date("2024-12-01");
  const to = new Date("2024-12-31");

  it("fetches events with fresh token from primary calendar", async () => {
    mockSupabase.from.mockReturnValue(
      createChainableMock({ data: mockTokenConnection, error: null })
    );

    const mockEvents = [mockCalendarEvent];
    mockListEvents.mockResolvedValue(mockEvents);

    const result = await fetchGoogleCalendarEvents(USER_ID, from, to);

    expect(result).toEqual(mockEvents);
    expect(mockSetCredentials).toHaveBeenCalled();
    expect(mockListEvents).toHaveBeenCalledWith(from, to);
  });

  it("fetches events from multiple calendar IDs", async () => {
    mockSupabase.from.mockReturnValue(
      createChainableMock({ data: mockTokenConnection, error: null })
    );

    const event1 = {
      ...mockCalendarEvent,
      id: "event-1",
      start: { dateTime: "2024-12-15T20:00:00+02:00" },
    };
    const event2 = {
      ...mockCalendarEvent,
      id: "event-2",
      start: { dateTime: "2024-12-10T14:00:00+02:00" },
    };

    mockListEvents
      .mockResolvedValueOnce([event1])
      .mockResolvedValueOnce([event2]);

    const result = await fetchGoogleCalendarEvents(USER_ID, from, to, [
      "cal-1",
      "cal-2",
    ]);

    // Events should be sorted by start time (event2 first: Dec 10, then event1: Dec 15)
    expect(result).toHaveLength(2);
    expect(result[0].id).toBe("event-2");
    expect(result[1].id).toBe("event-1");

    expect(mockListEvents).toHaveBeenCalledWith(from, to, 100, "cal-1");
    expect(mockListEvents).toHaveBeenCalledWith(from, to, 100, "cal-2");
  });

  it("throws when connection query fails", async () => {
    mockSupabase.from.mockReturnValue(
      createChainableMock({
        data: null,
        error: { message: "DB error", details: null, hint: null, code: "500" },
      })
    );

    await expect(
      fetchGoogleCalendarEvents(USER_ID, from, to)
    ).rejects.toThrow("Calendar not connected: DB error");
  });

  it("throws when no connection data exists", async () => {
    // connError is null but data is also null
    const mock = createChainableMock({ data: null, error: null });
    // Override single to return { data: null, error: null }
    // The chainable mock's single already resolves to { data: null, error: null }
    // but the function checks connError first (null), then !connection (null -> throws)
    mockSupabase.from.mockReturnValue(mock);

    await expect(
      fetchGoogleCalendarEvents(USER_ID, from, to)
    ).rejects.toThrow("Calendar not connected");
  });

  it("refreshes token when expired and fetches events", async () => {
    const selectMock = createChainableMock({
      data: mockExpiredTokenConnection,
      error: null,
    });

    mockSupabase.from.mockReturnValue(selectMock);

    mockRefreshAccessToken.mockResolvedValue({
      access_token: "new-token",
      refresh_token: "valid-refresh-token",
      expiry_date: Date.now() + 7200000,
    });

    mockListEvents.mockResolvedValue([mockCalendarEvent]);

    const result = await fetchGoogleCalendarEvents(USER_ID, from, to);

    expect(mockRefreshAccessToken).toHaveBeenCalledWith(
      "valid-refresh-token"
    );
    expect(result).toEqual([mockCalendarEvent]);
  });

  it("deletes connection on invalid_grant during token refresh", async () => {
    mockSupabase.from.mockReturnValue(
      createChainableMock({
        data: mockExpiredTokenConnection,
        error: null,
      })
    );

    mockRefreshAccessToken.mockRejectedValue(new Error("invalid_grant"));

    await expect(
      fetchGoogleCalendarEvents(USER_ID, from, to)
    ).rejects.toThrow(
      "Google Calendar session expired. Please reconnect your calendar."
    );
  });

  it("re-throws non-invalid_grant refresh errors", async () => {
    mockSupabase.from.mockReturnValue(
      createChainableMock({
        data: mockExpiredTokenConnection,
        error: null,
      })
    );

    mockRefreshAccessToken.mockRejectedValue(
      new Error("Network timeout")
    );

    await expect(
      fetchGoogleCalendarEvents(USER_ID, from, to)
    ).rejects.toThrow("Network timeout");
  });
});

// ============================================================================
// importCalendarEventAsGig
// ============================================================================

describe("importCalendarEventAsGig", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates a new gig from calendar event", async () => {
    const duplicateCheckMock = createChainableMock({
      data: null,
      error: null,
    });
    const insertGigMock = createChainableMock({
      data: { id: "new-gig-1" },
      error: null,
    });
    const insertRoleMock = createChainableMock({
      data: null,
      error: null,
    });
    const selectConnMock = createChainableMock({
      data: { id: "conn-1" },
      error: null,
    });
    const insertLogMock = createChainableMock({
      data: null,
      error: null,
    });

    mockSupabase.from.mockImplementation((table: string) => {
      if (table === "gigs") {
        // First call is duplicate check (maybeSingle), second is insert
        // Since both use .from("gigs"), we need to track calls
        const gigsCallCount =
          mockSupabase.from.mock.calls.filter(
            (c: string[]) => c[0] === "gigs"
          ).length;
        if (gigsCallCount <= 1) return duplicateCheckMock;
        return insertGigMock;
      }
      if (table === "gig_roles") return insertRoleMock;
      if (table === "calendar_connections") return selectConnMock;
      if (table === "calendar_sync_log") return insertLogMock;
      return createChainableMock({ data: null, error: null });
    });

    const result = await importCalendarEventAsGig(
      USER_ID,
      mockCalendarEvent
    );

    expect(result).toBe("new-gig-1");
  });

  it("returns existing gig ID for duplicate events", async () => {
    const duplicateCheckMock = createChainableMock({
      data: { id: "existing-gig-1" },
      error: null,
    });

    mockSupabase.from.mockReturnValue(duplicateCheckMock);

    const result = await importCalendarEventAsGig(
      USER_ID,
      mockCalendarEvent
    );

    expect(result).toBe("existing-gig-1");
  });

  it("throws when gig insert fails", async () => {
    const duplicateCheckMock = createChainableMock({
      data: null,
      error: null,
    });
    const insertGigMock = createChainableMock({
      data: null,
      error: { message: "Insert failed" },
    });

    mockSupabase.from.mockImplementation((table: string) => {
      if (table === "gigs") {
        const gigsCallCount =
          mockSupabase.from.mock.calls.filter(
            (c: string[]) => c[0] === "gigs"
          ).length;
        if (gigsCallCount <= 1) return duplicateCheckMock;
        return insertGigMock;
      }
      return createChainableMock({ data: null, error: null });
    });

    await expect(
      importCalendarEventAsGig(USER_ID, mockCalendarEvent)
    ).rejects.toThrow("Insert failed");
  });

  it("handles all-day events (no dateTime, only date)", async () => {
    const allDayEvent = {
      ...mockCalendarEvent,
      start: { date: "2024-12-15" },
      end: { date: "2024-12-16" },
    };

    const duplicateCheckMock = createChainableMock({
      data: null,
      error: null,
    });
    const insertGigMock = createChainableMock({
      data: { id: "allday-gig" },
      error: null,
    });
    const insertRoleMock = createChainableMock({
      data: null,
      error: null,
    });
    const selectConnMock = createChainableMock({
      data: { id: "conn-1" },
      error: null,
    });
    const insertLogMock = createChainableMock({
      data: null,
      error: null,
    });

    mockSupabase.from.mockImplementation((table: string) => {
      if (table === "gigs") {
        const gigsCallCount =
          mockSupabase.from.mock.calls.filter(
            (c: string[]) => c[0] === "gigs"
          ).length;
        if (gigsCallCount <= 1) return duplicateCheckMock;
        return insertGigMock;
      }
      if (table === "gig_roles") return insertRoleMock;
      if (table === "calendar_connections") return selectConnMock;
      if (table === "calendar_sync_log") return insertLogMock;
      return createChainableMock({ data: null, error: null });
    });

    const result = await importCalendarEventAsGig(USER_ID, allDayEvent);

    expect(result).toBe("allday-gig");
  });

  it("continues when gig role insert fails (non-blocking)", async () => {
    const duplicateCheckMock = createChainableMock({
      data: null,
      error: null,
    });
    const insertGigMock = createChainableMock({
      data: { id: "new-gig-2" },
      error: null,
    });
    const insertRoleMock = createChainableMock({
      data: null,
      error: { message: "Role insert failed" },
    });
    const selectConnMock = createChainableMock({
      data: { id: "conn-1" },
      error: null,
    });
    const insertLogMock = createChainableMock({
      data: null,
      error: null,
    });

    const consoleErrorSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});

    mockSupabase.from.mockImplementation((table: string) => {
      if (table === "gigs") {
        const gigsCallCount =
          mockSupabase.from.mock.calls.filter(
            (c: string[]) => c[0] === "gigs"
          ).length;
        if (gigsCallCount <= 1) return duplicateCheckMock;
        return insertGigMock;
      }
      if (table === "gig_roles") return insertRoleMock;
      if (table === "calendar_connections") return selectConnMock;
      if (table === "calendar_sync_log") return insertLogMock;
      return createChainableMock({ data: null, error: null });
    });

    // Should still succeed despite role error
    const result = await importCalendarEventAsGig(
      USER_ID,
      mockCalendarEvent
    );

    expect(result).toBe("new-gig-2");
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      "[Import Gig] Error creating gig role:",
      expect.objectContaining({ message: "Role insert failed" })
    );

    consoleErrorSpy.mockRestore();
  });

  it("skips sync log when no connection found", async () => {
    const duplicateCheckMock = createChainableMock({
      data: null,
      error: null,
    });
    const insertGigMock = createChainableMock({
      data: { id: "new-gig-3" },
      error: null,
    });
    const insertRoleMock = createChainableMock({
      data: null,
      error: null,
    });
    const noConnMock = createChainableMock({
      data: null,
      error: null,
    });

    mockSupabase.from.mockImplementation((table: string) => {
      if (table === "gigs") {
        const gigsCallCount =
          mockSupabase.from.mock.calls.filter(
            (c: string[]) => c[0] === "gigs"
          ).length;
        if (gigsCallCount <= 1) return duplicateCheckMock;
        return insertGigMock;
      }
      if (table === "gig_roles") return insertRoleMock;
      if (table === "calendar_connections") return noConnMock;
      // calendar_sync_log should NOT be called
      if (table === "calendar_sync_log") {
        throw new Error("Should not insert sync log without connection");
      }
      return createChainableMock({ data: null, error: null });
    });

    const result = await importCalendarEventAsGig(
      USER_ID,
      mockCalendarEvent
    );

    expect(result).toBe("new-gig-3");
  });

  it("handles event with no description or location", async () => {
    const minimalEvent = {
      id: "minimal-event",
      summary: "Quick Gig",
      start: { dateTime: "2024-12-20T19:00:00+02:00" },
      end: { dateTime: "2024-12-20T21:00:00+02:00" },
      htmlLink: "",
      status: "confirmed",
    };

    const duplicateCheckMock = createChainableMock({
      data: null,
      error: null,
    });
    const insertGigMock = createChainableMock({
      data: { id: "minimal-gig" },
      error: null,
    });
    const insertRoleMock = createChainableMock({
      data: null,
      error: null,
    });
    const selectConnMock = createChainableMock({
      data: { id: "conn-1" },
      error: null,
    });
    const insertLogMock = createChainableMock({
      data: null,
      error: null,
    });

    mockSupabase.from.mockImplementation((table: string) => {
      if (table === "gigs") {
        const gigsCallCount =
          mockSupabase.from.mock.calls.filter(
            (c: string[]) => c[0] === "gigs"
          ).length;
        if (gigsCallCount <= 1) return duplicateCheckMock;
        return insertGigMock;
      }
      if (table === "gig_roles") return insertRoleMock;
      if (table === "calendar_connections") return selectConnMock;
      if (table === "calendar_sync_log") return insertLogMock;
      return createChainableMock({ data: null, error: null });
    });

    const result = await importCalendarEventAsGig(USER_ID, minimalEvent);

    expect(result).toBe("minimal-gig");
  });
});

// ============================================================================
// checkAllConflicts
// ============================================================================

describe("checkAllConflicts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns ensemble gigs and calendar events that conflict", async () => {
    const ensembleGig = {
      id: "gig-1",
      title: "Existing Gig",
      date: "2024-12-15",
      startTime: "19:00",
      endTime: "22:00",
    };
    mockCheckGigConflicts.mockResolvedValue([ensembleGig]);

    // Mock getCalendarConnection (called inside checkAllConflicts)
    const connMock = createChainableMock({
      data: mockConnection,
      error: null,
    });
    // Mock fetchGoogleCalendarEvents
    const tokenMock = createChainableMock({
      data: mockTokenConnection,
      error: null,
    });

    mockSupabase.from.mockImplementation((table: string) => {
      if (table === "calendar_connections") {
        // First call is getCalendarConnection, second is fetchGoogleCalendarEvents
        const connCallCount =
          mockSupabase.from.mock.calls.filter(
            (c: string[]) => c[0] === "calendar_connections"
          ).length;
        if (connCallCount <= 1) return connMock;
        return tokenMock;
      }
      return createChainableMock({ data: null, error: null });
    });

    const conflictingEvent = {
      ...mockCalendarEvent,
      start: { dateTime: "2024-12-15T20:00:00+02:00" },
      end: { dateTime: "2024-12-15T23:00:00+02:00" },
    };
    mockListEvents.mockResolvedValue([conflictingEvent]);

    const result = await checkAllConflicts(
      USER_ID,
      "2024-12-15",
      "19:00",
      "22:00"
    );

    expect(result.ensembleGigs).toEqual([ensembleGig]);
    expect(result.calendarEvents.length).toBeGreaterThanOrEqual(1);
  });

  it("returns only ensemble gigs when no calendar connection", async () => {
    const ensembleGig = {
      id: "gig-1",
      title: "Solo Gig",
      date: "2024-12-15",
    };
    mockCheckGigConflicts.mockResolvedValue([ensembleGig]);

    // No calendar connection
    mockSupabase.from.mockReturnValue(
      createChainableMock({ data: null, error: null })
    );

    const result = await checkAllConflicts(
      USER_ID,
      "2024-12-15",
      "19:00",
      "22:00"
    );

    expect(result.ensembleGigs).toEqual([ensembleGig]);
    expect(result.calendarEvents).toEqual([]);
  });

  it("returns empty calendar events when Google Calendar throws", async () => {
    mockCheckGigConflicts.mockResolvedValue([]);

    // getCalendarConnection returns a valid connection
    const connMock = createChainableMock({
      data: mockConnection,
      error: null,
    });
    // fetchGoogleCalendarEvents gets a DB error when fetching tokens
    const tokenErrorMock = createChainableMock({
      data: null,
      error: { message: "Token fetch failed", details: null, hint: null, code: "500" },
    });

    mockSupabase.from.mockImplementation((table: string) => {
      if (table === "calendar_connections") {
        const connCallCount =
          mockSupabase.from.mock.calls.filter(
            (c: string[]) => c[0] === "calendar_connections"
          ).length;
        // First call: getCalendarConnection (success)
        if (connCallCount <= 1) return connMock;
        // Second call: fetchGoogleCalendarEvents token lookup (error)
        return tokenErrorMock;
      }
      return createChainableMock({ data: null, error: null });
    });

    const consoleErrorSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});

    const result = await checkAllConflicts(
      USER_ID,
      "2024-12-15",
      "19:00",
      "22:00"
    );

    expect(result.ensembleGigs).toEqual([]);
    expect(result.calendarEvents).toEqual([]);
    expect(consoleErrorSpy).toHaveBeenCalled();

    consoleErrorSpy.mockRestore();
  });

  it("returns all-day calendar events when no times specified", async () => {
    mockCheckGigConflicts.mockResolvedValue([]);

    const connMock = createChainableMock({
      data: mockConnection,
      error: null,
    });
    const tokenMock = createChainableMock({
      data: mockTokenConnection,
      error: null,
    });

    mockSupabase.from.mockImplementation((table: string) => {
      if (table === "calendar_connections") {
        const connCallCount =
          mockSupabase.from.mock.calls.filter(
            (c: string[]) => c[0] === "calendar_connections"
          ).length;
        if (connCallCount <= 1) return connMock;
        return tokenMock;
      }
      return createChainableMock({ data: null, error: null });
    });

    const eventOnDate = {
      ...mockCalendarEvent,
      start: { dateTime: "2024-12-15T10:00:00+02:00" },
      end: { dateTime: "2024-12-15T12:00:00+02:00" },
    };
    mockListEvents.mockResolvedValue([eventOnDate]);

    const result = await checkAllConflicts(
      USER_ID,
      "2024-12-15",
      null,
      null
    );

    expect(result.calendarEvents).toHaveLength(1);
  });

  it("filters out non-overlapping calendar events when times provided", async () => {
    mockCheckGigConflicts.mockResolvedValue([]);

    const connMock = createChainableMock({
      data: mockConnection,
      error: null,
    });
    const tokenMock = createChainableMock({
      data: mockTokenConnection,
      error: null,
    });

    mockSupabase.from.mockImplementation((table: string) => {
      if (table === "calendar_connections") {
        const connCallCount =
          mockSupabase.from.mock.calls.filter(
            (c: string[]) => c[0] === "calendar_connections"
          ).length;
        if (connCallCount <= 1) return connMock;
        return tokenMock;
      }
      return createChainableMock({ data: null, error: null });
    });

    // One overlapping event (20:00-23:00 overlaps with 19:00-22:00)
    const overlappingEvent = {
      ...mockCalendarEvent,
      id: "overlap",
      start: { dateTime: "2024-12-15T20:00:00+02:00" },
      end: { dateTime: "2024-12-15T23:00:00+02:00" },
    };
    // One non-overlapping event (10:00-12:00 does not overlap with 19:00-22:00)
    const nonOverlappingEvent = {
      ...mockCalendarEvent,
      id: "no-overlap",
      start: { dateTime: "2024-12-15T10:00:00+02:00" },
      end: { dateTime: "2024-12-15T12:00:00+02:00" },
    };
    mockListEvents.mockResolvedValue([
      overlappingEvent,
      nonOverlappingEvent,
    ]);

    const result = await checkAllConflicts(
      USER_ID,
      "2024-12-15",
      "19:00",
      "22:00"
    );

    // Only the overlapping event should remain
    expect(result.calendarEvents).toHaveLength(1);
    expect(result.calendarEvents[0].id).toBe("overlap");
  });

  it("treats all-day calendar events as conflicts when times specified", async () => {
    mockCheckGigConflicts.mockResolvedValue([]);

    const connMock = createChainableMock({
      data: mockConnection,
      error: null,
    });
    const tokenMock = createChainableMock({
      data: mockTokenConnection,
      error: null,
    });

    mockSupabase.from.mockImplementation((table: string) => {
      if (table === "calendar_connections") {
        const connCallCount =
          mockSupabase.from.mock.calls.filter(
            (c: string[]) => c[0] === "calendar_connections"
          ).length;
        if (connCallCount <= 1) return connMock;
        return tokenMock;
      }
      return createChainableMock({ data: null, error: null });
    });

    // All-day event (only .date, no .dateTime) - should be treated as conflict
    const allDayEvent = {
      ...mockCalendarEvent,
      id: "all-day",
      start: { date: "2024-12-15" },
      end: { date: "2024-12-16" },
    };
    mockListEvents.mockResolvedValue([allDayEvent]);

    const result = await checkAllConflicts(
      USER_ID,
      "2024-12-15",
      "19:00",
      "22:00"
    );

    // All-day events are always considered conflicts
    expect(result.calendarEvents).toHaveLength(1);
    expect(result.calendarEvents[0].id).toBe("all-day");
  });

  it("filters out events on different dates", async () => {
    mockCheckGigConflicts.mockResolvedValue([]);

    const connMock = createChainableMock({
      data: mockConnection,
      error: null,
    });
    const tokenMock = createChainableMock({
      data: mockTokenConnection,
      error: null,
    });

    mockSupabase.from.mockImplementation((table: string) => {
      if (table === "calendar_connections") {
        const connCallCount =
          mockSupabase.from.mock.calls.filter(
            (c: string[]) => c[0] === "calendar_connections"
          ).length;
        if (connCallCount <= 1) return connMock;
        return tokenMock;
      }
      return createChainableMock({ data: null, error: null });
    });

    // Event on Dec 16, but we check Dec 15
    const wrongDateEvent = {
      ...mockCalendarEvent,
      id: "wrong-date",
      start: { dateTime: "2024-12-16T20:00:00+02:00" },
      end: { dateTime: "2024-12-16T23:00:00+02:00" },
    };
    mockListEvents.mockResolvedValue([wrongDateEvent]);

    const result = await checkAllConflicts(
      USER_ID,
      "2024-12-15",
      null,
      null
    );

    expect(result.calendarEvents).toHaveLength(0);
  });
});
