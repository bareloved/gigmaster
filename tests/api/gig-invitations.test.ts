import { describe, it, expect, vi, beforeEach } from "vitest";
import { createClient } from "@/lib/supabase/client";
import {
  inviteMusicianByEmail,
  inviteViaWhatsApp,
  acceptInvitation,
  declineInvitation,
  getGigInvitations,
} from "@/lib/api/gig-invitations";
import { mockUser } from "../fixtures/users";
import { mockGigRole, mockGig } from "../fixtures/gigs";
import { createChainableMock } from "../mocks/supabase";

// Mock the Supabase client module
vi.mock("@/lib/supabase/client");

// Mock dependent modules
vi.mock("@/lib/api/notifications", () => ({
  createNotification: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/utils/whatsapp", () => ({
  generateWhatsAppInviteLink: vi.fn().mockReturnValue("https://wa.me/1234567890?text=You're%20invited"),
}));

// Mock fetch for email sending
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock crypto.getRandomValues for token generation
const mockCrypto = {
  getRandomValues: vi.fn((array: Uint8Array) => {
    for (let i = 0; i < array.length; i++) {
      array[i] = Math.floor(Math.random() * 256);
    }
    return array;
  }),
};
vi.stubGlobal("crypto", mockCrypto);

describe("Gig Invitations API", () => {
  const mockSupabase = {
    from: vi.fn(),
    auth: {
      getUser: vi.fn(),
    },
  };

  const mockInvitation = {
    id: "invite-123",
    gig_id: "test-gig-id",
    gig_role_id: "test-role-id",
    email: "musician@example.com",
    token: "abc123token",
    status: "pending",
    expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days from now
    created_at: new Date().toISOString(),
    accepted_at: null,
  };

  const mockRoleWithGig = {
    id: "test-role-id",
    gig_id: "test-gig-id",
    role_name: "Keys",
    gigs: {
      id: "test-gig-id",
      title: "Jazz Night",
      date: "2024-12-15",
      start_time: "20:00",
      owner_id: "owner-123",
      owner: {
        id: "owner-123",
        name: "Host Name",
      },
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(createClient).mockReturnValue(
      mockSupabase as unknown as ReturnType<typeof createClient>
    );

    // Default fetch mock for email sending
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: true }),
    });
  });

  // ============================================================================
  // inviteMusicianByEmail
  // ============================================================================

  describe("inviteMusicianByEmail", () => {
    it("should create invitation and send email", async () => {
      let callCount = 0;
      mockSupabase.from.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          // Fetch role with gig details
          return createChainableMock({ data: mockRoleWithGig, error: null });
        }
        if (callCount === 2) {
          // Create invitation
          return createChainableMock({ data: mockInvitation, error: null });
        }
        if (callCount === 3) {
          // Check if user exists (profile lookup)
          return createChainableMock({ data: null, error: null });
        }
        return createChainableMock({ data: null, error: null });
      });

      const result = await inviteMusicianByEmail(
        "test-role-id",
        "musician@example.com"
      );

      expect(result).toEqual(mockInvitation);
      expect(mockFetch).toHaveBeenCalledWith(
        "/api/send-invitation",
        expect.objectContaining({
          method: "POST",
          headers: { "Content-Type": "application/json" },
        })
      );
    });

    it("should send in-app notification if user exists", async () => {
      const { createNotification } = await import("@/lib/api/notifications");

      let callCount = 0;
      mockSupabase.from.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return createChainableMock({ data: mockRoleWithGig, error: null });
        }
        if (callCount === 2) {
          return createChainableMock({ data: mockInvitation, error: null });
        }
        if (callCount === 3) {
          // User exists with this email
          return createChainableMock({ data: { id: "existing-user-id" }, error: null });
        }
        return createChainableMock({ data: null, error: null });
      });

      await inviteMusicianByEmail("test-role-id", "musician@example.com");

      expect(createNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: "existing-user-id",
          type: "invitation_received",
          title: "Invitation: Jazz Night",
        })
      );
    });

    it("should throw error when role not found", async () => {
      mockSupabase.from.mockReturnValue(
        createChainableMock({
          data: null,
          error: { message: "Role not found" },
        })
      );

      await expect(
        inviteMusicianByEmail("invalid-role-id", "test@example.com")
      ).rejects.toThrow("Failed to fetch role details");
    });

    it("should throw error when invitation creation fails", async () => {
      let callCount = 0;
      mockSupabase.from.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return createChainableMock({ data: mockRoleWithGig, error: null });
        }
        // Invitation creation fails
        return createChainableMock({
          data: null,
          error: { message: "Duplicate invitation" },
        });
      });

      await expect(
        inviteMusicianByEmail("test-role-id", "test@example.com")
      ).rejects.toThrow("Failed to create invitation");
    });

    it("should throw error when email sending fails", async () => {
      let callCount = 0;
      mockSupabase.from.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return createChainableMock({ data: mockRoleWithGig, error: null });
        }
        return createChainableMock({ data: mockInvitation, error: null });
      });

      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        statusText: "Internal Server Error",
        text: () => Promise.resolve("Email service unavailable"),
      });

      await expect(
        inviteMusicianByEmail("test-role-id", "test@example.com")
      ).rejects.toThrow("Failed to send invitation email");
    });
  });

  // ============================================================================
  // inviteViaWhatsApp
  // ============================================================================

  describe("inviteViaWhatsApp", () => {
    it("should create invitation and return WhatsApp link", async () => {
      const { generateWhatsAppInviteLink } = await import("@/lib/utils/whatsapp");

      let callCount = 0;
      mockSupabase.from.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return createChainableMock({ data: mockRoleWithGig, error: null });
        }
        if (callCount === 2) {
          return createChainableMock({ data: mockInvitation, error: null });
        }
        // Profile lookup returns null (no user with this phone)
        return createChainableMock({ data: null, error: null });
      });

      const result = await inviteViaWhatsApp("test-role-id", "+1234567890");

      expect(result.invitation).toEqual(mockInvitation);
      expect(result.whatsappLink).toBe("https://wa.me/1234567890?text=You're%20invited");
      expect(generateWhatsAppInviteLink).toHaveBeenCalledWith(
        "+1234567890",
        "Jazz Night",
        "Host Name",
        "Keys",
        expect.stringContaining("/invitations/accept?token=")
      );
    });

    it("should send notification if user exists with phone", async () => {
      const { createNotification } = await import("@/lib/api/notifications");

      let callCount = 0;
      mockSupabase.from.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return createChainableMock({ data: mockRoleWithGig, error: null });
        }
        if (callCount === 2) {
          return createChainableMock({ data: mockInvitation, error: null });
        }
        // User exists with this phone
        return createChainableMock({ data: { id: "phone-user-id" }, error: null });
      });

      await inviteViaWhatsApp("test-role-id", "+1234567890");

      expect(createNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: "phone-user-id",
          type: "invitation_received",
        })
      );
    });

    it("should throw error when role not found", async () => {
      mockSupabase.from.mockReturnValue(
        createChainableMock({
          data: null,
          error: { message: "Role not found" },
        })
      );

      await expect(
        inviteViaWhatsApp("invalid-role-id", "+1234567890")
      ).rejects.toThrow("Failed to fetch role details");
    });
  });

  // ============================================================================
  // acceptInvitation
  // ============================================================================

  describe("acceptInvitation", () => {
    const pendingInvitation = {
      ...mockInvitation,
      status: "pending",
      gig_roles: {
        id: "test-role-id",
        invitation_status: "invited",
        gig_id: "test-gig-id",
        contact_id: null,
      },
    };

    it("should accept invitation and link user to role", async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      let callCount = 0;
      mockSupabase.from.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          // Fetch invitation
          return createChainableMock({ data: pendingInvitation, error: null });
        }
        // All subsequent updates
        return createChainableMock({ data: null, error: null });
      });

      await expect(acceptInvitation("valid-token")).resolves.not.toThrow();

      // Should have updated invitation and role
      expect(mockSupabase.from).toHaveBeenCalledWith("gig_invitations");
      expect(mockSupabase.from).toHaveBeenCalledWith("gig_roles");
    });

    it("should link contact to user when contact_id exists", async () => {
      const invitationWithContact = {
        ...pendingInvitation,
        gig_roles: {
          ...pendingInvitation.gig_roles,
          contact_id: "contact-123",
        },
      };

      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      let callCount = 0;
      mockSupabase.from.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return createChainableMock({ data: invitationWithContact, error: null });
        }
        return createChainableMock({ data: null, error: null });
      });

      await acceptInvitation("valid-token");

      // Should have updated musician_contacts to link user
      expect(mockSupabase.from).toHaveBeenCalledWith("musician_contacts");
    });

    it("should throw error for invalid token", async () => {
      mockSupabase.from.mockReturnValue(
        createChainableMock({
          data: null,
          error: { message: "Not found" },
        })
      );

      await expect(acceptInvitation("invalid-token")).rejects.toThrow(
        "Invalid or expired invitation"
      );
    });

    it("should throw error for already processed invitation", async () => {
      const acceptedInvitation = {
        ...pendingInvitation,
        status: "accepted",
      };

      mockSupabase.from.mockReturnValue(
        createChainableMock({ data: acceptedInvitation, error: null })
      );

      await expect(acceptInvitation("used-token")).rejects.toThrow(
        "Invitation already processed"
      );
    });

    it("should throw error for expired invitation", async () => {
      const expiredInvitation = {
        ...pendingInvitation,
        expires_at: new Date(Date.now() - 1000).toISOString(), // Expired
      };

      mockSupabase.from.mockReturnValue(
        createChainableMock({ data: expiredInvitation, error: null })
      );

      await expect(acceptInvitation("expired-token")).rejects.toThrow(
        "Invitation expired"
      );
    });

    it("should throw error when not logged in", async () => {
      mockSupabase.from.mockReturnValue(
        createChainableMock({ data: pendingInvitation, error: null })
      );

      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null,
      });

      await expect(acceptInvitation("valid-token")).rejects.toThrow(
        "Must be logged in to accept invitation"
      );
    });

    it("should throw error when invitation update fails", async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      let callCount = 0;
      mockSupabase.from.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return createChainableMock({ data: pendingInvitation, error: null });
        }
        // Invitation update fails
        return createChainableMock({
          data: null,
          error: { message: "Update failed" },
        });
      });

      await expect(acceptInvitation("valid-token")).rejects.toThrow(
        "Failed to update invitation"
      );
    });
  });

  // ============================================================================
  // declineInvitation
  // ============================================================================

  describe("declineInvitation", () => {
    const pendingInvitation = {
      ...mockInvitation,
      status: "pending",
    };

    it("should decline invitation and update role to needs_sub", async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      let callCount = 0;
      mockSupabase.from.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return createChainableMock({ data: pendingInvitation, error: null });
        }
        return createChainableMock({ data: null, error: null });
      });

      await expect(
        declineInvitation("valid-token", "Schedule conflict")
      ).resolves.not.toThrow();

      expect(mockSupabase.from).toHaveBeenCalledWith("gig_invitations");
      expect(mockSupabase.from).toHaveBeenCalledWith("gig_roles");
      expect(mockSupabase.from).toHaveBeenCalledWith("gig_role_status_history");
    });

    it("should throw error for invalid token", async () => {
      mockSupabase.from.mockReturnValue(
        createChainableMock({
          data: null,
          error: { message: "Not found" },
        })
      );

      await expect(declineInvitation("invalid-token")).rejects.toThrow(
        "Invalid invitation"
      );
    });

    it("should throw error when not logged in", async () => {
      mockSupabase.from.mockReturnValue(
        createChainableMock({ data: pendingInvitation, error: null })
      );

      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null,
      });

      await expect(declineInvitation("valid-token")).rejects.toThrow(
        "Must be logged in to decline invitation"
      );
    });

    it("should throw error when invitation update fails", async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      let callCount = 0;
      mockSupabase.from.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return createChainableMock({ data: pendingInvitation, error: null });
        }
        // Update fails
        return createChainableMock({
          data: null,
          error: { message: "Update failed" },
        });
      });

      await expect(declineInvitation("valid-token")).rejects.toThrow(
        "Failed to update invitation"
      );
    });

    it("should throw error when role update fails", async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      let callCount = 0;
      mockSupabase.from.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return createChainableMock({ data: pendingInvitation, error: null });
        }
        if (callCount === 2) {
          // Invitation update succeeds
          return createChainableMock({ data: null, error: null });
        }
        // Role update fails
        return createChainableMock({
          data: null,
          error: { message: "Role update failed" },
        });
      });

      await expect(declineInvitation("valid-token")).rejects.toThrow(
        "Failed to update role"
      );
    });
  });

  // ============================================================================
  // getGigInvitations
  // ============================================================================

  describe("getGigInvitations", () => {
    it("should return invitations for a gig", async () => {
      const invitations = [
        {
          ...mockInvitation,
          gig_roles: { id: "role-1", role_name: "Keys", musician_name: "John" },
        },
        {
          ...mockInvitation,
          id: "invite-456",
          email: "another@example.com",
          gig_roles: { id: "role-2", role_name: "Bass", musician_name: "Jane" },
        },
      ];

      mockSupabase.from.mockReturnValue(
        createChainableMock({ data: invitations, error: null })
      );

      const result = await getGigInvitations("test-gig-id");

      expect(result).toHaveLength(2);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect((result[0] as any).gig_roles).toBeDefined();
      expect(mockSupabase.from).toHaveBeenCalledWith("gig_invitations");
    });

    it("should return empty array when no invitations", async () => {
      mockSupabase.from.mockReturnValue(
        createChainableMock({ data: [], error: null })
      );

      const result = await getGigInvitations("test-gig-id");

      expect(result).toEqual([]);
    });

    it("should throw error on fetch failure", async () => {
      mockSupabase.from.mockReturnValue(
        createChainableMock({
          data: null,
          error: { message: "Database error" },
        })
      );

      await expect(getGigInvitations("test-gig-id")).rejects.toThrow(
        "Failed to fetch invitations"
      );
    });
  });
});
