import { describe, it, expect, vi, beforeEach } from "vitest";
import { createClient } from "@/lib/supabase/client";
import {
  getGigReadiness,
  createGigReadiness,
  updateGigReadiness,
  deleteGigReadiness,
  calculateReadinessScore,
  getOrCreateGigReadiness,
} from "@/lib/api/gig-readiness";
import { createChainableMock } from "../mocks/supabase";
import type { GigReadiness } from "@/lib/types/shared";

// Mock the Supabase client module
vi.mock("@/lib/supabase/client");

describe("Gig Readiness API", () => {
  const mockSupabase = {
    from: vi.fn(),
  };

  // Reusable database row shape (snake_case, as Supabase returns)
  const mockDbRow = {
    id: "readiness-1",
    gig_id: "gig-1",
    musician_id: "musician-1",
    songs_total: 12,
    songs_learned: 8,
    charts_ready: true,
    sounds_ready: false,
    travel_checked: true,
    gear_packed: false,
    notes: "Need to review bridge section",
    created_at: "2026-01-15T10:00:00Z",
    updated_at: "2026-01-16T14:30:00Z",
  };

  // Expected camelCase output after transformation
  const expectedTransformed: GigReadiness = {
    id: "readiness-1",
    gigId: "gig-1",
    musicianId: "musician-1",
    songsTotal: 12,
    songsLearned: 8,
    chartsReady: true,
    soundsReady: false,
    travelChecked: true,
    gearPacked: false,
    notes: "Need to review bridge section",
    createdAt: "2026-01-15T10:00:00Z",
    updatedAt: "2026-01-16T14:30:00Z",
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(createClient).mockReturnValue(
      mockSupabase as unknown as ReturnType<typeof createClient>
    );
  });

  // ============================================================================
  // getGigReadiness
  // ============================================================================

  describe("getGigReadiness", () => {
    it("should return a transformed readiness record", async () => {
      mockSupabase.from.mockReturnValue(
        createChainableMock({ data: mockDbRow, error: null })
      );

      const result = await getGigReadiness("gig-1", "musician-1");

      expect(result).toEqual(expectedTransformed);
      expect(mockSupabase.from).toHaveBeenCalledWith("gig_readiness");
    });

    it("should return null when no record exists", async () => {
      mockSupabase.from.mockReturnValue(
        createChainableMock({ data: null, error: null })
      );

      const result = await getGigReadiness("gig-1", "musician-1");

      expect(result).toBeNull();
    });

    it("should apply defaults for null numeric and boolean fields", async () => {
      const rowWithNulls = {
        ...mockDbRow,
        songs_total: null,
        songs_learned: null,
        charts_ready: null,
        sounds_ready: null,
        travel_checked: null,
        gear_packed: null,
      };

      mockSupabase.from.mockReturnValue(
        createChainableMock({ data: rowWithNulls, error: null })
      );

      const result = await getGigReadiness("gig-1", "musician-1");

      expect(result).not.toBeNull();
      expect(result!.songsTotal).toBe(0);
      expect(result!.songsLearned).toBe(0);
      expect(result!.chartsReady).toBe(false);
      expect(result!.soundsReady).toBe(false);
      expect(result!.travelChecked).toBe(false);
      expect(result!.gearPacked).toBe(false);
    });

    it("should throw on database error", async () => {
      const dbError = { message: "Connection refused", code: "ECONNREFUSED" };
      mockSupabase.from.mockReturnValue(
        createChainableMock({ data: null, error: dbError })
      );

      await expect(getGigReadiness("gig-1", "musician-1")).rejects.toEqual(
        dbError
      );
    });
  });

  // ============================================================================
  // createGigReadiness
  // ============================================================================

  describe("createGigReadiness", () => {
    it("should create a readiness record and return transformed result", async () => {
      mockSupabase.from.mockReturnValue(
        createChainableMock({ data: mockDbRow, error: null })
      );

      const result = await createGigReadiness({
        gigId: "gig-1",
        musicianId: "musician-1",
        songsTotal: 12,
        songsLearned: 8,
        chartsReady: true,
        soundsReady: false,
        travelChecked: true,
        gearPacked: false,
        notes: "Need to review bridge section",
      });

      expect(result).toEqual(expectedTransformed);
      expect(mockSupabase.from).toHaveBeenCalledWith("gig_readiness");
    });

    it("should apply defaults for null fields in the result", async () => {
      const rowWithNulls = {
        ...mockDbRow,
        songs_total: null,
        songs_learned: null,
        charts_ready: null,
        sounds_ready: null,
        travel_checked: null,
        gear_packed: null,
        notes: null,
      };

      mockSupabase.from.mockReturnValue(
        createChainableMock({ data: rowWithNulls, error: null })
      );

      const result = await createGigReadiness({
        gigId: "gig-1",
        musicianId: "musician-1",
        songsTotal: 0,
        songsLearned: 0,
        chartsReady: false,
        soundsReady: false,
        travelChecked: false,
        gearPacked: false,
        notes: null,
      });

      expect(result.songsTotal).toBe(0);
      expect(result.songsLearned).toBe(0);
      expect(result.chartsReady).toBe(false);
      expect(result.soundsReady).toBe(false);
      expect(result.travelChecked).toBe(false);
      expect(result.gearPacked).toBe(false);
      expect(result.notes).toBeNull();
    });

    it("should throw on database error", async () => {
      const dbError = { message: "Unique constraint violation" };
      mockSupabase.from.mockReturnValue(
        createChainableMock({ data: null, error: dbError })
      );

      await expect(
        createGigReadiness({
          gigId: "gig-1",
          musicianId: "musician-1",
          songsTotal: 0,
          songsLearned: 0,
          chartsReady: false,
          soundsReady: false,
          travelChecked: false,
          gearPacked: false,
          notes: null,
        })
      ).rejects.toEqual(dbError);
    });
  });

  // ============================================================================
  // updateGigReadiness
  // ============================================================================

  describe("updateGigReadiness", () => {
    it("should update and return the transformed record", async () => {
      const updatedRow = {
        ...mockDbRow,
        songs_learned: 10,
        gear_packed: true,
      };

      mockSupabase.from.mockReturnValue(
        createChainableMock({ data: updatedRow, error: null })
      );

      const result = await updateGigReadiness("gig-1", "musician-1", {
        songsLearned: 10,
        gearPacked: true,
      });

      expect(result.songsLearned).toBe(10);
      expect(result.gearPacked).toBe(true);
      expect(mockSupabase.from).toHaveBeenCalledWith("gig_readiness");
    });

    it("should handle a partial update with a single field", async () => {
      const updatedRow = { ...mockDbRow, notes: "Updated notes" };

      mockSupabase.from.mockReturnValue(
        createChainableMock({ data: updatedRow, error: null })
      );

      const result = await updateGigReadiness("gig-1", "musician-1", {
        notes: "Updated notes",
      });

      expect(result.notes).toBe("Updated notes");
    });

    it("should handle updating notes to null", async () => {
      const updatedRow = { ...mockDbRow, notes: null };

      mockSupabase.from.mockReturnValue(
        createChainableMock({ data: updatedRow, error: null })
      );

      const result = await updateGigReadiness("gig-1", "musician-1", {
        notes: null,
      });

      expect(result.notes).toBeNull();
    });

    it("should apply defaults for null fields in the result", async () => {
      const rowWithNulls = {
        ...mockDbRow,
        songs_total: null,
        songs_learned: null,
        charts_ready: null,
        sounds_ready: null,
        travel_checked: null,
        gear_packed: null,
      };

      mockSupabase.from.mockReturnValue(
        createChainableMock({ data: rowWithNulls, error: null })
      );

      const result = await updateGigReadiness("gig-1", "musician-1", {
        songsTotal: 0,
      });

      expect(result.songsTotal).toBe(0);
      expect(result.songsLearned).toBe(0);
      expect(result.chartsReady).toBe(false);
      expect(result.soundsReady).toBe(false);
      expect(result.travelChecked).toBe(false);
      expect(result.gearPacked).toBe(false);
    });

    it("should handle updating all boolean checklist fields", async () => {
      const updatedRow = {
        ...mockDbRow,
        charts_ready: false,
        sounds_ready: true,
        travel_checked: false,
      };

      mockSupabase.from.mockReturnValue(
        createChainableMock({ data: updatedRow, error: null })
      );

      const result = await updateGigReadiness("gig-1", "musician-1", {
        chartsReady: false,
        soundsReady: true,
        travelChecked: false,
      });

      expect(result.chartsReady).toBe(false);
      expect(result.soundsReady).toBe(true);
      expect(result.travelChecked).toBe(false);
    });

    it("should handle an empty updates object", async () => {
      mockSupabase.from.mockReturnValue(
        createChainableMock({ data: mockDbRow, error: null })
      );

      const result = await updateGigReadiness("gig-1", "musician-1", {});

      expect(result).toEqual(expectedTransformed);
    });

    it("should throw on database error", async () => {
      const dbError = { message: "Row not found" };
      mockSupabase.from.mockReturnValue(
        createChainableMock({ data: null, error: dbError })
      );

      await expect(
        updateGigReadiness("gig-1", "musician-1", { songsLearned: 5 })
      ).rejects.toEqual(dbError);
    });
  });

  // ============================================================================
  // deleteGigReadiness
  // ============================================================================

  describe("deleteGigReadiness", () => {
    it("should delete successfully and return void", async () => {
      mockSupabase.from.mockReturnValue(
        createChainableMock({ data: null, error: null })
      );

      await expect(
        deleteGigReadiness("gig-1", "musician-1")
      ).resolves.toBeUndefined();
      expect(mockSupabase.from).toHaveBeenCalledWith("gig_readiness");
    });

    it("should throw on database error", async () => {
      const dbError = { message: "RLS policy violation" };
      mockSupabase.from.mockReturnValue(
        createChainableMock({ data: null, error: dbError })
      );

      await expect(
        deleteGigReadiness("gig-1", "musician-1")
      ).rejects.toEqual(dbError);
    });
  });

  // ============================================================================
  // calculateReadinessScore (pure function, no Supabase mocking needed)
  // ============================================================================

  describe("calculateReadinessScore", () => {
    it("should return all zeros for null input", () => {
      const score = calculateReadinessScore(null);

      expect(score).toEqual({
        overall: 0,
        songs: 0,
        charts: 0,
        sounds: 0,
        travel: 0,
        gear: 0,
      });
    });

    it("should return 100% overall when everything is complete", () => {
      const fullyReady: GigReadiness = {
        ...expectedTransformed,
        songsTotal: 10,
        songsLearned: 10,
        chartsReady: true,
        soundsReady: true,
        travelChecked: true,
        gearPacked: true,
      };

      const score = calculateReadinessScore(fullyReady);

      expect(score.overall).toBe(100);
      expect(score.songs).toBe(100);
      expect(score.charts).toBe(100);
      expect(score.sounds).toBe(100);
      expect(score.travel).toBe(100);
      expect(score.gear).toBe(100);
    });

    it("should return 0% overall when nothing is done and songs exist", () => {
      const notReady: GigReadiness = {
        ...expectedTransformed,
        songsTotal: 10,
        songsLearned: 0,
        chartsReady: false,
        soundsReady: false,
        travelChecked: false,
        gearPacked: false,
      };

      const score = calculateReadinessScore(notReady);

      expect(score.overall).toBe(0);
      expect(score.songs).toBe(0);
      expect(score.charts).toBe(0);
      expect(score.sounds).toBe(0);
      expect(score.travel).toBe(0);
      expect(score.gear).toBe(0);
    });

    it("should treat zero songsTotal as 100% songs complete", () => {
      const noSongs: GigReadiness = {
        ...expectedTransformed,
        songsTotal: 0,
        songsLearned: 0,
        chartsReady: false,
        soundsReady: false,
        travelChecked: false,
        gearPacked: false,
      };

      const score = calculateReadinessScore(noSongs);

      // Songs: 100% (no songs = complete), but checklist all 0
      // Overall: (100/100) * 40 + (0/400) * 60 = 40
      expect(score.songs).toBe(100);
      expect(score.overall).toBe(40);
    });

    it("should calculate partial song progress correctly", () => {
      const halfSongs: GigReadiness = {
        ...expectedTransformed,
        songsTotal: 10,
        songsLearned: 5,
        chartsReady: false,
        soundsReady: false,
        travelChecked: false,
        gearPacked: false,
      };

      const score = calculateReadinessScore(halfSongs);

      // Songs: 50%
      // Overall: (50/100) * 40 + (0/400) * 60 = 20
      expect(score.songs).toBe(50);
      expect(score.overall).toBe(20);
    });

    it("should round song percentage to nearest integer", () => {
      const oddSongs: GigReadiness = {
        ...expectedTransformed,
        songsTotal: 3,
        songsLearned: 1,
        chartsReady: false,
        soundsReady: false,
        travelChecked: false,
        gearPacked: false,
      };

      const score = calculateReadinessScore(oddSongs);

      // 1/3 = 33.33... -> rounds to 33
      expect(score.songs).toBe(33);
    });

    it("should weight checklist items at 15% each (60% total)", () => {
      const onlyChecklist: GigReadiness = {
        ...expectedTransformed,
        songsTotal: 10,
        songsLearned: 0,
        chartsReady: true,
        soundsReady: true,
        travelChecked: true,
        gearPacked: true,
      };

      const score = calculateReadinessScore(onlyChecklist);

      // Songs: 0%
      // Overall: (0/100) * 40 + (400/400) * 60 = 60
      expect(score.songs).toBe(0);
      expect(score.charts).toBe(100);
      expect(score.sounds).toBe(100);
      expect(score.travel).toBe(100);
      expect(score.gear).toBe(100);
      expect(score.overall).toBe(60);
    });

    it("should calculate mixed progress correctly", () => {
      const mixed: GigReadiness = {
        ...expectedTransformed,
        songsTotal: 10,
        songsLearned: 10,
        chartsReady: true,
        soundsReady: false,
        travelChecked: true,
        gearPacked: false,
      };

      const score = calculateReadinessScore(mixed);

      // Songs: 100%
      // Checklist: charts 100, sounds 0, travel 100, gear 0 = 200/400
      // Overall: (100/100)*40 + (200/400)*60 = 40 + 30 = 70
      expect(score.songs).toBe(100);
      expect(score.charts).toBe(100);
      expect(score.sounds).toBe(0);
      expect(score.travel).toBe(100);
      expect(score.gear).toBe(0);
      expect(score.overall).toBe(70);
    });

    it("should handle a single checklist item being true", () => {
      const oneItem: GigReadiness = {
        ...expectedTransformed,
        songsTotal: 10,
        songsLearned: 0,
        chartsReady: true,
        soundsReady: false,
        travelChecked: false,
        gearPacked: false,
      };

      const score = calculateReadinessScore(oneItem);

      // Songs: 0%
      // Checklist: 100/400
      // Overall: 0 + (100/400)*60 = 15
      expect(score.overall).toBe(15);
    });
  });

  // ============================================================================
  // getOrCreateGigReadiness
  // ============================================================================

  describe("getOrCreateGigReadiness", () => {
    it("should return existing record when one exists", async () => {
      // First call (getGigReadiness) uses maybeSingle, returns data
      mockSupabase.from.mockReturnValue(
        createChainableMock({ data: mockDbRow, error: null })
      );

      const result = await getOrCreateGigReadiness("gig-1", "musician-1", 12);

      expect(result).toEqual(expectedTransformed);
      // Should only call from() once (for the get, not the create)
      expect(mockSupabase.from).toHaveBeenCalledTimes(1);
    });

    it("should create a new record when none exists", async () => {
      // First call (getGigReadiness) returns null
      const getMock = createChainableMock({ data: null, error: null });
      // Second call (createGigReadiness) returns the new record
      const createMock = createChainableMock({
        data: {
          ...mockDbRow,
          songs_total: 5,
          songs_learned: 0,
          charts_ready: false,
          sounds_ready: false,
          travel_checked: false,
          gear_packed: false,
          notes: null,
        },
        error: null,
      });

      mockSupabase.from
        .mockReturnValueOnce(getMock)
        .mockReturnValueOnce(createMock);

      const result = await getOrCreateGigReadiness("gig-1", "musician-1", 5);

      expect(result.songsTotal).toBe(5);
      expect(result.songsLearned).toBe(0);
      expect(result.chartsReady).toBe(false);
      expect(result.notes).toBeNull();
      // Called twice: once for get, once for create
      expect(mockSupabase.from).toHaveBeenCalledTimes(2);
    });

    it("should default songsTotal to 0 when not provided", async () => {
      const getMock = createChainableMock({ data: null, error: null });
      const createMock = createChainableMock({
        data: {
          ...mockDbRow,
          songs_total: 0,
          songs_learned: 0,
          charts_ready: false,
          sounds_ready: false,
          travel_checked: false,
          gear_packed: false,
          notes: null,
        },
        error: null,
      });

      mockSupabase.from
        .mockReturnValueOnce(getMock)
        .mockReturnValueOnce(createMock);

      const result = await getOrCreateGigReadiness("gig-1", "musician-1");

      expect(result.songsTotal).toBe(0);
    });

    it("should propagate error from getGigReadiness", async () => {
      const dbError = { message: "Database unreachable" };
      mockSupabase.from.mockReturnValue(
        createChainableMock({ data: null, error: dbError })
      );

      await expect(
        getOrCreateGigReadiness("gig-1", "musician-1", 10)
      ).rejects.toEqual(dbError);
    });

    it("should propagate error from createGigReadiness", async () => {
      const getMock = createChainableMock({ data: null, error: null });
      const createError = { message: "Insert failed" };
      const createMock = createChainableMock({
        data: null,
        error: createError,
      });

      mockSupabase.from
        .mockReturnValueOnce(getMock)
        .mockReturnValueOnce(createMock);

      await expect(
        getOrCreateGigReadiness("gig-1", "musician-1", 10)
      ).rejects.toEqual(createError);
    });
  });
});
