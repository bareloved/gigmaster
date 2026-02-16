import { describe, it, expect, vi, beforeEach } from "vitest";
import { createClient } from "@/lib/supabase/client";
import {
  listRolesForGig,
  addRoleToGig,
  updateRole,
  deleteRole,
  updateMyInvitationStatus,
  getMyPendingInvitations,
  getMyDeclinedInvitations,
  acceptMultipleInvitations,
  addSystemUserToGig,
  inviteAllMusicians,
  reinviteMusician,
  checkGigConflicts,
  getRecentMusicians,
  searchMusicianNames,
  updateMyPlayerNotes,
  checkIfRoleReplaced,
} from "@/lib/api/gig-roles";
import { mockGigRole, mockGig } from "../fixtures/gigs";
import { mockUser, mockUser2 } from "../fixtures/users";
import { createChainableMock } from "../mocks/supabase";

// Mock the Supabase client module
vi.mock("@/lib/supabase/client");

// Mock dependent modules
vi.mock("@/lib/api/notifications", () => ({
  createNotification: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/api/musician-contacts", () => ({
  getOrCreateContact: vi.fn().mockResolvedValue({ id: "contact-123" }),
  incrementContactUsage: vi.fn().mockResolvedValue(undefined),
  findContactByName: vi.fn().mockResolvedValue(null),
}));

