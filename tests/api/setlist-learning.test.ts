import { describe, it, expect, vi, beforeEach } from "vitest";
import { createClient } from "@/lib/supabase/client";
import {
  getLearningStatus,
  upsertLearningStatus,
  toggleSongLearned,
  recordPracticeSession,
  getMusicianLearningStatuses,
  getPracticeItems,
  getLearningStats,
} from "@/lib/api/setlist-learning";
import { createChainableMock } from "../mocks/supabase";

// Mock the Supabase client module
vi.mock("@/lib/supabase/client");

describe("Setlist Learning API", () => {
  const mockSupabase = {
    from: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(createClient).mockReturnValue(
      mockSupabase as unknown as ReturnType<typeof createClient>
    );
  });

  // Reusable mock data for a database row (snake_case)
  const mockDbRow = {
    id: "status-1",
    setlist_item_id: "item-1",
    musician_id: "musician-1",
    learned: false,
    last_practiced_at: null,
    practice_count: 0,
    difficulty: null,
    priority: "medium",
    notes: null,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-02T00:00:00Z",
  };

  // Expected camelCase transform of the above row
  const mockTransformed = {
    id: "status-1",
    setlistItemId: "item-1",
    musicianId: "musician-1",
    learned: false,
    lastPracticedAt: null,
    practiceCount: 0,
    difficulty: null,
    priority: "medium",
    notes: null,
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-02T00:00:00Z",
  };

  // ============================================================================
  // getLearningStatus
  // ============================================================================

  describe("getLearningStatus", () => {
    it("should return transformed learning status when found", async () => {
      mockSupabase.from.mockReturnValue(
        createChainableMock({ data: mockDbRow, error: null })
      );

      const result = await getLearningStatus("item-1", "musician-1");

      expect(result).toEqual(mockTransformed);
      expect(mockSupabase.from).toHaveBeenCalledWith(
        "setlist_learning_status"
      );
    });

    it("should return null when no learning status exists", async () => {
      mockSupabase.from.mockReturnValue(
        createChainableMock({ data: null, error: null })
      );

      const result = await getLearningStatus("item-1", "musician-1");

      expect(result).toBeNull();
    });

    it("should throw on database error", async () => {
      const dbError = { message: "Connection failed", code: "PGRST000" };
      mockSupabase.from.mockReturnValue(
        createChainableMock({ data: null, error: dbError })
      );

      await expect(
        getLearningStatus("item-1", "musician-1")
      ).rejects.toEqual(dbError);
    });

    it("should correctly transform all fields including non-null values", async () => {
      const fullRow = {
        ...mockDbRow,
        learned: true,
        last_practiced_at: "2026-02-10T15:00:00Z",
        practice_count: 5,
        difficulty: "hard",
        priority: "high",
        notes: "Need to work on the bridge section",
      };

      mockSupabase.from.mockReturnValue(
        createChainableMock({ data: fullRow, error: null })
      );

      const result = await getLearningStatus("item-1", "musician-1");

      expect(result).toEqual({
        id: "status-1",
        setlistItemId: "item-1",
        musicianId: "musician-1",
        learned: true,
        lastPracticedAt: "2026-02-10T15:00:00Z",
        practiceCount: 5,
        difficulty: "hard",
        priority: "high",
        notes: "Need to work on the bridge section",
        createdAt: "2026-01-01T00:00:00Z",
        updatedAt: "2026-01-02T00:00:00Z",
      });
    });
  });

  // ============================================================================
  // upsertLearningStatus
  // ============================================================================

  describe("upsertLearningStatus", () => {
    it("should upsert with minimal fields and return transformed result", async () => {
      mockSupabase.from.mockReturnValue(
        createChainableMock({ data: mockDbRow, error: null })
      );

      const result = await upsertLearningStatus({
        setlistItemId: "item-1",
        musicianId: "musician-1",
      });

      expect(result).toEqual(mockTransformed);
      expect(mockSupabase.from).toHaveBeenCalledWith(
        "setlist_learning_status"
      );
    });

    it("should include all optional fields when provided", async () => {
      const updatedRow = {
        ...mockDbRow,
        learned: true,
        last_practiced_at: "2026-02-15T10:00:00Z",
        practice_count: 3,
        difficulty: "easy",
        priority: "high",
        notes: "Sounds good now",
      };

      mockSupabase.from.mockReturnValue(
        createChainableMock({ data: updatedRow, error: null })
      );

      const result = await upsertLearningStatus({
        setlistItemId: "item-1",
        musicianId: "musician-1",
        learned: true,
        lastPracticedAt: "2026-02-15T10:00:00Z",
        practiceCount: 3,
        difficulty: "easy",
        priority: "high",
        notes: "Sounds good now",
      });

      expect(result.learned).toBe(true);
      expect(result.practiceCount).toBe(3);
      expect(result.difficulty).toBe("easy");
      expect(result.priority).toBe("high");
      expect(result.notes).toBe("Sounds good now");
    });

    it("should throw on database error", async () => {
      const dbError = { message: "Unique constraint violation" };
      mockSupabase.from.mockReturnValue(
        createChainableMock({ data: null, error: dbError })
      );

      await expect(
        upsertLearningStatus({
          setlistItemId: "item-1",
          musicianId: "musician-1",
        })
      ).rejects.toEqual(dbError);
    });

    it("should include learned field when explicitly false", async () => {
      const chainMock = createChainableMock({
        data: mockDbRow,
        error: null,
      });
      mockSupabase.from.mockReturnValue(chainMock);

      await upsertLearningStatus({
        setlistItemId: "item-1",
        musicianId: "musician-1",
        learned: false,
      });

      // Verify upsert was called (the chainable mock captures the call)
      expect(chainMock.upsert).toHaveBeenCalled();
      const upsertArg = chainMock.upsert.mock.calls[0][0];
      expect(upsertArg.learned).toBe(false);
    });

    it("should pass the correct onConflict option", async () => {
      const chainMock = createChainableMock({
        data: mockDbRow,
        error: null,
      });
      mockSupabase.from.mockReturnValue(chainMock);

      await upsertLearningStatus({
        setlistItemId: "item-1",
        musicianId: "musician-1",
      });

      expect(chainMock.upsert).toHaveBeenCalledWith(
        expect.any(Object),
        { onConflict: "setlist_item_id,musician_id" }
      );
    });
  });

  // ============================================================================
  // toggleSongLearned
  // ============================================================================

  describe("toggleSongLearned", () => {
    it("should mark a song as learned", async () => {
      const learnedRow = { ...mockDbRow, learned: true };
      const chainMock = createChainableMock({
        data: learnedRow,
        error: null,
      });
      mockSupabase.from.mockReturnValue(chainMock);

      const result = await toggleSongLearned("item-1", "musician-1", true);

      expect(result.learned).toBe(true);
      const upsertArg = chainMock.upsert.mock.calls[0][0];
      expect(upsertArg.learned).toBe(true);
    });

    it("should mark a song as unlearned", async () => {
      const chainMock = createChainableMock({
        data: mockDbRow,
        error: null,
      });
      mockSupabase.from.mockReturnValue(chainMock);

      const result = await toggleSongLearned("item-1", "musician-1", false);

      expect(result.learned).toBe(false);
      const upsertArg = chainMock.upsert.mock.calls[0][0];
      expect(upsertArg.learned).toBe(false);
    });

    it("should throw on error", async () => {
      mockSupabase.from.mockReturnValue(
        createChainableMock({
          data: null,
          error: { message: "RLS policy violation" },
        })
      );

      await expect(
        toggleSongLearned("item-1", "musician-1", true)
      ).rejects.toEqual({ message: "RLS policy violation" });
    });
  });

  // ============================================================================
  // recordPracticeSession
  // ============================================================================

  describe("recordPracticeSession", () => {
    it("should increment practice count from existing status", async () => {
      const existingRow = { ...mockDbRow, practice_count: 3 };
      const updatedRow = {
        ...mockDbRow,
        practice_count: 4,
        last_practiced_at: "2026-02-16T12:00:00Z",
      };

      // First call: getLearningStatus (maybeSingle)
      // Second call: upsertLearningStatus (upsert -> select -> single)
      let callCount = 0;
      mockSupabase.from.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return createChainableMock({ data: existingRow, error: null });
        }
        return createChainableMock({ data: updatedRow, error: null });
      });

      const result = await recordPracticeSession("item-1", "musician-1");

      expect(result.practiceCount).toBe(4);
    });

    it("should start from zero when no existing status", async () => {
      const newRow = {
        ...mockDbRow,
        practice_count: 1,
        last_practiced_at: "2026-02-16T12:00:00Z",
      };

      let callCount = 0;
      mockSupabase.from.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          // getLearningStatus returns null (no existing row)
          return createChainableMock({ data: null, error: null });
        }
        return createChainableMock({ data: newRow, error: null });
      });

      const result = await recordPracticeSession("item-1", "musician-1");

      expect(result.practiceCount).toBe(1);
    });

    it("should set lastPracticedAt to current timestamp", async () => {
      const now = new Date("2026-02-16T14:00:00Z");
      vi.setSystemTime(now);

      const updatedRow = {
        ...mockDbRow,
        practice_count: 1,
        last_practiced_at: now.toISOString(),
      };

      let callCount = 0;
      mockSupabase.from.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return createChainableMock({ data: null, error: null });
        }
        return createChainableMock({ data: updatedRow, error: null });
      });

      const result = await recordPracticeSession("item-1", "musician-1");

      expect(result.lastPracticedAt).toBe(now.toISOString());

      vi.useRealTimers();
    });

    it("should throw if getLearningStatus fails", async () => {
      mockSupabase.from.mockReturnValue(
        createChainableMock({
          data: null,
          error: { message: "DB error on read" },
        })
      );

      await expect(
        recordPracticeSession("item-1", "musician-1")
      ).rejects.toEqual({ message: "DB error on read" });
    });

    it("should throw if upsert fails", async () => {
      let callCount = 0;
      mockSupabase.from.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return createChainableMock({ data: null, error: null });
        }
        return createChainableMock({
          data: null,
          error: { message: "DB error on write" },
        });
      });

      await expect(
        recordPracticeSession("item-1", "musician-1")
      ).rejects.toEqual({ message: "DB error on write" });
    });
  });

  // ============================================================================
  // getMusicianLearningStatuses
  // ============================================================================

  describe("getMusicianLearningStatuses", () => {
    it("should return transformed array of learning statuses", async () => {
      const rows = [
        { ...mockDbRow, id: "status-1" },
        {
          ...mockDbRow,
          id: "status-2",
          setlist_item_id: "item-2",
          learned: true,
          practice_count: 7,
          difficulty: "easy",
        },
      ];

      mockSupabase.from.mockReturnValue(
        createChainableMock({ data: rows, error: null })
      );

      const result = await getMusicianLearningStatuses("musician-1");

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe("status-1");
      expect(result[0].setlistItemId).toBe("item-1");
      expect(result[1].id).toBe("status-2");
      expect(result[1].learned).toBe(true);
      expect(result[1].practiceCount).toBe(7);
      expect(result[1].difficulty).toBe("easy");
    });

    it("should return empty array when no statuses exist", async () => {
      mockSupabase.from.mockReturnValue(
        createChainableMock({ data: [], error: null })
      );

      const result = await getMusicianLearningStatuses("musician-1");

      expect(result).toEqual([]);
    });

    it("should throw on database error", async () => {
      mockSupabase.from.mockReturnValue(
        createChainableMock({
          data: null,
          error: { message: "Permission denied" },
        })
      );

      await expect(
        getMusicianLearningStatuses("musician-1")
      ).rejects.toEqual({ message: "Permission denied" });
    });

    it("should query the correct table with musician_id filter", async () => {
      mockSupabase.from.mockReturnValue(
        createChainableMock({ data: [], error: null })
      );

      await getMusicianLearningStatuses("musician-42");

      expect(mockSupabase.from).toHaveBeenCalledWith(
        "setlist_learning_status"
      );
    });
  });

  // ============================================================================
  // getPracticeItems
  // ============================================================================

  describe("getPracticeItems", () => {
    // Helper to set up the 3-step mock chain for getPracticeItems
    function setupPracticeItemsMocks(options: {
      gigRoles?: { data: unknown; error: unknown };
      setlistItems?: { data: unknown; error: unknown };
      learningStatuses?: { data: unknown; error: unknown };
    }) {
      const {
        gigRoles = { data: [], error: null },
        setlistItems = { data: [], error: null },
        learningStatuses = { data: [], error: null },
      } = options;

      let callCount = 0;
      mockSupabase.from.mockImplementation(() => {
        callCount++;
        if (callCount === 1) return createChainableMock(gigRoles);
        if (callCount === 2) return createChainableMock(setlistItems);
        return createChainableMock(learningStatuses);
      });
    }

    // Create a future date string for tests (30 days from "today")
    const futureGigDate = (() => {
      const d = new Date();
      d.setDate(d.getDate() + 30);
      return d.toISOString().split("T")[0];
    })();

    const mockSetlistItem = {
      id: "setlist-item-1",
      title: "Blue Bossa",
      key: "Cm",
      tempo: "120",
      sort_order: 1,
      setlist_sections: {
        gig_id: "gig-1",
        gigs: {
          id: "gig-1",
          title: "Friday Jazz Night",
          date: futureGigDate,
          owner_id: "owner-1",
          owner: { name: "Jazz Club" },
        },
      },
    };

    it("should return empty array when musician has no gig roles", async () => {
      setupPracticeItemsMocks({
        gigRoles: { data: [], error: null },
      });

      const result = await getPracticeItems("musician-1");

      expect(result).toEqual([]);
    });

    it("should return empty array when gig roles query fails", async () => {
      setupPracticeItemsMocks({
        gigRoles: { data: null, error: { message: "Query failed" } },
      });

      const result = await getPracticeItems("musician-1");

      expect(result).toEqual([]);
    });

    it("should return empty array when gigRoles data is null", async () => {
      setupPracticeItemsMocks({
        gigRoles: { data: null, error: null },
      });

      const result = await getPracticeItems("musician-1");

      expect(result).toEqual([]);
    });

    it("should return empty array when no setlist items found", async () => {
      setupPracticeItemsMocks({
        gigRoles: { data: [{ gig_id: "gig-1" }], error: null },
        setlistItems: { data: [], error: null },
      });

      const result = await getPracticeItems("musician-1");

      expect(result).toEqual([]);
    });

    it("should return empty array when setlist query fails", async () => {
      setupPracticeItemsMocks({
        gigRoles: { data: [{ gig_id: "gig-1" }], error: null },
        setlistItems: {
          data: null,
          error: { message: "Setlist query failed" },
        },
      });

      const result = await getPracticeItems("musician-1");

      expect(result).toEqual([]);
    });

    it("should return practice items for unlearned songs", async () => {
      setupPracticeItemsMocks({
        gigRoles: { data: [{ gig_id: "gig-1" }], error: null },
        setlistItems: { data: [mockSetlistItem], error: null },
        learningStatuses: { data: [], error: null },
      });

      const result = await getPracticeItems("musician-1");

      expect(result).toHaveLength(1);
      expect(result[0].songTitle).toBe("Blue Bossa");
      expect(result[0].gigTitle).toBe("Friday Jazz Night");
      expect(result[0].key).toBe("Cm");
      expect(result[0].bpm).toBe(120);
      expect(result[0].learned).toBe(false);
      expect(result[0].priority).toBe("medium");
      expect(result[0].hostName).toBe("Jazz Club");
    });

    it("should exclude learned songs", async () => {
      const learnedStatus = {
        setlist_item_id: "setlist-item-1",
        musician_id: "musician-1",
        learned: true,
        last_practiced_at: "2026-02-10T00:00:00Z",
        practice_count: 5,
        difficulty: null,
        priority: "medium",
        notes: null,
      };

      setupPracticeItemsMocks({
        gigRoles: { data: [{ gig_id: "gig-1" }], error: null },
        setlistItems: { data: [mockSetlistItem], error: null },
        learningStatuses: { data: [learnedStatus], error: null },
      });

      const result = await getPracticeItems("musician-1");

      expect(result).toHaveLength(0);
    });

    it("should apply priority filter", async () => {
      const items = [
        { ...mockSetlistItem, id: "item-high" },
        { ...mockSetlistItem, id: "item-low" },
      ];

      const statuses = [
        {
          setlist_item_id: "item-high",
          musician_id: "musician-1",
          learned: false,
          last_practiced_at: null,
          practice_count: 0,
          difficulty: null,
          priority: "high",
          notes: null,
        },
        {
          setlist_item_id: "item-low",
          musician_id: "musician-1",
          learned: false,
          last_practiced_at: null,
          practice_count: 0,
          difficulty: null,
          priority: "low",
          notes: null,
        },
      ];

      setupPracticeItemsMocks({
        gigRoles: { data: [{ gig_id: "gig-1" }], error: null },
        setlistItems: { data: items, error: null },
        learningStatuses: { data: statuses, error: null },
      });

      const result = await getPracticeItems("musician-1", 10, "high");

      expect(result).toHaveLength(1);
      expect(result[0].setlistItemId).toBe("item-high");
      expect(result[0].priority).toBe("high");
    });

    it("should respect the limit parameter", async () => {
      const items = Array.from({ length: 5 }, (_, i) => ({
        ...mockSetlistItem,
        id: `item-${i}`,
        title: `Song ${i}`,
      }));

      setupPracticeItemsMocks({
        gigRoles: { data: [{ gig_id: "gig-1" }], error: null },
        setlistItems: { data: items, error: null },
        learningStatuses: { data: [], error: null },
      });

      const result = await getPracticeItems("musician-1", 3);

      expect(result).toHaveLength(3);
    });

    it("should sort by priority then by days until gig", async () => {
      const nearDate = (() => {
        const d = new Date();
        d.setDate(d.getDate() + 5);
        return d.toISOString().split("T")[0];
      })();

      const farDate = (() => {
        const d = new Date();
        d.setDate(d.getDate() + 50);
        return d.toISOString().split("T")[0];
      })();

      const items = [
        {
          ...mockSetlistItem,
          id: "item-med-far",
          title: "Far Medium",
          setlist_sections: {
            ...mockSetlistItem.setlist_sections,
            gigs: {
              ...mockSetlistItem.setlist_sections.gigs,
              date: farDate,
            },
          },
        },
        {
          ...mockSetlistItem,
          id: "item-high-near",
          title: "Near High",
          setlist_sections: {
            ...mockSetlistItem.setlist_sections,
            gigs: {
              ...mockSetlistItem.setlist_sections.gigs,
              date: nearDate,
            },
          },
        },
        {
          ...mockSetlistItem,
          id: "item-med-near",
          title: "Near Medium",
          setlist_sections: {
            ...mockSetlistItem.setlist_sections,
            gigs: {
              ...mockSetlistItem.setlist_sections.gigs,
              date: nearDate,
            },
          },
        },
      ];

      const statuses = [
        {
          setlist_item_id: "item-high-near",
          musician_id: "musician-1",
          learned: false,
          last_practiced_at: null,
          practice_count: 0,
          difficulty: null,
          priority: "high",
          notes: null,
        },
      ];

      setupPracticeItemsMocks({
        gigRoles: { data: [{ gig_id: "gig-1" }], error: null },
        setlistItems: { data: items, error: null },
        learningStatuses: { data: statuses, error: null },
      });

      const result = await getPracticeItems("musician-1");

      // High priority should come first
      expect(result[0].setlistItemId).toBe("item-high-near");
      // Then medium priority sorted by days until gig (nearer first)
      expect(result[1].setlistItemId).toBe("item-med-near");
      expect(result[2].setlistItemId).toBe("item-med-far");
    });

    it("should handle null tempo gracefully", async () => {
      const itemWithNoTempo = {
        ...mockSetlistItem,
        tempo: null,
      };

      setupPracticeItemsMocks({
        gigRoles: { data: [{ gig_id: "gig-1" }], error: null },
        setlistItems: { data: [itemWithNoTempo], error: null },
        learningStatuses: { data: [], error: null },
      });

      const result = await getPracticeItems("musician-1");

      expect(result[0].bpm).toBeNull();
    });

    it("should handle null key gracefully", async () => {
      const itemWithNoKey = {
        ...mockSetlistItem,
        key: null,
      };

      setupPracticeItemsMocks({
        gigRoles: { data: [{ gig_id: "gig-1" }], error: null },
        setlistItems: { data: [itemWithNoKey], error: null },
        learningStatuses: { data: [], error: null },
      });

      const result = await getPracticeItems("musician-1");

      expect(result[0].key).toBeNull();
    });

    it("should continue without learning statuses when that query fails", async () => {
      setupPracticeItemsMocks({
        gigRoles: { data: [{ gig_id: "gig-1" }], error: null },
        setlistItems: { data: [mockSetlistItem], error: null },
        learningStatuses: {
          data: null,
          error: { message: "Learning status query error" },
        },
      });

      const result = await getPracticeItems("musician-1");

      // Should still return items, treating all as unlearned
      expect(result).toHaveLength(1);
      expect(result[0].learned).toBe(false);
      expect(result[0].priority).toBe("medium");
    });

    it("should skip items where gig data is missing from the section", async () => {
      const itemWithNoGig = {
        ...mockSetlistItem,
        setlist_sections: {
          gig_id: "gig-1",
          gigs: null,
        },
      };

      setupPracticeItemsMocks({
        gigRoles: { data: [{ gig_id: "gig-1" }], error: null },
        setlistItems: { data: [itemWithNoGig], error: null },
        learningStatuses: { data: [], error: null },
      });

      const result = await getPracticeItems("musician-1");

      expect(result).toEqual([]);
    });

    it("should handle owner being an array (Supabase join edge case)", async () => {
      const itemWithArrayOwner = {
        ...mockSetlistItem,
        setlist_sections: {
          ...mockSetlistItem.setlist_sections,
          gigs: {
            ...mockSetlistItem.setlist_sections.gigs,
            owner: [{ name: "Array Owner" }],
          },
        },
      };

      setupPracticeItemsMocks({
        gigRoles: { data: [{ gig_id: "gig-1" }], error: null },
        setlistItems: { data: [itemWithArrayOwner], error: null },
        learningStatuses: { data: [], error: null },
      });

      const result = await getPracticeItems("musician-1");

      expect(result[0].hostName).toBe("Array Owner");
    });

    it("should handle null owner gracefully", async () => {
      const itemWithNullOwner = {
        ...mockSetlistItem,
        setlist_sections: {
          ...mockSetlistItem.setlist_sections,
          gigs: {
            ...mockSetlistItem.setlist_sections.gigs,
            owner: null,
          },
        },
      };

      setupPracticeItemsMocks({
        gigRoles: { data: [{ gig_id: "gig-1" }], error: null },
        setlistItems: { data: [itemWithNullOwner], error: null },
        learningStatuses: { data: [], error: null },
      });

      const result = await getPracticeItems("musician-1");

      expect(result[0].hostName).toBeNull();
    });

    it("should use default limit of 10", async () => {
      const items = Array.from({ length: 15 }, (_, i) => ({
        ...mockSetlistItem,
        id: `item-${i}`,
        title: `Song ${i}`,
      }));

      setupPracticeItemsMocks({
        gigRoles: { data: [{ gig_id: "gig-1" }], error: null },
        setlistItems: { data: items, error: null },
        learningStatuses: { data: [], error: null },
      });

      const result = await getPracticeItems("musician-1");

      expect(result).toHaveLength(10);
    });

    it("should return all items when priorityFilter is 'all'", async () => {
      const items = [
        { ...mockSetlistItem, id: "item-1" },
        { ...mockSetlistItem, id: "item-2" },
      ];

      const statuses = [
        {
          setlist_item_id: "item-1",
          musician_id: "musician-1",
          learned: false,
          last_practiced_at: null,
          practice_count: 0,
          difficulty: null,
          priority: "high",
          notes: null,
        },
        {
          setlist_item_id: "item-2",
          musician_id: "musician-1",
          learned: false,
          last_practiced_at: null,
          practice_count: 0,
          difficulty: null,
          priority: "low",
          notes: null,
        },
      ];

      setupPracticeItemsMocks({
        gigRoles: { data: [{ gig_id: "gig-1" }], error: null },
        setlistItems: { data: items, error: null },
        learningStatuses: { data: statuses, error: null },
      });

      const result = await getPracticeItems("musician-1", 10, "all");

      expect(result).toHaveLength(2);
    });
  });

  // ============================================================================
  // getLearningStats
  // ============================================================================

  describe("getLearningStats", () => {
    it("should return correct stats for mixed learned/unlearned", async () => {
      const rows = [
        { ...mockDbRow, id: "s1", learned: true },
        { ...mockDbRow, id: "s2", learned: true },
        { ...mockDbRow, id: "s3", learned: false },
        { ...mockDbRow, id: "s4", learned: false },
        { ...mockDbRow, id: "s5", learned: false },
      ];

      mockSupabase.from.mockReturnValue(
        createChainableMock({ data: rows, error: null })
      );

      const stats = await getLearningStats("musician-1");

      expect(stats.totalSongs).toBe(5);
      expect(stats.learned).toBe(2);
      expect(stats.unlearned).toBe(3);
      expect(stats.percentage).toBe(40);
    });

    it("should return zero percentage when no statuses exist", async () => {
      mockSupabase.from.mockReturnValue(
        createChainableMock({ data: [], error: null })
      );

      const stats = await getLearningStats("musician-1");

      expect(stats.totalSongs).toBe(0);
      expect(stats.learned).toBe(0);
      expect(stats.unlearned).toBe(0);
      expect(stats.percentage).toBe(0);
    });

    it("should return 100% when all songs are learned", async () => {
      const rows = [
        { ...mockDbRow, id: "s1", learned: true },
        { ...mockDbRow, id: "s2", learned: true },
      ];

      mockSupabase.from.mockReturnValue(
        createChainableMock({ data: rows, error: null })
      );

      const stats = await getLearningStats("musician-1");

      expect(stats.totalSongs).toBe(2);
      expect(stats.learned).toBe(2);
      expect(stats.unlearned).toBe(0);
      expect(stats.percentage).toBe(100);
    });

    it("should return 0% when no songs are learned", async () => {
      const rows = [
        { ...mockDbRow, id: "s1", learned: false },
        { ...mockDbRow, id: "s2", learned: false },
      ];

      mockSupabase.from.mockReturnValue(
        createChainableMock({ data: rows, error: null })
      );

      const stats = await getLearningStats("musician-1");

      expect(stats.percentage).toBe(0);
    });

    it("should round percentage to nearest integer", async () => {
      const rows = [
        { ...mockDbRow, id: "s1", learned: true },
        { ...mockDbRow, id: "s2", learned: false },
        { ...mockDbRow, id: "s3", learned: false },
      ];

      mockSupabase.from.mockReturnValue(
        createChainableMock({ data: rows, error: null })
      );

      const stats = await getLearningStats("musician-1");

      // 1/3 = 33.333... -> rounds to 33
      expect(stats.percentage).toBe(33);
    });

    it("should throw if underlying query fails", async () => {
      mockSupabase.from.mockReturnValue(
        createChainableMock({
          data: null,
          error: { message: "Database unreachable" },
        })
      );

      await expect(getLearningStats("musician-1")).rejects.toEqual({
        message: "Database unreachable",
      });
    });
  });
});
