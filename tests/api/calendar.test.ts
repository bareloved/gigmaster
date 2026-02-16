import { describe, it, expect, vi, beforeEach } from "vitest";
import type { DashboardGig } from "@/lib/types/shared";
import { checkGigConflicts, timesOverlap } from "@/lib/api/calendar";
import { listDashboardGigs } from "@/lib/api/dashboard-gigs";

// Mock the dashboard-gigs module (checkGigConflicts depends on it, not Supabase directly)
vi.mock("@/lib/api/dashboard-gigs");

// ============================================================================
// FIXTURES
// ============================================================================

function createDashboardGig(overrides: Partial<DashboardGig> = {}): DashboardGig {
  return {
    gigId: "gig-1",
    gigTitle: "Test Gig",
    date: "2024-12-15",
    startTime: "20:00",
    endTime: "23:00",
    callTime: null,
    locationName: null,
    status: "confirmed",
    isManager: true,
    isPlayer: false,
    hostId: "owner-1",
    hostName: "Test Owner",
    ...overrides,
  };
}

describe("Calendar API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ============================================================================
  // timesOverlap
  // ============================================================================

  describe("timesOverlap", () => {
    it("should detect overlapping ranges where first starts before second ends", () => {
      // Range 1: 10:00-14:00, Range 2: 12:00-16:00
      expect(timesOverlap("10:00", "14:00", "12:00", "16:00")).toBe(true);
    });

    it("should detect overlapping ranges where second starts before first ends", () => {
      // Range 1: 14:00-18:00, Range 2: 10:00-16:00
      expect(timesOverlap("14:00", "18:00", "10:00", "16:00")).toBe(true);
    });

    it("should detect when one range is fully contained in another", () => {
      // Range 1: 10:00-20:00, Range 2: 12:00-14:00
      expect(timesOverlap("10:00", "20:00", "12:00", "14:00")).toBe(true);
    });

    it("should detect when ranges are identical", () => {
      expect(timesOverlap("10:00", "14:00", "10:00", "14:00")).toBe(true);
    });

    it("should return false for adjacent ranges (first ends when second starts)", () => {
      // Range 1: 10:00-12:00, Range 2: 12:00-14:00
      // s1 < e2 (10:00 < 14:00) = true, but s2 < e1 (12:00 < 12:00) = false
      expect(timesOverlap("10:00", "12:00", "12:00", "14:00")).toBe(false);
    });

    it("should return false for adjacent ranges (second ends when first starts)", () => {
      // Range 1: 14:00-16:00, Range 2: 10:00-14:00
      expect(timesOverlap("14:00", "16:00", "10:00", "14:00")).toBe(false);
    });

    it("should return false for completely separate ranges", () => {
      // Range 1: 08:00-10:00, Range 2: 14:00-16:00
      expect(timesOverlap("08:00", "10:00", "14:00", "16:00")).toBe(false);
    });

    it("should return false for ranges separated by a gap", () => {
      // Range 1: 20:00-23:00, Range 2: 08:00-12:00
      expect(timesOverlap("20:00", "23:00", "08:00", "12:00")).toBe(false);
    });

    it("should handle single-minute ranges", () => {
      expect(timesOverlap("10:00", "10:01", "10:00", "10:01")).toBe(true);
    });

    it("should handle midnight-adjacent times", () => {
      // Range 1: 23:00-23:59, Range 2: 00:00-01:00
      // In minutes: s1=1380, e1=1439, s2=0, e2=60
      // s1 < e2 => 1380 < 60 => false
      expect(timesOverlap("23:00", "23:59", "00:00", "01:00")).toBe(false);
    });
  });

  // ============================================================================
  // checkGigConflicts
  // ============================================================================

  describe("checkGigConflicts", () => {
    const userId = "test-user-id";

    it("should return conflicting gigs with overlapping times", async () => {
      const eveningGig = createDashboardGig({
        gigId: "gig-evening",
        gigTitle: "Evening Gig",
        date: "2024-12-15",
        startTime: "19:00",
        endTime: "22:00",
      });

      vi.mocked(listDashboardGigs).mockResolvedValue({
        gigs: [eveningGig],
        hasMore: false,
        total: 1,
      });

      // Check 20:00-23:00 which overlaps with 19:00-22:00
      const result = await checkGigConflicts(userId, "2024-12-15", "20:00", "23:00");

      expect(result).toHaveLength(1);
      expect(result[0].gigTitle).toBe("Evening Gig");
    });

    it("should return empty array when no gigs on date", async () => {
      vi.mocked(listDashboardGigs).mockResolvedValue({
        gigs: [],
        hasMore: false,
        total: 0,
      });

      const result = await checkGigConflicts(userId, "2024-12-15", "10:00", "12:00");

      expect(result).toEqual([]);
    });

    it("should return empty array when no time overlap exists", async () => {
      const morningGig = createDashboardGig({
        gigId: "gig-morning",
        gigTitle: "Morning Gig",
        date: "2024-12-15",
        startTime: "08:00",
        endTime: "10:00",
      });

      vi.mocked(listDashboardGigs).mockResolvedValue({
        gigs: [morningGig],
        hasMore: false,
        total: 1,
      });

      // Check 14:00-16:00 which does not overlap 08:00-10:00
      const result = await checkGigConflicts(userId, "2024-12-15", "14:00", "16:00");

      expect(result).toEqual([]);
    });

    it("should return all gigs on date when no times are specified", async () => {
      const gig1 = createDashboardGig({
        gigId: "gig-1",
        gigTitle: "Morning Gig",
        date: "2024-12-15",
        startTime: "08:00",
        endTime: "10:00",
      });
      const gig2 = createDashboardGig({
        gigId: "gig-2",
        gigTitle: "Evening Gig",
        date: "2024-12-15",
        startTime: "19:00",
        endTime: "22:00",
      });

      vi.mocked(listDashboardGigs).mockResolvedValue({
        gigs: [gig1, gig2],
        hasMore: false,
        total: 2,
      });

      const result = await checkGigConflicts(userId, "2024-12-15", null, null);

      expect(result).toHaveLength(2);
    });

    it("should treat all-day gigs (no times) as conflicts", async () => {
      const allDayGig = createDashboardGig({
        gigId: "gig-allday",
        gigTitle: "All Day Gig",
        date: "2024-12-15",
        startTime: null,
        endTime: null,
      });

      vi.mocked(listDashboardGigs).mockResolvedValue({
        gigs: [allDayGig],
        hasMore: false,
        total: 1,
      });

      const result = await checkGigConflicts(userId, "2024-12-15", "10:00", "12:00");

      expect(result).toHaveLength(1);
      expect(result[0].gigTitle).toBe("All Day Gig");
    });

    it("should filter out gigs on different dates", async () => {
      const differentDateGig = createDashboardGig({
        gigId: "gig-other-date",
        gigTitle: "Other Day Gig",
        date: "2024-12-16",
        startTime: "10:00",
        endTime: "12:00",
      });

      vi.mocked(listDashboardGigs).mockResolvedValue({
        gigs: [differentDateGig],
        hasMore: false,
        total: 1,
      });

      const result = await checkGigConflicts(userId, "2024-12-15", "10:00", "12:00");

      expect(result).toEqual([]);
    });

    it("should handle mix of conflicting and non-conflicting gigs", async () => {
      const morningGig = createDashboardGig({
        gigId: "gig-morning",
        gigTitle: "Morning Gig",
        date: "2024-12-15",
        startTime: "08:00",
        endTime: "10:00",
      });
      const overlappingGig = createDashboardGig({
        gigId: "gig-overlap",
        gigTitle: "Overlapping Gig",
        date: "2024-12-15",
        startTime: "13:00",
        endTime: "16:00",
      });
      const eveningGig = createDashboardGig({
        gigId: "gig-evening",
        gigTitle: "Evening Gig",
        date: "2024-12-15",
        startTime: "20:00",
        endTime: "23:00",
      });

      vi.mocked(listDashboardGigs).mockResolvedValue({
        gigs: [morningGig, overlappingGig, eveningGig],
        hasMore: false,
        total: 3,
      });

      // Check 14:00-21:00 which overlaps with the afternoon and evening gigs
      const result = await checkGigConflicts(userId, "2024-12-15", "14:00", "21:00");

      expect(result).toHaveLength(2);
      expect(result.map((g) => g.gigTitle)).toEqual(
        expect.arrayContaining(["Overlapping Gig", "Evening Gig"])
      );
    });

    it("should pass correct parameters to listDashboardGigs", async () => {
      vi.mocked(listDashboardGigs).mockResolvedValue({
        gigs: [],
        hasMore: false,
        total: 0,
      });

      await checkGigConflicts(userId, "2024-12-15", "10:00", "12:00");

      expect(listDashboardGigs).toHaveBeenCalledWith(userId, {
        from: expect.any(Date),
        to: expect.any(Date),
        limit: 100,
        offset: 0,
      });

      // Verify the Date objects represent the correct date
      const callArgs = vi.mocked(listDashboardGigs).mock.calls[0][1]!;
      expect(callArgs.from!.toISOString()).toContain("2024-12-15");
      expect(callArgs.to!.toISOString()).toContain("2024-12-15");
    });

    it("should return all gigs on date when startTime is null", async () => {
      const gig = createDashboardGig({
        gigId: "gig-1",
        date: "2024-12-15",
        startTime: "10:00",
        endTime: "12:00",
      });

      vi.mocked(listDashboardGigs).mockResolvedValue({
        gigs: [gig],
        hasMore: false,
        total: 1,
      });

      // startTime null, endTime provided - still treated as "no times specified"
      const result = await checkGigConflicts(userId, "2024-12-15", null, "12:00");

      expect(result).toHaveLength(1);
    });

    it("should return all gigs on date when endTime is null", async () => {
      const gig = createDashboardGig({
        gigId: "gig-1",
        date: "2024-12-15",
        startTime: "10:00",
        endTime: "12:00",
      });

      vi.mocked(listDashboardGigs).mockResolvedValue({
        gigs: [gig],
        hasMore: false,
        total: 1,
      });

      // endTime null, startTime provided - still treated as "no times specified"
      const result = await checkGigConflicts(userId, "2024-12-15", "10:00", null);

      expect(result).toHaveLength(1);
    });

    it("should handle gig with only startTime (no endTime) as all-day conflict", async () => {
      const gigMissingEndTime = createDashboardGig({
        gigId: "gig-no-end",
        gigTitle: "No End Time",
        date: "2024-12-15",
        startTime: "10:00",
        endTime: null,
      });

      vi.mocked(listDashboardGigs).mockResolvedValue({
        gigs: [gigMissingEndTime],
        hasMore: false,
        total: 1,
      });

      const result = await checkGigConflicts(userId, "2024-12-15", "14:00", "16:00");

      // Gig has no endTime, so it is treated as an all-day event and is a conflict
      expect(result).toHaveLength(1);
      expect(result[0].gigTitle).toBe("No End Time");
    });

    it("should handle gig with only endTime (no startTime) as all-day conflict", async () => {
      const gigMissingStartTime = createDashboardGig({
        gigId: "gig-no-start",
        gigTitle: "No Start Time",
        date: "2024-12-15",
        startTime: null,
        endTime: "16:00",
      });

      vi.mocked(listDashboardGigs).mockResolvedValue({
        gigs: [gigMissingStartTime],
        hasMore: false,
        total: 1,
      });

      const result = await checkGigConflicts(userId, "2024-12-15", "14:00", "16:00");

      // Gig has no startTime, so it is treated as an all-day event and is a conflict
      expect(result).toHaveLength(1);
      expect(result[0].gigTitle).toBe("No Start Time");
    });

    it("should not return adjacent (non-overlapping) gigs as conflicts", async () => {
      const adjacentGig = createDashboardGig({
        gigId: "gig-adjacent",
        date: "2024-12-15",
        startTime: "12:00",
        endTime: "14:00",
      });

      vi.mocked(listDashboardGigs).mockResolvedValue({
        gigs: [adjacentGig],
        hasMore: false,
        total: 1,
      });

      // Check 14:00-16:00 which starts exactly when the other ends
      const result = await checkGigConflicts(userId, "2024-12-15", "14:00", "16:00");

      expect(result).toEqual([]);
    });
  });
});
