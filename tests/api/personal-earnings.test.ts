import { describe, it, expect, vi, beforeEach } from "vitest";
import { createChainableMock } from "../mocks/supabase";

// Mock supabase client
const mockSupabase = {
  from: vi.fn(),
  auth: {
    getUser: vi.fn(),
  },
};

vi.mock("@/lib/supabase/client", () => ({
  createClient: vi.fn(() => mockSupabase),
}));

import { getPersonalEarnings, updatePersonalEarnings } from "@/lib/api/personal-earnings";

describe("getPersonalEarnings", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: "user-123" } },
      error: null,
    });
  });

  it("returns earnings data for user role", async () => {
    const mockRole = {
      id: "role-1",
      personal_earnings_amount: 500,
      personal_earnings_currency: "ILS",
      personal_earnings_notes: "Cash",
      personal_earnings_paid_at: "2024-12-15T00:00:00Z",
    };

    mockSupabase.from.mockReturnValue(
      createChainableMock({ data: mockRole, error: null })
    );

    const result = await getPersonalEarnings("gig-123");

    expect(result).toEqual({
      roleId: "role-1",
      earnings: {
        amount: 500,
        currency: "ILS",
        notes: "Cash",
        paidAt: "2024-12-15T00:00:00Z",
      },
    });
  });

  it("returns null when user has no role", async () => {
    mockSupabase.from.mockReturnValue(
      createChainableMock({ data: null, error: null })
    );

    const result = await getPersonalEarnings("gig-123");
    expect(result).toBeNull();
  });
});

describe("updatePersonalEarnings", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("updates earnings on the gig_role", async () => {
    const updateMock = createChainableMock({ data: null, error: null });
    mockSupabase.from.mockReturnValue(updateMock);

    await updatePersonalEarnings("role-1", {
      amount: 750,
      currency: "USD",
      notes: "Bank transfer",
      paidAt: "2024-12-20T00:00:00Z",
      paymentMethod: null,
    });

    expect(mockSupabase.from).toHaveBeenCalledWith("gig_roles");
  });

  it("throws on error", async () => {
    mockSupabase.from.mockReturnValue(
      createChainableMock({ data: null, error: { message: "RLS denied" } })
    );

    await expect(
      updatePersonalEarnings("role-1", {
        amount: 100,
        currency: "ILS",
        notes: null,
        paidAt: null,
        paymentMethod: null,
      })
    ).rejects.toThrow();
  });
});
