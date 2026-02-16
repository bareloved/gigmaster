import { describe, it, expect, vi, beforeEach } from "vitest";
import { createClient } from "@/lib/supabase/client";
import {
  fetchGigActivity,
  fetchRecentActivity,
  countNewActivity,
  getActivitySummary,
  logActivity,
  getActivityIcon,
  getActivityColor,
} from "@/lib/api/gig-activity";
import type { ActivityType, GigActivityLogEntry } from "@/lib/api/gig-activity";
import { createChainableMock } from "../mocks/supabase";

// Mock the Supabase client module
vi.mock("@/lib/supabase/client");

describe("Gig Activity API", () => {
  const mockSupabase = {
    from: vi.fn(),
    auth: {
      getUser: vi.fn(),
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(createClient).mockReturnValue(
      mockSupabase as unknown as ReturnType<typeof createClient>
    );
  });

  // Reusable mock data
  const mockActivityEntry: GigActivityLogEntry = {
    id: "activity-1",
    gig_id: "gig-123",
    user_id: "user-456",
    activity_type: "gig_created",
    description: "Gig was created",
    metadata: {},
    created_at: "2024-06-01T10:00:00Z",
    user: {
      name: "John Doe",
      avatar_url: "https://example.com/avatar.jpg",
    },
  };

  const mockActivityWithGig: GigActivityLogEntry = {
    ...mockActivityEntry,
    gig: {
      title: "Jazz Night",
      date: "2024-12-15",
    },
  };

  // ============================================================================
  // fetchGigActivity
  // ============================================================================

  describe("fetchGigActivity", () => {
    it("should fetch activity entries for a gig with default options", async () => {
      const entries = [mockActivityEntry];

      mockSupabase.from.mockReturnValue(
        createChainableMock({ data: entries, error: null })
      );

      const result = await fetchGigActivity("gig-123");

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe("activity-1");
      expect(result[0].gig_id).toBe("gig-123");
      expect(result[0].activity_type).toBe("gig_created");
      expect(mockSupabase.from).toHaveBeenCalledWith("gig_activity_log");
    });

    it("should return multiple activity entries in order", async () => {
      const entries = [
        {
          ...mockActivityEntry,
          id: "activity-2",
          activity_type: "setlist_added" as ActivityType,
          created_at: "2024-06-02T10:00:00Z",
        },
        {
          ...mockActivityEntry,
          id: "activity-1",
          created_at: "2024-06-01T10:00:00Z",
        },
      ];

      mockSupabase.from.mockReturnValue(
        createChainableMock({ data: entries, error: null })
      );

      const result = await fetchGigActivity("gig-123");

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe("activity-2");
      expect(result[1].id).toBe("activity-1");
    });

    it("should apply custom limit and offset via range", async () => {
      const chainMock = createChainableMock({ data: [], error: null });
      mockSupabase.from.mockReturnValue(chainMock);

      await fetchGigActivity("gig-123", { limit: 10, offset: 5 });

      expect(chainMock.range).toHaveBeenCalledWith(5, 14);
    });

    it("should use default limit of 20 and offset of 0", async () => {
      const chainMock = createChainableMock({ data: [], error: null });
      mockSupabase.from.mockReturnValue(chainMock);

      await fetchGigActivity("gig-123");

      expect(chainMock.range).toHaveBeenCalledWith(0, 19);
    });

    it("should filter by activity types when provided", async () => {
      const chainMock = createChainableMock({ data: [], error: null });
      mockSupabase.from.mockReturnValue(chainMock);

      const types: ActivityType[] = ["setlist_added", "setlist_removed"];
      await fetchGigActivity("gig-123", { activityTypes: types });

      expect(chainMock.in).toHaveBeenCalledWith("activity_type", types);
    });

    it("should not filter by activity types when array is empty", async () => {
      const chainMock = createChainableMock({ data: [], error: null });
      mockSupabase.from.mockReturnValue(chainMock);

      await fetchGigActivity("gig-123", { activityTypes: [] });

      expect(chainMock.in).not.toHaveBeenCalled();
    });

    it("should not filter by activity types when not provided", async () => {
      const chainMock = createChainableMock({ data: [], error: null });
      mockSupabase.from.mockReturnValue(chainMock);

      await fetchGigActivity("gig-123");

      expect(chainMock.in).not.toHaveBeenCalled();
    });

    it("should filter by since date when provided", async () => {
      const chainMock = createChainableMock({ data: [], error: null });
      mockSupabase.from.mockReturnValue(chainMock);

      const since = new Date("2024-06-01T00:00:00Z");
      await fetchGigActivity("gig-123", { since });

      expect(chainMock.gte).toHaveBeenCalledWith(
        "created_at",
        "2024-06-01T00:00:00.000Z"
      );
    });

    it("should not filter by since when not provided", async () => {
      const chainMock = createChainableMock({ data: [], error: null });
      mockSupabase.from.mockReturnValue(chainMock);

      await fetchGigActivity("gig-123");

      expect(chainMock.gte).not.toHaveBeenCalled();
    });

    it("should return empty array when no activity exists", async () => {
      mockSupabase.from.mockReturnValue(
        createChainableMock({ data: [], error: null })
      );

      const result = await fetchGigActivity("gig-123");

      expect(result).toEqual([]);
    });

    it("should throw on database error", async () => {
      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      mockSupabase.from.mockReturnValue(
        createChainableMock({
          data: null,
          error: { message: "Connection timeout", code: "TIMEOUT" },
        })
      );

      await expect(fetchGigActivity("gig-123")).rejects.toEqual({
        message: "Connection timeout",
        code: "TIMEOUT",
      });

      expect(consoleSpy).toHaveBeenCalledWith(
        "Error fetching gig activity:",
        expect.objectContaining({ message: "Connection timeout" })
      );

      consoleSpy.mockRestore();
    });

    it("should include user join data in results", async () => {
      mockSupabase.from.mockReturnValue(
        createChainableMock({ data: [mockActivityEntry], error: null })
      );

      const result = await fetchGigActivity("gig-123");

      expect(result[0].user).toEqual({
        name: "John Doe",
        avatar_url: "https://example.com/avatar.jpg",
      });
    });

    it("should handle activity entry with null user_id", async () => {
      const entryWithNullUser = {
        ...mockActivityEntry,
        user_id: null,
        user: undefined,
      };

      mockSupabase.from.mockReturnValue(
        createChainableMock({ data: [entryWithNullUser], error: null })
      );

      const result = await fetchGigActivity("gig-123");

      expect(result[0].user_id).toBeNull();
    });

    it("should apply both activityTypes and since filters together", async () => {
      const chainMock = createChainableMock({ data: [], error: null });
      mockSupabase.from.mockReturnValue(chainMock);

      const types: ActivityType[] = ["gig_updated"];
      const since = new Date("2024-01-01T00:00:00Z");
      await fetchGigActivity("gig-123", { activityTypes: types, since });

      expect(chainMock.in).toHaveBeenCalledWith("activity_type", types);
      expect(chainMock.gte).toHaveBeenCalledWith(
        "created_at",
        "2024-01-01T00:00:00.000Z"
      );
    });
  });

  // ============================================================================
  // fetchRecentActivity
  // ============================================================================

  describe("fetchRecentActivity", () => {
    it("should fetch recent activity across all gigs with default options", async () => {
      const entries = [mockActivityWithGig];

      mockSupabase.from.mockReturnValue(
        createChainableMock({ data: entries, error: null })
      );

      const result = await fetchRecentActivity();

      expect(result).toHaveLength(1);
      expect(result[0].gig?.title).toBe("Jazz Night");
      expect(mockSupabase.from).toHaveBeenCalledWith("gig_activity_log");
    });

    it("should use default limit of 50 and offset of 0", async () => {
      const chainMock = createChainableMock({ data: [], error: null });
      mockSupabase.from.mockReturnValue(chainMock);

      await fetchRecentActivity();

      expect(chainMock.range).toHaveBeenCalledWith(0, 49);
    });

    it("should apply custom limit and offset", async () => {
      const chainMock = createChainableMock({ data: [], error: null });
      mockSupabase.from.mockReturnValue(chainMock);

      await fetchRecentActivity({ limit: 25, offset: 10 });

      expect(chainMock.range).toHaveBeenCalledWith(10, 34);
    });

    it("should filter by activity types when provided", async () => {
      const chainMock = createChainableMock({ data: [], error: null });
      mockSupabase.from.mockReturnValue(chainMock);

      const types: ActivityType[] = ["role_assigned", "role_removed"];
      await fetchRecentActivity({ activityTypes: types });

      expect(chainMock.in).toHaveBeenCalledWith("activity_type", types);
    });

    it("should not filter by activity types when array is empty", async () => {
      const chainMock = createChainableMock({ data: [], error: null });
      mockSupabase.from.mockReturnValue(chainMock);

      await fetchRecentActivity({ activityTypes: [] });

      expect(chainMock.in).not.toHaveBeenCalled();
    });

    it("should filter by since date when provided", async () => {
      const chainMock = createChainableMock({ data: [], error: null });
      mockSupabase.from.mockReturnValue(chainMock);

      const since = new Date("2024-05-01T00:00:00Z");
      await fetchRecentActivity({ since });

      expect(chainMock.gte).toHaveBeenCalledWith(
        "created_at",
        "2024-05-01T00:00:00.000Z"
      );
    });

    it("should return empty array when no activity exists", async () => {
      mockSupabase.from.mockReturnValue(
        createChainableMock({ data: [], error: null })
      );

      const result = await fetchRecentActivity();

      expect(result).toEqual([]);
    });

    it("should throw on database error", async () => {
      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      mockSupabase.from.mockReturnValue(
        createChainableMock({
          data: null,
          error: { message: "Permission denied" },
        })
      );

      await expect(fetchRecentActivity()).rejects.toEqual({
        message: "Permission denied",
      });

      expect(consoleSpy).toHaveBeenCalledWith(
        "Error fetching recent activity:",
        expect.objectContaining({ message: "Permission denied" })
      );

      consoleSpy.mockRestore();
    });

    it("should include gig join data in results", async () => {
      mockSupabase.from.mockReturnValue(
        createChainableMock({ data: [mockActivityWithGig], error: null })
      );

      const result = await fetchRecentActivity();

      expect(result[0].gig).toEqual({
        title: "Jazz Night",
        date: "2024-12-15",
      });
    });
  });

  // ============================================================================
  // countNewActivity
  // ============================================================================

  describe("countNewActivity", () => {
    it("should return the count of new activity entries", async () => {
      const chainMock = createChainableMock({ data: null, error: null });
      // Override the thenable to include count
      Object.assign(chainMock, {
        then: (resolve: (value: unknown) => void) =>
          Promise.resolve({ count: 5, error: null }).then(resolve),
      });
      mockSupabase.from.mockReturnValue(chainMock);

      const result = await countNewActivity(
        "gig-123",
        new Date("2024-06-01T00:00:00Z")
      );

      expect(result).toBe(5);
      expect(mockSupabase.from).toHaveBeenCalledWith("gig_activity_log");
      expect(chainMock.eq).toHaveBeenCalledWith("gig_id", "gig-123");
      expect(chainMock.gte).toHaveBeenCalledWith(
        "created_at",
        "2024-06-01T00:00:00.000Z"
      );
    });

    it("should return 0 when count is null", async () => {
      const chainMock = createChainableMock({ data: null, error: null });
      Object.assign(chainMock, {
        then: (resolve: (value: unknown) => void) =>
          Promise.resolve({ count: null, error: null }).then(resolve),
      });
      mockSupabase.from.mockReturnValue(chainMock);

      const result = await countNewActivity(
        "gig-123",
        new Date("2024-06-01T00:00:00Z")
      );

      expect(result).toBe(0);
    });

    it("should return 0 when no new activity exists", async () => {
      const chainMock = createChainableMock({ data: null, error: null });
      Object.assign(chainMock, {
        then: (resolve: (value: unknown) => void) =>
          Promise.resolve({ count: 0, error: null }).then(resolve),
      });
      mockSupabase.from.mockReturnValue(chainMock);

      const result = await countNewActivity(
        "gig-123",
        new Date("2024-06-01T00:00:00Z")
      );

      expect(result).toBe(0);
    });

    it("should throw on database error", async () => {
      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      const chainMock = createChainableMock({ data: null, error: null });
      Object.assign(chainMock, {
        then: (resolve: (value: unknown) => void) =>
          Promise.resolve({
            count: null,
            error: { message: "Table not found" },
          }).then(resolve),
      });
      mockSupabase.from.mockReturnValue(chainMock);

      await expect(
        countNewActivity("gig-123", new Date("2024-06-01T00:00:00Z"))
      ).rejects.toEqual({ message: "Table not found" });

      expect(consoleSpy).toHaveBeenCalledWith(
        "Error counting new activity:",
        expect.objectContaining({ message: "Table not found" })
      );

      consoleSpy.mockRestore();
    });

    it("should pass the since date as ISO string to gte filter", async () => {
      const chainMock = createChainableMock({ data: null, error: null });
      Object.assign(chainMock, {
        then: (resolve: (value: unknown) => void) =>
          Promise.resolve({ count: 3, error: null }).then(resolve),
      });
      mockSupabase.from.mockReturnValue(chainMock);

      const since = new Date("2024-12-25T14:30:00Z");
      await countNewActivity("gig-123", since);

      expect(chainMock.gte).toHaveBeenCalledWith(
        "created_at",
        "2024-12-25T14:30:00.000Z"
      );
    });
  });

  // ============================================================================
  // getActivitySummary
  // ============================================================================

  describe("getActivitySummary", () => {
    it("should return activity counts grouped by type", async () => {
      const data = [
        { activity_type: "gig_created" },
        { activity_type: "setlist_added" },
        { activity_type: "setlist_added" },
        { activity_type: "role_assigned" },
        { activity_type: "role_assigned" },
        { activity_type: "role_assigned" },
      ];

      mockSupabase.from.mockReturnValue(
        createChainableMock({ data, error: null })
      );

      const result = await getActivitySummary("gig-123");

      expect(result.gig_created).toBe(1);
      expect(result.setlist_added).toBe(2);
      expect(result.role_assigned).toBe(3);
      expect(mockSupabase.from).toHaveBeenCalledWith("gig_activity_log");
    });

    it("should return empty object when no activity exists", async () => {
      mockSupabase.from.mockReturnValue(
        createChainableMock({ data: [], error: null })
      );

      const result = await getActivitySummary("gig-123");

      expect(result).toEqual({});
    });

    it("should handle null data gracefully", async () => {
      mockSupabase.from.mockReturnValue(
        createChainableMock({ data: null, error: null })
      );

      const result = await getActivitySummary("gig-123");

      // data?.forEach with null data results in no iterations
      expect(result).toEqual({});
    });

    it("should filter by since date when provided", async () => {
      const chainMock = createChainableMock({
        data: [{ activity_type: "gig_updated" }],
        error: null,
      });
      mockSupabase.from.mockReturnValue(chainMock);

      const since = new Date("2024-01-15T00:00:00Z");
      await getActivitySummary("gig-123", since);

      expect(chainMock.gte).toHaveBeenCalledWith(
        "created_at",
        "2024-01-15T00:00:00.000Z"
      );
    });

    it("should not filter by date when since is not provided", async () => {
      const chainMock = createChainableMock({ data: [], error: null });
      mockSupabase.from.mockReturnValue(chainMock);

      await getActivitySummary("gig-123");

      expect(chainMock.gte).not.toHaveBeenCalled();
    });

    it("should throw on database error", async () => {
      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      mockSupabase.from.mockReturnValue(
        createChainableMock({
          data: null,
          error: { message: "Query failed" },
        })
      );

      await expect(getActivitySummary("gig-123")).rejects.toEqual({
        message: "Query failed",
      });

      expect(consoleSpy).toHaveBeenCalledWith(
        "Error fetching activity summary:",
        expect.objectContaining({ message: "Query failed" })
      );

      consoleSpy.mockRestore();
    });

    it("should handle a single activity type with multiple entries", async () => {
      const data = [
        { activity_type: "file_uploaded" },
        { activity_type: "file_uploaded" },
        { activity_type: "file_uploaded" },
        { activity_type: "file_uploaded" },
      ];

      mockSupabase.from.mockReturnValue(
        createChainableMock({ data, error: null })
      );

      const result = await getActivitySummary("gig-123");

      expect(result.file_uploaded).toBe(4);
    });

    it("should filter by gig_id", async () => {
      const chainMock = createChainableMock({ data: [], error: null });
      mockSupabase.from.mockReturnValue(chainMock);

      await getActivitySummary("specific-gig-id");

      expect(chainMock.eq).toHaveBeenCalledWith("gig_id", "specific-gig-id");
    });
  });

  // ============================================================================
  // logActivity
  // ============================================================================

  describe("logActivity", () => {
    it("should insert an activity entry with the authenticated user", async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: "user-789" } },
      });

      const chainMock = createChainableMock({ data: null, error: null });
      mockSupabase.from.mockReturnValue(chainMock);

      await logActivity(
        "gig-123",
        "gig_updated",
        "Gig details were updated",
        { field: "title", old: "Old Name", new: "New Name" }
      );

      expect(mockSupabase.from).toHaveBeenCalledWith("gig_activity_log");
      expect(chainMock.insert).toHaveBeenCalledWith({
        gig_id: "gig-123",
        user_id: "user-789",
        activity_type: "gig_updated",
        description: "Gig details were updated",
        metadata: { field: "title", old: "Old Name", new: "New Name" },
      });
    });

    it("should use null user_id when no user is authenticated", async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
      });

      const chainMock = createChainableMock({ data: null, error: null });
      mockSupabase.from.mockReturnValue(chainMock);

      await logActivity("gig-123", "gig_created", "Gig was created");

      expect(chainMock.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: null,
        })
      );
    });

    it("should use empty object as default metadata", async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: "user-789" } },
      });

      const chainMock = createChainableMock({ data: null, error: null });
      mockSupabase.from.mockReturnValue(chainMock);

      await logActivity("gig-123", "notes_updated", "Notes were updated");

      expect(chainMock.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: {},
        })
      );
    });

    it("should throw on database error", async () => {
      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: "user-789" } },
      });

      mockSupabase.from.mockReturnValue(
        createChainableMock({
          data: null,
          error: { message: "Insert failed" },
        })
      );

      await expect(
        logActivity("gig-123", "gig_updated", "Update failed")
      ).rejects.toEqual({ message: "Insert failed" });

      expect(consoleSpy).toHaveBeenCalledWith(
        "Error logging activity:",
        expect.objectContaining({ message: "Insert failed" })
      );

      consoleSpy.mockRestore();
    });

    it("should resolve without returning a value on success", async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: "user-789" } },
      });

      mockSupabase.from.mockReturnValue(
        createChainableMock({ data: null, error: null })
      );

      const result = await logActivity(
        "gig-123",
        "schedule_updated",
        "Schedule was changed"
      );

      expect(result).toBeUndefined();
    });
  });

  // ============================================================================
  // getActivityIcon
  // ============================================================================

  describe("getActivityIcon", () => {
    it("should return correct icon for each activity type", () => {
      const expectedIcons: Record<ActivityType, string> = {
        setlist_added: "\u{1F3B5}",
        setlist_removed: "\u274C",
        setlist_updated: "\u270F\uFE0F",
        setlist_reordered: "\u{1F504}",
        file_uploaded: "\u{1F4CE}",
        file_removed: "\u{1F5D1}\uFE0F",
        file_updated: "\u{1F4DD}",
        role_assigned: "\u{1F464}",
        role_removed: "\u{1F6AB}",
        role_status_changed: "\u{1F514}",
        gig_updated: "\u{1F3A4}",
        notes_updated: "\u{1F4CB}",
        schedule_updated: "\u{1F4C5}",
        gig_created: "\u2728",
        gig_status_changed: "\u{1F514}",
        gig_times_changed: "\u{1F550}",
        gig_venue_changed: "\u{1F4CD}",
        gig_fee_changed: "\u{1F4B0}",
        gig_logistics_changed: "\u{1F4E6}",
      };

      for (const [type, expectedIcon] of Object.entries(expectedIcons)) {
        expect(getActivityIcon(type as ActivityType)).toBe(expectedIcon);
      }
    });

    it("should return bullet for unknown activity type", () => {
      // Cast to bypass TypeScript for edge case testing
      const result = getActivityIcon("unknown_type" as ActivityType);
      expect(result).toBe("\u2022");
    });
  });

  // ============================================================================
  // getActivityColor
  // ============================================================================

  describe("getActivityColor", () => {
    it("should return green for creation/addition types", () => {
      const greenTypes: ActivityType[] = [
        "setlist_added",
        "file_uploaded",
        "role_assigned",
        "gig_created",
        "gig_fee_changed",
      ];

      for (const type of greenTypes) {
        expect(getActivityColor(type)).toBe(
          "text-green-600 dark:text-green-400"
        );
      }
    });

    it("should return red for removal types", () => {
      const redTypes: ActivityType[] = [
        "setlist_removed",
        "file_removed",
        "role_removed",
      ];

      for (const type of redTypes) {
        expect(getActivityColor(type)).toBe("text-red-600 dark:text-red-400");
      }
    });

    it("should return blue for update types", () => {
      const blueTypes: ActivityType[] = [
        "setlist_updated",
        "file_updated",
        "gig_updated",
        "schedule_updated",
      ];

      for (const type of blueTypes) {
        expect(getActivityColor(type)).toBe(
          "text-blue-600 dark:text-blue-400"
        );
      }
    });

    it("should return amber for status change types", () => {
      const amberTypes: ActivityType[] = [
        "role_status_changed",
        "gig_status_changed",
      ];

      for (const type of amberTypes) {
        expect(getActivityColor(type)).toBe(
          "text-amber-600 dark:text-amber-400"
        );
      }
    });

    it("should return purple for reorder and venue types", () => {
      expect(getActivityColor("setlist_reordered")).toBe(
        "text-purple-600 dark:text-purple-400"
      );
      expect(getActivityColor("gig_venue_changed")).toBe(
        "text-purple-600 dark:text-purple-400"
      );
    });

    it("should return orange for time changes", () => {
      expect(getActivityColor("gig_times_changed")).toBe(
        "text-orange-600 dark:text-orange-400"
      );
    });

    it("should return gray for notes and logistics types", () => {
      const grayTypes: ActivityType[] = [
        "notes_updated",
        "gig_logistics_changed",
      ];

      for (const type of grayTypes) {
        expect(getActivityColor(type)).toBe(
          "text-gray-600 dark:text-gray-400"
        );
      }
    });

    it("should return default gray for unknown activity type", () => {
      const result = getActivityColor("unknown_type" as ActivityType);
      expect(result).toBe("text-gray-600 dark:text-gray-400");
    });
  });
});
