import { describe, it, expect, vi, beforeEach } from "vitest";
import { createClient } from "@/lib/supabase/client";
import {
  listSetlistItemsForGig,
  addSetlistItem,
  updateSetlistItem,
  deleteSetlistItem,
} from "@/lib/api/setlist-items";
import { createChainableMock } from "../mocks/supabase";

// Mock the Supabase client module
vi.mock("@/lib/supabase/client");

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const mockSetlistItem = {
  id: "item-1",
  title: "All The Things You Are",
  artist: "Jerome Kern",
  key: "Ab",
  tempo: "Medium Swing",
  notes: "Intro rubato",
  reference_url: "https://example.com/song",
  is_medley: false,
  section_id: "section-1",
  sort_order: 1,
};

const mockSetlistItem2 = {
  id: "item-2",
  title: "Giant Steps",
  artist: "John Coltrane",
  key: "B",
  tempo: "Fast",
  notes: null,
  reference_url: null,
  is_medley: false,
  section_id: "section-1",
  sort_order: 2,
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("Setlist Items API", () => {
  const mockSupabase = {
    from: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(createClient).mockReturnValue(
      mockSupabase as unknown as ReturnType<typeof createClient>
    );
  });

  // ==========================================================================
  // listSetlistItemsForGig
  // ==========================================================================

  describe("listSetlistItemsForGig", () => {
    it("should return items sorted by sort_order", async () => {
      const items = [mockSetlistItem, mockSetlistItem2];

      mockSupabase.from.mockReturnValue(
        createChainableMock({ data: items, error: null })
      );

      const result = await listSetlistItemsForGig("test-gig-id");

      expect(result).toEqual(items);
      expect(result).toHaveLength(2);
      expect(mockSupabase.from).toHaveBeenCalledWith("setlist_items");
    });

    it("should return empty array when no items exist", async () => {
      mockSupabase.from.mockReturnValue(
        createChainableMock({ data: [], error: null })
      );

      const result = await listSetlistItemsForGig("gig-with-no-setlist");

      expect(result).toEqual([]);
    });

    it("should return empty array when data is null", async () => {
      mockSupabase.from.mockReturnValue(
        createChainableMock({ data: null, error: null })
      );

      const result = await listSetlistItemsForGig("gig-with-null-data");

      expect(result).toEqual([]);
    });

    it("should throw error on database failure", async () => {
      mockSupabase.from.mockReturnValue(
        createChainableMock({
          data: null,
          error: { message: "Connection refused" },
        })
      );

      await expect(listSetlistItemsForGig("test-gig-id")).rejects.toThrow(
        "Connection refused"
      );
    });

    it("should throw fallback message when error has no message", async () => {
      mockSupabase.from.mockReturnValue(
        createChainableMock({
          data: null,
          error: { message: "" },
        })
      );

      await expect(listSetlistItemsForGig("test-gig-id")).rejects.toThrow(
        "Failed to fetch setlist items"
      );
    });
  });

  // ==========================================================================
  // addSetlistItem
  // ==========================================================================

  describe("addSetlistItem", () => {
    it("should add item with provided sort_order", async () => {
      const insertData = {
        title: "Fly Me to the Moon",
        section_id: "section-1",
        sort_order: 5,
      };

      const returnedItem = { ...mockSetlistItem, ...insertData, id: "new-id" };

      mockSupabase.from.mockReturnValue(
        createChainableMock({ data: returnedItem, error: null })
      );

      const result = await addSetlistItem(insertData);

      expect(result).toEqual(returnedItem);
      expect(mockSupabase.from).toHaveBeenCalledWith("setlist_items");
    });

    it("should auto-assign sort_order when not provided", async () => {
      const insertData = {
        title: "Autumn Leaves",
        section_id: "section-1",
      };

      const existingItems = [{ sort_order: 3 }];
      const returnedItem = {
        ...mockSetlistItem,
        title: "Autumn Leaves",
        sort_order: 4,
        id: "new-id",
      };

      let callCount = 0;
      mockSupabase.from.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          // First call: fetch max sort_order
          return createChainableMock({ data: existingItems, error: null });
        }
        // Second call: insert the item
        return createChainableMock({ data: returnedItem, error: null });
      });

      const result = await addSetlistItem(insertData);

      expect(result).toEqual(returnedItem);
      // Called twice: once for sort_order lookup, once for insert
      expect(mockSupabase.from).toHaveBeenCalledTimes(2);
      expect(mockSupabase.from).toHaveBeenCalledWith("setlist_items");
    });

    it("should default sort_order to 1 when section is empty", async () => {
      const insertData = {
        title: "First Song",
        section_id: "empty-section",
      };

      const returnedItem = {
        ...mockSetlistItem,
        title: "First Song",
        sort_order: 1,
        id: "new-id",
      };

      let callCount = 0;
      mockSupabase.from.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          // No existing items in section
          return createChainableMock({ data: [], error: null });
        }
        return createChainableMock({ data: returnedItem, error: null });
      });

      const result = await addSetlistItem(insertData);

      expect(result).toEqual(returnedItem);
    });

    it("should default sort_order to 1 when lookup returns null data", async () => {
      const insertData = {
        title: "First Song",
        section_id: "new-section",
      };

      const returnedItem = {
        ...mockSetlistItem,
        title: "First Song",
        sort_order: 1,
        id: "new-id",
      };

      let callCount = 0;
      mockSupabase.from.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          // Null data from lookup
          return createChainableMock({ data: null, error: null });
        }
        return createChainableMock({ data: returnedItem, error: null });
      });

      const result = await addSetlistItem(insertData);

      expect(result).toEqual(returnedItem);
    });

    it("should auto-assign sort_order when sort_order is 0", async () => {
      const insertData = {
        title: "Song With Zero",
        section_id: "section-1",
        sort_order: 0,
      };

      const existingItems = [{ sort_order: 2 }];
      const returnedItem = {
        ...mockSetlistItem,
        title: "Song With Zero",
        sort_order: 3,
        id: "new-id",
      };

      let callCount = 0;
      mockSupabase.from.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return createChainableMock({ data: existingItems, error: null });
        }
        return createChainableMock({ data: returnedItem, error: null });
      });

      const result = await addSetlistItem(insertData);

      expect(result).toEqual(returnedItem);
      // Two calls: sort_order lookup + insert
      expect(mockSupabase.from).toHaveBeenCalledTimes(2);
    });

    it("should throw error on insert failure", async () => {
      const insertData = {
        title: "Bad Song",
        section_id: "section-1",
        sort_order: 1,
      };

      mockSupabase.from.mockReturnValue(
        createChainableMock({
          data: null,
          error: { message: "Foreign key violation" },
        })
      );

      await expect(addSetlistItem(insertData)).rejects.toThrow(
        "Foreign key violation"
      );
    });

    it("should throw fallback message when insert error has no message", async () => {
      const insertData = {
        title: "Bad Song",
        section_id: "section-1",
        sort_order: 1,
      };

      mockSupabase.from.mockReturnValue(
        createChainableMock({
          data: null,
          error: { message: "" },
        })
      );

      await expect(addSetlistItem(insertData)).rejects.toThrow(
        "Failed to add setlist item"
      );
    });

    it("should include all optional fields when provided", async () => {
      const insertData = {
        title: "Complex Song",
        artist: "Some Artist",
        key: "Dm",
        tempo: "120 BPM",
        notes: "Watch the bridge",
        reference_url: "https://example.com/ref",
        is_medley: true,
        section_id: "section-1",
        sort_order: 3,
      };

      const returnedItem = { ...insertData, id: "new-id" };

      mockSupabase.from.mockReturnValue(
        createChainableMock({ data: returnedItem, error: null })
      );

      const result = await addSetlistItem(insertData);

      expect(result).toEqual(returnedItem);
    });
  });

  // ==========================================================================
  // updateSetlistItem
  // ==========================================================================

  describe("updateSetlistItem", () => {
    it("should update item and return updated data", async () => {
      const updatedItem = { ...mockSetlistItem, title: "Updated Title" };

      mockSupabase.from.mockReturnValue(
        createChainableMock({ data: updatedItem, error: null })
      );

      const result = await updateSetlistItem("item-1", {
        title: "Updated Title",
      });

      expect(result.title).toBe("Updated Title");
      expect(mockSupabase.from).toHaveBeenCalledWith("setlist_items");
    });

    it("should update multiple fields at once", async () => {
      const updatedItem = {
        ...mockSetlistItem,
        key: "Bb",
        tempo: "Fast Swing",
        notes: "New arrangement",
      };

      mockSupabase.from.mockReturnValue(
        createChainableMock({ data: updatedItem, error: null })
      );

      const result = await updateSetlistItem("item-1", {
        key: "Bb",
        tempo: "Fast Swing",
        notes: "New arrangement",
      });

      expect(result.key).toBe("Bb");
      expect(result.tempo).toBe("Fast Swing");
      expect(result.notes).toBe("New arrangement");
    });

    it("should update sort_order for reordering", async () => {
      const updatedItem = { ...mockSetlistItem, sort_order: 10 };

      mockSupabase.from.mockReturnValue(
        createChainableMock({ data: updatedItem, error: null })
      );

      const result = await updateSetlistItem("item-1", { sort_order: 10 });

      expect(result.sort_order).toBe(10);
    });

    it("should throw error on update failure", async () => {
      mockSupabase.from.mockReturnValue(
        createChainableMock({
          data: null,
          error: { message: "Row not found" },
        })
      );

      await expect(
        updateSetlistItem("nonexistent-id", { title: "New Title" })
      ).rejects.toThrow("Row not found");
    });

    it("should throw fallback message when update error has no message", async () => {
      mockSupabase.from.mockReturnValue(
        createChainableMock({
          data: null,
          error: { message: "" },
        })
      );

      await expect(
        updateSetlistItem("item-1", { title: "New" })
      ).rejects.toThrow("Failed to update setlist item");
    });
  });

  // ==========================================================================
  // deleteSetlistItem
  // ==========================================================================

  describe("deleteSetlistItem", () => {
    it("should delete item successfully", async () => {
      mockSupabase.from.mockReturnValue(
        createChainableMock({ data: null, error: null })
      );

      await expect(deleteSetlistItem("item-1")).resolves.not.toThrow();
      expect(mockSupabase.from).toHaveBeenCalledWith("setlist_items");
    });

    it("should return void on success", async () => {
      mockSupabase.from.mockReturnValue(
        createChainableMock({ data: null, error: null })
      );

      const result = await deleteSetlistItem("item-1");

      expect(result).toBeUndefined();
    });

    it("should throw error on delete failure", async () => {
      mockSupabase.from.mockReturnValue(
        createChainableMock({
          data: null,
          error: { message: "Foreign key constraint" },
        })
      );

      await expect(deleteSetlistItem("item-1")).rejects.toThrow(
        "Foreign key constraint"
      );
    });

    it("should throw fallback message when delete error has no message", async () => {
      mockSupabase.from.mockReturnValue(
        createChainableMock({
          data: null,
          error: { message: "" },
        })
      );

      await expect(deleteSetlistItem("item-1")).rejects.toThrow(
        "Failed to delete setlist item"
      );
    });
  });
});
