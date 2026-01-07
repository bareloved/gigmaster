import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { EditRoleDialog } from "@/components/roles/edit-role-dialog";
import { updateRole } from "@/lib/api/gig-roles";
import { mockGigRole } from "../../fixtures/gigs";

// Mock the API module
vi.mock("@/lib/api/gig-roles", () => ({
  updateRole: vi.fn(),
}));

// Mock the keyboard submit hook
vi.mock("@/hooks/use-keyboard-submit", () => ({
  useKeyboardSubmit: vi.fn(),
}));

// Mock the keyboard shortcut hint component
vi.mock("@/components/shared/keyboard-shortcut-hint", () => ({
  KeyboardShortcutHint: () => <div data-testid="keyboard-hint">⌘+Enter</div>,
}));

describe("EditRoleDialog", () => {
  const defaultProps = {
    open: true,
    onOpenChange: vi.fn(),
    onSuccess: vi.fn(),
    role: { ...mockGigRole, role_name: "Keys" },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(updateRole).mockResolvedValue(mockGigRole);
  });

  // ============================================================================
  // Rendering Tests
  // ============================================================================

  describe("rendering", () => {
    it("should render dialog with title and description", () => {
      render(<EditRoleDialog {...defaultProps} />);

      expect(screen.getByRole("dialog")).toBeInTheDocument();
      expect(screen.getByText("Edit Role")).toBeInTheDocument();
      expect(
        screen.getByText("Update the role details and musician assignment.")
      ).toBeInTheDocument();
    });

    it("should render form fields with labels", () => {
      render(<EditRoleDialog {...defaultProps} />);

      expect(screen.getByLabelText("Musician Name")).toBeInTheDocument();
      expect(screen.getByLabelText("Fee (optional)")).toBeInTheDocument();
      expect(screen.getByLabelText("Notes (optional)")).toBeInTheDocument();
    });

    it("should render Cancel and Save buttons", () => {
      render(<EditRoleDialog {...defaultProps} />);

      expect(screen.getByRole("button", { name: "Cancel" })).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: "Save Changes" })
      ).toBeInTheDocument();
    });

    it("should pre-fill form with role data", () => {
      render(<EditRoleDialog {...defaultProps} />);

      // Musician name should be pre-filled
      expect(screen.getByLabelText("Musician Name")).toHaveValue("John Doe");

      // Fee should be pre-filled
      expect(screen.getByLabelText("Fee (optional)")).toHaveValue(500);
    });

    it("should show custom role input when role is not in common list", () => {
      const customRole = { ...mockGigRole, role_name: "Percussionist" };
      render(<EditRoleDialog {...defaultProps} role={customRole} />);

      expect(screen.getByLabelText(/Custom Role Name/)).toBeInTheDocument();
      expect(screen.getByLabelText(/Custom Role Name/)).toHaveValue("Percussionist");
    });

    it("should hide custom input when role is in common list", () => {
      render(<EditRoleDialog {...defaultProps} />);

      expect(screen.queryByLabelText(/Custom Role Name/)).not.toBeInTheDocument();
    });

    it("should not render when closed", () => {
      render(<EditRoleDialog {...defaultProps} open={false} />);

      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
  });

  // ============================================================================
  // Form Interaction Tests
  // ============================================================================

  describe("form interactions", () => {
    it("should update musician name when typing", async () => {
      const user = userEvent.setup();
      render(<EditRoleDialog {...defaultProps} />);

      const input = screen.getByLabelText("Musician Name");
      await user.clear(input);
      await user.type(input, "Jane Smith");

      expect(input).toHaveValue("Jane Smith");
    });

    it("should update fee when typing", async () => {
      const user = userEvent.setup();
      render(<EditRoleDialog {...defaultProps} />);

      const input = screen.getByLabelText("Fee (optional)");
      await user.clear(input);
      await user.type(input, "750");

      expect(input).toHaveValue(750);
    });

    it("should update notes when typing", async () => {
      const user = userEvent.setup();
      render(<EditRoleDialog {...defaultProps} />);

      const input = screen.getByLabelText("Notes (optional)");
      await user.type(input, "Bring extra cables");

      expect(input).toHaveValue("Bring extra cables");
    });

    it("should call onOpenChange when Cancel is clicked", async () => {
      const user = userEvent.setup();
      render(<EditRoleDialog {...defaultProps} />);

      await user.click(screen.getByRole("button", { name: "Cancel" }));

      expect(defaultProps.onOpenChange).toHaveBeenCalledWith(false);
    });
  });

  // ============================================================================
  // Form Submission Tests
  // ============================================================================

  describe("form submission", () => {
    it("should call updateRole when form is submitted", async () => {
      render(<EditRoleDialog {...defaultProps} />);

      // Submit using fireEvent for more reliable form submission
      const form = screen.getByRole("dialog").querySelector("form")!;
      fireEvent.submit(form);

      await waitFor(() => {
        expect(updateRole).toHaveBeenCalledWith(
          defaultProps.role.id,
          expect.objectContaining({
            role_name: "Keys",
            musician_name: "John Doe",
          })
        );
      });
    });

    it("should call onSuccess and close dialog after successful submit", async () => {
      render(<EditRoleDialog {...defaultProps} />);

      const form = screen.getByRole("dialog").querySelector("form")!;
      fireEvent.submit(form);

      await waitFor(() => {
        expect(defaultProps.onSuccess).toHaveBeenCalled();
        expect(defaultProps.onOpenChange).toHaveBeenCalledWith(false);
      });
    });

    it("should handle null values correctly", async () => {
      const roleWithNulls = {
        ...mockGigRole,
        role_name: "Keys",
        musician_name: null,
        agreed_fee: null,
        notes: null,
      };
      render(<EditRoleDialog {...defaultProps} role={roleWithNulls} />);

      const form = screen.getByRole("dialog").querySelector("form")!;
      fireEvent.submit(form);

      await waitFor(() => {
        expect(updateRole).toHaveBeenCalledWith(roleWithNulls.id, {
          role_name: "Keys",
          musician_name: null,
          agreed_fee: null,
          notes: null,
        });
      });
    });
  });

  // ============================================================================
  // Validation Tests
  // ============================================================================

  describe("validation", () => {
    it("should show error when submitting with empty custom role", async () => {
      const user = userEvent.setup();
      const customRole = { ...mockGigRole, role_name: "Percussionist" };
      render(<EditRoleDialog {...defaultProps} role={customRole} />);

      // Clear the custom role input
      const customInput = screen.getByLabelText(/Custom Role Name/);
      await user.clear(customInput);

      // Submit form
      const form = screen.getByRole("dialog").querySelector("form")!;
      fireEvent.submit(form);

      await waitFor(() => {
        expect(screen.getByText("Role name is required")).toBeInTheDocument();
      });

      // Should not call API
      expect(updateRole).not.toHaveBeenCalled();
    });
  });

  // ============================================================================
  // Error Handling Tests
  // ============================================================================

  describe("error handling", () => {
    it("should display API error message", async () => {
      vi.mocked(updateRole).mockRejectedValue(new Error("Network error"));

      render(<EditRoleDialog {...defaultProps} />);

      const form = screen.getByRole("dialog").querySelector("form")!;
      fireEvent.submit(form);

      await waitFor(() => {
        expect(screen.getByText("Network error")).toBeInTheDocument();
      });

      // Should not close dialog
      expect(defaultProps.onOpenChange).not.toHaveBeenCalled();
    });

    it("should display generic error for non-Error throws", async () => {
      vi.mocked(updateRole).mockRejectedValue("Something went wrong");

      render(<EditRoleDialog {...defaultProps} />);

      const form = screen.getByRole("dialog").querySelector("form")!;
      fireEvent.submit(form);

      await waitFor(() => {
        expect(screen.getByText("Failed to update role")).toBeInTheDocument();
      });
    });

    it("should re-enable form after error", async () => {
      vi.mocked(updateRole).mockRejectedValue(new Error("Failed"));

      render(<EditRoleDialog {...defaultProps} />);

      const form = screen.getByRole("dialog").querySelector("form")!;
      fireEvent.submit(form);

      await waitFor(() => {
        expect(screen.getByText("Failed")).toBeInTheDocument();
      });

      // Button should be re-enabled
      expect(
        screen.getByRole("button", { name: "Save Changes" })
      ).not.toBeDisabled();
    });
  });

  // ============================================================================
  // Custom Role Tests
  // ============================================================================

  describe("custom role handling", () => {
    it("should submit with custom role name", async () => {
      const user = userEvent.setup();
      const customRole = { ...mockGigRole, role_name: "Percussionist" };
      render(<EditRoleDialog {...defaultProps} role={customRole} />);

      // Change custom role
      const customInput = screen.getByLabelText(/Custom Role Name/);
      await user.clear(customInput);
      await user.type(customInput, "Backup Singer");

      // Submit form
      const form = screen.getByRole("dialog").querySelector("form")!;
      fireEvent.submit(form);

      await waitFor(() => {
        expect(updateRole).toHaveBeenCalledWith(
          customRole.id,
          expect.objectContaining({
            role_name: "Backup Singer",
          })
        );
      });
    });
  });
});
