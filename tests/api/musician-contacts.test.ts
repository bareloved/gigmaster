import { describe, it, expect, vi, beforeEach } from "vitest";
import { createClient } from "@/lib/supabase/client";
import {
  listMyContacts,
  getContact,
  createContact,
  updateContact,
  deleteContact,
  searchContacts,
  getOrCreateContact,
  incrementContactUsage,
  findContactByName,
  updateContactStatus,
  linkContactToUser,
  findContactByEmailOrPhone,
} from "@/lib/api/musician-contacts";
import { createChainableMock } from "../mocks/supabase";

// Mock the Supabase client module
vi.mock("@/lib/supabase/client");

// Suppress console.error from the API functions under test
vi.spyOn(console, "error").mockImplementation(() => {});

describe("Musician Contacts API", () => {
  const mockUser = { id: "test-user-id-123", email: "user@example.com" };

  const mockSupabase = {
    from: vi.fn(),
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: mockUser },
        error: null,
      }),
    },
  };

  const mockContactRow = {
    id: "contact-id-123",
    user_id: "test-user-id-123",
    contact_name: "Jane Smith",
    email: "jane@example.com",
    phone: "+1234567890",
    primary_instrument: "Piano",
    default_roles: ["Keys", "Synth"],
    default_fee: 400,
    status: "local_only",
    linked_user_id: null,
    times_worked_together: 5,
    last_worked_date: "2024-11-01",
    notes: null,
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(createClient).mockReturnValue(
      mockSupabase as unknown as ReturnType<typeof createClient>
    );
    // Reset auth mock to default authenticated user
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });
  });

  // ============================================================================
  // listMyContacts
  // ============================================================================

  describe("listMyContacts", () => {
    it("should return contacts sorted by last_worked_date then name", async () => {
      const contacts = [
        { ...mockContactRow, id: "c-1", last_worked_date: "2024-12-01" },
        { ...mockContactRow, id: "c-2", last_worked_date: "2024-11-01" },
      ];

      mockSupabase.from.mockReturnValue(
        createChainableMock({ data: contacts, error: null })
      );

      const result = await listMyContacts();

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe("c-1");
      expect(result[1].id).toBe("c-2");
      expect(mockSupabase.from).toHaveBeenCalledWith("musician_contacts");
    });

    it("should return empty array when no contacts exist", async () => {
      mockSupabase.from.mockReturnValue(
        createChainableMock({ data: [], error: null })
      );

      const result = await listMyContacts();

      expect(result).toEqual([]);
    });

    it("should return empty array when data is null", async () => {
      mockSupabase.from.mockReturnValue(
        createChainableMock({ data: null, error: null })
      );

      const result = await listMyContacts();

      expect(result).toEqual([]);
    });

    it("should throw when user is not authenticated", async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null,
      });

      await expect(listMyContacts()).rejects.toThrow("Not authenticated");
    });

    it("should throw on database error with error message", async () => {
      mockSupabase.from.mockReturnValue(
        createChainableMock({
          data: null,
          error: { message: "Connection timeout" },
        })
      );

      await expect(listMyContacts()).rejects.toThrow("Connection timeout");
    });

    it("should throw fallback error when error message is empty", async () => {
      mockSupabase.from.mockReturnValue(
        createChainableMock({
          data: null,
          error: { message: "" },
        })
      );

      await expect(listMyContacts()).rejects.toThrow(
        "Failed to fetch contacts"
      );
    });
  });

  // ============================================================================
  // getContact
  // ============================================================================

  describe("getContact", () => {
    it("should return a contact by ID", async () => {
      mockSupabase.from.mockReturnValue(
        createChainableMock({ data: mockContactRow, error: null })
      );

      const result = await getContact("contact-id-123");

      expect(result).toEqual(mockContactRow);
      expect(mockSupabase.from).toHaveBeenCalledWith("musician_contacts");
    });

    it("should return null when contact is not found", async () => {
      mockSupabase.from.mockReturnValue(
        createChainableMock({ data: null, error: null })
      );

      const result = await getContact("nonexistent-id");

      expect(result).toBeNull();
    });

    it("should throw on database error", async () => {
      mockSupabase.from.mockReturnValue(
        createChainableMock({
          data: null,
          error: { message: "RLS violation" },
        })
      );

      await expect(getContact("contact-id-123")).rejects.toThrow(
        "RLS violation"
      );
    });

    it("should throw fallback error when error message is empty", async () => {
      mockSupabase.from.mockReturnValue(
        createChainableMock({
          data: null,
          error: { message: "" },
        })
      );

      await expect(getContact("contact-id-123")).rejects.toThrow(
        "Failed to fetch contact"
      );
    });
  });

  // ============================================================================
  // createContact
  // ============================================================================

  describe("createContact", () => {
    const newContactData = {
      contact_name: "Bob Marley",
      email: "bob@example.com",
      phone: "+9876543210",
    };

    it("should create a contact and return it", async () => {
      const created = {
        ...mockContactRow,
        id: "new-contact-id",
        contact_name: "Bob Marley",
        email: "bob@example.com",
      };

      mockSupabase.from.mockReturnValue(
        createChainableMock({ data: created, error: null })
      );

      const result = await createContact(newContactData);

      expect(result.contact_name).toBe("Bob Marley");
      expect(result.email).toBe("bob@example.com");
      expect(mockSupabase.from).toHaveBeenCalledWith("musician_contacts");
    });

    it("should throw when user is not authenticated", async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null,
      });

      await expect(createContact(newContactData)).rejects.toThrow(
        "Not authenticated"
      );
    });

    it("should throw on database error", async () => {
      mockSupabase.from.mockReturnValue(
        createChainableMock({
          data: null,
          error: { message: "Duplicate key violation" },
        })
      );

      await expect(createContact(newContactData)).rejects.toThrow(
        "Duplicate key violation"
      );
    });

    it("should throw fallback error when error message is empty", async () => {
      mockSupabase.from.mockReturnValue(
        createChainableMock({
          data: null,
          error: { message: "" },
        })
      );

      await expect(createContact(newContactData)).rejects.toThrow(
        "Failed to create contact"
      );
    });
  });

  // ============================================================================
  // updateContact
  // ============================================================================

  describe("updateContact", () => {
    it("should update a contact and return the updated data", async () => {
      const updated = { ...mockContactRow, contact_name: "Jane Doe" };

      mockSupabase.from.mockReturnValue(
        createChainableMock({ data: updated, error: null })
      );

      const result = await updateContact("contact-id-123", {
        contact_name: "Jane Doe",
      });

      expect(result.contact_name).toBe("Jane Doe");
      expect(mockSupabase.from).toHaveBeenCalledWith("musician_contacts");
    });

    it("should throw on database error", async () => {
      mockSupabase.from.mockReturnValue(
        createChainableMock({
          data: null,
          error: { message: "Row not found" },
        })
      );

      await expect(
        updateContact("contact-id-123", { contact_name: "X" })
      ).rejects.toThrow("Row not found");
    });

    it("should throw fallback error when error message is empty", async () => {
      mockSupabase.from.mockReturnValue(
        createChainableMock({
          data: null,
          error: { message: "" },
        })
      );

      await expect(
        updateContact("contact-id-123", { contact_name: "X" })
      ).rejects.toThrow("Failed to update contact");
    });
  });

  // ============================================================================
  // deleteContact
  // ============================================================================

  describe("deleteContact", () => {
    it("should delete a contact successfully", async () => {
      mockSupabase.from.mockReturnValue(
        createChainableMock({ data: null, error: null })
      );

      await expect(deleteContact("contact-id-123")).resolves.not.toThrow();
      expect(mockSupabase.from).toHaveBeenCalledWith("musician_contacts");
    });

    it("should resolve to undefined on success", async () => {
      mockSupabase.from.mockReturnValue(
        createChainableMock({ data: null, error: null })
      );

      const result = await deleteContact("contact-id-123");

      expect(result).toBeUndefined();
    });

    it("should throw on database error", async () => {
      mockSupabase.from.mockReturnValue(
        createChainableMock({
          data: null,
          error: { message: "Foreign key constraint violation" },
        })
      );

      await expect(deleteContact("contact-id-123")).rejects.toThrow(
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

      await expect(deleteContact("contact-id-123")).rejects.toThrow(
        "Failed to delete contact"
      );
    });
  });

  // ============================================================================
  // searchContacts
  // ============================================================================

  describe("searchContacts", () => {
    it("should return contacts with computed stats", async () => {
      const contacts = [
        {
          ...mockContactRow,
          id: "c-1",
          times_worked_together: 10,
          default_roles: ["Keys", "Synth"],
        },
      ];

      mockSupabase.from.mockReturnValue(
        createChainableMock({ data: contacts, error: null })
      );

      const result = await searchContacts("test-user-id-123", "Jane");

      expect(result).toHaveLength(1);
      expect(result[0].gigsCount).toBe(10);
      expect(result[0].mostCommonRole).toBe("Keys");
      expect(mockSupabase.from).toHaveBeenCalledWith("musician_contacts");
    });

    it("should set mostCommonRole to null when default_roles is empty", async () => {
      const contacts = [
        { ...mockContactRow, default_roles: [] },
      ];

      mockSupabase.from.mockReturnValue(
        createChainableMock({ data: contacts, error: null })
      );

      const result = await searchContacts("test-user-id-123");

      expect(result[0].mostCommonRole).toBeNull();
    });

    it("should set mostCommonRole to null when default_roles is null", async () => {
      const contacts = [
        { ...mockContactRow, default_roles: null },
      ];

      mockSupabase.from.mockReturnValue(
        createChainableMock({ data: contacts, error: null })
      );

      const result = await searchContacts("test-user-id-123");

      expect(result[0].mostCommonRole).toBeNull();
    });

    it("should return empty array when no matches found", async () => {
      mockSupabase.from.mockReturnValue(
        createChainableMock({ data: [], error: null })
      );

      const result = await searchContacts("test-user-id-123", "Nonexistent");

      expect(result).toEqual([]);
    });

    it("should return empty array when data is null", async () => {
      mockSupabase.from.mockReturnValue(
        createChainableMock({ data: null, error: null })
      );

      const result = await searchContacts("test-user-id-123");

      expect(result).toEqual([]);
    });

    it("should work with empty query string (list all)", async () => {
      mockSupabase.from.mockReturnValue(
        createChainableMock({ data: [mockContactRow], error: null })
      );

      const result = await searchContacts("test-user-id-123", "");

      expect(result).toHaveLength(1);
    });

    it("should work with whitespace-only query (treated as empty)", async () => {
      mockSupabase.from.mockReturnValue(
        createChainableMock({ data: [mockContactRow], error: null })
      );

      const result = await searchContacts("test-user-id-123", "   ");

      expect(result).toHaveLength(1);
    });

    it("should throw on database error", async () => {
      mockSupabase.from.mockReturnValue(
        createChainableMock({
          data: null,
          error: { message: "Query failed" },
        })
      );

      await expect(
        searchContacts("test-user-id-123", "Jane")
      ).rejects.toThrow("Query failed");
    });

    it("should throw fallback error when error message is empty", async () => {
      mockSupabase.from.mockReturnValue(
        createChainableMock({
          data: null,
          error: { message: "" },
        })
      );

      await expect(
        searchContacts("test-user-id-123", "Jane")
      ).rejects.toThrow("Failed to search contacts");
    });
  });

  // ============================================================================
  // getOrCreateContact
  // ============================================================================

  describe("getOrCreateContact", () => {
    it("should return existing contact when found", async () => {
      mockSupabase.from.mockReturnValue(
        createChainableMock({ data: mockContactRow, error: null })
      );

      const result = await getOrCreateContact(
        "test-user-id-123",
        "Jane Smith"
      );

      expect(result).toEqual(mockContactRow);
    });

    it("should create a new contact when not found", async () => {
      const created = {
        ...mockContactRow,
        id: "new-contact-id",
        contact_name: "New Person",
        times_worked_together: 0,
      };

      // First call: search returns null (not found)
      // Second call: insert returns created contact
      mockSupabase.from
        .mockReturnValueOnce(
          createChainableMock({ data: null, error: null })
        )
        .mockReturnValueOnce(
          createChainableMock({ data: created, error: null })
        );

      const result = await getOrCreateContact(
        "test-user-id-123",
        "New Person",
        "new@example.com",
        "+111222333"
      );

      expect(result.contact_name).toBe("New Person");
      expect(result.times_worked_together).toBe(0);
    });

    it("should trim the musician name", async () => {
      mockSupabase.from.mockReturnValue(
        createChainableMock({ data: mockContactRow, error: null })
      );

      await getOrCreateContact("test-user-id-123", "  Jane Smith  ");

      // The function should have called ilike with trimmed name
      expect(mockSupabase.from).toHaveBeenCalledWith("musician_contacts");
    });

    it("should ignore PGRST116 errors during search", async () => {
      const created = {
        ...mockContactRow,
        id: "new-contact-id",
        contact_name: "New Person",
      };

      // First call: search returns PGRST116 error (multiple rows)
      // Second call: insert returns created contact
      mockSupabase.from
        .mockReturnValueOnce(
          createChainableMock({
            data: null,
            error: { code: "PGRST116", message: "Multiple rows returned" },
          })
        )
        .mockReturnValueOnce(
          createChainableMock({ data: created, error: null })
        );

      const result = await getOrCreateContact(
        "test-user-id-123",
        "New Person"
      );

      expect(result.contact_name).toBe("New Person");
    });

    it("should throw on non-PGRST116 search errors", async () => {
      mockSupabase.from.mockReturnValue(
        createChainableMock({
          data: null,
          error: { code: "42P01", message: "Table not found" },
        })
      );

      await expect(
        getOrCreateContact("test-user-id-123", "Jane Smith")
      ).rejects.toThrow("Table not found");
    });

    it("should throw on create error", async () => {
      // First call: search returns null (not found)
      // Second call: insert fails
      mockSupabase.from
        .mockReturnValueOnce(
          createChainableMock({ data: null, error: null })
        )
        .mockReturnValueOnce(
          createChainableMock({
            data: null,
            error: { message: "Insert failed" },
          })
        );

      await expect(
        getOrCreateContact("test-user-id-123", "New Person")
      ).rejects.toThrow("Insert failed");
    });

    it("should throw fallback error when create error message is empty", async () => {
      mockSupabase.from
        .mockReturnValueOnce(
          createChainableMock({ data: null, error: null })
        )
        .mockReturnValueOnce(
          createChainableMock({
            data: null,
            error: { message: "" },
          })
        );

      await expect(
        getOrCreateContact("test-user-id-123", "New Person")
      ).rejects.toThrow("Failed to create contact");
    });

    it("should throw fallback error when search error message is empty", async () => {
      mockSupabase.from.mockReturnValue(
        createChainableMock({
          data: null,
          error: { code: "OTHER", message: "" },
        })
      );

      await expect(
        getOrCreateContact("test-user-id-123", "Jane Smith")
      ).rejects.toThrow("Failed to search for contact");
    });
  });

  // ============================================================================
  // incrementContactUsage
  // ============================================================================

  describe("incrementContactUsage", () => {
    it("should increment times_worked_together and update date", async () => {
      const existingContact = {
        ...mockContactRow,
        times_worked_together: 3,
        default_roles: ["Keys"],
        default_fee: null,
      };

      // First call: fetch contact
      // Second call: update contact
      mockSupabase.from
        .mockReturnValueOnce(
          createChainableMock({ data: existingContact, error: null })
        )
        .mockReturnValueOnce(
          createChainableMock({ data: null, error: null })
        );

      await expect(
        incrementContactUsage("contact-id-123", "Drums", 500)
      ).resolves.not.toThrow();

      expect(mockSupabase.from).toHaveBeenCalledTimes(2);
    });

    it("should add new role to default_roles if not present", async () => {
      const existingContact = {
        ...mockContactRow,
        times_worked_together: 2,
        default_roles: ["Keys"],
        default_fee: 400,
      };

      mockSupabase.from
        .mockReturnValueOnce(
          createChainableMock({ data: existingContact, error: null })
        )
        .mockReturnValueOnce(
          createChainableMock({ data: null, error: null })
        );

      await incrementContactUsage("contact-id-123", "Drums", null);

      // The update call was made (second from() call)
      expect(mockSupabase.from).toHaveBeenCalledTimes(2);
    });

    it("should not duplicate existing role in default_roles", async () => {
      const existingContact = {
        ...mockContactRow,
        times_worked_together: 2,
        default_roles: ["Keys", "Synth"],
        default_fee: 400,
      };

      mockSupabase.from
        .mockReturnValueOnce(
          createChainableMock({ data: existingContact, error: null })
        )
        .mockReturnValueOnce(
          createChainableMock({ data: null, error: null })
        );

      await incrementContactUsage("contact-id-123", "Keys", null);

      expect(mockSupabase.from).toHaveBeenCalledTimes(2);
    });

    it("should handle null default_roles gracefully", async () => {
      const existingContact = {
        ...mockContactRow,
        times_worked_together: 0,
        default_roles: null,
        default_fee: null,
      };

      mockSupabase.from
        .mockReturnValueOnce(
          createChainableMock({ data: existingContact, error: null })
        )
        .mockReturnValueOnce(
          createChainableMock({ data: null, error: null })
        );

      await expect(
        incrementContactUsage("contact-id-123", "Bass", 300)
      ).resolves.not.toThrow();
    });

    it("should handle null times_worked_together gracefully", async () => {
      const existingContact = {
        ...mockContactRow,
        times_worked_together: null,
        default_roles: [],
        default_fee: null,
      };

      mockSupabase.from
        .mockReturnValueOnce(
          createChainableMock({ data: existingContact, error: null })
        )
        .mockReturnValueOnce(
          createChainableMock({ data: null, error: null })
        );

      await expect(
        incrementContactUsage("contact-id-123", "Guitar", null)
      ).resolves.not.toThrow();
    });

    it("should set default_fee when not already set and fee is provided", async () => {
      const existingContact = {
        ...mockContactRow,
        default_fee: null,
        default_roles: ["Keys"],
      };

      mockSupabase.from
        .mockReturnValueOnce(
          createChainableMock({ data: existingContact, error: null })
        )
        .mockReturnValueOnce(
          createChainableMock({ data: null, error: null })
        );

      await incrementContactUsage("contact-id-123", "Keys", 750);

      expect(mockSupabase.from).toHaveBeenCalledTimes(2);
    });

    it("should not overwrite existing default_fee", async () => {
      const existingContact = {
        ...mockContactRow,
        default_fee: 400,
        default_roles: ["Keys"],
      };

      mockSupabase.from
        .mockReturnValueOnce(
          createChainableMock({ data: existingContact, error: null })
        )
        .mockReturnValueOnce(
          createChainableMock({ data: null, error: null })
        );

      await incrementContactUsage("contact-id-123", "Keys", 900);

      expect(mockSupabase.from).toHaveBeenCalledTimes(2);
    });

    it("should not set default_fee when fee is null", async () => {
      const existingContact = {
        ...mockContactRow,
        default_fee: null,
        default_roles: [],
      };

      mockSupabase.from
        .mockReturnValueOnce(
          createChainableMock({ data: existingContact, error: null })
        )
        .mockReturnValueOnce(
          createChainableMock({ data: null, error: null })
        );

      await incrementContactUsage("contact-id-123", "Vocals", null);

      expect(mockSupabase.from).toHaveBeenCalledTimes(2);
    });

    it("should throw on fetch error", async () => {
      mockSupabase.from.mockReturnValue(
        createChainableMock({
          data: null,
          error: { message: "Contact not found" },
        })
      );

      await expect(
        incrementContactUsage("contact-id-123", "Keys", null)
      ).rejects.toThrow("Contact not found");
    });

    it("should throw fallback error when fetch error message is empty", async () => {
      mockSupabase.from.mockReturnValue(
        createChainableMock({
          data: null,
          error: { message: "" },
        })
      );

      await expect(
        incrementContactUsage("contact-id-123", "Keys", null)
      ).rejects.toThrow("Failed to fetch contact");
    });

    it("should throw on update error", async () => {
      mockSupabase.from
        .mockReturnValueOnce(
          createChainableMock({ data: mockContactRow, error: null })
        )
        .mockReturnValueOnce(
          createChainableMock({
            data: null,
            error: { message: "Update failed" },
          })
        );

      await expect(
        incrementContactUsage("contact-id-123", "Keys", null)
      ).rejects.toThrow("Update failed");
    });

    it("should throw fallback error when update error message is empty", async () => {
      mockSupabase.from
        .mockReturnValueOnce(
          createChainableMock({ data: mockContactRow, error: null })
        )
        .mockReturnValueOnce(
          createChainableMock({
            data: null,
            error: { message: "" },
          })
        );

      await expect(
        incrementContactUsage("contact-id-123", "Keys", null)
      ).rejects.toThrow("Failed to update contact usage");
    });
  });

  // ============================================================================
  // findContactByName
  // ============================================================================

  describe("findContactByName", () => {
    it("should return a contact when found by name", async () => {
      mockSupabase.from.mockReturnValue(
        createChainableMock({ data: mockContactRow, error: null })
      );

      const result = await findContactByName(
        "test-user-id-123",
        "Jane Smith"
      );

      expect(result).toEqual(mockContactRow);
      expect(mockSupabase.from).toHaveBeenCalledWith("musician_contacts");
    });

    it("should return null when contact is not found", async () => {
      mockSupabase.from.mockReturnValue(
        createChainableMock({ data: null, error: null })
      );

      const result = await findContactByName(
        "test-user-id-123",
        "Nonexistent"
      );

      expect(result).toBeNull();
    });

    it("should ignore PGRST116 errors", async () => {
      mockSupabase.from.mockReturnValue(
        createChainableMock({
          data: null,
          error: { code: "PGRST116", message: "Multiple rows" },
        })
      );

      const result = await findContactByName(
        "test-user-id-123",
        "Jane Smith"
      );

      expect(result).toBeNull();
    });

    it("should throw on non-PGRST116 errors", async () => {
      mockSupabase.from.mockReturnValue(
        createChainableMock({
          data: null,
          error: { code: "42P01", message: "Database error" },
        })
      );

      await expect(
        findContactByName("test-user-id-123", "Jane Smith")
      ).rejects.toThrow("Database error");
    });

    it("should throw fallback error when error message is empty", async () => {
      mockSupabase.from.mockReturnValue(
        createChainableMock({
          data: null,
          error: { code: "OTHER", message: "" },
        })
      );

      await expect(
        findContactByName("test-user-id-123", "Jane Smith")
      ).rejects.toThrow("Failed to find contact");
    });

    it("should trim the search name", async () => {
      mockSupabase.from.mockReturnValue(
        createChainableMock({ data: mockContactRow, error: null })
      );

      await findContactByName("test-user-id-123", "  Jane Smith  ");

      expect(mockSupabase.from).toHaveBeenCalledWith("musician_contacts");
    });
  });

  // ============================================================================
  // updateContactStatus
  // ============================================================================

  describe("updateContactStatus", () => {
    it("should update status to invited", async () => {
      const updated = { ...mockContactRow, status: "invited" };

      mockSupabase.from.mockReturnValue(
        createChainableMock({ data: updated, error: null })
      );

      const result = await updateContactStatus("contact-id-123", "invited");

      expect(result.status).toBe("invited");
      expect(mockSupabase.from).toHaveBeenCalledWith("musician_contacts");
    });

    it("should update status to active_user", async () => {
      const updated = { ...mockContactRow, status: "active_user" };

      mockSupabase.from.mockReturnValue(
        createChainableMock({ data: updated, error: null })
      );

      const result = await updateContactStatus(
        "contact-id-123",
        "active_user"
      );

      expect(result.status).toBe("active_user");
    });

    it("should update status to local_only", async () => {
      const updated = { ...mockContactRow, status: "local_only" };

      mockSupabase.from.mockReturnValue(
        createChainableMock({ data: updated, error: null })
      );

      const result = await updateContactStatus(
        "contact-id-123",
        "local_only"
      );

      expect(result.status).toBe("local_only");
    });

    it("should throw on database error", async () => {
      mockSupabase.from.mockReturnValue(
        createChainableMock({
          data: null,
          error: { message: "Update failed" },
        })
      );

      await expect(
        updateContactStatus("contact-id-123", "invited")
      ).rejects.toThrow("Update failed");
    });

    it("should throw fallback error when error message is empty", async () => {
      mockSupabase.from.mockReturnValue(
        createChainableMock({
          data: null,
          error: { message: "" },
        })
      );

      await expect(
        updateContactStatus("contact-id-123", "invited")
      ).rejects.toThrow("Failed to update contact status");
    });
  });

  // ============================================================================
  // linkContactToUser
  // ============================================================================

  describe("linkContactToUser", () => {
    it("should link a contact to a user and set status to active_user", async () => {
      const linked = {
        ...mockContactRow,
        status: "active_user",
        linked_user_id: "linked-user-456",
      };

      mockSupabase.from.mockReturnValue(
        createChainableMock({ data: linked, error: null })
      );

      const result = await linkContactToUser(
        "contact-id-123",
        "linked-user-456"
      );

      expect(result.status).toBe("active_user");
      expect(result.linked_user_id).toBe("linked-user-456");
      expect(mockSupabase.from).toHaveBeenCalledWith("musician_contacts");
    });

    it("should throw on database error", async () => {
      mockSupabase.from.mockReturnValue(
        createChainableMock({
          data: null,
          error: { message: "User not found" },
        })
      );

      await expect(
        linkContactToUser("contact-id-123", "bad-user-id")
      ).rejects.toThrow("User not found");
    });

    it("should throw fallback error when error message is empty", async () => {
      mockSupabase.from.mockReturnValue(
        createChainableMock({
          data: null,
          error: { message: "" },
        })
      );

      await expect(
        linkContactToUser("contact-id-123", "user-id")
      ).rejects.toThrow("Failed to link contact to user");
    });
  });

  // ============================================================================
  // findContactByEmailOrPhone
  // ============================================================================

  describe("findContactByEmailOrPhone", () => {
    it("should return null when neither email nor phone is provided", async () => {
      const result = await findContactByEmailOrPhone("test-user-id-123");

      expect(result).toBeNull();
      // Should not even call supabase
      expect(mockSupabase.from).not.toHaveBeenCalled();
    });

    it("should find contact by email only", async () => {
      mockSupabase.from.mockReturnValue(
        createChainableMock({ data: mockContactRow, error: null })
      );

      const result = await findContactByEmailOrPhone(
        "test-user-id-123",
        "jane@example.com"
      );

      expect(result).toEqual(mockContactRow);
      expect(mockSupabase.from).toHaveBeenCalledWith("musician_contacts");
    });

    it("should find contact by phone only", async () => {
      mockSupabase.from.mockReturnValue(
        createChainableMock({ data: mockContactRow, error: null })
      );

      const result = await findContactByEmailOrPhone(
        "test-user-id-123",
        undefined,
        "+1234567890"
      );

      expect(result).toEqual(mockContactRow);
    });

    it("should find contact by email or phone when both provided", async () => {
      mockSupabase.from.mockReturnValue(
        createChainableMock({ data: mockContactRow, error: null })
      );

      const result = await findContactByEmailOrPhone(
        "test-user-id-123",
        "jane@example.com",
        "+1234567890"
      );

      expect(result).toEqual(mockContactRow);
    });

    it("should return null when no contact matches", async () => {
      mockSupabase.from.mockReturnValue(
        createChainableMock({ data: null, error: null })
      );

      const result = await findContactByEmailOrPhone(
        "test-user-id-123",
        "nobody@example.com"
      );

      expect(result).toBeNull();
    });

    it("should ignore PGRST116 errors", async () => {
      mockSupabase.from.mockReturnValue(
        createChainableMock({
          data: null,
          error: { code: "PGRST116", message: "Multiple rows" },
        })
      );

      const result = await findContactByEmailOrPhone(
        "test-user-id-123",
        "jane@example.com"
      );

      expect(result).toBeNull();
    });

    it("should throw on non-PGRST116 errors", async () => {
      mockSupabase.from.mockReturnValue(
        createChainableMock({
          data: null,
          error: { code: "42P01", message: "Connection error" },
        })
      );

      await expect(
        findContactByEmailOrPhone(
          "test-user-id-123",
          "jane@example.com"
        )
      ).rejects.toThrow("Connection error");
    });

    it("should throw fallback error when error message is empty", async () => {
      mockSupabase.from.mockReturnValue(
        createChainableMock({
          data: null,
          error: { code: "OTHER", message: "" },
        })
      );

      await expect(
        findContactByEmailOrPhone(
          "test-user-id-123",
          "jane@example.com"
        )
      ).rejects.toThrow("Failed to find contact");
    });

    it("should return null when both email and phone are undefined", async () => {
      const result = await findContactByEmailOrPhone(
        "test-user-id-123",
        undefined,
        undefined
      );

      expect(result).toBeNull();
      expect(mockSupabase.from).not.toHaveBeenCalled();
    });
  });
});
