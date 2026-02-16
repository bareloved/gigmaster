import { describe, it, expect, vi, beforeEach } from "vitest";
import { createClient } from "@/lib/supabase/client";
import {
  saveGigDraft,
  listGigDrafts,
  getGigDraft,
  deleteGigDraft,
} from "@/lib/api/gig-drafts";
import type { GigDraft } from "@/lib/api/gig-drafts";
import type { GigDraftFormData } from "@/hooks/use-gig-draft";
import { mockUser } from "../fixtures/users";
import { createChainableMock } from "../mocks/supabase";

// Mock the Supabase client module
vi.mock("@/lib/supabase/client");

// Minimal valid form data for tests
const mockFormData: GigDraftFormData = {
  title: "Jazz Night at The Blue Note",
  bandId: "band-123",
  bandName: "The Quartet",
  date: "2026-03-15",
  callTime: "18:00",
  onStageTime: "20:00",
  venueName: "The Blue Note",
  venueAddress: "131 W 3rd St",
  venueMapsUrl: "",
  lineup: [],
  setlistText: "",
  dressCode: "Smart casual",
  backlineNotes: "",
  parkingNotes: "",
  paymentNotes: "",
  internalNotes: "",
  gigType: "jazz",
  status: "confirmed",
  bandLogoUrl: "",
  heroImageUrl: "",
  accentColor: "",
  packingChecklist: [],
  materials: [],
  schedule: [],
};

const mockDraft: GigDraft = {
  id: "draft-001",
  owner_id: mockUser.id,
  title: "Jazz Night at The Blue Note",
  form_data: mockFormData,
  created_at: "2026-02-15T10:00:00Z",
  updated_at: "2026-02-15T12:30:00Z",
};

