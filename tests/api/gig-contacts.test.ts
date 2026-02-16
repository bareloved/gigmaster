import { describe, it, expect, vi, beforeEach } from "vitest";
import { createClient } from "@/lib/supabase/client";
import {
  listGigContacts,
  createGigContact,
  updateGigContact,
  deleteGigContact,
  reorderGigContacts,
} from "@/lib/api/gig-contacts";
import { createChainableMock } from "../mocks/supabase";

// Mock the Supabase client module
vi.mock("@/lib/supabase/client");

describe("Gig Contacts API", () => {
  const mockSupabase = {
    from: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(createClient).mockReturnValue(
      mockSupabase as unknown as ReturnType<typeof createClient>
    );
  });

  // A reusable database row that mirrors what Supabase returns (snake_case)
  const mockDbRow = {
    id: "contact-1",
    gig_id: "gig-100",
    label: "Sound Engineer",
    name: "Dan Mixer",
    phone: "+972501234567",
    email: "dan@sound.co",
    source_type: "manual",
    source_id: null,
    sort_order: 0,
    created_at: "2026-01-15T10:00:00Z",
  };

  // The expected camelCase shape after transformation
  const expectedContact = {
    id: "contact-1",
    gigId: "gig-100",
    label: "Sound Engineer",
    name: "Dan Mixer",
    phone: "+972501234567",
    email: "dan@sound.co",
    sourceType: "manual",
    sourceId: null,
    sortOrder: 0,
    createdAt: "2026-01-15T10:00:00Z",
  };

  // ============================================================================
  // listGigContacts
  // ============================================================================

  describe("listGigContacts", () => {
    it("should return contacts sorted by sort_order", async () => {
      const rows = [
        { ...mockDbRow, id: "contact-1", sort_order: 0 },
        { ...mockDbRow, id: "contact-2", sort_order: 1, name: "Avi Light" },
      ];

      mockSupabase.from.mockReturnValue(
        createChainableMock({ data: rows, error: null })
      );

      const result = await listGigContacts("gig-100");

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe("contact-1");
      expect(result[1].id).toBe("contact-2");
      expect(result[1].name).toBe("Avi Light");
      expect(mockSupabase.from).toHaveBeenCalledWith("gig_contacts");
    });

    it("should transform snake_case database rows to camelCase", async () => {
      mockSupabase.from.mockReturnValue(
        createChainableMock({ data: [mockDbRow], error: null })
      );

      const result = await listGigContacts("gig-100");

      expect(result[0]).toEqual(expectedContact);
    });

    it("should return empty array when no contacts exist", async () => {
      mockSupabase.from.mockReturnValue(
        createChainableMock({ data: [], error: null })
      );

      const result = await listGigContacts("gig-100");

      expect(result).toEqual([]);
    });

    it("should return empty array when data is null", async () => {
      mockSupabase.from.mockReturnValue(
        createChainableMock({ data: null, error: null })
      );

      const result = await listGigContacts("gig-100");

      expect(result).toEqual([]);
    });

    it("should throw error on database failure", async () => {
      mockSupabase.from.mockReturnValue(
        createChainableMock({
          data: null,
          error: { message: "Connection failed" },
        })
      );

      await expect(listGigContacts("gig-100")).rejects.toEqual({
        message: "Connection failed",
      });
    });

    it("should handle contacts with null phone and email", async () => {
      const rowWithNulls = {
        ...mockDbRow,
        phone: null,
        email: null,
      };

      mockSupabase.from.mockReturnValue(
        createChainableMock({ data: [rowWithNulls], error: null })
      );

      const result = await listGigContacts("gig-100");

      expect(result[0].phone).toBeNull();
      expect(result[0].email).toBeNull();
    });

    it("should correctly map all source_type values", async () => {
      const rows = [
        { ...mockDbRow, id: "c-1", source_type: "manual", sort_order: 0 },
        { ...mockDbRow, id: "c-2", source_type: "lineup", sort_order: 1 },
        { ...mockDbRow, id: "c-3", source_type: "contact", sort_order: 2 },
      ];

      mockSupabase.from.mockReturnValue(
        createChainableMock({ data: rows, error: null })
      );

      const result = await listGigContacts("gig-100");

      expect(result[0].sourceType).toBe("manual");
      expect(result[1].sourceType).toBe("lineup");
      expect(result[2].sourceType).toBe("contact");
    });
  });

  // ============================================================================
  // createGigContact
  // ============================================================================

  describe("createGigContact", () => {
    it("should create a contact and return the transformed result", async () => {
      mockSupabase.from.mockReturnValue(
        createChainableMock({ data: mockDbRow, error: null })
      );

      const result = await createGigContact({
        gigId: "gig-100",
        label: "Sound Engineer",
        name: "Dan Mixer",
        phone: "+972501234567",
        email: "dan@sound.co",
        sourceType: "manual",
        sourceId: null,
        sortOrder: 0,
      });

      expect(result).toEqual(expectedContact);
      expect(mockSupabase.from).toHaveBeenCalledWith("gig_contacts");
    });

    it("should pass correct snake_case fields to insert", async () => {
      const chainable = createChainableMock({ data: mockDbRow, error: null });
      mockSupabase.from.mockReturnValue(chainable);

      await createGigContact({
        gigId: "gig-100",
        label: "Venue Manager",
        name: "Sarah Stage",
        phone: null,
        email: "sarah@venue.com",
        sourceType: "contact",
        sourceId: "contact-abc",
        sortOrder: 3,
      });

      expect(chainable.insert).toHaveBeenCalledWith({
        gig_id: "gig-100",
        label: "Venue Manager",
        name: "Sarah Stage",
        phone: null,
        email: "sarah@venue.com",
        source_type: "contact",
        source_id: "contact-abc",
        sort_order: 3,
      });
    });

    it("should throw error on insert failure", async () => {
      mockSupabase.from.mockReturnValue(
        createChainableMock({
          data: null,
          error: { message: "Duplicate contact" },
        })
      );

      await expect(
        createGigContact({
          gigId: "gig-100",
          label: "Sound Engineer",
          name: "Dan Mixer",
          phone: null,
          email: null,
          sourceType: "manual",
          sourceId: null,
          sortOrder: 0,
        })
      ).rejects.toEqual({ message: "Duplicate contact" });
    });

    it("should create a contact with a source_id from lineup", async () => {
      const lineupRow = {
        ...mockDbRow,
        source_type: "lineup",
        source_id: "role-456",
      };

      mockSupabase.from.mockReturnValue(
        createChainableMock({ data: lineupRow, error: null })
      );

      const result = await createGigContact({
        gigId: "gig-100",
        label: "Guitarist",
        name: "Yoni Strings",
        phone: "+972509876543",
        email: null,
        sourceType: "lineup",
        sourceId: "role-456",
        sortOrder: 1,
      });

      expect(result.sourceType).toBe("lineup");
      expect(result.sourceId).toBe("role-456");
    });
  });

  // ============================================================================
  // updateGigContact
  // ============================================================================

  describe("updateGigContact", () => {
    it("should update a contact and return the transformed result", async () => {
      const updatedRow = { ...mockDbRow, name: "Dan Updated" };

      mockSupabase.from.mockReturnValue(
        createChainableMock({ data: updatedRow, error: null })
      );

      const result = await updateGigContact("contact-1", { name: "Dan Updated" });

      expect(result.name).toBe("Dan Updated");
      expect(result.id).toBe("contact-1");
      expect(mockSupabase.from).toHaveBeenCalledWith("gig_contacts");
    });

    it("should only include defined fields in the update payload", async () => {
      const chainable = createChainableMock({ data: mockDbRow, error: null });
      mockSupabase.from.mockReturnValue(chainable);

      await updateGigContact("contact-1", {
        name: "New Name",
        phone: "+972501111111",
      });

      expect(chainable.update).toHaveBeenCalledWith({
        name: "New Name",
        phone: "+972501111111",
      });
    });

    it("should handle updating all possible fields", async () => {
      const chainable = createChainableMock({ data: mockDbRow, error: null });
      mockSupabase.from.mockReturnValue(chainable);

      await updateGigContact("contact-1", {
        label: "New Label",
        name: "New Name",
        phone: "+972500000000",
        email: "new@email.com",
        sourceType: "contact",
        sourceId: "src-999",
        sortOrder: 5,
      });

      expect(chainable.update).toHaveBeenCalledWith({
        label: "New Label",
        name: "New Name",
        phone: "+972500000000",
        email: "new@email.com",
        source_type: "contact",
        source_id: "src-999",
        sort_order: 5,
      });
    });

    it("should send an empty object when no fields are provided", async () => {
      const chainable = createChainableMock({ data: mockDbRow, error: null });
      mockSupabase.from.mockReturnValue(chainable);

      await updateGigContact("contact-1", {});

      expect(chainable.update).toHaveBeenCalledWith({});
    });

    it("should throw error on update failure", async () => {
      mockSupabase.from.mockReturnValue(
        createChainableMock({
          data: null,
          error: { message: "Not found" },
        })
      );

      await expect(
        updateGigContact("nonexistent-id", { name: "Nope" })
      ).rejects.toEqual({ message: "Not found" });
    });

    it("should correctly map sourceType to source_type in update", async () => {
      const chainable = createChainableMock({ data: mockDbRow, error: null });
      mockSupabase.from.mockReturnValue(chainable);

      await updateGigContact("contact-1", { sourceType: "lineup" });

      expect(chainable.update).toHaveBeenCalledWith({
        source_type: "lineup",
      });
    });
  });

  // ============================================================================
  // deleteGigContact
  // ============================================================================

  describe("deleteGigContact", () => {
    it("should delete a contact successfully", async () => {
      mockSupabase.from.mockReturnValue(
        createChainableMock({ data: null, error: null })
      );

      await expect(deleteGigContact("contact-1")).resolves.not.toThrow();
      expect(mockSupabase.from).toHaveBeenCalledWith("gig_contacts");
    });

    it("should return void on success", async () => {
      mockSupabase.from.mockReturnValue(
        createChainableMock({ data: null, error: null })
      );

      const result = await deleteGigContact("contact-1");

      expect(result).toBeUndefined();
    });

    it("should throw error on delete failure", async () => {
      mockSupabase.from.mockReturnValue(
        createChainableMock({
          data: null,
          error: { message: "Cannot delete" },
        })
      );

      await expect(deleteGigContact("contact-1")).rejects.toEqual({
        message: "Cannot delete",
      });
    });

    it("should throw on RLS violation", async () => {
      mockSupabase.from.mockReturnValue(
        createChainableMock({
          data: null,
          error: { message: "violates row-level security policy" },
        })
      );

      await expect(deleteGigContact("contact-1")).rejects.toEqual({
        message: "violates row-level security policy",
      });
    });
  });

  // ============================================================================
  // reorderGigContacts
  // ============================================================================

  describe("reorderGigContacts", () => {
    it("should update sort_order for each contact", async () => {
      mockSupabase.from.mockReturnValue(
        createChainableMock({ data: null, error: null })
      );

      await reorderGigContacts("gig-100", ["c-3", "c-1", "c-2"]);

      // Should call from('gig_contacts') three times, once per contact
      expect(mockSupabase.from).toHaveBeenCalledTimes(3);
      expect(mockSupabase.from).toHaveBeenCalledWith("gig_contacts");
    });

    it("should return void on success", async () => {
      mockSupabase.from.mockReturnValue(
        createChainableMock({ data: null, error: null })
      );

      const result = await reorderGigContacts("gig-100", ["c-1", "c-2"]);

      expect(result).toBeUndefined();
    });

    it("should throw error if any update fails", async () => {
      let callCount = 0;
      mockSupabase.from.mockImplementation(() => {
        callCount++;
        if (callCount === 2) {
          return createChainableMock({
            data: null,
            error: { message: "Update failed for contact" },
          });
        }
        return createChainableMock({ data: null, error: null });
      });

      await expect(
        reorderGigContacts("gig-100", ["c-1", "c-2", "c-3"])
      ).rejects.toEqual({ message: "Update failed for contact" });
    });

    it("should handle empty array of ids", async () => {
      await reorderGigContacts("gig-100", []);

      // No Supabase calls should be made
      expect(mockSupabase.from).not.toHaveBeenCalled();
    });

    it("should handle single contact reorder", async () => {
      mockSupabase.from.mockReturnValue(
        createChainableMock({ data: null, error: null })
      );

      await expect(
        reorderGigContacts("gig-100", ["c-1"])
      ).resolves.not.toThrow();

      expect(mockSupabase.from).toHaveBeenCalledTimes(1);
    });

    it("should assign sort_order based on array position", async () => {
      const chainables: ReturnType<typeof createChainableMock>[] = [];

      mockSupabase.from.mockImplementation(() => {
        const chainable = createChainableMock({ data: null, error: null });
        chainables.push(chainable);
        return chainable;
      });

      await reorderGigContacts("gig-100", ["c-3", "c-1", "c-2"]);

      // First contact (c-3) gets sort_order 0
      expect(chainables[0].update).toHaveBeenCalledWith({ sort_order: 0 });
      // Second contact (c-1) gets sort_order 1
      expect(chainables[1].update).toHaveBeenCalledWith({ sort_order: 1 });
      // Third contact (c-2) gets sort_order 2
      expect(chainables[2].update).toHaveBeenCalledWith({ sort_order: 2 });
    });

    it("should throw the first error when multiple updates fail", async () => {
      mockSupabase.from.mockReturnValue(
        createChainableMock({
          data: null,
          error: { message: "All updates failed" },
        })
      );

      await expect(
        reorderGigContacts("gig-100", ["c-1", "c-2", "c-3"])
      ).rejects.toEqual({ message: "All updates failed" });
    });
  });
});
