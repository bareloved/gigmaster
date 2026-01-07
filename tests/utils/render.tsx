import { ReactElement, ReactNode } from "react";
import { render, RenderOptions } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { vi } from "vitest";

/**
 * Creates a test QueryClient with retry disabled for predictable tests.
 */
function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: Infinity,
      },
      mutations: {
        retry: false,
      },
    },
  });
}

/**
 * Mock user context shape
 */
interface MockUserContext {
  user: { id: string; email: string } | null;
  profile: { id: string; name: string } | null;
  isLoading: boolean;
  refetch: () => void;
}

const defaultUserContext: MockUserContext = {
  user: null,
  profile: null,
  isLoading: false,
  refetch: vi.fn(),
};

interface CustomRenderOptions extends Omit<RenderOptions, "wrapper"> {
  user?: MockUserContext["user"];
  profile?: MockUserContext["profile"];
  isLoading?: boolean;
  queryClient?: QueryClient;
}

/**
 * Provider wrapper for testing components
 */
function AllProviders({
  children,
  queryClient,
}: {
  children: ReactNode;
  queryClient: QueryClient;
}) {
  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

/**
 * Custom render function that wraps components in necessary providers.
 *
 * Usage:
 * ```tsx
 * import { render, screen } from '@/tests/utils/render';
 *
 * test('renders component', () => {
 *   render(<MyComponent />, { user: mockUser, profile: mockProfile });
 *   expect(screen.getByText('Hello')).toBeInTheDocument();
 * });
 * ```
 */
export function renderWithProviders(
  ui: ReactElement,
  options: CustomRenderOptions = {}
) {
  const {
    user = null,
    profile = null,
    isLoading = false,
    queryClient = createTestQueryClient(),
    ...renderOptions
  } = options;

  // Mock the useUser hook with provided context
  const userContext: MockUserContext = {
    user,
    profile,
    isLoading,
    refetch: vi.fn(),
  };

  // Note: You'll need to mock useUser in individual tests or setup.ts
  // This is a template for the context value
  void userContext; // Suppress unused variable warning
  void defaultUserContext;

  return {
    ...render(ui, {
      wrapper: ({ children }) => (
        <AllProviders queryClient={queryClient}>{children}</AllProviders>
      ),
      ...renderOptions,
    }),
    queryClient,
  };
}

// Re-export everything from testing-library
export * from "@testing-library/react";
export { renderWithProviders as render };
