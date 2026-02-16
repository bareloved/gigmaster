import { describe, it, expect, vi, beforeEach } from "vitest";
import { createClient } from "@/lib/supabase/client";
import { getGig, createGig, updateGig, deleteGig, restoreGig, permanentDeleteGig, listTrashedGigs } from "@/lib/api/gigs";
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

  describe("restoreGig", () => {
    it("should restore a trashed gig by setting deleted_at to null", async () => {
      // Arrange
      mockSupabase.from.mockReturnValue(
        createChainableMock({ data: null, error: null })
      );

      // Act
      await restoreGig("test-gig-id-123");

      // Assert
      expect(mockSupabase.from).toHaveBeenCalledWith("gigs");
    });

    it("should throw error when restore fails", async () => {
      // Arrange
      mockSupabase.from.mockReturnValue(
        createChainableMock({
          data: null,
          error: { message: "Restore not allowed" },
        })
      );

      // Act & Assert
      await expect(restoreGig("test-gig-id-123")).rejects.toThrow(
        "Restore not allowed"
      );
    });

    it("should throw fallback message when error has no message", async () => {
      // Arrange
      mockSupabase.from.mockReturnValue(
        createChainableMock({
          data: null,
          error: { message: "" },
        })
      );

      // Act & Assert
      await expect(restoreGig("test-gig-id-123")).rejects.toThrow(
        "Failed to restore gig"
      );
    });
  });

  describe("permanentDeleteGig", () => {
    it("should permanently delete an already-trashed gig", async () => {
      // Arrange: first call fetches gig with deleted_at, second call does the delete
      let callCount = 0;
      mockSupabase.from.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return createChainableMock({
            data: { deleted_at: "2026-01-15T00:00:00Z" },
            error: null,
          });
        }
        return createChainableMock({ data: null, error: null });
      });

      // Act
      await permanentDeleteGig("test-gig-id-123");

      // Assert - called twice: once for fetch, once for delete
      expect(mockSupabase.from).toHaveBeenCalledTimes(2);
      expect(mockSupabase.from).toHaveBeenCalledWith("gigs");
    });

    it("should throw error when gig is not in trash (deleted_at is null)", async () => {
      // Arrange
      mockSupabase.from.mockReturnValue(
        createChainableMock({
          data: { deleted_at: null },
          error: null,
        })
      );

      // Act & Assert
      await expect(permanentDeleteGig("test-gig-id-123")).rejects.toThrow(
        "Only trashed gigs can be permanently deleted"
      );
    });

    it("should throw error when gig is not found", async () => {
      // Arrange
      mockSupabase.from.mockReturnValue(
        createChainableMock({ data: null, error: null })
      );

      // Act & Assert
      await expect(permanentDeleteGig("nonexistent-id")).rejects.toThrow(
        "Only trashed gigs can be permanently deleted"
      );
    });

    it("should throw error when permanent delete fails", async () => {
      // Arrange: first call returns trashed gig, second call fails
      let callCount = 0;
      mockSupabase.from.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return createChainableMock({
            data: { deleted_at: "2026-01-15T00:00:00Z" },
            error: null,
          });
        }
        return createChainableMock({
          data: null,
          error: { message: "Foreign key constraint violation" },
        });
      });

      // Act & Assert
      await expect(permanentDeleteGig("test-gig-id-123")).rejects.toThrow(
        "Foreign key constraint violation"
      );
    });

    it("should throw fallback message when delete error has no message", async () => {
      // Arrange
      let callCount = 0;
      mockSupabase.from.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return createChainableMock({
            data: { deleted_at: "2026-01-15T00:00:00Z" },
            error: null,
          });
        }
        return createChainableMock({
          data: null,
          error: { message: "" },
        });
      });

      // Act & Assert
      await expect(permanentDeleteGig("test-gig-id-123")).rejects.toThrow(
        "Failed to permanently delete gig"
      );
    });
  });

  describe("listTrashedGigs", () => {
    it("should return mapped trashed gigs with camelCase fields", async () => {
      // Arrange
      const trashedGigsFromDb = [
        {
          id: "gig-1",
          title: "Old Jazz Night",
          date: "2024-12-01",
          location_name: "Blue Note",
          band_name: "The Quartet",
          deleted_at: "2026-02-10T00:00:00Z",
        },
        {
          id: "gig-2",
          title: "Cancelled Wedding",
          date: "2024-11-15",
          location_name: null,
          band_name: null,
          deleted_at: "2026-02-01T00:00:00Z",
        },
      ];

      mockSupabase.from.mockReturnValue(
        createChainableMock({ data: trashedGigsFromDb, error: null })
      );

      // Act
      const result = await listTrashedGigs();

      // Assert
      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        id: "gig-1",
        title: "Old Jazz Night",
        date: "2024-12-01",
        locationName: "Blue Note",
        bandName: "The Quartet",
        deletedAt: "2026-02-10T00:00:00Z",
        daysRemaining: expect.any(Number),
      });
      expect(result[1]).toEqual({
        id: "gig-2",
        title: "Cancelled Wedding",
        date: "2024-11-15",
        locationName: null,
        bandName: null,
        deletedAt: "2026-02-01T00:00:00Z",
        daysRemaining: expect.any(Number),
      });
      expect(mockSupabase.from).toHaveBeenCalledWith("gigs");
    });

    it("should return empty array when no trashed gigs exist", async () => {
      // Arrange
      mockSupabase.from.mockReturnValue(
        createChainableMock({ data: [], error: null })
      );

      // Act
      const result = await listTrashedGigs();

      // Assert
      expect(result).toEqual([]);
    });

    it("should return empty array when data is null", async () => {
      // Arrange
      mockSupabase.from.mockReturnValue(
        createChainableMock({ data: null, error: null })
      );

      // Act
      const result = await listTrashedGigs();

      // Assert
      expect(result).toEqual([]);
    });

    it("should throw error when fetch fails", async () => {
      // Arrange
      mockSupabase.from.mockReturnValue(
        createChainableMock({
          data: null,
          error: { message: "Connection timeout" },
        })
      );

      // Act & Assert
      await expect(listTrashedGigs()).rejects.toThrow("Connection timeout");
    });

    it("should throw fallback message when error has no message", async () => {
      // Arrange
      mockSupabase.from.mockReturnValue(
        createChainableMock({
          data: null,
          error: { message: "" },
        })
      );

      // Act & Assert
      await expect(listTrashedGigs()).rejects.toThrow(
        "Failed to fetch trashed gigs"
      );
    });
  });

});
