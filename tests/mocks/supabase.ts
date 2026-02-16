import { vi } from "vitest";

/**
 * Creates a chainable mock for Supabase query builder methods.
 * Each method returns `this` to allow chaining, and the terminal
 * methods (single, maybeSingle) return the configured result.
 */
export function createChainableMock(result: { data: unknown; error: unknown }) {
  const mock = {
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    upsert: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    neq: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    is: vi.fn().mockReturnThis(),
    not: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    lte: vi.fn().mockReturnThis(),
    gt: vi.fn().mockReturnThis(),
    lt: vi.fn().mockReturnThis(),
    like: vi.fn().mockReturnThis(),
    ilike: vi.fn().mockReturnThis(),
    or: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    range: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue(result),
    maybeSingle: vi.fn().mockResolvedValue(result),
    then: vi.fn().mockResolvedValue(result),
  };

  // Make the mock itself thenable so `await supabase.from(...).select(...)` works
  Object.assign(mock, {
    then: (resolve: (value: unknown) => void) => Promise.resolve(result).then(resolve),
  });

  return mock;
}

/**
 * Creates a mock Supabase client with configurable behavior.
 */
export function createMockSupabaseClient(options: {
  user?: { id: string; email: string } | null;
} = {}) {
  const { user = null } = options;

  const mockFrom = vi.fn(() => createChainableMock({ data: null, error: null }));

  const mockAuth = {
    getUser: vi.fn().mockResolvedValue({
      data: { user },
      error: null,
    }),
    getSession: vi.fn().mockResolvedValue({
      data: { session: user ? { user } : null },
      error: null,
    }),
    onAuthStateChange: vi.fn().mockReturnValue({
      data: { subscription: { unsubscribe: vi.fn() } },
    }),
    signOut: vi.fn().mockResolvedValue({ error: null }),
  };

  return {
    from: mockFrom,
    auth: mockAuth,
  };
}

/**
 * Helper to configure mock responses for specific tables.
 *
 * Usage:
 * ```ts
 * const mockClient = createMockSupabaseClient({ user: mockUser });
 * configureMockResponse(mockClient, 'gigs', { data: mockGig, error: null });
 * ```
 */
export function configureMockResponse(
  mockClient: ReturnType<typeof createMockSupabaseClient>,
  _table: string,
  result: { data: unknown; error: unknown }
) {
  mockClient.from.mockReturnValue(createChainableMock(result));
}

/**
 * Type for mocking the createClient function.
 */
export type MockSupabaseClient = ReturnType<typeof createMockSupabaseClient>;
