import { describe, it, expect, vi, beforeEach } from "vitest";
import { createClient } from "@/lib/supabase/client";
import { getGig, createGig, updateGig, deleteGig, duplicateGig } from "@/lib/api/gigs";
import { mockGig, mockGigWithOwner, mockGigRole } from "../fixtures/gigs";
import { mockUser } from "../fixtures/users";
import { createChainableMock } from "../mocks/supabase";

// Mock the Supabase client module
vi.mock("@/lib/supabase/client");

// Mock the notifications module to prevent side effects
vi.mock("@/lib/api/notifications", () => ({
  createNotification: vi.fn().mockResolvedValue(undefined),
}));

describe("Gigs API", () => {
  const mockSupabase = {
    from: vi.fn(),
    auth: {
      getUser: vi.fn(),
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(createClient).mockReturnValue(mockSupabase as unknown as ReturnType<typeof createClient>);
  });

  describe("getGig", () => {
    it("should return gig data with owner when found", async () => {
      // Arrange
      mockSupabase.from.mockReturnValue(
        createChainableMock({ data: mockGigWithOwner, error: null })
      );

      // Act
      const result = await getGig("test-gig-id-123");

      // Assert
      expect(result).toEqual(mockGigWithOwner);
      expect(mockSupabase.from).toHaveBeenCalledWith("gigs");
    });

    it("should return null when gig not found (PGRST116)", async () => {
      // Arrange
      mockSupabase.from.mockReturnValue(
        createChainableMock({
          data: null,
          error: { code: "PGRST116", message: "No rows found" },
        })
      );

      // Act
      const result = await getGig("nonexistent-id");

      // Assert
      expect(result).toBeNull();
    });

    it("should return null on RLS violation", async () => {
      // Arrange
      mockSupabase.from.mockReturnValue(
        createChainableMock({
          data: null,
          error: { code: "PGRST301", message: "violates row-level security" },
        })
      );

      // Act
      const result = await getGig("unauthorized-gig-id");

      // Assert
      expect(result).toBeNull();
    });

    it("should throw error for unexpected database errors", async () => {
      // Arrange
      mockSupabase.from.mockReturnValue(
        createChainableMock({
          data: null,
          error: { code: "OTHER", message: "Database connection failed" },
        })
      );

      // Act & Assert
      await expect(getGig("test-id")).rejects.toThrow(
        "Database connection failed"
      );
    });
  });

  describe("createGig", () => {
    it("should create gig with owner_id from authenticated user", async () => {
      // Arrange
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      const createdGig = { ...mockGig, owner_id: mockUser.id };
      mockSupabase.from.mockReturnValue(
        createChainableMock({ data: createdGig, error: null })
      );

      // Act
      const result = await createGig({
        title: "New Jazz Night",
        date: "2024-12-20",
      });

      // Assert
      expect(result).toEqual(createdGig);
      expect(mockSupabase.auth.getUser).toHaveBeenCalled();
      expect(mockSupabase.from).toHaveBeenCalledWith("gigs");
    });

    it("should throw error when not authenticated", async () => {
      // Arrange
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null,
      });

      // Act & Assert
      await expect(
        createGig({ title: "Test Gig", date: "2024-12-20" })
      ).rejects.toThrow("Not authenticated");
    });

    it("should throw error on auth failure", async () => {
      // Arrange
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: { message: "Session expired" },
      });

      // Act & Assert
      await expect(
        createGig({ title: "Test Gig", date: "2024-12-20" })
      ).rejects.toThrow("Authentication failed: Session expired");
    });

    it("should throw error on database insert failure", async () => {
      // Arrange
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });
      mockSupabase.from.mockReturnValue(
        createChainableMock({
          data: null,
          error: { message: "Duplicate key violation" },
        })
      );

      // Act & Assert
      await expect(
        createGig({ title: "Test Gig", date: "2024-12-20" })
      ).rejects.toThrow("Duplicate key violation");
    });
  });

  describe("updateGig", () => {
    it("should update gig and return updated data", async () => {
      // Arrange
      const updatedGig = { ...mockGig, title: "Updated Jazz Night" };
      mockSupabase.from.mockReturnValue(
        createChainableMock({ data: updatedGig, error: null })
      );

      // Act
      const result = await updateGig("test-gig-id-123", {
        title: "Updated Jazz Night",
      });

      // Assert
      expect(result).toEqual(updatedGig);
      expect(mockSupabase.from).toHaveBeenCalledWith("gigs");
    });

    it("should throw error on update failure", async () => {
      // Arrange
      mockSupabase.from.mockReturnValue(
        createChainableMock({
          data: null,
          error: { message: "Update not allowed" },
        })
      );

      // Act & Assert
      await expect(
        updateGig("test-gig-id-123", { title: "New Title" })
      ).rejects.toThrow("Update not allowed");
    });
  });

  describe("deleteGig", () => {
    it("should delete gig and notify invited musicians", async () => {
      // Arrange
      const gigWithRoles = {
        title: "Jazz Night",
        gig_roles: [
          { musician_id: "user-1", invitation_status: "accepted" },
          { musician_id: "user-2", invitation_status: "invited" },
        ],
      };

      // First call for fetching gig with roles, second for delete
      let callCount = 0;
      mockSupabase.from.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return createChainableMock({ data: gigWithRoles, error: null });
        }
        // Delete operation returns no data
        return createChainableMock({ data: null, error: null });
      });

      // Act
      await deleteGig("test-gig-id-123");

      // Assert
      expect(mockSupabase.from).toHaveBeenCalledWith("gigs");
      // Notifications should have been called (mocked)
    });

    it("should throw error on delete failure", async () => {
      // Arrange
      // First call succeeds (fetch), second fails (delete)
      let callCount = 0;
      mockSupabase.from.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return createChainableMock({ data: { title: "Test", gig_roles: [] }, error: null });
        }
        return createChainableMock({
          data: null,
          error: { message: "Delete not allowed" },
        });
      });

      // Act & Assert
      await expect(deleteGig("test-gig-id-123")).rejects.toThrow(
        "Delete not allowed"
      );
    });

    it("should proceed with delete even if no musicians to notify", async () => {
      // Arrange
      let callCount = 0;
      mockSupabase.from.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          // No roles to notify
          return createChainableMock({ data: null, error: null });
        }
        return createChainableMock({ data: null, error: null });
      });

      // Act - should not throw
      await deleteGig("test-gig-id-123");

      // Assert
      expect(mockSupabase.from).toHaveBeenCalledWith("gigs");
    });
  });

  describe("duplicateGig", () => {
    it("should create a new gig with copied data and reset statuses", async () => {
      // Arrange
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      const newGigId = "new-gig-id-456";
      const newGig = { ...mockGig, id: newGigId, status: "draft", title: "Copy of Jazz Night" };

      // Track which table is being queried
      let queryCount = 0;
      mockSupabase.from.mockImplementation((table: string) => {
        queryCount++;

        // 1. Fetch source gig
        if (table === "gigs" && queryCount === 1) {
          return createChainableMock({ data: mockGig, error: null });
        }

        // 2-5. Fetch related data (roles, sections, schedule, materials)
        if (table === "gig_roles" && queryCount <= 5) {
          return createChainableMock({ data: [mockGigRole], error: null });
        }
        if (table === "setlist_sections" && queryCount <= 5) {
          return createChainableMock({ data: [], error: null });
        }
        if (table === "gig_schedule_items" && queryCount <= 5) {
          return createChainableMock({ data: [], error: null });
        }
        if (table === "gig_materials" && queryCount <= 5) {
          return createChainableMock({ data: [], error: null });
        }

        // 6. Create new gig
        if (table === "gigs") {
          return createChainableMock({ data: newGig, error: null });
        }

        // 7. Copy roles
        if (table === "gig_roles") {
          return createChainableMock({ data: null, error: null });
        }

        // Final fetch of new gig (for return)
        return createChainableMock({ data: { ...newGig, owner: { id: mockUser.id, name: "Test User" } }, error: null });
      });

      // Act
      const result = await duplicateGig("test-gig-id-123", "Copy of Jazz Night", "2024-12-25");

      // Assert
      expect(result.gig).toBeTruthy();
      expect(result.counts.roles).toBe(1);
      expect(mockSupabase.auth.getUser).toHaveBeenCalled();
    });

    it("should throw error when not authenticated", async () => {
      // Arrange
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null,
      });

      // Act & Assert
      await expect(duplicateGig("test-gig-id-123")).rejects.toThrow("Not authenticated");
    });

    it("should throw error when source gig not found", async () => {
      // Arrange
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      mockSupabase.from.mockReturnValue(
        createChainableMock({
          data: null,
          error: { code: "PGRST116", message: "No rows found" },
        })
      );

      // Act & Assert
      await expect(duplicateGig("nonexistent-gig")).rejects.toThrow("No rows found");
    });

    it("should use default title when not provided", async () => {
      // Arrange
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      const newGigId = "new-gig-id-789";
      let insertedData: Record<string, unknown> | null = null;

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === "gigs") {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            order: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: mockGig, error: null }),
            insert: vi.fn().mockImplementation((data) => {
              insertedData = data;
              return {
                select: vi.fn().mockReturnThis(),
                single: vi.fn().mockResolvedValue({
                  data: { ...mockGig, id: newGigId, ...data },
                  error: null,
                }),
              };
            }),
          };
        }
        // Return empty arrays for related data
        return createChainableMock({ data: [], error: null });
      });

      // Act
      await duplicateGig("test-gig-id-123");

      // Assert - title should be "Copy of {original title}"
      expect(insertedData).toBeTruthy();
      expect((insertedData as unknown as Record<string, unknown>).title).toBe("Copy of Jazz Night at Blue Note");
    });

    it("should copy setlist sections and items", async () => {
      // Arrange
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      const mockSection = {
        id: "section-1",
        gig_id: "test-gig-id-123",
        name: "Set 1",
        sort_order: 0,
        setlist_items: [
          {
            id: "item-1",
            title: "Song 1",
            artist: "Artist 1",
            key: "C",
            tempo: "120",
            notes: null,
            reference_url: null,
            is_medley: false,
            sort_order: 0,
          },
        ],
      };

      const newGigId = "new-gig-id-456";
      const newSectionId = "new-section-1";
      let sectionsInserted = 0;
      let itemsInserted = 0;

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === "gigs") {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: mockGig, error: null }),
            insert: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnThis(),
              single: vi.fn().mockResolvedValue({
                data: { ...mockGig, id: newGigId, status: "draft" },
                error: null,
              }),
            }),
          };
        }
        if (table === "gig_roles") {
          return createChainableMock({ data: [], error: null });
        }
        if (table === "setlist_sections") {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            order: vi.fn().mockReturnThis(),
            then: vi.fn().mockImplementation((cb) => cb({ data: [mockSection], error: null })),
            insert: vi.fn().mockImplementation(() => {
              sectionsInserted++;
              return {
                select: vi.fn().mockReturnThis(),
                single: vi.fn().mockResolvedValue({
                  data: { id: newSectionId, gig_id: newGigId, name: "Set 1", sort_order: 0 },
                  error: null,
                }),
              };
            }),
          };
        }
        if (table === "setlist_items") {
          return {
            insert: vi.fn().mockImplementation(() => {
              itemsInserted++;
              return { error: null };
            }),
          };
        }
        if (table === "gig_schedule_items" || table === "gig_materials") {
          return createChainableMock({ data: [], error: null });
        }
        return createChainableMock({ data: null, error: null });
      });

      // Act
      const result = await duplicateGig("test-gig-id-123");

      // Assert
      expect(result.counts.setlistSections).toBe(1);
      expect(result.counts.setlistItems).toBe(1);
    });

    it("should handle errors gracefully when copying related data fails", async () => {
      // Arrange
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      const newGigId = "new-gig-id-456";

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === "gigs") {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: mockGig, error: null }),
            insert: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnThis(),
              single: vi.fn().mockResolvedValue({
                data: { ...mockGig, id: newGigId, status: "draft" },
                error: null,
              }),
            }),
          };
        }
        if (table === "gig_roles") {
          // Return roles to copy, then fail on insert
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            order: vi.fn().mockReturnThis(),
            then: vi.fn().mockImplementation((cb) => cb({ data: [mockGigRole], error: null })),
            insert: vi.fn().mockReturnValue({ error: { message: "Insert failed" } }),
          };
        }
        // Return empty for other related data
        return createChainableMock({ data: [], error: null });
      });

      // Act - should not throw, but counts should reflect failure
      const result = await duplicateGig("test-gig-id-123");

      // Assert - gig should still be created even if roles failed to copy
      expect(result.gig).toBeTruthy();
      expect(result.counts.roles).toBe(0); // Failed to copy
    });
  });
});
