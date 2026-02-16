import { describe, it, expect, vi, beforeEach } from "vitest";
import { createClient } from "@/lib/supabase/client";
import {
  listFilesForGig,
  addFileToGig,
  updateGigFile,
  deleteGigFile,
} from "@/lib/api/gig-files";
import { createChainableMock } from "../mocks/supabase";

// Mock the Supabase client module
vi.mock("@/lib/supabase/client");

/**
 * Mock gig file (matches gig_materials Row type)
 */
const mockGigFile = {
  id: "file-id-123",
  gig_id: "test-gig-id-123",
  label: "Stage Plot",
  url: "https://drive.google.com/file/stage-plot",
  kind: "document",
  sort_order: 0,
};

const mockGigFile2 = {
  id: "file-id-456",
  gig_id: "test-gig-id-123",
  label: "Setlist PDF",
  url: "https://drive.google.com/file/setlist",
  kind: "setlist",
  sort_order: 1,
};

describe("Gig Files API", () => {
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
  // listFilesForGig
  // ============================================================================

  describe("listFilesForGig", () => {
    it("should return files sorted by sort_order", async () => {
      const files = [mockGigFile, mockGigFile2];

      mockSupabase.from.mockReturnValue(
        createChainableMock({ data: files, error: null })
      );

      const result = await listFilesForGig("test-gig-id-123");

      expect(result).toEqual(files);
      expect(result).toHaveLength(2);
      expect(mockSupabase.from).toHaveBeenCalledWith("gig_materials");
    });

    it("should return empty array when gig has no files", async () => {
      mockSupabase.from.mockReturnValue(
        createChainableMock({ data: [], error: null })
      );

      const result = await listFilesForGig("gig-with-no-files");

      expect(result).toEqual([]);
    });

    it("should return empty array when data is null", async () => {
      mockSupabase.from.mockReturnValue(
        createChainableMock({ data: null, error: null })
      );

      const result = await listFilesForGig("test-gig-id");

      expect(result).toEqual([]);
    });

    it("should throw error with message from Supabase on failure", async () => {
      mockSupabase.from.mockReturnValue(
        createChainableMock({
          data: null,
          error: { message: "Connection refused" },
        })
      );

      await expect(listFilesForGig("test-gig-id")).rejects.toThrow(
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

      await expect(listFilesForGig("test-gig-id")).rejects.toThrow(
        "Failed to fetch gig files"
      );
    });
  });

  // ============================================================================
  // addFileToGig
  // ============================================================================

  describe("addFileToGig", () => {
    it("should insert a file and return the created record", async () => {
      mockSupabase.from.mockReturnValue(
        createChainableMock({ data: mockGigFile, error: null })
      );

      const result = await addFileToGig({
        gig_id: "test-gig-id-123",
        label: "Stage Plot",
        url: "https://drive.google.com/file/stage-plot",
        kind: "document",
      });

      expect(result).toEqual(mockGigFile);
      expect(mockSupabase.from).toHaveBeenCalledWith("gig_materials");
    });

    it("should accept optional sort_order", async () => {
      const fileWithOrder = { ...mockGigFile, sort_order: 5 };

      mockSupabase.from.mockReturnValue(
        createChainableMock({ data: fileWithOrder, error: null })
      );

      const result = await addFileToGig({
        gig_id: "test-gig-id-123",
        label: "Stage Plot",
        url: "https://drive.google.com/file/stage-plot",
        kind: "document",
        sort_order: 5,
      });

      expect(result.sort_order).toBe(5);
    });

    it("should throw error with message from Supabase on insert failure", async () => {
      mockSupabase.from.mockReturnValue(
        createChainableMock({
          data: null,
          error: { message: "Duplicate key violation" },
        })
      );

      await expect(
        addFileToGig({
          gig_id: "test-gig-id-123",
          label: "Stage Plot",
          url: "https://drive.google.com/file/stage-plot",
          kind: "document",
        })
      ).rejects.toThrow("Duplicate key violation");
    });

    it("should throw fallback message when error has no message", async () => {
      mockSupabase.from.mockReturnValue(
        createChainableMock({
          data: null,
          error: { message: "" },
        })
      );

      await expect(
        addFileToGig({
          gig_id: "test-gig-id-123",
          label: "Stage Plot",
          url: "https://example.com/file",
          kind: "document",
        })
      ).rejects.toThrow("Failed to add gig file");
    });

    it("should throw on RLS violation", async () => {
      mockSupabase.from.mockReturnValue(
        createChainableMock({
          data: null,
          error: { message: "new row violates row-level security policy" },
        })
      );

      await expect(
        addFileToGig({
          gig_id: "unauthorized-gig-id",
          label: "Secret File",
          url: "https://example.com/secret",
          kind: "document",
        })
      ).rejects.toThrow("new row violates row-level security policy");
    });
  });

  // ============================================================================
  // updateGigFile
  // ============================================================================

  describe("updateGigFile", () => {
    it("should update file and return updated record", async () => {
      const updatedFile = { ...mockGigFile, label: "Updated Stage Plot" };

      mockSupabase.from.mockReturnValue(
        createChainableMock({ data: updatedFile, error: null })
      );

      const result = await updateGigFile("file-id-123", {
        label: "Updated Stage Plot",
      });

      expect(result.label).toBe("Updated Stage Plot");
      expect(mockSupabase.from).toHaveBeenCalledWith("gig_materials");
    });

    it("should update URL only", async () => {
      const updatedFile = {
        ...mockGigFile,
        url: "https://drive.google.com/file/new-url",
      };

      mockSupabase.from.mockReturnValue(
        createChainableMock({ data: updatedFile, error: null })
      );

      const result = await updateGigFile("file-id-123", {
        url: "https://drive.google.com/file/new-url",
      });

      expect(result.url).toBe("https://drive.google.com/file/new-url");
    });

    it("should update sort_order", async () => {
      const updatedFile = { ...mockGigFile, sort_order: 3 };

      mockSupabase.from.mockReturnValue(
        createChainableMock({ data: updatedFile, error: null })
      );

      const result = await updateGigFile("file-id-123", { sort_order: 3 });

      expect(result.sort_order).toBe(3);
    });

    it("should update multiple fields at once", async () => {
      const updatedFile = {
        ...mockGigFile,
        label: "New Label",
        url: "https://new-url.com",
        kind: "audio",
      };

      mockSupabase.from.mockReturnValue(
        createChainableMock({ data: updatedFile, error: null })
      );

      const result = await updateGigFile("file-id-123", {
        label: "New Label",
        url: "https://new-url.com",
        kind: "audio",
      });

      expect(result.label).toBe("New Label");
      expect(result.url).toBe("https://new-url.com");
      expect(result.kind).toBe("audio");
    });

    it("should throw error with message from Supabase on update failure", async () => {
      mockSupabase.from.mockReturnValue(
        createChainableMock({
          data: null,
          error: { message: "Record not found" },
        })
      );

      await expect(
        updateGigFile("nonexistent-id", { label: "New Label" })
      ).rejects.toThrow("Record not found");
    });

    it("should throw fallback message when error has no message", async () => {
      mockSupabase.from.mockReturnValue(
        createChainableMock({
          data: null,
          error: { message: "" },
        })
      );

      await expect(
        updateGigFile("file-id-123", { label: "New Label" })
      ).rejects.toThrow("Failed to update gig file");
    });
  });

  // ============================================================================
  // deleteGigFile
  // ============================================================================

  describe("deleteGigFile", () => {
    it("should delete file successfully", async () => {
      mockSupabase.from.mockReturnValue(
        createChainableMock({ data: null, error: null })
      );

      await expect(deleteGigFile("file-id-123")).resolves.not.toThrow();
      expect(mockSupabase.from).toHaveBeenCalledWith("gig_materials");
    });

    it("should return void on success", async () => {
      mockSupabase.from.mockReturnValue(
        createChainableMock({ data: null, error: null })
      );

      const result = await deleteGigFile("file-id-123");

      expect(result).toBeUndefined();
    });

    it("should throw error with message from Supabase on delete failure", async () => {
      mockSupabase.from.mockReturnValue(
        createChainableMock({
          data: null,
          error: { message: "Foreign key constraint violation" },
        })
      );

      await expect(deleteGigFile("file-id-123")).rejects.toThrow(
        "Foreign key constraint violation"
      );
    });

    it("should throw fallback message when error has no message", async () => {
      mockSupabase.from.mockReturnValue(
        createChainableMock({
          data: null,
          error: { message: "" },
        })
      );

      await expect(deleteGigFile("file-id-123")).rejects.toThrow(
        "Failed to delete gig file"
      );
    });

    it("should throw on RLS violation during delete", async () => {
      mockSupabase.from.mockReturnValue(
        createChainableMock({
          data: null,
          error: { message: "violates row-level security policy" },
        })
      );

      await expect(deleteGigFile("unauthorized-file-id")).rejects.toThrow(
        "violates row-level security policy"
      );
    });
  });
});