describe("Gig Drafts API", () => {
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
  // saveGigDraft
  // ============================================================================

  describe("saveGigDraft", () => {
    it("should create a new draft when no draftId is provided", async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      mockSupabase.from.mockReturnValue(
        createChainableMock({ data: mockDraft, error: null })
      );

      const result = await saveGigDraft(mockFormData);

      expect(result).toEqual(mockDraft);
      expect(mockSupabase.from).toHaveBeenCalledWith("gig_drafts");
    });

    it("should update an existing draft when draftId is provided", async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      const updatedDraft = {
        ...mockDraft,
        title: "Updated Title",
        updated_at: "2026-02-15T14:00:00Z",
      };

      mockSupabase.from.mockReturnValue(
        createChainableMock({ data: updatedDraft, error: null })
      );

      const result = await saveGigDraft(
        { ...mockFormData, title: "Updated Title" },
        "draft-001"
      );

      expect(result).toEqual(updatedDraft);
      expect(mockSupabase.from).toHaveBeenCalledWith("gig_drafts");
    });

    it("should set title to null when formData.title is empty", async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      const draftWithoutTitle = { ...mockDraft, title: null };
      mockSupabase.from.mockReturnValue(
        createChainableMock({ data: draftWithoutTitle, error: null })
      );

      const formDataNoTitle = { ...mockFormData, title: "" };
      const result = await saveGigDraft(formDataNoTitle);

      expect(result.title).toBeNull();
    });

    it("should throw error when authentication fails", async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: { message: "JWT expired" },
      });

      await expect(saveGigDraft(mockFormData)).rejects.toThrow(
        "Authentication failed: JWT expired"
      );
    });

    it("should throw error when user is not authenticated", async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null,
      });

      await expect(saveGigDraft(mockFormData)).rejects.toThrow(
        "Not authenticated. Please sign in again."
      );
    });

    it("should throw error when insert fails", async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      mockSupabase.from.mockReturnValue(
        createChainableMock({
          data: null,
          error: { message: "Unique constraint violation" },
        })
      );

      await expect(saveGigDraft(mockFormData)).rejects.toThrow(
        "Unique constraint violation"
      );
    });

    it("should throw error when update fails", async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      mockSupabase.from.mockReturnValue(
        createChainableMock({
          data: null,
          error: { message: "Row not found" },
        })
      );

      await expect(saveGigDraft(mockFormData, "draft-001")).rejects.toThrow(
        "Row not found"
      );
    });

    it("should use fallback message when insert error has no message", async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      mockSupabase.from.mockReturnValue(
        createChainableMock({
          data: null,
          error: { message: "" },
        })
      );

      await expect(saveGigDraft(mockFormData)).rejects.toThrow(
        "Failed to save draft"
      );
    });

    it("should use fallback message when update error has no message", async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      mockSupabase.from.mockReturnValue(
        createChainableMock({
          data: null,
          error: { message: "" },
        })
      );

      await expect(saveGigDraft(mockFormData, "draft-001")).rejects.toThrow(
        "Failed to update draft"
      );
    });
  });

  // ============================================================================
  // listGigDrafts
  // ============================================================================

  describe("listGigDrafts", () => {
    it("should return drafts sorted by updated_at descending", async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      const drafts = [
        { ...mockDraft, id: "draft-002", updated_at: "2026-02-16T10:00:00Z" },
        { ...mockDraft, id: "draft-001", updated_at: "2026-02-15T12:30:00Z" },
      ];

      mockSupabase.from.mockReturnValue(
        createChainableMock({ data: drafts, error: null })
      );

      const result = await listGigDrafts();

      expect(result).toEqual(drafts);
      expect(result).toHaveLength(2);
      expect(mockSupabase.from).toHaveBeenCalledWith("gig_drafts");
    });

    it("should return empty array when user has no drafts", async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      mockSupabase.from.mockReturnValue(
        createChainableMock({ data: [], error: null })
      );

      const result = await listGigDrafts();

      expect(result).toEqual([]);
    });

    it("should return empty array when data is null", async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      mockSupabase.from.mockReturnValue(
        createChainableMock({ data: null, error: null })
      );

      const result = await listGigDrafts();

      expect(result).toEqual([]);
    });

    it("should throw error when authentication fails", async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: { message: "Token revoked" },
      });

      await expect(listGigDrafts()).rejects.toThrow(
        "Authentication failed: Token revoked"
      );
    });

    it("should throw error when user is not authenticated", async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null,
      });

      await expect(listGigDrafts()).rejects.toThrow(
        "Not authenticated. Please sign in again."
      );
    });

    it("should throw error on database failure", async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      mockSupabase.from.mockReturnValue(
        createChainableMock({
          data: null,
          error: { message: "Connection refused" },
        })
      );

      await expect(listGigDrafts()).rejects.toThrow("Connection refused");
    });

    it("should use fallback message when error has no message", async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      mockSupabase.from.mockReturnValue(
        createChainableMock({
          data: null,
          error: { message: "" },
        })
      );

      await expect(listGigDrafts()).rejects.toThrow("Failed to list drafts");
    });
  });

  // ============================================================================
  // getGigDraft
  // ============================================================================

  describe("getGigDraft", () => {
    it("should return the draft when found", async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      mockSupabase.from.mockReturnValue(
        createChainableMock({ data: mockDraft, error: null })
      );

      const result = await getGigDraft("draft-001");

      expect(result).toEqual(mockDraft);
      expect(mockSupabase.from).toHaveBeenCalledWith("gig_drafts");
    });

    it("should return null when draft does not exist (PGRST116)", async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      mockSupabase.from.mockReturnValue(
        createChainableMock({
          data: null,
          error: { code: "PGRST116", message: "JSON object requested, multiple (or no) rows returned" },
        })
      );

      const result = await getGigDraft("nonexistent-draft");

      expect(result).toBeNull();
    });

    it("should return null when error message includes 'No rows'", async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      mockSupabase.from.mockReturnValue(
        createChainableMock({
          data: null,
          error: { code: "OTHER", message: "No rows found" },
        })
      );

      const result = await getGigDraft("nonexistent-draft");

      expect(result).toBeNull();
    });

    it("should throw error for unexpected database errors", async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      mockSupabase.from.mockReturnValue(
        createChainableMock({
          data: null,
          error: { code: "42P01", message: "relation does not exist" },
        })
      );

      await expect(getGigDraft("draft-001")).rejects.toThrow(
        "relation does not exist"
      );
    });

    it("should throw error when authentication fails", async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: { message: "Invalid token" },
      });

      await expect(getGigDraft("draft-001")).rejects.toThrow(
        "Authentication failed: Invalid token"
      );
    });

    it("should throw error when user is not authenticated", async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null,
      });

      await expect(getGigDraft("draft-001")).rejects.toThrow(
        "Not authenticated. Please sign in again."
      );
    });

    it("should use fallback message when error has no message", async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      mockSupabase.from.mockReturnValue(
        createChainableMock({
          data: null,
          error: { code: "UNKNOWN", message: "" },
        })
      );

      await expect(getGigDraft("draft-001")).rejects.toThrow(
        "Failed to fetch draft"
      );
    });
  });

  // ============================================================================
  // deleteGigDraft
  // ============================================================================

  describe("deleteGigDraft", () => {
    it("should delete a draft successfully", async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      mockSupabase.from.mockReturnValue(
        createChainableMock({ data: null, error: null })
      );

      await expect(deleteGigDraft("draft-001")).resolves.not.toThrow();
      expect(mockSupabase.from).toHaveBeenCalledWith("gig_drafts");
    });

    it("should throw error when authentication fails", async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: { message: "Session expired" },
      });

      await expect(deleteGigDraft("draft-001")).rejects.toThrow(
        "Authentication failed: Session expired"
      );
    });

    it("should throw error when user is not authenticated", async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null,
      });

      await expect(deleteGigDraft("draft-001")).rejects.toThrow(
        "Not authenticated. Please sign in again."
      );
    });

    it("should throw error on delete failure", async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      mockSupabase.from.mockReturnValue(
        createChainableMock({
          data: null,
          error: { message: "Foreign key constraint" },
        })
      );

      await expect(deleteGigDraft("draft-001")).rejects.toThrow(
        "Foreign key constraint"
      );
    });

    it("should use fallback message when delete error has no message", async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      mockSupabase.from.mockReturnValue(
        createChainableMock({
          data: null,
          error: { message: "" },
        })
      );

      await expect(deleteGigDraft("draft-001")).rejects.toThrow(
        "Failed to delete draft"
      );
    });

    it("should return void on success", async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      mockSupabase.from.mockReturnValue(
        createChainableMock({ data: null, error: null })
      );

      const result = await deleteGigDraft("draft-001");

      expect(result).toBeUndefined();
    });
  });
});
