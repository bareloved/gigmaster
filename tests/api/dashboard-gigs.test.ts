import { describe, it, expect, vi, beforeEach } from "vitest";
import { createClient } from "@/lib/supabase/client";
import {
  listDashboardGigs,
  listRecentPastGigs,
  listAllPastGigs,
} from "@/lib/api/dashboard-gigs";
import { createChainableMock } from "../mocks/supabase";

// Mock the Supabase client module
vi.mock("@/lib/supabase/client");

// ============================================================================
// Shared Fixtures
// ============================================================================

const TEST_USER_ID = "test-user-id-123";
const OTHER_USER_ID = "other-user-id-456";

/** A raw gig row as returned by the Supabase fallback queries */
function createFallbackGigRow(overrides: Record<string, unknown> = {}) {
  return {
    id: "gig-1",
    owner_id: TEST_USER_ID,
    title: "Jazz Night",
    date: "2026-03-01",
    start_time: "20:00",
    end_time: "23:00",
    call_time: "19:00",
    location_name: "Blue Note",
    status: "confirmed",
    hero_image_url: null,
    gig_type: "club",
    is_external: false,
    band_id: "band-1",
    owner: { id: TEST_USER_ID, name: "Test User" },
    project: { name: "The Quartet" },
    gig_roles: [
      {
        id: "role-1",
        role_name: "Keys",
        invitation_status: "accepted",
        payment_status: "pending",
        musician_id: TEST_USER_ID,
      },
    ],
    ...overrides,
  };
}

/** A row as returned by the list_dashboard_gigs RPC */
function createRpcRow(overrides: Record<string, unknown> = {}) {
  return {
    gig_id: "gig-1",
    gig_title: "Jazz Night",
    date: "2026-03-01",
    start_time: "20:00",
    end_time: "23:00",
    call_time: "19:00",
    location_name: "Blue Note",
    status: "confirmed",
    is_manager: true,
    is_player: true,
    player_role_name: "Keys",
    player_gig_role_id: "role-1",
    invitation_status: "accepted",
    host_name: "Test User",
    host_id: TEST_USER_ID,
    total_count: 1,
    gig_type: "club",
    hero_image_url: null,
    role_stats: { total: 2, invited: 1, accepted: 1, declined: 0, pending: 0 },
    band_id: "band-1",
    band_name: "The Quartet",
    ...overrides,
  };
}

// ============================================================================
// Test Suite
// ============================================================================

