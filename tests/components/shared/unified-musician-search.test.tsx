import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { UnifiedMusicianSearch } from "@/components/shared/unified-musician-search";
import { searchContacts } from "@/lib/api/musician-contacts";
import { searchSystemUsers } from "@/lib/api/users";
import { mockContact, mockSystemUser } from "../../fixtures/gigs";

// Mock the API modules
vi.mock("@/lib/api/musician-contacts", () => ({
  searchContacts: vi.fn(),
}));

vi.mock("@/lib/api/users", () => ({
  searchSystemUsers: vi.fn(),
}));

// Mock the user provider
vi.mock("@/lib/providers/user-provider", () => ({
  useUser: vi.fn(() => ({
    user: { id: "current-user-id", email: "test@example.com" },
    profile: { name: "Current User" },
    isLoading: false,
  })),
}));

describe("UnifiedMusicianSearch", () => {
  let queryClient: QueryClient;

  const defaultProps = {
    gigId: "test-gig-id",
    onAddFromCircle: vi.fn(),
    onAddSystemUser: vi.fn(),
    onInviteByEmail: vi.fn(),
    onInviteByWhatsApp: vi.fn(),
  };

  const renderComponent = (props = {}) => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
          gcTime: 0,
        },
      },
    });

    return render(
      <QueryClientProvider client={queryClient}>
        <UnifiedMusicianSearch {...defaultProps} {...props} />
      </QueryClientProvider>
    );
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(searchContacts).mockResolvedValue([]);
    vi.mocked(searchSystemUsers).mockResolvedValue([]);
  });

  // ============================================================================
  // Rendering Tests
  // ============================================================================

  describe("rendering", () => {
    it("should render trigger button with search icon", () => {
      renderComponent();

      const button = screen.getByRole("combobox");
      expect(button).toBeInTheDocument();
      expect(button).toHaveTextContent("Add musician...");
    });

    it("should not show popover content initially", () => {
      renderComponent();

      expect(screen.queryByPlaceholderText("Search by name or email...")).not.toBeInTheDocument();
    });

    it("should open popover when button is clicked", async () => {
      const user = userEvent.setup();
      renderComponent();

      await user.click(screen.getByRole("combobox"));

      expect(screen.getByPlaceholderText("Search by name or email...")).toBeInTheDocument();
    });

    it("should show minimum character message when search is less than 2 chars", async () => {
      const user = userEvent.setup();
      renderComponent();

      await user.click(screen.getByRole("combobox"));
      await user.type(screen.getByPlaceholderText("Search by name or email..."), "J");

      expect(screen.getByText("Type at least 2 characters to search...")).toBeInTheDocument();
    });
  });

  // ============================================================================
  // Search Behavior Tests
  // ============================================================================

  describe("search behavior", () => {
    it("should search contacts when typing 2+ characters", async () => {
      const user = userEvent.setup();
      renderComponent();

      await user.click(screen.getByRole("combobox"));
      await user.type(screen.getByPlaceholderText("Search by name or email..."), "Jo");

      await waitFor(() => {
        expect(searchContacts).toHaveBeenCalledWith("current-user-id", "Jo");
      });
    });

    it("should search system users when typing 2+ characters", async () => {
      const user = userEvent.setup();
      renderComponent();

      await user.click(screen.getByRole("combobox"));
      await user.type(screen.getByPlaceholderText("Search by name or email..."), "Jo");

      await waitFor(() => {
        expect(searchSystemUsers).toHaveBeenCalledWith("Jo");
      });
    });

    it("should still show invite options when no search results found", async () => {
      // Note: "No matches found" message doesn't appear because invite options
      // are always shown when typing 2+ characters
      const user = userEvent.setup();
      vi.mocked(searchContacts).mockResolvedValue([]);
      vi.mocked(searchSystemUsers).mockResolvedValue([]);

      renderComponent();

      await user.click(screen.getByRole("combobox"));
      await user.type(screen.getByPlaceholderText("Search by name or email..."), "xyz123");

      await waitFor(() => {
        // Invite options are always available
        expect(screen.getByText('Invite "xyz123" by email...')).toBeInTheDocument();
        expect(screen.getByText('Invite "xyz123" by WhatsApp...')).toBeInTheDocument();
      });

      // No Circle or System Users sections
      expect(screen.queryByText("My Circle")).not.toBeInTheDocument();
      expect(screen.queryByText("System Users")).not.toBeInTheDocument();
    });
  });

  // ============================================================================
  // Circle Results Tests
  // ============================================================================

  describe("My Circle results", () => {
    it("should display contacts from My Circle", async () => {
      const user = userEvent.setup();
      vi.mocked(searchContacts).mockResolvedValue([mockContact]);

      renderComponent();

      await user.click(screen.getByRole("combobox"));
      await user.type(screen.getByPlaceholderText("Search by name or email..."), "Jo");

      await waitFor(() => {
        expect(screen.getByText("Jane Smith")).toBeInTheDocument();
      });
      expect(screen.getByText("My Circle")).toBeInTheDocument();
    });

    it("should display contact details (instrument, fee, times worked)", async () => {
      const user = userEvent.setup();
      const contactWithDetails = {
        ...mockContact,
        primary_instrument: "Piano",
        default_fee: 500,
        times_worked_together: 3,
      };
      vi.mocked(searchContacts).mockResolvedValue([contactWithDetails]);

      renderComponent();

      await user.click(screen.getByRole("combobox"));
      await user.type(screen.getByPlaceholderText("Search by name or email..."), "Ja");

      await waitFor(() => {
        expect(screen.getByText("Piano")).toBeInTheDocument();
        // formatCurrency adds 2 decimal places
        expect(screen.getByText("₪500.00")).toBeInTheDocument();
        expect(screen.getByText("3x")).toBeInTheDocument();
      });
    });

    it("should show Active badge for active_user status", async () => {
      const user = userEvent.setup();
      const activeContact = { ...mockContact, status: "active_user" as const };
      vi.mocked(searchContacts).mockResolvedValue([activeContact]);

      renderComponent();

      await user.click(screen.getByRole("combobox"));
      await user.type(screen.getByPlaceholderText("Search by name or email..."), "Ja");

      await waitFor(() => {
        expect(screen.getByText("Active")).toBeInTheDocument();
      });
    });

    it("should call onAddFromCircle when selecting a contact", async () => {
      const user = userEvent.setup();
      vi.mocked(searchContacts).mockResolvedValue([mockContact]);

      renderComponent();

      await user.click(screen.getByRole("combobox"));
      await user.type(screen.getByPlaceholderText("Search by name or email..."), "Ja");

      await waitFor(() => {
        expect(screen.getByText("Jane Smith")).toBeInTheDocument();
      });

      // Click on the contact result
      await user.click(screen.getByText("Jane Smith"));

      expect(defaultProps.onAddFromCircle).toHaveBeenCalledWith(
        mockContact.id,
        mockContact.contact_name,
        mockContact.default_roles?.[0] || "Musician",
        mockContact.default_fee,
        mockContact.linked_user_id
      );
    });

    it("should close popover after selecting a contact", async () => {
      const user = userEvent.setup();
      vi.mocked(searchContacts).mockResolvedValue([mockContact]);

      renderComponent();

      await user.click(screen.getByRole("combobox"));
      await user.type(screen.getByPlaceholderText("Search by name or email..."), "Ja");

      await waitFor(() => {
        expect(screen.getByText("Jane Smith")).toBeInTheDocument();
      });

      await user.click(screen.getByText("Jane Smith"));

      await waitFor(() => {
        expect(screen.queryByPlaceholderText("Search by name or email...")).not.toBeInTheDocument();
      });
    });
  });

  // ============================================================================
  // System Users Results Tests
  // ============================================================================

  describe("System Users results", () => {
    it("should display system users", async () => {
      const user = userEvent.setup();
      vi.mocked(searchSystemUsers).mockResolvedValue([mockSystemUser]);

      renderComponent();

      await user.click(screen.getByRole("combobox"));
      await user.type(screen.getByPlaceholderText("Search by name or email..."), "Al");

      await waitFor(() => {
        expect(screen.getByText("Alice Johnson")).toBeInTheDocument();
      });
      expect(screen.getByText("System Users")).toBeInTheDocument();
    });

    it("should display system user instrument", async () => {
      const user = userEvent.setup();
      vi.mocked(searchSystemUsers).mockResolvedValue([mockSystemUser]);

      renderComponent();

      await user.click(screen.getByRole("combobox"));
      await user.type(screen.getByPlaceholderText("Search by name or email..."), "Al");

      await waitFor(() => {
        expect(screen.getByText("Drums")).toBeInTheDocument();
      });
    });

    it("should filter out current user from system results", async () => {
      const user = userEvent.setup();
      const currentUserResult = { ...mockSystemUser, id: "current-user-id", name: "Current User" };
      vi.mocked(searchSystemUsers).mockResolvedValue([currentUserResult, mockSystemUser]);

      renderComponent();

      await user.click(screen.getByRole("combobox"));
      await user.type(screen.getByPlaceholderText("Search by name or email..."), "us");

      await waitFor(() => {
        expect(screen.getByText("Alice Johnson")).toBeInTheDocument();
      });

      expect(screen.queryByText("Current User")).not.toBeInTheDocument();
    });

    it("should filter out contacts already in circle from system results", async () => {
      const user = userEvent.setup();
      const linkedSystemUser = { ...mockSystemUser, id: "linked-user-123" };
      const contactWithLinkedUser = { ...mockContact, linked_user_id: "linked-user-123" };

      vi.mocked(searchContacts).mockResolvedValue([contactWithLinkedUser]);
      vi.mocked(searchSystemUsers).mockResolvedValue([linkedSystemUser]);

      renderComponent();

      await user.click(screen.getByRole("combobox"));
      await user.type(screen.getByPlaceholderText("Search by name or email..."), "Al");

      await waitFor(() => {
        expect(screen.getByText("Jane Smith")).toBeInTheDocument(); // Circle contact shows
      });

      // System user with same linked ID should NOT appear
      expect(screen.queryByText("System Users")).not.toBeInTheDocument();
    });

    it("should call onAddSystemUser when selecting a system user", async () => {
      const user = userEvent.setup();
      vi.mocked(searchSystemUsers).mockResolvedValue([mockSystemUser]);

      renderComponent();

      await user.click(screen.getByRole("combobox"));
      await user.type(screen.getByPlaceholderText("Search by name or email..."), "Al");

      await waitFor(() => {
        expect(screen.getByText("Alice Johnson")).toBeInTheDocument();
      });

      await user.click(screen.getByText("Alice Johnson"));

      expect(defaultProps.onAddSystemUser).toHaveBeenCalledWith(
        mockSystemUser.id,
        mockSystemUser.name,
        mockSystemUser.main_instrument
      );
    });
  });

  // ============================================================================
  // Invite Options Tests
  // ============================================================================

  describe("invite options", () => {
    it("should show invite options when typing 2+ characters", async () => {
      const user = userEvent.setup();
      renderComponent();

      await user.click(screen.getByRole("combobox"));
      await user.type(screen.getByPlaceholderText("Search by name or email..."), "New Person");

      await waitFor(() => {
        expect(screen.getByText("Invite New Person")).toBeInTheDocument();
        expect(screen.getByText('Invite "New Person" by email...')).toBeInTheDocument();
        expect(screen.getByText('Invite "New Person" by WhatsApp...')).toBeInTheDocument();
      });
    });

    it("should call onInviteByEmail when selecting email option", async () => {
      const user = userEvent.setup();
      renderComponent();

      await user.click(screen.getByRole("combobox"));
      await user.type(screen.getByPlaceholderText("Search by name or email..."), "New");

      await waitFor(() => {
        expect(screen.getByText('Invite "New" by email...')).toBeInTheDocument();
      });

      await user.click(screen.getByText('Invite "New" by email...'));

      expect(defaultProps.onInviteByEmail).toHaveBeenCalled();
    });

    it("should call onInviteByWhatsApp when selecting WhatsApp option", async () => {
      const user = userEvent.setup();
      renderComponent();

      await user.click(screen.getByRole("combobox"));
      await user.type(screen.getByPlaceholderText("Search by name or email..."), "New");

      await waitFor(() => {
        expect(screen.getByText('Invite "New" by WhatsApp...')).toBeInTheDocument();
      });

      await user.click(screen.getByText('Invite "New" by WhatsApp...'));

      expect(defaultProps.onInviteByWhatsApp).toHaveBeenCalled();
    });

    it("should close popover after selecting invite option", async () => {
      const user = userEvent.setup();
      renderComponent();

      await user.click(screen.getByRole("combobox"));
      await user.type(screen.getByPlaceholderText("Search by name or email..."), "New");

      await waitFor(() => {
        expect(screen.getByText('Invite "New" by email...')).toBeInTheDocument();
      });

      await user.click(screen.getByText('Invite "New" by email...'));

      await waitFor(() => {
        expect(screen.queryByPlaceholderText("Search by name or email...")).not.toBeInTheDocument();
      });
    });
  });

  // ============================================================================
  // Combined Results Tests
  // ============================================================================

  describe("combined results", () => {
    it("should show both Circle and System Users with separator when both have results", async () => {
      const user = userEvent.setup();
      vi.mocked(searchContacts).mockResolvedValue([mockContact]);
      vi.mocked(searchSystemUsers).mockResolvedValue([mockSystemUser]);

      renderComponent();

      await user.click(screen.getByRole("combobox"));
      await user.type(screen.getByPlaceholderText("Search by name or email..."), "Musician");

      await waitFor(() => {
        expect(screen.getByText("My Circle")).toBeInTheDocument();
        expect(screen.getByText("System Users")).toBeInTheDocument();
        expect(screen.getByText("Jane Smith")).toBeInTheDocument();
        expect(screen.getByText("Alice Johnson")).toBeInTheDocument();
      });
    });

    it("should not show 'No matches' when results exist", async () => {
      const user = userEvent.setup();
      vi.mocked(searchContacts).mockResolvedValue([mockContact]);

      renderComponent();

      await user.click(screen.getByRole("combobox"));
      await user.type(screen.getByPlaceholderText("Search by name or email..."), "Ja");

      await waitFor(() => {
        expect(screen.getByText("Jane Smith")).toBeInTheDocument();
      });

      expect(screen.queryByText("No matches found")).not.toBeInTheDocument();
    });
  });
});
