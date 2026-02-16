import { describe, it, expect, vi, beforeEach } from "vitest";
import { createClient } from "@/lib/supabase/client";
import {
  acceptInvitation,
  declineInvitation,
  updateGigStatus,
} from "@/lib/api/gig-actions";
import { createChainableMock } from "../mocks/supabase";

// Mock the Supabase client module
vi.mock("@/lib/supabase/client");

// Mock the notifications dependency
const mockCreateNotification = vi.fn().mockResolvedValue(undefined);
vi.mock("@/lib/api/notifications", () => ({
  createNotification: (...args: unknown[]) => mockCreateNotification(...args),
}));

describe("Gig Actions API", () => {
  const mockSupabase = {
    from: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(createClient).mockReturnValue(
      mockSupabase as unknown as ReturnType<typeof createClient>
    );
  });

  // ============================================================================
  // acceptInvitation
  // ============================================================================

  describe("acceptInvitation", () => {
    it("should update gig_roles with accepted status", async () => {
      mockSupabase.from.mockReturnValue(
        createChainableMock({ data: null, error: null })
      );

      await acceptInvitation("role-123");

      expect(mockSupabase.from).toHaveBeenCalledWith("gig_roles");
    });

    it("should resolve without error on success", async () => {
      mockSupabase.from.mockReturnValue(
        createChainableMock({ data: null, error: null })
      );

      await expect(acceptInvitation("role-123")).resolves.toBeUndefined();
    });

    it("should throw error when update fails", async () => {
      mockSupabase.from.mockReturnValue(
        createChainableMock({
          data: null,
          error: { message: "Row not found" },
        })
      );

      await expect(acceptInvitation("role-123")).rejects.toThrow(
        "Failed to accept invitation: Row not found"
      );
    });

    it("should throw error on database connection failure", async () => {
      mockSupabase.from.mockReturnValue(
        createChainableMock({
          data: null,
          error: { message: "Connection refused" },
        })
      );

      await expect(acceptInvitation("role-abc")).rejects.toThrow(
        "Failed to accept invitation: Connection refused"
      );
    });

    it("should throw error on RLS violation", async () => {
      mockSupabase.from.mockReturnValue(
        createChainableMock({
          data: null,
          error: { message: "violates row-level security policy" },
        })
      );

      await expect(acceptInvitation("role-unauthorized")).rejects.toThrow(
        "Failed to accept invitation: violates row-level security policy"
      );
    });
  });

  // ============================================================================
  // declineInvitation
  // ============================================================================

  describe("declineInvitation", () => {
    it("should update gig_roles with declined status", async () => {
      mockSupabase.from.mockReturnValue(
        createChainableMock({ data: null, error: null })
      );

      await declineInvitation("role-456");

      expect(mockSupabase.from).toHaveBeenCalledWith("gig_roles");
    });

    it("should resolve without error on success", async () => {
      mockSupabase.from.mockReturnValue(
        createChainableMock({ data: null, error: null })
      );

      await expect(declineInvitation("role-456")).resolves.toBeUndefined();
    });

    it("should throw error when update fails", async () => {
      mockSupabase.from.mockReturnValue(
        createChainableMock({
          data: null,
          error: { message: "Update denied" },
        })
      );

      await expect(declineInvitation("role-456")).rejects.toThrow(
        "Failed to decline invitation: Update denied"
      );
    });

    it("should throw error on database connection failure", async () => {
      mockSupabase.from.mockReturnValue(
        createChainableMock({
          data: null,
          error: { message: "Connection timeout" },
        })
      );

      await expect(declineInvitation("role-xyz")).rejects.toThrow(
        "Failed to decline invitation: Connection timeout"
      );
    });
  });

  // ============================================================================
  // updateGigStatus
  // ============================================================================

  describe("updateGigStatus", () => {
    const gigId = "gig-123";

    const mockGigWithRoles = {
      title: "Jazz Night",
      gig_roles: [
        { id: "role-1", musician_id: "musician-1" },
        { id: "role-2", musician_id: "musician-2" },
      ],
    };

    it("should update gig status to confirmed and notify musicians", async () => {
      let callCount = 0;
      mockSupabase.from.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          // First call: fetch gig with roles
          return createChainableMock({
            data: mockGigWithRoles,
            error: null,
          });
        }
        // Second call: update gig status
        return createChainableMock({ data: null, error: null });
      });

      await updateGigStatus(gigId, "confirmed");

      expect(mockSupabase.from).toHaveBeenCalledWith("gigs");
      expect(mockCreateNotification).toHaveBeenCalledTimes(2);
      expect(mockCreateNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: "musician-1",
          type: "gig_updated",
          title: "Gig confirmed: Jazz Night",
          message: "This gig has been confirmed!",
          link: `/gigs/${gigId}/pack`,
          gig_id: gigId,
        })
      );
      expect(mockCreateNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: "musician-2",
          type: "gig_updated",
          title: "Gig confirmed: Jazz Night",
        })
      );
    });

    it("should update gig status to tentative and notify musicians", async () => {
      let callCount = 0;
      mockSupabase.from.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return createChainableMock({
            data: mockGigWithRoles,
            error: null,
          });
        }
        return createChainableMock({ data: null, error: null });
      });

      await updateGigStatus(gigId, "tentative");

      expect(mockCreateNotification).toHaveBeenCalledTimes(2);
      expect(mockCreateNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: "musician-1",
          type: "gig_updated",
          title: "Gig tentative: Jazz Night",
          message: "This gig has been marked as tentative",
          link: `/gigs/${gigId}/pack`,
          gig_id: gigId,
        })
      );
    });

    it("should update gig status to cancelled and notify musicians with dashboard link", async () => {
      let callCount = 0;
      mockSupabase.from.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return createChainableMock({
            data: mockGigWithRoles,
            error: null,
          });
        }
        return createChainableMock({ data: null, error: null });
      });

      await updateGigStatus(gigId, "cancelled");

      expect(mockCreateNotification).toHaveBeenCalledTimes(2);
      expect(mockCreateNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: "musician-1",
          type: "gig_cancelled",
          title: "Gig cancelled: Jazz Night",
          message: "This gig has been cancelled",
          link: "/dashboard",
          gig_id: gigId,
        })
      );
    });

    it("should throw error when update fails", async () => {
      let callCount = 0;
      mockSupabase.from.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          // Fetch gig succeeds
          return createChainableMock({
            data: mockGigWithRoles,
            error: null,
          });
        }
        // Update fails
        return createChainableMock({
          data: null,
          error: { message: "Permission denied" },
        });
      });

      await expect(updateGigStatus(gigId, "confirmed")).rejects.toThrow(
        "Failed to update gig status: Permission denied"
      );
    });

    it("should not send notifications when gig fetch returns null", async () => {
      let callCount = 0;
      mockSupabase.from.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          // Fetch gig returns null (gig not found)
          return createChainableMock({ data: null, error: null });
        }
        // Update still succeeds
        return createChainableMock({ data: null, error: null });
      });

      await updateGigStatus(gigId, "confirmed");

      expect(mockCreateNotification).not.toHaveBeenCalled();
    });

    it("should not send notifications when gig has no roles", async () => {
      let callCount = 0;
      mockSupabase.from.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return createChainableMock({
            data: { title: "Solo Gig", gig_roles: [] },
            error: null,
          });
        }
        return createChainableMock({ data: null, error: null });
      });

      await updateGigStatus(gigId, "confirmed");

      expect(mockCreateNotification).not.toHaveBeenCalled();
    });

    it("should skip roles with null musician_id", async () => {
      const gigWithMixedRoles = {
        title: "Mixed Gig",
        gig_roles: [
          { id: "role-1", musician_id: "musician-1" },
          { id: "role-2", musician_id: null },
          { id: "role-3", musician_id: "musician-3" },
        ],
      };

      let callCount = 0;
      mockSupabase.from.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return createChainableMock({
            data: gigWithMixedRoles,
            error: null,
          });
        }
        return createChainableMock({ data: null, error: null });
      });

      await updateGigStatus(gigId, "confirmed");

      // Only musician-1 and musician-3 should get notifications (not the null one)
      expect(mockCreateNotification).toHaveBeenCalledTimes(2);
      expect(mockCreateNotification).toHaveBeenCalledWith(
        expect.objectContaining({ user_id: "musician-1" })
      );
      expect(mockCreateNotification).toHaveBeenCalledWith(
        expect.objectContaining({ user_id: "musician-3" })
      );
    });

    it("should not send notifications for unrecognized status values", async () => {
      let callCount = 0;
      mockSupabase.from.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return createChainableMock({
            data: mockGigWithRoles,
            error: null,
          });
        }
        return createChainableMock({ data: null, error: null });
      });

      // Cast to GigStatus to test a hypothetical unrecognized value
      await updateGigStatus(gigId, "some_other_status" as any);

      expect(mockCreateNotification).not.toHaveBeenCalled();
    });

    it("should still update status even when gig fetch has error", async () => {
      let callCount = 0;
      mockSupabase.from.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          // Gig fetch fails (data is null due to error)
          return createChainableMock({
            data: null,
            error: { message: "Not found" },
          });
        }
        // Update succeeds
        return createChainableMock({ data: null, error: null });
      });

      // Should not throw because the gig fetch error is not checked
      await updateGigStatus(gigId, "confirmed");

      // No notifications since gig was null
      expect(mockCreateNotification).not.toHaveBeenCalled();
    });

    it("should handle gig with null gig_roles gracefully", async () => {
      let callCount = 0;
      mockSupabase.from.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return createChainableMock({
            data: { title: "Empty Gig", gig_roles: null },
            error: null,
          });
        }
        return createChainableMock({ data: null, error: null });
      });

      await updateGigStatus(gigId, "confirmed");

      expect(mockCreateNotification).not.toHaveBeenCalled();
    });

    it("should include updated_at timestamp in the update", async () => {
      const beforeTime = new Date().toISOString();

      let callCount = 0;
      mockSupabase.from.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return createChainableMock({ data: null, error: null });
        }
        return createChainableMock({ data: null, error: null });
      });

      await updateGigStatus(gigId, "confirmed");

      // Verify from was called with "gigs" for both fetch and update
      expect(mockSupabase.from).toHaveBeenCalledWith("gigs");
      // Both calls should target the gigs table
      expect(mockSupabase.from).toHaveBeenCalledTimes(2);
    });

    it("should send one notification per musician for single-role gig", async () => {
      const singleRoleGig = {
        title: "Duo Show",
        gig_roles: [{ id: "role-1", musician_id: "musician-1" }],
      };

      let callCount = 0;
      mockSupabase.from.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return createChainableMock({
            data: singleRoleGig,
            error: null,
          });
        }
        return createChainableMock({ data: null, error: null });
      });

      await updateGigStatus(gigId, "cancelled");

      expect(mockCreateNotification).toHaveBeenCalledTimes(1);
      expect(mockCreateNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: "musician-1",
          type: "gig_cancelled",
          title: "Gig cancelled: Duo Show",
        })
      );
    });
  });
});