describe("Dashboard Gigs API", () => {
  const mockSupabase = {
    from: vi.fn(),
    rpc: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(createClient).mockReturnValue(
      mockSupabase as unknown as ReturnType<typeof createClient>
    );
  });

  // ==========================================================================
  // listDashboardGigs
  // ==========================================================================

  describe("listDashboardGigs", () => {
    // --- RPC path (happy) ---------------------------------------------------

    it("should return gigs from RPC when available", async () => {
      const rpcRow = createRpcRow();
      mockSupabase.rpc.mockResolvedValue({
        data: [rpcRow],
        error: null,
      });

      const result = await listDashboardGigs(TEST_USER_ID);

      expect(result.gigs).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.hasMore).toBe(false);
      expect(result.gigs[0]).toMatchObject({
        gigId: "gig-1",
        gigTitle: "Jazz Night",
        date: "2026-03-01",
        startTime: "20:00",
        endTime: "23:00",
        callTime: "19:00",
        locationName: "Blue Note",
        status: "confirmed",
        isManager: true,
        isPlayer: true,
        playerRoleName: "Keys",
        playerGigRoleId: "role-1",
        invitationStatus: "accepted",
        hostId: TEST_USER_ID,
        hostName: "Test User",
        bandId: "band-1",
        projectName: "The Quartet",
        heroImageUrl: null,
        gigType: "club",
      });
    });

    it("should map roleStats from RPC response", async () => {
      const stats = {
        total: 5,
        invited: 2,
        accepted: 2,
        declined: 1,
        pending: 0,
      };
      mockSupabase.rpc.mockResolvedValue({
        data: [createRpcRow({ role_stats: stats })],
        error: null,
      });

      const result = await listDashboardGigs(TEST_USER_ID);

      expect(result.gigs[0].roleStats).toEqual(stats);
    });

    it("should calculate hasMore correctly from RPC total_count", async () => {
      const rows = [
        createRpcRow({ gig_id: "gig-1", total_count: 25 }),
        createRpcRow({ gig_id: "gig-2", total_count: 25 }),
      ];
      mockSupabase.rpc.mockResolvedValue({ data: rows, error: null });

      // Default limit is 20, offset is 0 -- 0 + 20 < 25 => hasMore
      const result = await listDashboardGigs(TEST_USER_ID);

      expect(result.total).toBe(25);
      expect(result.hasMore).toBe(true);
    });

    it("should pass custom limit and offset to RPC", async () => {
      mockSupabase.rpc.mockResolvedValue({
        data: [createRpcRow({ total_count: 50 })],
        error: null,
      });

      const result = await listDashboardGigs(TEST_USER_ID, {
        limit: 10,
        offset: 40,
      });

      expect(mockSupabase.rpc).toHaveBeenCalledWith(
        "list_dashboard_gigs",
        expect.objectContaining({
          p_user_id: TEST_USER_ID,
          p_limit: 10,
          p_offset: 40,
        })
      );
      // 40 + 10 = 50, total = 50 => hasMore false
      expect(result.hasMore).toBe(false);
    });

    it("should pass date range strings to RPC", async () => {
      mockSupabase.rpc.mockResolvedValue({
        data: [createRpcRow()],
        error: null,
      });

      const from = new Date("2026-04-01T00:00:00Z");
      const to = new Date("2026-06-30T00:00:00Z");

      await listDashboardGigs(TEST_USER_ID, { from, to });

      expect(mockSupabase.rpc).toHaveBeenCalledWith(
        "list_dashboard_gigs",
        expect.objectContaining({
          p_from_date: "2026-04-01",
          p_to_date: "2026-06-30",
        })
      );
    });

    // --- RPC fallback scenarios ---------------------------------------------

    it("should fall back to query when RPC returns an error", async () => {
      mockSupabase.rpc.mockResolvedValue({
        data: null,
        error: { message: "function does not exist" },
      });
      mockSupabase.from.mockReturnValue(
        createChainableMock({ data: [], error: null })
      );

      const result = await listDashboardGigs(TEST_USER_ID);

      expect(result.gigs).toEqual([]);
      expect(result.total).toBe(0);
      expect(mockSupabase.from).toHaveBeenCalledWith("gigs");
    });

    it("should fall back to query when RPC returns empty array", async () => {
      mockSupabase.rpc.mockResolvedValue({ data: [], error: null });
      mockSupabase.from.mockReturnValue(
        createChainableMock({ data: [], error: null })
      );

      const result = await listDashboardGigs(TEST_USER_ID);

      expect(result.gigs).toEqual([]);
      expect(mockSupabase.from).toHaveBeenCalledWith("gigs");
    });

    it("should fall back to query when RPC returns null data", async () => {
      mockSupabase.rpc.mockResolvedValue({ data: null, error: null });
      mockSupabase.from.mockReturnValue(
        createChainableMock({ data: [], error: null })
      );

      const result = await listDashboardGigs(TEST_USER_ID);

      expect(result.gigs).toEqual([]);
      expect(mockSupabase.from).toHaveBeenCalledWith("gigs");
    });

    it("should fall back to query when RPC throws an exception", async () => {
      mockSupabase.rpc.mockRejectedValue(new Error("network error"));
      mockSupabase.from.mockReturnValue(
        createChainableMock({ data: [], error: null })
      );

      const result = await listDashboardGigs(TEST_USER_ID);

      expect(result.gigs).toEqual([]);
    });

    // --- Fallback path (happy) ----------------------------------------------

    it("should include gigs where user is the owner (manager)", async () => {
      mockSupabase.rpc.mockResolvedValue({ data: [], error: null });

      const gig = createFallbackGigRow({
        owner_id: TEST_USER_ID,
        gig_roles: [], // no player role, but user is owner
      });
      mockSupabase.from.mockReturnValue(
        createChainableMock({ data: [gig], error: null })
      );

      const result = await listDashboardGigs(TEST_USER_ID);

      expect(result.gigs).toHaveLength(1);
      expect(result.gigs[0].isManager).toBe(true);
      expect(result.gigs[0].isPlayer).toBe(false);
    });

    it("should include gigs where user has an accepted role (player)", async () => {
      mockSupabase.rpc.mockResolvedValue({ data: [], error: null });

      const gig = createFallbackGigRow({
        owner_id: OTHER_USER_ID,
        gig_roles: [
          {
            id: "role-1",
            role_name: "Bass",
            invitation_status: "accepted",
            payment_status: "pending",
            musician_id: TEST_USER_ID,
          },
        ],
      });
      mockSupabase.from.mockReturnValue(
        createChainableMock({ data: [gig], error: null })
      );

      const result = await listDashboardGigs(TEST_USER_ID);

      expect(result.gigs).toHaveLength(1);
      expect(result.gigs[0].isManager).toBe(false);
      expect(result.gigs[0].isPlayer).toBe(true);
      expect(result.gigs[0].playerRoleName).toBe("Bass");
    });

    it("should exclude gigs where user has no connection", async () => {
      mockSupabase.rpc.mockResolvedValue({ data: [], error: null });

      const gig = createFallbackGigRow({
        owner_id: OTHER_USER_ID,
        gig_roles: [
          {
            id: "role-1",
            role_name: "Drums",
            invitation_status: "accepted",
            payment_status: "pending",
            musician_id: "someone-else",
          },
        ],
      });
      mockSupabase.from.mockReturnValue(
        createChainableMock({ data: [gig], error: null })
      );

      const result = await listDashboardGigs(TEST_USER_ID);

      expect(result.gigs).toHaveLength(0);
    });

    it("should exclude gigs where user role is pending", async () => {
      mockSupabase.rpc.mockResolvedValue({ data: [], error: null });

      const gig = createFallbackGigRow({
        owner_id: OTHER_USER_ID,
        gig_roles: [
          {
            id: "role-1",
            role_name: "Keys",
            invitation_status: "pending",
            payment_status: "pending",
            musician_id: TEST_USER_ID,
          },
        ],
      });
      mockSupabase.from.mockReturnValue(
        createChainableMock({ data: [gig], error: null })
      );

      const result = await listDashboardGigs(TEST_USER_ID);

      expect(result.gigs).toHaveLength(0);
    });

    it("should exclude gigs where user role is declined", async () => {
      mockSupabase.rpc.mockResolvedValue({ data: [], error: null });

      const gig = createFallbackGigRow({
        owner_id: OTHER_USER_ID,
        gig_roles: [
          {
            id: "role-1",
            role_name: "Keys",
            invitation_status: "declined",
            payment_status: "pending",
            musician_id: TEST_USER_ID,
          },
        ],
      });
      mockSupabase.from.mockReturnValue(
        createChainableMock({ data: [gig], error: null })
      );

      const result = await listDashboardGigs(TEST_USER_ID);

      expect(result.gigs).toHaveLength(0);
    });

    it("should handle external gigs as player (not manager)", async () => {
      mockSupabase.rpc.mockResolvedValue({ data: [], error: null });

      const gig = createFallbackGigRow({
        owner_id: TEST_USER_ID,
        is_external: true,
        gig_roles: [],
      });
      mockSupabase.from.mockReturnValue(
        createChainableMock({ data: [gig], error: null })
      );

      const result = await listDashboardGigs(TEST_USER_ID);

      expect(result.gigs).toHaveLength(1);
      expect(result.gigs[0].isManager).toBe(false);
      expect(result.gigs[0].isPlayer).toBe(true);
      expect(result.gigs[0].isExternal).toBe(true);
    });

    it("should compute roleStats for manager gigs", async () => {
      mockSupabase.rpc.mockResolvedValue({ data: [], error: null });

      const gig = createFallbackGigRow({
        gig_roles: [
          {
            id: "r1",
            role_name: "Keys",
            invitation_status: "accepted",
            payment_status: "pending",
            musician_id: "someone",
          },
          {
            id: "r2",
            role_name: "Bass",
            invitation_status: "invited",
            payment_status: "pending",
            musician_id: "someone2",
          },
          {
            id: "r3",
            role_name: "Drums",
            invitation_status: "declined",
            payment_status: "pending",
            musician_id: "someone3",
          },
          {
            id: "r4",
            role_name: "Vocals",
            invitation_status: "pending",
            payment_status: "pending",
            musician_id: "someone4",
          },
        ],
      });
      mockSupabase.from.mockReturnValue(
        createChainableMock({ data: [gig], error: null })
      );

      const result = await listDashboardGigs(TEST_USER_ID);

      expect(result.gigs[0].roleStats).toEqual({
        total: 4,
        invited: 1,
        accepted: 1,
        declined: 1,
        pending: 1,
      });
    });

    it("should not compute roleStats when user is only a player", async () => {
      mockSupabase.rpc.mockResolvedValue({ data: [], error: null });

      const gig = createFallbackGigRow({
        owner_id: OTHER_USER_ID,
        gig_roles: [
          {
            id: "r1",
            role_name: "Keys",
            invitation_status: "accepted",
            payment_status: "pending",
            musician_id: TEST_USER_ID,
          },
        ],
      });
      mockSupabase.from.mockReturnValue(
        createChainableMock({ data: [gig], error: null })
      );

      const result = await listDashboardGigs(TEST_USER_ID);

      expect(result.gigs[0].roleStats).toBeNull();
    });

    it("should sort fallback results by date then startTime", async () => {
      mockSupabase.rpc.mockResolvedValue({ data: [], error: null });

      const gigs = [
        createFallbackGigRow({
          id: "gig-late",
          date: "2026-03-02",
          start_time: "21:00",
        }),
        createFallbackGigRow({
          id: "gig-early",
          date: "2026-03-01",
          start_time: "18:00",
        }),
        createFallbackGigRow({
          id: "gig-mid",
          date: "2026-03-01",
          start_time: "20:00",
        }),
      ];
      mockSupabase.from.mockReturnValue(
        createChainableMock({ data: gigs, error: null })
      );

      const result = await listDashboardGigs(TEST_USER_ID);

      expect(result.gigs.map((g) => g.gigId)).toEqual([
        "gig-early",
        "gig-mid",
        "gig-late",
      ]);
    });

    it("should sort gigs without startTime after gigs with startTime on same date", async () => {
      mockSupabase.rpc.mockResolvedValue({ data: [], error: null });

      const gigs = [
        createFallbackGigRow({
          id: "gig-no-time",
          date: "2026-03-01",
          start_time: null,
        }),
        createFallbackGigRow({
          id: "gig-with-time",
          date: "2026-03-01",
          start_time: "18:00",
        }),
      ];
      mockSupabase.from.mockReturnValue(
        createChainableMock({ data: gigs, error: null })
      );

      const result = await listDashboardGigs(TEST_USER_ID);

      expect(result.gigs[0].gigId).toBe("gig-with-time");
      expect(result.gigs[1].gigId).toBe("gig-no-time");
    });

    it("should paginate fallback results with offset and limit", async () => {
      mockSupabase.rpc.mockResolvedValue({ data: [], error: null });

      const gigs = Array.from({ length: 5 }, (_, i) =>
        createFallbackGigRow({
          id: `gig-${i}`,
          date: `2026-03-0${i + 1}`,
        })
      );
      mockSupabase.from.mockReturnValue(
        createChainableMock({ data: gigs, error: null })
      );

      const result = await listDashboardGigs(TEST_USER_ID, {
        limit: 2,
        offset: 2,
      });

      expect(result.gigs).toHaveLength(2);
      expect(result.gigs[0].gigId).toBe("gig-2");
      expect(result.gigs[1].gigId).toBe("gig-3");
      expect(result.total).toBe(5);
      expect(result.hasMore).toBe(true);
    });

    it("should handle owner as array (Supabase join shape)", async () => {
      mockSupabase.rpc.mockResolvedValue({ data: [], error: null });

      const gig = createFallbackGigRow({
        owner: [{ id: TEST_USER_ID, name: "Array User" }],
      });
      mockSupabase.from.mockReturnValue(
        createChainableMock({ data: [gig], error: null })
      );

      const result = await listDashboardGigs(TEST_USER_ID);

      expect(result.gigs[0].hostName).toBe("Array User");
    });

    it("should handle project as array (Supabase join shape)", async () => {
      mockSupabase.rpc.mockResolvedValue({ data: [], error: null });

      const gig = createFallbackGigRow({
        project: [{ name: "Array Band" }],
      });
      mockSupabase.from.mockReturnValue(
        createChainableMock({ data: [gig], error: null })
      );

      const result = await listDashboardGigs(TEST_USER_ID);

      expect(result.gigs[0].projectName).toBe("Array Band");
    });

    it("should handle null owner and project gracefully", async () => {
      mockSupabase.rpc.mockResolvedValue({ data: [], error: null });

      const gig = createFallbackGigRow({
        owner: null,
        project: null,
      });
      mockSupabase.from.mockReturnValue(
        createChainableMock({ data: [gig], error: null })
      );

      const result = await listDashboardGigs(TEST_USER_ID);

      expect(result.gigs[0].hostName).toBeNull();
      expect(result.gigs[0].projectName).toBeNull();
    });

    it("should handle gig_roles as a single object (non-array)", async () => {
      mockSupabase.rpc.mockResolvedValue({ data: [], error: null });

      const gig = createFallbackGigRow({
        owner_id: OTHER_USER_ID,
        gig_roles: {
          id: "role-single",
          role_name: "Sax",
          invitation_status: "accepted",
          payment_status: "pending",
          musician_id: TEST_USER_ID,
        },
      });
      mockSupabase.from.mockReturnValue(
        createChainableMock({ data: [gig], error: null })
      );

      const result = await listDashboardGigs(TEST_USER_ID);

      expect(result.gigs).toHaveLength(1);
      expect(result.gigs[0].playerRoleName).toBe("Sax");
    });

    // --- Fallback path (error) ----------------------------------------------

    it("should throw when fallback query returns an error", async () => {
      mockSupabase.rpc.mockResolvedValue({ data: [], error: null });
      mockSupabase.from.mockReturnValue(
        createChainableMock({
          data: null,
          error: { message: "Connection refused" },
        })
      );

      await expect(listDashboardGigs(TEST_USER_ID)).rejects.toThrow(
        "Connection refused"
      );
    });

    it("should throw fallback error message when error message is empty", async () => {
      mockSupabase.rpc.mockResolvedValue({ data: [], error: null });
      mockSupabase.from.mockReturnValue(
        createChainableMock({
          data: null,
          error: { message: "" },
        })
      );

      await expect(listDashboardGigs(TEST_USER_ID)).rejects.toThrow(
        "Failed to fetch gigs"
      );
    });

    it("should return empty results when fallback data is null", async () => {
      mockSupabase.rpc.mockResolvedValue({ data: [], error: null });
      mockSupabase.from.mockReturnValue(
        createChainableMock({ data: null, error: null })
      );

      // data is null but no error => the code checks `if (allGigs)` and skips,
      // but the Supabase query resolves with { data: null, error: null }.
      // Since there's no error, it won't throw. But it also won't iterate.
      // However, the fallback function destructures and checks allGigsError first.
      // With no error and null data, it should return empty results.
      const result = await listDashboardGigs(TEST_USER_ID);

      expect(result.gigs).toEqual([]);
      expect(result.total).toBe(0);
    });
  });

  // ==========================================================================
  // listRecentPastGigs
  // ==========================================================================

  describe("listRecentPastGigs", () => {
    it("should return recent past gigs for the user", async () => {
      const gig = createFallbackGigRow({
        date: "2026-02-10",
        is_external: false,
      });
      mockSupabase.from.mockReturnValue(
        createChainableMock({ data: [gig], error: null })
      );

      const result = await listRecentPastGigs(TEST_USER_ID);

      expect(result).toHaveLength(1);
      expect(result[0].gigId).toBe("gig-1");
      expect(result[0].gigTitle).toBe("Jazz Night");
      expect(result[0].isManager).toBe(true);
    });

    it("should query the gigs table", async () => {
      mockSupabase.from.mockReturnValue(
        createChainableMock({ data: [], error: null })
      );

      await listRecentPastGigs(TEST_USER_ID);

      expect(mockSupabase.from).toHaveBeenCalledWith("gigs");
    });

    it("should use default limit of 5", async () => {
      const gigs = Array.from({ length: 10 }, (_, i) =>
        createFallbackGigRow({ id: `gig-${i}`, date: `2026-02-0${i + 1}` })
      );
      mockSupabase.from.mockReturnValue(
        createChainableMock({ data: gigs, error: null })
      );

      const result = await listRecentPastGigs(TEST_USER_ID);

      expect(result.length).toBeLessThanOrEqual(5);
    });

    it("should respect custom limit parameter", async () => {
      const gigs = Array.from({ length: 10 }, (_, i) =>
        createFallbackGigRow({ id: `gig-${i}`, date: `2026-02-0${i + 1}` })
      );
      mockSupabase.from.mockReturnValue(
        createChainableMock({ data: gigs, error: null })
      );

      const result = await listRecentPastGigs(TEST_USER_ID, 3);

      expect(result.length).toBeLessThanOrEqual(3);
    });

    it("should exclude gigs where user has no connection", async () => {
      const gig = createFallbackGigRow({
        owner_id: OTHER_USER_ID,
        gig_roles: [
          {
            id: "r1",
            role_name: "Guitar",
            invitation_status: "accepted",
            payment_status: "paid",
            musician_id: "someone-else",
          },
        ],
      });
      mockSupabase.from.mockReturnValue(
        createChainableMock({ data: [gig], error: null })
      );

      const result = await listRecentPastGigs(TEST_USER_ID);

      expect(result).toHaveLength(0);
    });

    it("should exclude gigs where user role is pending", async () => {
      const gig = createFallbackGigRow({
        owner_id: OTHER_USER_ID,
        gig_roles: [
          {
            id: "r1",
            role_name: "Keys",
            invitation_status: "pending",
            payment_status: "pending",
            musician_id: TEST_USER_ID,
          },
        ],
      });
      mockSupabase.from.mockReturnValue(
        createChainableMock({ data: [gig], error: null })
      );

      const result = await listRecentPastGigs(TEST_USER_ID);

      expect(result).toHaveLength(0);
    });

    it("should include gigs where user role is declined (different from dashboard)", async () => {
      // listRecentPastGigs only filters out 'pending', not 'declined'
      const gig = createFallbackGigRow({
        owner_id: OTHER_USER_ID,
        gig_roles: [
          {
            id: "r1",
            role_name: "Keys",
            invitation_status: "declined",
            payment_status: "pending",
            musician_id: TEST_USER_ID,
          },
        ],
      });
      mockSupabase.from.mockReturnValue(
        createChainableMock({ data: [gig], error: null })
      );

      const result = await listRecentPastGigs(TEST_USER_ID);

      expect(result).toHaveLength(1);
      expect(result[0].invitationStatus).toBe("declined");
    });

    it("should handle external gigs as player not manager", async () => {
      const gig = createFallbackGigRow({
        owner_id: TEST_USER_ID,
        is_external: true,
        gig_roles: [],
      });
      mockSupabase.from.mockReturnValue(
        createChainableMock({ data: [gig], error: null })
      );

      const result = await listRecentPastGigs(TEST_USER_ID);

      expect(result).toHaveLength(1);
      expect(result[0].isManager).toBe(false);
      expect(result[0].isPlayer).toBe(true);
      expect(result[0].isExternal).toBe(true);
    });

    it("should handle owner as array shape", async () => {
      const gig = createFallbackGigRow({
        owner: [{ id: TEST_USER_ID, name: "Array Owner" }],
      });
      mockSupabase.from.mockReturnValue(
        createChainableMock({ data: [gig], error: null })
      );

      const result = await listRecentPastGigs(TEST_USER_ID);

      expect(result[0].hostName).toBe("Array Owner");
    });

    it("should handle null owner gracefully", async () => {
      const gig = createFallbackGigRow({ owner: null });
      mockSupabase.from.mockReturnValue(
        createChainableMock({ data: [gig], error: null })
      );

      const result = await listRecentPastGigs(TEST_USER_ID);

      expect(result[0].hostName).toBeNull();
    });

    it("should handle gig_roles as single object", async () => {
      const gig = createFallbackGigRow({
        owner_id: OTHER_USER_ID,
        gig_roles: {
          id: "role-single",
          role_name: "Trumpet",
          invitation_status: "accepted",
          payment_status: "pending",
          musician_id: TEST_USER_ID,
        },
      });
      mockSupabase.from.mockReturnValue(
        createChainableMock({ data: [gig], error: null })
      );

      const result = await listRecentPastGigs(TEST_USER_ID);

      expect(result).toHaveLength(1);
      expect(result[0].playerRoleName).toBe("Trumpet");
    });

    it("should return empty array when no data is returned", async () => {
      mockSupabase.from.mockReturnValue(
        createChainableMock({ data: null, error: null })
      );

      const result = await listRecentPastGigs(TEST_USER_ID);

      expect(result).toEqual([]);
    });

    it("should return empty array when data is empty", async () => {
      mockSupabase.from.mockReturnValue(
        createChainableMock({ data: [], error: null })
      );

      const result = await listRecentPastGigs(TEST_USER_ID);

      expect(result).toEqual([]);
    });

    it("should throw on database error", async () => {
      mockSupabase.from.mockReturnValue(
        createChainableMock({
          data: null,
          error: { message: "Permission denied" },
        })
      );

      await expect(listRecentPastGigs(TEST_USER_ID)).rejects.toThrow(
        "Permission denied"
      );
    });

    it("should throw fallback message when error message is empty", async () => {
      mockSupabase.from.mockReturnValue(
        createChainableMock({
          data: null,
          error: { message: "" },
        })
      );

      await expect(listRecentPastGigs(TEST_USER_ID)).rejects.toThrow(
        "Failed to fetch recent past gigs"
      );
    });
  });

  // ==========================================================================
  // listAllPastGigs
  // ==========================================================================

  describe("listAllPastGigs", () => {
    // --- RPC path (happy) ---------------------------------------------------

    it("should return past gigs from RPC when available", async () => {
      const rpcRow = createRpcRow({
        gig_id: "past-gig-1",
        gig_title: "Last Month Show",
        date: "2026-01-15",
      });
      mockSupabase.rpc.mockResolvedValue({
        data: [rpcRow],
        error: null,
      });

      const result = await listAllPastGigs(TEST_USER_ID);

      expect(result.gigs).toHaveLength(1);
      expect(result.gigs[0].gigId).toBe("past-gig-1");
      expect(result.gigs[0].gigTitle).toBe("Last Month Show");
      expect(result.total).toBe(1);
      expect(result.hasMore).toBe(false);
    });

    it("should call list_past_gigs RPC with correct params", async () => {
      mockSupabase.rpc.mockResolvedValue({
        data: [createRpcRow()],
        error: null,
      });

      await listAllPastGigs(TEST_USER_ID, { limit: 15, offset: 30 });

      expect(mockSupabase.rpc).toHaveBeenCalledWith("list_past_gigs", {
        p_user_id: TEST_USER_ID,
        p_limit: 15,
        p_offset: 30,
      });
    });

    it("should calculate hasMore from RPC total_count", async () => {
      mockSupabase.rpc.mockResolvedValue({
        data: [createRpcRow({ total_count: 100 })],
        error: null,
      });

      const result = await listAllPastGigs(TEST_USER_ID, {
        limit: 20,
        offset: 0,
      });

      expect(result.hasMore).toBe(true);
      expect(result.total).toBe(100);
    });

    it("should map all RPC fields correctly", async () => {
      const row = createRpcRow({
        gig_id: "pg-1",
        gig_title: "Past Show",
        date: "2026-01-20",
        start_time: "19:00",
        end_time: "22:00",
        call_time: "18:00",
        location_name: "The Venue",
        status: "confirmed",
        is_manager: false,
        is_player: true,
        player_role_name: "Guitar",
        player_gig_role_id: "prole-1",
        invitation_status: "accepted",
        host_id: OTHER_USER_ID,
        host_name: "Other User",
      });
      mockSupabase.rpc.mockResolvedValue({ data: [row], error: null });

      const result = await listAllPastGigs(TEST_USER_ID);

      expect(result.gigs[0]).toMatchObject({
        gigId: "pg-1",
        gigTitle: "Past Show",
        date: "2026-01-20",
        startTime: "19:00",
        endTime: "22:00",
        callTime: "18:00",
        locationName: "The Venue",
        status: "confirmed",
        isManager: false,
        isPlayer: true,
        playerRoleName: "Guitar",
        playerGigRoleId: "prole-1",
        invitationStatus: "accepted",
        hostId: OTHER_USER_ID,
        hostName: "Other User",
      });
    });

    // --- RPC fallback scenarios ---------------------------------------------

    it("should fall back to query when RPC returns error", async () => {
      mockSupabase.rpc.mockResolvedValue({
        data: null,
        error: { message: "function not found" },
      });
      mockSupabase.from.mockReturnValue(
        createChainableMock({ data: [], error: null })
      );

      const result = await listAllPastGigs(TEST_USER_ID);

      expect(result.gigs).toEqual([]);
      expect(mockSupabase.from).toHaveBeenCalledWith("gigs");
    });

    it("should fall back to query when RPC returns empty array", async () => {
      mockSupabase.rpc.mockResolvedValue({ data: [], error: null });
      mockSupabase.from.mockReturnValue(
        createChainableMock({ data: [], error: null })
      );

      const result = await listAllPastGigs(TEST_USER_ID);

      expect(result.gigs).toEqual([]);
    });

    it("should fall back to query when RPC throws exception", async () => {
      mockSupabase.rpc.mockRejectedValue(new Error("timeout"));
      mockSupabase.from.mockReturnValue(
        createChainableMock({ data: [], error: null })
      );

      const result = await listAllPastGigs(TEST_USER_ID);

      expect(result.gigs).toEqual([]);
    });

    // --- Fallback path (happy) ----------------------------------------------

    it("should include past gigs where user is manager via fallback", async () => {
      mockSupabase.rpc.mockResolvedValue({ data: [], error: null });

      const gig = createFallbackGigRow({
        id: "past-fb-1",
        date: "2026-01-10",
        owner_id: TEST_USER_ID,
        gig_roles: [],
      });
      mockSupabase.from.mockReturnValue(
        createChainableMock({ data: [gig], error: null })
      );

      const result = await listAllPastGigs(TEST_USER_ID);

      expect(result.gigs).toHaveLength(1);
      expect(result.gigs[0].isManager).toBe(true);
    });

    it("should include past gigs where user is player via fallback", async () => {
      mockSupabase.rpc.mockResolvedValue({ data: [], error: null });

      const gig = createFallbackGigRow({
        id: "past-fb-2",
        date: "2026-01-10",
        owner_id: OTHER_USER_ID,
        gig_roles: [
          {
            id: "r1",
            role_name: "Vocals",
            invitation_status: "accepted",
            payment_status: "paid",
            musician_id: TEST_USER_ID,
          },
        ],
      });
      mockSupabase.from.mockReturnValue(
        createChainableMock({ data: [gig], error: null })
      );

      const result = await listAllPastGigs(TEST_USER_ID);

      expect(result.gigs).toHaveLength(1);
      expect(result.gigs[0].isPlayer).toBe(true);
      expect(result.gigs[0].playerRoleName).toBe("Vocals");
    });

    it("should exclude past gigs where user has no role and is not owner", async () => {
      mockSupabase.rpc.mockResolvedValue({ data: [], error: null });

      const gig = createFallbackGigRow({
        owner_id: OTHER_USER_ID,
        gig_roles: [],
      });
      mockSupabase.from.mockReturnValue(
        createChainableMock({ data: [gig], error: null })
      );

      const result = await listAllPastGigs(TEST_USER_ID);

      expect(result.gigs).toHaveLength(0);
    });

    it("should handle external gigs as player in fallback", async () => {
      mockSupabase.rpc.mockResolvedValue({ data: [], error: null });

      const gig = createFallbackGigRow({
        owner_id: TEST_USER_ID,
        is_external: true,
        gig_roles: [],
      });
      mockSupabase.from.mockReturnValue(
        createChainableMock({ data: [gig], error: null })
      );

      const result = await listAllPastGigs(TEST_USER_ID);

      expect(result.gigs).toHaveLength(1);
      expect(result.gigs[0].isManager).toBe(false);
      expect(result.gigs[0].isPlayer).toBe(true);
    });

    it("should paginate fallback results correctly", async () => {
      mockSupabase.rpc.mockResolvedValue({ data: [], error: null });

      const gigs = Array.from({ length: 8 }, (_, i) =>
        createFallbackGigRow({
          id: `past-gig-${i}`,
          date: `2026-01-${String(i + 10).padStart(2, "0")}`,
        })
      );
      mockSupabase.from.mockReturnValue(
        createChainableMock({ data: gigs, error: null })
      );

      const result = await listAllPastGigs(TEST_USER_ID, {
        limit: 3,
        offset: 2,
      });

      expect(result.gigs).toHaveLength(3);
      expect(result.total).toBe(8);
      expect(result.hasMore).toBe(true);
    });

    it("should use default limit 20 and offset 0", async () => {
      mockSupabase.rpc.mockResolvedValue({ data: [], error: null });

      const gigs = Array.from({ length: 3 }, (_, i) =>
        createFallbackGigRow({ id: `gig-${i}` })
      );
      mockSupabase.from.mockReturnValue(
        createChainableMock({ data: gigs, error: null })
      );

      const result = await listAllPastGigs(TEST_USER_ID);

      expect(result.gigs).toHaveLength(3);
      expect(result.hasMore).toBe(false);
    });

    // --- Fallback path (error) ----------------------------------------------

    it("should throw when fallback query returns error", async () => {
      mockSupabase.rpc.mockResolvedValue({ data: [], error: null });
      mockSupabase.from.mockReturnValue(
        createChainableMock({
          data: null,
          error: { message: "Table not found" },
        })
      );

      await expect(listAllPastGigs(TEST_USER_ID)).rejects.toThrow(
        "Table not found"
      );
    });

    it("should throw fallback message when error has empty message", async () => {
      mockSupabase.rpc.mockResolvedValue({ data: [], error: null });
      mockSupabase.from.mockReturnValue(
        createChainableMock({
          data: null,
          error: { message: "" },
        })
      );

      await expect(listAllPastGigs(TEST_USER_ID)).rejects.toThrow(
        "Failed to fetch past gigs"
      );
    });

    it("should return empty results when fallback data is null", async () => {
      mockSupabase.rpc.mockResolvedValue({ data: [], error: null });
      mockSupabase.from.mockReturnValue(
        createChainableMock({ data: null, error: null })
      );

      const result = await listAllPastGigs(TEST_USER_ID);

      expect(result.gigs).toEqual([]);
      expect(result.total).toBe(0);
    });
  });
});