describe("Gig Roles API", () => {
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

  // ============================================================================
  // listRolesForGig
  // ============================================================================

  describe("listRolesForGig", () => {
    it("should return roles sorted by created_at", async () => {
      const roles = [
        { ...mockGigRole, id: "role-1", created_at: "2024-01-01" },
        { ...mockGigRole, id: "role-2", created_at: "2024-01-02" },
      ];

      mockSupabase.from.mockReturnValue(
        createChainableMock({ data: roles, error: null })
      );

      const result = await listRolesForGig("test-gig-id");

      expect(result).toEqual(roles);
      expect(mockSupabase.from).toHaveBeenCalledWith("gig_roles");
    });

    it("should return empty array when gig not found", async () => {
      mockSupabase.from.mockReturnValue(
        createChainableMock({
          data: null,
          error: { code: "PGRST116", message: "No rows found" },
        })
      );

      const result = await listRolesForGig("nonexistent-gig");

      expect(result).toEqual([]);
    });

    it("should return empty array on RLS violation", async () => {
      mockSupabase.from.mockReturnValue(
        createChainableMock({
          data: null,
          error: { message: "violates row-level security" },
        })
      );

      const result = await listRolesForGig("unauthorized-gig");

      expect(result).toEqual([]);
    });

    it("should throw error for unexpected database errors", async () => {
      mockSupabase.from.mockReturnValue(
        createChainableMock({
          data: null,
          error: { code: "OTHER", message: "Connection failed" },
        })
      );

      await expect(listRolesForGig("test-gig-id")).rejects.toThrow(
        "Connection failed"
      );
    });
  });

  // ============================================================================
  // addRoleToGig
  // ============================================================================

  describe("addRoleToGig", () => {
    it("should add role when authenticated", async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      mockSupabase.from.mockReturnValue(
        createChainableMock({ data: mockGigRole, error: null })
      );

      const result = await addRoleToGig({
        gig_id: "test-gig-id",
        role_name: "Keys",
        musician_name: "John Doe",
      });

      expect(result).toEqual(mockGigRole);
      expect(mockSupabase.from).toHaveBeenCalledWith("gig_roles");
    });

    it("should throw error when not authenticated", async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null,
      });

      await expect(
        addRoleToGig({
          gig_id: "test-gig-id",
          role_name: "Keys",
        })
      ).rejects.toThrow("Not authenticated");
    });

    it("should throw error on insert failure", async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      mockSupabase.from.mockReturnValue(
        createChainableMock({
          data: null,
          error: { message: "Duplicate role" },
        })
      );

      await expect(
        addRoleToGig({
          gig_id: "test-gig-id",
          role_name: "Keys",
        })
      ).rejects.toThrow("Duplicate role");
    });
  });

  // ============================================================================
  // updateRole
  // ============================================================================

  describe("updateRole", () => {
    it("should update role and return updated data", async () => {
      // updateRole makes a single Supabase call: update + select + single
      mockSupabase.from.mockReturnValue(
        createChainableMock({
          data: { ...mockGigRole, agreed_fee: 750 },
          error: null,
        })
      );

      const result = await updateRole("test-role-id", { agreed_fee: 750 });

      expect(result.agreed_fee).toBe(750);
      expect(mockSupabase.from).toHaveBeenCalledWith("gig_roles");
    });

    it("should throw error on update failure", async () => {
      mockSupabase.from.mockReturnValue(
        createChainableMock({
          data: null,
          error: { message: "Update failed" },
        })
      );

      await expect(
        updateRole("test-role-id", { agreed_fee: 500 })
      ).rejects.toThrow("Update failed");
    });
  });

  // ============================================================================
  // deleteRole
  // ============================================================================

  describe("deleteRole", () => {
    it("should delete role successfully", async () => {
      mockSupabase.from.mockReturnValue(
        createChainableMock({ data: null, error: null })
      );

      await expect(deleteRole("test-role-id")).resolves.not.toThrow();
      expect(mockSupabase.from).toHaveBeenCalledWith("gig_roles");
    });

    it("should throw error on delete failure", async () => {
      mockSupabase.from.mockReturnValue(
        createChainableMock({
          data: null,
          error: { message: "Cannot delete" },
        })
      );

      await expect(deleteRole("test-role-id")).rejects.toThrow("Cannot delete");
    });
  });

  // ============================================================================
  // updateMyInvitationStatus
  // ============================================================================

  describe("updateMyInvitationStatus", () => {
    it("should update status when user owns the role", async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      let callCount = 0;
      mockSupabase.from.mockImplementation(() => {
        callCount++;
        // 1: fetch role, 2: update role, 3: record history, 4: get gig data, 5: get profile
        if (callCount === 1) {
          return createChainableMock({
            data: {
              musician_id: mockUser.id,
              invitation_status: "invited",
            },
            error: null,
          });
        }
        if (callCount === 4) {
          return createChainableMock({
            data: {
              gig_id: "gig-1",
              role_name: "Keys",
              gigs: { id: "gig-1", title: "Test Gig", owner_id: "owner-123" },
            },
            error: null,
          });
        }
        if (callCount === 5) {
          return createChainableMock({
            data: { name: "Test User" },
            error: null,
          });
        }
        return createChainableMock({ data: null, error: null });
      });

      await expect(
        updateMyInvitationStatus("test-role-id", "accepted")
      ).resolves.not.toThrow();
    });

    it("should throw error when not authenticated", async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null,
      });

      await expect(
        updateMyInvitationStatus("test-role-id", "accepted")
      ).rejects.toThrow("Not authenticated");
    });

    it("should throw error when user does not own the role", async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      mockSupabase.from.mockReturnValue(
        createChainableMock({
          data: {
            musician_id: "different-user-id",
            invitation_status: "invited",
          },
          error: null,
        })
      );

      await expect(
        updateMyInvitationStatus("test-role-id", "accepted")
      ).rejects.toThrow("Not authorized to update this role");
    });

    it("should throw error when role not found", async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      mockSupabase.from.mockReturnValue(
        createChainableMock({
          data: null,
          error: { message: "Not found" },
        })
      );

      await expect(
        updateMyInvitationStatus("test-role-id", "accepted")
      ).rejects.toThrow("Role not found");
    });
  });

  // ============================================================================
  // getMyPendingInvitations
  // ============================================================================

  describe("getMyPendingInvitations", () => {
    it("should return pending invitations sorted by date", async () => {
      const invitations = [
        {
          ...mockGigRole,
          id: "role-1",
          invitation_status: "invited",
          gigs: { date: "2024-12-20", title: "Gig 2" },
        },
        {
          ...mockGigRole,
          id: "role-2",
          invitation_status: "invited",
          gigs: { date: "2024-12-15", title: "Gig 1" },
        },
      ];

      mockSupabase.from.mockReturnValue(
        createChainableMock({ data: invitations, error: null })
      );

      const result = await getMyPendingInvitations(mockUser.id);

      expect(result).toHaveLength(2);
      // Should be sorted by date ascending
      expect((result[0] as any).gigs.date).toBe("2024-12-15");
      expect((result[1] as any).gigs.date).toBe("2024-12-20");
    });

    it("should return empty array when no pending invitations", async () => {
      mockSupabase.from.mockReturnValue(
        createChainableMock({ data: [], error: null })
      );

      const result = await getMyPendingInvitations(mockUser.id);

      expect(result).toEqual([]);
    });

    it("should throw error on fetch failure", async () => {
      mockSupabase.from.mockReturnValue(
        createChainableMock({
          data: null,
          error: { message: "Database error" },
        })
      );

      await expect(getMyPendingInvitations(mockUser.id)).rejects.toThrow(
        "Failed to fetch pending invitations"
      );
    });
  });

  // ============================================================================
  // acceptMultipleInvitations
  // ============================================================================

  describe("acceptMultipleInvitations", () => {
    it("should accept multiple invitations and record history", async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      mockSupabase.from.mockReturnValue(
        createChainableMock({ data: null, error: null })
      );

      await expect(
        acceptMultipleInvitations(["role-1", "role-2", "role-3"])
      ).resolves.not.toThrow();

      // Should have been called for update and history records
      expect(mockSupabase.from).toHaveBeenCalledWith("gig_roles");
      expect(mockSupabase.from).toHaveBeenCalledWith("gig_role_status_history");
    });

    it("should throw error when not authenticated", async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null,
      });

      await expect(
        acceptMultipleInvitations(["role-1", "role-2"])
      ).rejects.toThrow("Not authenticated");
    });

    it("should throw error on update failure", async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      mockSupabase.from.mockReturnValue(
        createChainableMock({
          data: null,
          error: { message: "Update failed" },
        })
      );

      await expect(
        acceptMultipleInvitations(["role-1", "role-2"])
      ).rejects.toThrow("Failed to accept invitations");
    });
  });

  // ============================================================================
  // addSystemUserToGig
  // ============================================================================

  describe("addSystemUserToGig", () => {
    it("should add user to gig and send notification", async () => {
      const { createNotification } = await import("@/lib/api/notifications");

      let callCount = 0;
      mockSupabase.from.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          // Insert role
          return createChainableMock({ data: mockGigRole, error: null });
        }
        // Fetch gig title
        return createChainableMock({
          data: { title: "Jazz Night" },
          error: null,
        });
      });

      const result = await addSystemUserToGig({
        gigId: "test-gig-id",
        userId: mockUser2.id,
        userName: "Jane Musician",
        roleName: "Bass",
        agreedFee: 600,
      });

      expect(result).toEqual(mockGigRole);
      expect(createNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: mockUser2.id,
          type: "invitation_received",
          title: "Invitation: Jazz Night",
        })
      );
    });

    it("should throw error on insert failure", async () => {
      mockSupabase.from.mockReturnValue(
        createChainableMock({
          data: null,
          error: { message: "Insert failed" },
        })
      );

      await expect(
        addSystemUserToGig({
          gigId: "test-gig-id",
          userId: mockUser2.id,
          userName: "Jane",
          roleName: "Bass",
        })
      ).rejects.toThrow("Insert failed");
    });
  });

  // ============================================================================
  // inviteAllMusicians
  // ============================================================================

  describe("inviteAllMusicians", () => {
    it("should invite all pending musicians and send notifications", async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      const pendingRoles = [
        {
          id: "role-1",
          invitation_status: "pending",
          musician_id: "user-1",
          musician_name: "John",
          role_name: "Keys",
        },
        {
          id: "role-2",
          invitation_status: "pending",
          musician_id: "user-2",
          musician_name: "Jane",
          role_name: "Bass",
        },
      ];

      let callCount = 0;
      mockSupabase.from.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          // Fetch pending roles
          return createChainableMock({ data: pendingRoles, error: null });
        }
        if (callCount === 2) {
          // Update roles
          return createChainableMock({ data: null, error: null });
        }
        // Fetch gig for notifications
        return createChainableMock({
          data: {
            id: "test-gig-id",
            title: "Jazz Night",
            date: "2024-12-15",
          },
          error: null,
        });
      });

      const result = await inviteAllMusicians("test-gig-id");

      expect(result.count).toBe(2);
    });

    it("should throw error when no musicians to invite", async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      mockSupabase.from.mockReturnValue(
        createChainableMock({ data: [], error: null })
      );

      await expect(inviteAllMusicians("test-gig-id")).rejects.toThrow(
        "No musicians to invite"
      );
    });

    it("should throw error when not authenticated", async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null,
      });

      await expect(inviteAllMusicians("test-gig-id")).rejects.toThrow(
        "Not authenticated"
      );
    });
  });

  // ============================================================================
  // reinviteMusician
  // ============================================================================

  describe("reinviteMusician", () => {
    it("should reinvite declined musician when called by owner", async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      let callCount = 0;
      mockSupabase.from.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          // Fetch role with gig owner
          return createChainableMock({
            data: {
              id: "role-1",
              invitation_status: "declined",
              musician_id: "musician-123",
              musician_name: "John",
              role_name: "Keys",
              gigs: {
                id: "gig-1",
                title: "Jazz Night",
                owner_id: mockUser.id,
              },
            },
            error: null,
          });
        }
        // Update and history
        return createChainableMock({ data: null, error: null });
      });

      await expect(reinviteMusician("role-1")).resolves.not.toThrow();
    });

    it("should throw error when not the gig owner", async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      mockSupabase.from.mockReturnValue(
        createChainableMock({
          data: {
            id: "role-1",
            invitation_status: "declined",
            musician_id: "musician-123",
            gigs: {
              id: "gig-1",
              title: "Jazz Night",
              owner_id: "different-owner",
            },
          },
          error: null,
        })
      );

      await expect(reinviteMusician("role-1")).rejects.toThrow(
        "Not authorized - only gig owner can re-invite musicians"
      );
    });

    it("should throw error when role is not declined", async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      mockSupabase.from.mockReturnValue(
        createChainableMock({
          data: {
            id: "role-1",
            invitation_status: "accepted",
            musician_id: "musician-123",
            gigs: {
              id: "gig-1",
              title: "Jazz Night",
              owner_id: mockUser.id,
            },
          },
          error: null,
        })
      );

      await expect(reinviteMusician("role-1")).rejects.toThrow(
        "Can only re-invite musicians who have declined"
      );
    });

    it("should throw error when not authenticated", async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null,
      });

      await expect(reinviteMusician("role-1")).rejects.toThrow(
        "Not authenticated"
      );
    });
  });

  // ============================================================================
  // checkGigConflicts
  // ============================================================================

  describe("checkGigConflicts", () => {
    it("should return conflicting gigs with overlapping times", async () => {
      const existingGigs = [
        {
          id: "role-1",
          gigs: {
            id: "gig-1",
            title: "Morning Gig",
            date: "2024-12-15",
            start_time: "10:00",
            end_time: "12:00",
            location_name: "Venue A",
          },
        },
        {
          id: "role-2",
          gigs: {
            id: "gig-2",
            title: "Evening Gig",
            date: "2024-12-15",
            start_time: "19:00",
            end_time: "22:00",
            location_name: "Venue B",
          },
        },
      ];

      mockSupabase.from.mockReturnValue(
        createChainableMock({ data: existingGigs, error: null })
      );

      // Check for conflict with 18:00-21:00 (overlaps with Evening Gig)
      const result = await checkGigConflicts(
        mockUser.id,
        "new-gig-id",
        "2024-12-15",
        "18:00",
        "21:00"
      );

      expect(result).toHaveLength(1);
      expect(result[0].title).toBe("Evening Gig");
    });

    it("should return empty array when no conflicts", async () => {
      const existingGigs = [
        {
          id: "role-1",
          gigs: {
            id: "gig-1",
            title: "Morning Gig",
            date: "2024-12-15",
            start_time: "10:00",
            end_time: "12:00",
            location_name: "Venue A",
          },
        },
      ];

      mockSupabase.from.mockReturnValue(
        createChainableMock({ data: existingGigs, error: null })
      );

      // Check for 19:00-22:00 (no overlap with 10:00-12:00)
      const result = await checkGigConflicts(
        mockUser.id,
        "new-gig-id",
        "2024-12-15",
        "19:00",
        "22:00"
      );

      expect(result).toEqual([]);
    });

    it("should return empty array on database error", async () => {
      mockSupabase.from.mockReturnValue(
        createChainableMock({
          data: null,
          error: { message: "Database error" },
        })
      );

      const result = await checkGigConflicts(
        mockUser.id,
        "new-gig-id",
        "2024-12-15",
        "19:00",
        "22:00"
      );

      expect(result).toEqual([]);
    });

    it("should skip gigs without start/end times", async () => {
      const existingGigs = [
        {
          id: "role-1",
          gigs: {
            id: "gig-1",
            title: "All Day Event",
            date: "2024-12-15",
            start_time: null,
            end_time: null,
            location_name: "TBD",
          },
        },
      ];

      mockSupabase.from.mockReturnValue(
        createChainableMock({ data: existingGigs, error: null })
      );

      const result = await checkGigConflicts(
        mockUser.id,
        "new-gig-id",
        "2024-12-15",
        "10:00",
        "12:00"
      );

      expect(result).toEqual([]);
    });
  });

  // ============================================================================
  // getRecentMusicians
  // ============================================================================

  describe("getRecentMusicians", () => {
    it("should return recent musicians grouped by name", async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      const roles = [
        {
          musician_name: "Alice",
          role_name: "Keys",
          musician_id: null,
          contact_id: "contact-1",
          gigs: { owner_id: mockUser.id, date: "2024-12-10" },
        },
        {
          musician_name: "Alice",
          role_name: "Keys",
          musician_id: "user-alice",
          contact_id: null,
          gigs: { owner_id: mockUser.id, date: "2024-12-15" },
        },
        {
          musician_name: "Bob",
          role_name: "Drums",
          musician_id: null,
          contact_id: null,
          gigs: { owner_id: mockUser.id, date: "2024-12-05" },
        },
      ];

      let callCount = 0;
      mockSupabase.from.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          // Fetch roles
          return createChainableMock({ data: roles, error: null });
        }
        // Fetch profiles for musicians with userId
        return createChainableMock({
          data: [{ id: "user-alice", email: "alice@test.com", phone: "+123" }],
          error: null,
        });
      });

      const result = await getRecentMusicians(10);

      expect(result).toHaveLength(2);
      // Alice should be first (most recent date: 2024-12-15)
      expect(result[0].name).toBe("Alice");
      expect(result[0].timesWorkedTogether).toBe(2);
      expect(result[0].userId).toBe("user-alice");
      expect(result[0].contactId).toBe("contact-1");
      expect(result[0].email).toBe("alice@test.com");
      expect(result[0].phone).toBe("+123");
      // Bob second
      expect(result[1].name).toBe("Bob");
      expect(result[1].timesWorkedTogether).toBe(1);
    });

    it("should throw error when not authenticated", async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null,
      });

      await expect(getRecentMusicians()).rejects.toThrow("Not authenticated");
    });

    it("should throw error on database failure", async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      mockSupabase.from.mockReturnValue(
        createChainableMock({
          data: null,
          error: { message: "Query failed" },
        })
      );

      await expect(getRecentMusicians()).rejects.toThrow("Query failed");
    });

    it("should return empty array when no roles exist", async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      mockSupabase.from.mockReturnValue(
        createChainableMock({ data: [], error: null })
      );

      const result = await getRecentMusicians();

      expect(result).toEqual([]);
    });

    it("should respect the limit parameter", async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      const roles = [
        {
          musician_name: "Alice",
          role_name: "Keys",
          musician_id: null,
          contact_id: null,
          gigs: { owner_id: mockUser.id, date: "2024-12-15" },
        },
        {
          musician_name: "Bob",
          role_name: "Drums",
          musician_id: null,
          contact_id: null,
          gigs: { owner_id: mockUser.id, date: "2024-12-10" },
        },
        {
          musician_name: "Charlie",
          role_name: "Bass",
          musician_id: null,
          contact_id: null,
          gigs: { owner_id: mockUser.id, date: "2024-12-05" },
        },
      ];

      mockSupabase.from.mockReturnValue(
        createChainableMock({ data: roles, error: null })
      );

      const result = await getRecentMusicians(2);

      expect(result).toHaveLength(2);
    });

    it("should skip roles with empty musician names", async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      const roles = [
        {
          musician_name: "  ",
          role_name: "Keys",
          musician_id: null,
          contact_id: null,
          gigs: { owner_id: mockUser.id, date: "2024-12-15" },
        },
        {
          musician_name: "Bob",
          role_name: "Drums",
          musician_id: null,
          contact_id: null,
          gigs: { owner_id: mockUser.id, date: "2024-12-10" },
        },
      ];

      mockSupabase.from.mockReturnValue(
        createChainableMock({ data: roles, error: null })
      );

      const result = await getRecentMusicians();

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe("Bob");
    });

    it("should sort by frequency when dates are equal", async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      const roles = [
        {
          musician_name: "Alice",
          role_name: "Keys",
          musician_id: null,
          contact_id: null,
          gigs: { owner_id: mockUser.id, date: "2024-12-15" },
        },
        {
          musician_name: "Bob",
          role_name: "Drums",
          musician_id: null,
          contact_id: null,
          gigs: { owner_id: mockUser.id, date: "2024-12-15" },
        },
        {
          musician_name: "Bob",
          role_name: "Percussion",
          musician_id: null,
          contact_id: null,
          gigs: { owner_id: mockUser.id, date: "2024-12-15" },
        },
      ];

      mockSupabase.from.mockReturnValue(
        createChainableMock({ data: roles, error: null })
      );

      const result = await getRecentMusicians();

      // Bob has 2 gigs, Alice has 1, same date => Bob first
      expect(result[0].name).toBe("Bob");
      expect(result[0].timesWorkedTogether).toBe(2);
      expect(result[1].name).toBe("Alice");
    });
  });

  // ============================================================================
  // searchMusicianNames
  // ============================================================================

  describe("searchMusicianNames", () => {
    it("should return musicians grouped by name with counts", async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      const roles = [
        {
          musician_name: "Alice",
          role_name: "Keys",
          gigs: { owner_id: mockUser.id },
        },
        {
          musician_name: "Alice",
          role_name: "Piano",
          gigs: { owner_id: mockUser.id },
        },
        {
          musician_name: "Bob",
          role_name: "Drums",
          gigs: { owner_id: mockUser.id },
        },
      ];

      mockSupabase.from.mockReturnValue(
        createChainableMock({ data: roles, error: null })
      );

      const result = await searchMusicianNames();

      expect(result).toHaveLength(2);
      // Alice has count=2, Bob has count=1 => Alice first
      expect(result[0].name).toBe("Alice");
      expect(result[0].count).toBe(2);
      expect(result[0].roles).toContain("Keys");
      expect(result[0].roles).toContain("Piano");
      expect(result[1].name).toBe("Bob");
      expect(result[1].count).toBe(1);
    });

    it("should filter by query string (case insensitive)", async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      const roles = [
        {
          musician_name: "Alice",
          role_name: "Keys",
          gigs: { owner_id: mockUser.id },
        },
        {
          musician_name: "Bob",
          role_name: "Drums",
          gigs: { owner_id: mockUser.id },
        },
      ];

      mockSupabase.from.mockReturnValue(
        createChainableMock({ data: roles, error: null })
      );

      const result = await searchMusicianNames("ali");

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe("Alice");
    });

    it("should throw error when not authenticated", async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null,
      });

      await expect(searchMusicianNames()).rejects.toThrow("Not authenticated");
    });

    it("should throw error on database failure", async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      mockSupabase.from.mockReturnValue(
        createChainableMock({
          data: null,
          error: { message: "DB error" },
        })
      );

      await expect(searchMusicianNames()).rejects.toThrow("DB error");
    });

    it("should skip roles with null or empty musician names", async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      const roles = [
        {
          musician_name: null,
          role_name: "Keys",
          gigs: { owner_id: mockUser.id },
        },
        {
          musician_name: "  ",
          role_name: "Drums",
          gigs: { owner_id: mockUser.id },
        },
        {
          musician_name: "Alice",
          role_name: "Bass",
          gigs: { owner_id: mockUser.id },
        },
      ];

      mockSupabase.from.mockReturnValue(
        createChainableMock({ data: roles, error: null })
      );

      const result = await searchMusicianNames();

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe("Alice");
    });

    it("should handle roles with no role_name", async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      const roles = [
        {
          musician_name: "Alice",
          role_name: null,
          gigs: { owner_id: mockUser.id },
        },
      ];

      mockSupabase.from.mockReturnValue(
        createChainableMock({ data: roles, error: null })
      );

      const result = await searchMusicianNames();

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe("Alice");
      expect(result[0].roles).toEqual([]);
    });

    it("should not duplicate roles for the same musician", async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      const roles = [
        {
          musician_name: "Alice",
          role_name: "Keys",
          gigs: { owner_id: mockUser.id },
        },
        {
          musician_name: "Alice",
          role_name: "Keys",
          gigs: { owner_id: mockUser.id },
        },
      ];

      mockSupabase.from.mockReturnValue(
        createChainableMock({ data: roles, error: null })
      );

      const result = await searchMusicianNames();

      expect(result).toHaveLength(1);
      expect(result[0].count).toBe(2);
      expect(result[0].roles).toEqual(["Keys"]); // No duplicate
    });
  });

  // ============================================================================
  // getMyDeclinedInvitations
  // ============================================================================

  describe("getMyDeclinedInvitations", () => {
    it("should return declined invitations sorted by date", async () => {
      const invitations = [
        {
          ...mockGigRole,
          id: "role-1",
          invitation_status: "declined",
          gigs: { id: "g1", date: "2024-12-20", title: "Gig 2" },
        },
        {
          ...mockGigRole,
          id: "role-2",
          invitation_status: "declined",
          gigs: { id: "g2", date: "2024-12-15", title: "Gig 1" },
        },
      ];

      mockSupabase.from.mockReturnValue(
        createChainableMock({ data: invitations, error: null })
      );

      const result = await getMyDeclinedInvitations(mockUser.id);

      expect(result).toHaveLength(2);
      // Should be sorted by date ascending
      expect((result[0] as any).gigs.date).toBe("2024-12-15");
      expect((result[1] as any).gigs.date).toBe("2024-12-20");
    });

    it("should return empty array when no declined invitations", async () => {
      mockSupabase.from.mockReturnValue(
        createChainableMock({ data: [], error: null })
      );

      const result = await getMyDeclinedInvitations(mockUser.id);

      expect(result).toEqual([]);
    });

    it("should throw error on fetch failure", async () => {
      mockSupabase.from.mockReturnValue(
        createChainableMock({
          data: null,
          error: { message: "Database error" },
        })
      );

      await expect(getMyDeclinedInvitations(mockUser.id)).rejects.toThrow(
        "Failed to fetch declined invitations"
      );
    });

    it("should handle invitations with null gig dates", async () => {
      const invitations = [
        {
          ...mockGigRole,
          id: "role-1",
          invitation_status: "declined",
          gigs: { id: "g1", date: null, title: "Gig No Date" },
        },
        {
          ...mockGigRole,
          id: "role-2",
          invitation_status: "declined",
          gigs: { id: "g2", date: "2024-12-15", title: "Gig With Date" },
        },
      ];

      mockSupabase.from.mockReturnValue(
        createChainableMock({ data: invitations, error: null })
      );

      const result = await getMyDeclinedInvitations(mockUser.id);

      expect(result).toHaveLength(2);
      // null date sorts as empty string, comes first
      expect((result[0] as any).gigs.date).toBeNull();
      expect((result[1] as any).gigs.date).toBe("2024-12-15");
    });
  });

  // ============================================================================
  // updateMyPlayerNotes
  // ============================================================================

  describe("updateMyPlayerNotes", () => {
    it("should update player notes when authenticated and authorized", async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      mockSupabase.from.mockReturnValue(
        createChainableMock({ data: null, error: null })
      );

      await expect(
        updateMyPlayerNotes("test-role-id", "My personal notes")
      ).resolves.not.toThrow();

      expect(mockSupabase.from).toHaveBeenCalledWith("gig_roles");
    });

    it("should throw error when not authenticated", async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null,
      });

      await expect(
        updateMyPlayerNotes("test-role-id", "Notes")
      ).rejects.toThrow("Not authenticated");
    });

    it("should throw error on update failure", async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      mockSupabase.from.mockReturnValue(
        createChainableMock({
          data: null,
          error: { message: "Update failed" },
        })
      );

      await expect(
        updateMyPlayerNotes("test-role-id", "Notes")
      ).rejects.toThrow("Failed to update notes");
    });
  });

  // ============================================================================
  // checkIfRoleReplaced
  // ============================================================================

  describe("checkIfRoleReplaced", () => {
    it("should return true when role status is replaced", async () => {
      mockSupabase.from.mockReturnValue(
        createChainableMock({
          data: { invitation_status: "replaced" },
          error: null,
        })
      );

      const result = await checkIfRoleReplaced("role-1");

      expect(result).toBe(true);
    });

    it("should return false when role status is not replaced", async () => {
      mockSupabase.from.mockReturnValue(
        createChainableMock({
          data: { invitation_status: "accepted" },
          error: null,
        })
      );

      const result = await checkIfRoleReplaced("role-1");

      expect(result).toBe(false);
    });

    it("should return false when role is not found", async () => {
      mockSupabase.from.mockReturnValue(
        createChainableMock({
          data: null,
          error: { message: "Not found" },
        })
      );

      const result = await checkIfRoleReplaced("nonexistent-role");

      expect(result).toBe(false);
    });
  });

  // ============================================================================
  // updateMyInvitationStatus - additional edge cases
  // ============================================================================

  describe("updateMyInvitationStatus - replaced status", () => {
    it("should throw error when role has been replaced", async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      mockSupabase.from.mockReturnValue(
        createChainableMock({
          data: {
            musician_id: mockUser.id,
            invitation_status: "replaced",
            role_name: "Keys",
            gigs: { id: "gig-1", title: "Test Gig", owner_id: "owner-123" },
          },
          error: null,
        })
      );

      await expect(
        updateMyInvitationStatus("test-role-id", "accepted")
      ).rejects.toThrow(
        "This spot has already been filled"
      );
    });
  });
});
