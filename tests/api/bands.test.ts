import { describe, it, expect, vi, beforeEach } from "vitest";
import { createClient } from "@/lib/supabase/client";
import { listUserBands, deleteBand } from "@/lib/api/bands";
import { createChainableMock } from "../mocks/supabase";

// Mock the Supabase client module
vi.mock("@/lib/supabase/client");

describe("Bands API", () => {
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
  // listUserBands
  // ============================================================================

  describe("listUserBands", () => {
    const mockBandRow = {
      id: "band-1",
      owner_id: "test-user-id-123",
      name: "The Jazz Quartet",
      description: "A smooth jazz ensemble",
      band_logo_url: null,
      hero_image_url: "https://example.com/hero.jpg",
      accent_color: "#ff0000",
      calendar_color: "#00ff00",
      poster_skin: "paper",
      default_lineup: [{ role: "Keys", name: "John" }],
      created_at: "2024-01-01T00:00:00Z",
      updated_at: "2024-01-02T00:00:00Z",
    };

    it("should return bands sorted by created_at descending", async () => {
      const bands = [
        { ...mockBandRow, id: "band-2", created_at: "2024-02-01T00:00:00Z" },
        { ...mockBandRow, id: "band-1", created_at: "2024-01-01T00:00:00Z" },
      ];

      mockSupabase.from.mockReturnValue(
        createChainableMock({ data: bands, error: null })
      );

      const result = await listUserBands();

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe("band-2");
      expect(result[1].id).toBe("band-1");
      expect(mockSupabase.from).toHaveBeenCalledWith("bands");
    });

    it("should map database fields to the Band interface", async () => {
      mockSupabase.from.mockReturnValue(
        createChainableMock({ data: [mockBandRow], error: null })
      );

      const result = await listUserBands();

      expect(result).toHaveLength(1);
      const band = result[0];
      expect(band.id).toBe("band-1");
      expect(band.name).toBe("The Jazz Quartet");
      expect(band.hero_image_url).toBe("https://example.com/hero.jpg");
      expect(band.accent_color).toBe("#ff0000");
      expect(band.poster_skin).toBe("paper");
      expect(band.default_lineup).toEqual([{ role: "Keys", name: "John" }]);
      expect(band.created_at).toBe("2024-01-01T00:00:00Z");
      expect(band.updated_at).toBe("2024-01-02T00:00:00Z");
    });

    it("should default hero_image_url to null when falsy", async () => {
      const bandWithEmptyHero = {
        ...mockBandRow,
        hero_image_url: "",
      };

      mockSupabase.from.mockReturnValue(
        createChainableMock({ data: [bandWithEmptyHero], error: null })
      );

      const result = await listUserBands();

      expect(result[0].hero_image_url).toBeNull();
    });

    it("should default accent_color to null when falsy", async () => {
      const bandWithEmptyAccent = {
        ...mockBandRow,
        accent_color: "",
      };

      mockSupabase.from.mockReturnValue(
        createChainableMock({ data: [bandWithEmptyAccent], error: null })
      );

      const result = await listUserBands();

      expect(result[0].accent_color).toBeNull();
    });

    it("should default poster_skin to 'clean' when falsy", async () => {
      const bandWithNullSkin = {
        ...mockBandRow,
        poster_skin: null,
      };

      mockSupabase.from.mockReturnValue(
        createChainableMock({ data: [bandWithNullSkin], error: null })
      );

      const result = await listUserBands();

      expect(result[0].poster_skin).toBe("clean");
    });

    it("should default poster_skin to 'clean' when empty string", async () => {
      const bandWithEmptySkin = {
        ...mockBandRow,
        poster_skin: "",
      };

      mockSupabase.from.mockReturnValue(
        createChainableMock({ data: [bandWithEmptySkin], error: null })
      );

      const result = await listUserBands();

      expect(result[0].poster_skin).toBe("clean");
    });

    it("should default default_lineup to empty array when falsy", async () => {
      const bandWithNullLineup = {
        ...mockBandRow,
        default_lineup: null,
      };

      mockSupabase.from.mockReturnValue(
        createChainableMock({ data: [bandWithNullLineup], error: null })
      );

      const result = await listUserBands();

      expect(result[0].default_lineup).toEqual([]);
    });

    it("should return empty array when data is null", async () => {
      mockSupabase.from.mockReturnValue(
        createChainableMock({ data: null, error: null })
      );

      const result = await listUserBands();

      expect(result).toEqual([]);
    });

    it("should return empty array when no bands exist", async () => {
      mockSupabase.from.mockReturnValue(
        createChainableMock({ data: [], error: null })
      );

      const result = await listUserBands();

      expect(result).toEqual([]);
    });

    it("should throw error with message on database error", async () => {
      mockSupabase.from.mockReturnValue(
        createChainableMock({
          data: null,
          error: { message: "Connection timeout" },
        })
      );

      await expect(listUserBands()).rejects.toThrow("Connection timeout");
    });

    it("should throw fallback error when error message is empty", async () => {
      mockSupabase.from.mockReturnValue(
        createChainableMock({
          data: null,
          error: { message: "" },
        })
      );

      await expect(listUserBands()).rejects.toThrow("Failed to fetch bands");
    });

    it("should preserve valid poster_skin values", async () => {
      const grainBand = { ...mockBandRow, poster_skin: "grain" };

      mockSupabase.from.mockReturnValue(
        createChainableMock({ data: [grainBand], error: null })
      );

      const result = await listUserBands();

      expect(result[0].poster_skin).toBe("grain");
    });

    it("should handle multiple bands with varied field states", async () => {
      const bands = [
        {
          ...mockBandRow,
          id: "band-a",
          hero_image_url: null,
          accent_color: null,
          poster_skin: null,
          default_lineup: null,
        },
        {
          ...mockBandRow,
          id: "band-b",
          hero_image_url: "https://example.com/img.jpg",
          accent_color: "#123456",
          poster_skin: "paper",
          default_lineup: [{ role: "Drums" }],
        },
      ];

      mockSupabase.from.mockReturnValue(
        createChainableMock({ data: bands, error: null })
      );

      const result = await listUserBands();

      expect(result).toHaveLength(2);

      // First band: all defaults
      expect(result[0].hero_image_url).toBeNull();
      expect(result[0].accent_color).toBeNull();
      expect(result[0].poster_skin).toBe("clean");
      expect(result[0].default_lineup).toEqual([]);

      // Second band: all populated
      expect(result[1].hero_image_url).toBe("https://example.com/img.jpg");
      expect(result[1].accent_color).toBe("#123456");
      expect(result[1].poster_skin).toBe("paper");
      expect(result[1].default_lineup).toEqual([{ role: "Drums" }]);
    });
  });

  // ============================================================================
  // deleteBand
  // ============================================================================

  describe("deleteBand", () => {
    it("should delete a band successfully", async () => {
      mockSupabase.from.mockReturnValue(
        createChainableMock({ data: null, error: null })
      );

      await expect(deleteBand("band-1")).resolves.not.toThrow();
      expect(mockSupabase.from).toHaveBeenCalledWith("bands");
    });

    it("should resolve to undefined on success", async () => {
      mockSupabase.from.mockReturnValue(
        createChainableMock({ data: null, error: null })
      );

      const result = await deleteBand("band-1");

      expect(result).toBeUndefined();
    });

    it("should throw error with message on delete failure", async () => {
      mockSupabase.from.mockReturnValue(
        createChainableMock({
          data: null,
          error: { message: "Foreign key constraint violation" },
        })
      );

      await expect(deleteBand("band-1")).rejects.toThrow(
        "Foreign key constraint violation"
      );
    });

    it("should throw fallback error when error message is empty", async () => {
      mockSupabase.from.mockReturnValue(
        createChainableMock({
          data: null,
          error: { message: "" },
        })
      );

      await expect(deleteBand("band-1")).rejects.toThrow(
        "Failed to delete band"
      );
    });

    it("should throw error on RLS violation", async () => {
      mockSupabase.from.mockReturnValue(
        createChainableMock({
          data: null,
          error: { message: "new row violates row-level security policy" },
        })
      );

      await expect(deleteBand("band-1")).rejects.toThrow(
        "new row violates row-level security policy"
      );
    });

    it("should throw error when band does not exist", async () => {
      mockSupabase.from.mockReturnValue(
        createChainableMock({
          data: null,
          error: { message: "No rows found" },
        })
      );

      await expect(deleteBand("nonexistent-band")).rejects.toThrow(
        "No rows found"
      );
    });
  });
});
