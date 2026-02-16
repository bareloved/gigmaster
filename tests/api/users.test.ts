import { describe, it, expect, vi, beforeEach } from "vitest";
import { createClient } from "@/lib/supabase/client";
import { searchSystemUsers, getUserById } from "@/lib/api/users";
import { createChainableMock } from "../mocks/supabase";
import type { SystemUser } from "@/lib/types/shared";

// Mock the Supabase client module
vi.mock("@/lib/supabase/client");

describe("Users API", () => {
  const mockSupabase = {
    from: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(createClient).mockReturnValue(
      mockSupabase as unknown as ReturnType<typeof createClient>
    );
  });

  // Sample user data matching the SystemUser interface
  const mockSystemUser: SystemUser = {
    id: "user-1",
    name: "Alice Keys",
    email: "alice@example.com",
    phone: "+1234567890",
    main_instrument: "Piano",
    avatar_url: "https://example.com/avatar.jpg",
    created_at: "2024-06-01T00:00:00Z",
  };

  const mockSystemUser2: SystemUser = {
    id: "user-2",
    name: "Bob Bass",
    email: "bob@example.com",
    phone: null,
    main_instrument: "Bass",
    avatar_url: null,
    created_at: "2024-07-15T00:00:00Z",
  };

  // ============================================================================
  // searchSystemUsers
  // ============================================================================

  describe("searchSystemUsers", () => {
    it("should return matching users for a valid query", async () => {
      const users = [mockSystemUser, mockSystemUser2];

      mockSupabase.from.mockReturnValue(
        createChainableMock({ data: users, error: null })
      );

      const result = await searchSystemUsers("alice");

      expect(result).toEqual(users);
      expect(mockSupabase.from).toHaveBeenCalledWith("profiles");
    });

    it("should return a single matching user", async () => {
      mockSupabase.from.mockReturnValue(
        createChainableMock({ data: [mockSystemUser], error: null })
      );

      const result = await searchSystemUsers("Alice");

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe("Alice Keys");
    });

    it("should return empty array for empty query string", async () => {
      const result = await searchSystemUsers("");

      expect(result).toEqual([]);
      expect(mockSupabase.from).not.toHaveBeenCalled();
    });

    it("should return empty array for single-character query", async () => {
      const result = await searchSystemUsers("a");

      expect(result).toEqual([]);
      expect(mockSupabase.from).not.toHaveBeenCalled();
    });

    it("should execute query for two-character query", async () => {
      mockSupabase.from.mockReturnValue(
        createChainableMock({ data: [], error: null })
      );

      const result = await searchSystemUsers("al");

      expect(result).toEqual([]);
      expect(mockSupabase.from).toHaveBeenCalledWith("profiles");
    });

    it("should return empty array on database error", async () => {
      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      mockSupabase.from.mockReturnValue(
        createChainableMock({
          data: null,
          error: { message: "Database connection failed" },
        })
      );

      const result = await searchSystemUsers("alice");

      expect(result).toEqual([]);
      expect(consoleSpy).toHaveBeenCalledWith(
        "Error searching system users:",
        expect.objectContaining({ message: "Database connection failed" })
      );

      consoleSpy.mockRestore();
    });

    it("should return empty array when data is null with no error", async () => {
      mockSupabase.from.mockReturnValue(
        createChainableMock({ data: null, error: null })
      );

      const result = await searchSystemUsers("nobody");

      expect(result).toEqual([]);
    });

    it("should return empty array when no users match", async () => {
      mockSupabase.from.mockReturnValue(
        createChainableMock({ data: [], error: null })
      );

      const result = await searchSystemUsers("zzzznonexistent");

      expect(result).toEqual([]);
    });

    it("should handle users with null fields", async () => {
      const userWithNulls: SystemUser = {
        id: "user-3",
        name: null,
        email: null,
        phone: null,
        main_instrument: null,
        avatar_url: null,
        created_at: "2024-01-01T00:00:00Z",
      };

      mockSupabase.from.mockReturnValue(
        createChainableMock({ data: [userWithNulls], error: null })
      );

      const result = await searchSystemUsers("test");

      expect(result).toHaveLength(1);
      expect(result[0].name).toBeNull();
      expect(result[0].email).toBeNull();
    });

    it("should handle RLS violation error gracefully", async () => {
      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      mockSupabase.from.mockReturnValue(
        createChainableMock({
          data: null,
          error: { message: "violates row-level security" },
        })
      );

      const result = await searchSystemUsers("alice");

      expect(result).toEqual([]);

      consoleSpy.mockRestore();
    });
  });

  // ============================================================================
  // getUserById
  // ============================================================================

  describe("getUserById", () => {
    it("should return user when found", async () => {
      mockSupabase.from.mockReturnValue(
        createChainableMock({ data: mockSystemUser, error: null })
      );

      const result = await getUserById("user-1");

      expect(result).toEqual(mockSystemUser);
      expect(mockSupabase.from).toHaveBeenCalledWith("profiles");
    });

    it("should return null when user not found", async () => {
      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      mockSupabase.from.mockReturnValue(
        createChainableMock({
          data: null,
          error: { code: "PGRST116", message: "No rows found" },
        })
      );

      const result = await getUserById("nonexistent-id");

      expect(result).toBeNull();
      expect(consoleSpy).toHaveBeenCalledWith(
        "Error fetching user:",
        expect.objectContaining({ message: "No rows found" })
      );

      consoleSpy.mockRestore();
    });

    it("should return null on database error", async () => {
      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      mockSupabase.from.mockReturnValue(
        createChainableMock({
          data: null,
          error: { message: "Connection timeout" },
        })
      );

      const result = await getUserById("user-1");

      expect(result).toBeNull();
      expect(consoleSpy).toHaveBeenCalledWith(
        "Error fetching user:",
        expect.objectContaining({ message: "Connection timeout" })
      );

      consoleSpy.mockRestore();
    });

    it("should return user data with all fields populated", async () => {
      mockSupabase.from.mockReturnValue(
        createChainableMock({ data: mockSystemUser, error: null })
      );

      const result = await getUserById("user-1");

      expect(result).not.toBeNull();
      expect(result!.id).toBe("user-1");
      expect(result!.name).toBe("Alice Keys");
      expect(result!.email).toBe("alice@example.com");
      expect(result!.phone).toBe("+1234567890");
      expect(result!.main_instrument).toBe("Piano");
      expect(result!.avatar_url).toBe("https://example.com/avatar.jpg");
      expect(result!.created_at).toBe("2024-06-01T00:00:00Z");
    });

    it("should return user data with nullable fields as null", async () => {
      const userWithNulls: SystemUser = {
        id: "user-3",
        name: null,
        email: null,
        phone: null,
        main_instrument: null,
        avatar_url: null,
        created_at: "2024-01-01T00:00:00Z",
      };

      mockSupabase.from.mockReturnValue(
        createChainableMock({ data: userWithNulls, error: null })
      );

      const result = await getUserById("user-3");

      expect(result).not.toBeNull();
      expect(result!.name).toBeNull();
      expect(result!.email).toBeNull();
      expect(result!.phone).toBeNull();
      expect(result!.main_instrument).toBeNull();
      expect(result!.avatar_url).toBeNull();
    });

    it("should return null on RLS violation", async () => {
      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      mockSupabase.from.mockReturnValue(
        createChainableMock({
          data: null,
          error: { message: "violates row-level security" },
        })
      );

      const result = await getUserById("unauthorized-id");

      expect(result).toBeNull();

      consoleSpy.mockRestore();
    });
  });
});
