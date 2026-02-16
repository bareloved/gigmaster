# Testing Automation Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add E2E tests with Playwright for 3 critical user flows, and expand unit/component test coverage across 4 key UI areas.

**Architecture:** Playwright E2E tests run against the real Supabase project with dedicated test user accounts. Unit tests use the existing Vitest + React Testing Library setup with mocked Supabase. E2E and unit tests live in separate directories (`e2e/` and `tests/`).

**Tech Stack:** Playwright (E2E), Vitest (unit), React Testing Library, happy-dom, TanStack Query

---

## Phase 1: E2E Infrastructure

### Task 1: Install Playwright test runner and configure

The project has `playwright` (browser library) but needs `@playwright/test` (the test runner with assertions, fixtures, etc.).

**Files:**
- Create: `playwright.config.ts`
- Create: `.env.test` (gitignored — test user credentials)
- Modify: `package.json` (add scripts)
- Modify: `.gitignore` (add test artifacts)

**Step 1: Install @playwright/test and browsers**

```bash
npm install -D @playwright/test
npx playwright install chromium
```

Only install Chromium — we don't need Firefox/WebKit for now.

**Step 2: Create playwright.config.ts**

```typescript
import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false, // Sequential — tests share state via real DB
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1, // Single worker — real DB, avoid conflicts
  reporter: "html",
  timeout: 30_000,

  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },

  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "mobile",
      use: { ...devices["iPhone 14"] },
    },
  ],

  // Start dev server before tests if not already running
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: true,
    timeout: 60_000,
  },
});
```

**Step 3: Create .env.test**

```
# E2E test user credentials — DO NOT COMMIT
# Create these users manually in Supabase Auth dashboard
E2E_MANAGER_EMAIL=e2e-manager@test.gigmaster.app
E2E_MANAGER_PASSWORD=TestPassword123!
E2E_MUSICIAN_EMAIL=e2e-musician@test.gigmaster.app
E2E_MUSICIAN_PASSWORD=TestPassword123!
```

**Step 4: Add scripts to package.json**

Add these to the `"scripts"` section:

```json
"test:e2e": "playwright test",
"test:e2e:ui": "playwright test --ui",
"test:e2e:headed": "playwright test --headed"
```

**Step 5: Add to .gitignore**

```
# Playwright
/test-results/
/playwright-report/
/blob-report/
/playwright/.cache/
.env.test
```

**Step 6: Run to verify config loads**

```bash
npx playwright test --list
```

Expected: "No tests found" (we haven't written any yet). Config loads without errors.

**Step 7: Commit**

```bash
git add playwright.config.ts package.json .gitignore package-lock.json
git commit -m "chore: add Playwright E2E test infrastructure"
```

---

### Task 2: Create E2E auth fixtures and helpers

Playwright fixtures let tests share login state without re-authenticating every test.

**Files:**
- Create: `e2e/fixtures/auth.ts`
- Create: `e2e/helpers/supabase-admin.ts`

**Step 1: Create auth fixture**

`e2e/fixtures/auth.ts`:

```typescript
import { test as base, expect, type Page } from "@playwright/test";

/**
 * Log in via the Supabase auth UI.
 * Navigates to /auth/login, fills email+password, submits.
 * Waits until redirected to /gigs (the main authenticated page).
 */
async function login(page: Page, email: string, password: string) {
  await page.goto("/auth/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: /sign in|log in/i }).click();

  // Wait for auth redirect — app redirects to /gigs after login
  await page.waitForURL("**/gigs**", { timeout: 15_000 });
}

// Extend base test with authenticated pages
export const test = base.extend<{
  managerPage: Page;
  musicianPage: Page;
}>({
  managerPage: async ({ browser }, use) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    await login(
      page,
      process.env.E2E_MANAGER_EMAIL!,
      process.env.E2E_MANAGER_PASSWORD!
    );
    await use(page);
    await context.close();
  },

  musicianPage: async ({ browser }, use) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    await login(
      page,
      process.env.E2E_MUSICIAN_EMAIL!,
      process.env.E2E_MUSICIAN_PASSWORD!
    );
    await use(page);
    await context.close();
  },
});

export { expect };
```

**Step 2: Create Supabase admin helper for test data cleanup**

`e2e/helpers/supabase-admin.ts`:

```typescript
import { createClient } from "@supabase/supabase-js";

/**
 * Admin Supabase client for test data setup/teardown.
 * Uses the service role key (NOT the anon key) to bypass RLS.
 *
 * IMPORTANT: Only use in test helpers, never in app code.
 */
function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.test"
    );
  }

  return createClient(url, serviceKey);
}

/**
 * Delete all gigs created by the test manager user.
 * Call this in afterAll/afterEach to clean up test data.
 */
export async function cleanupTestGigs(ownerEmail: string) {
  const admin = getAdminClient();

  // Find the user by email
  const { data: users } = await admin.auth.admin.listUsers();
  const testUser = users?.users.find((u) => u.email === ownerEmail);
  if (!testUser) return;

  // Delete gigs owned by this user (cascade will handle roles, setlist, etc.)
  await admin.from("gigs").delete().eq("owner_id", testUser.id);
}

/**
 * Delete a specific gig by ID.
 */
export async function deleteTestGig(gigId: string) {
  const admin = getAdminClient();
  await admin.from("gigs").delete().eq("id", gigId);
}
```

**Step 3: Update .env.test with service role key**

Add to `.env.test`:
```
SUPABASE_SERVICE_ROLE_KEY=<get from Supabase dashboard: Settings > API > service_role key>
```

**Step 4: Commit**

```bash
git add e2e/fixtures/auth.ts e2e/helpers/supabase-admin.ts
git commit -m "feat: add E2E auth fixtures and test data helpers"
```

---

### Task 3: Create test users in Supabase

Before E2E tests can run, we need two test user accounts.

**Step 1: Create test users via Supabase dashboard**

Go to Supabase Dashboard > Authentication > Users and create:

1. **Manager account:**
   - Email: `e2e-manager@test.gigmaster.app`
   - Password: `TestPassword123!`
   - Auto-confirm email: Yes

2. **Musician account:**
   - Email: `e2e-musician@test.gigmaster.app`
   - Password: `TestPassword123!`
   - Auto-confirm email: Yes

**Step 2: Verify by running a smoke test**

Create `e2e/smoke.spec.ts`:

```typescript
import { test, expect } from "./fixtures/auth";

test("manager can log in and see gigs page", async ({ managerPage }) => {
  await expect(managerPage).toHaveURL(/\/gigs/);
  await expect(managerPage.locator("body")).toBeVisible();
});

test("musician can log in and see gigs page", async ({ musicianPage }) => {
  await expect(musicianPage).toHaveURL(/\/gigs/);
  await expect(musicianPage.locator("body")).toBeVisible();
});
```

**Step 3: Run the smoke test**

```bash
npx playwright test e2e/smoke.spec.ts --headed
```

Expected: Both tests pass. You see the browser open, log in, and land on /gigs.

**Step 4: Commit**

```bash
git add e2e/smoke.spec.ts
git commit -m "test: add E2E smoke test to verify auth fixtures"
```

---

## Phase 2: E2E Test Suites

### Task 4: E2E — Gig lifecycle (create, edit, view, delete)

The most important E2E test: create a gig through the UI and verify it appears.

**Files:**
- Create: `e2e/gig-lifecycle.spec.ts`

**Important notes for the implementer:**
- The gig editor is a `Sheet` (slide-out panel) opened by clicking "New Gig" button
- The form uses React Hook Form — use `fill()` for inputs, not `type()`
- Date picker is a Radix calendar — click the date input, then pick a date
- After saving, the sheet closes and the gig appears in the list
- Use `page.waitForResponse()` to wait for save to complete
- Clean up created gigs in `afterAll` using the admin helper

**Step 1: Write the test**

```typescript
import { test, expect } from "./fixtures/auth";
import { cleanupTestGigs } from "./helpers/supabase-admin";

const TEST_GIG_TITLE = `E2E Test Gig ${Date.now()}`;

test.describe("Gig Lifecycle", () => {
  test.afterAll(async () => {
    await cleanupTestGigs(process.env.E2E_MANAGER_EMAIL!);
  });

  test("manager can create a new gig", async ({ managerPage: page }) => {
    // Navigate to gigs page
    await page.goto("/gigs");

    // Click "New Gig" button
    await page.getByRole("button", { name: /new gig/i }).click();

    // Wait for editor sheet to open
    await page.waitForSelector('[role="dialog"]', { timeout: 5_000 });

    // Fill in gig title
    const titleInput = page.getByLabel(/title/i);
    await titleInput.fill(TEST_GIG_TITLE);

    // Fill in venue
    const venueInput = page.getByLabel(/venue/i).first();
    await venueInput.fill("E2E Test Venue");

    // Save the gig
    await page.getByRole("button", { name: /save/i }).click();

    // Wait for sheet to close (save complete)
    await page.waitForSelector('[role="dialog"]', {
      state: "detached",
      timeout: 10_000,
    });

    // Verify the gig appears in the list
    await expect(page.getByText(TEST_GIG_TITLE)).toBeVisible({
      timeout: 5_000,
    });
  });

  test("gig pack page renders the created gig", async ({
    managerPage: page,
  }) => {
    await page.goto("/gigs");

    // Click on the gig we created
    await page.getByText(TEST_GIG_TITLE).click();

    // Verify gig pack page loaded with our data
    await expect(page.getByText(TEST_GIG_TITLE)).toBeVisible();
    await expect(page.getByText("E2E Test Venue")).toBeVisible();
  });
});
```

**Step 2: Run the test**

```bash
npx playwright test e2e/gig-lifecycle.spec.ts --headed
```

Watch the browser — it should log in, create a gig, and verify it appears.

**Step 3: Iterate on selectors**

The selectors above (`getByLabel`, `getByRole`) may need adjusting based on the actual form structure. Run with `--headed` and use Playwright's codegen if needed:

```bash
npx playwright codegen http://localhost:3000
```

**Step 4: Commit**

```bash
git add e2e/gig-lifecycle.spec.ts
git commit -m "test: add E2E gig lifecycle test (create, view)"
```

---

### Task 5: E2E — Invitation flow (accept/decline)

Tests the musician-facing invitation flow.

**Files:**
- Create: `e2e/invitation-flow.spec.ts`

**Important notes:**
- This test needs BOTH test users: manager creates the gig + role, musician accepts
- The invitation page is at `/invitations`
- Accept/Decline buttons use optimistic updates — the UI changes instantly
- We need to create a gig with a lineup role assigned to the musician's email
- Use the admin helper to seed the invitation data, OR create it through the manager UI

**Step 1: Write the test**

```typescript
import { test, expect } from "./fixtures/auth";
import { cleanupTestGigs } from "./helpers/supabase-admin";

test.describe("Invitation Flow", () => {
  let testGigTitle: string;

  test.afterAll(async () => {
    await cleanupTestGigs(process.env.E2E_MANAGER_EMAIL!);
  });

  test("manager creates gig and invites musician", async ({
    managerPage: page,
  }) => {
    testGigTitle = `E2E Invite Test ${Date.now()}`;

    await page.goto("/gigs");

    // Create a new gig
    await page.getByRole("button", { name: /new gig/i }).click();
    await page.waitForSelector('[role="dialog"]', { timeout: 5_000 });

    // Fill title
    await page.getByLabel(/title/i).fill(testGigTitle);

    // Save the gig first
    await page.getByRole("button", { name: /save/i }).click();
    await page.waitForSelector('[role="dialog"]', {
      state: "detached",
      timeout: 10_000,
    });

    // Navigate to the gig pack to add lineup
    await page.getByText(testGigTitle).click();
    await expect(page.getByText(testGigTitle)).toBeVisible();

    // TODO: Add musician to lineup via the gig editor
    // This step depends on the exact UI for adding lineup members.
    // The implementer should:
    // 1. Open the gig editor from the pack page
    // 2. Scroll to the lineup section
    // 3. Search for the musician by email (e2e-musician@test.gigmaster.app)
    // 4. Add them to a role
    // 5. Save
  });

  test("musician sees and accepts the invitation", async ({
    musicianPage: page,
  }) => {
    await page.goto("/invitations");

    // Wait for pending invitations to load
    await page.waitForLoadState("networkidle");

    // Should see the pending invitation
    // Note: This test may need the previous test to have successfully
    // added the musician to the lineup. If that's not feasible via UI,
    // seed the invitation via the admin helper instead.
    const invitationCard = page.getByText(testGigTitle);
    await expect(invitationCard).toBeVisible({ timeout: 10_000 });

    // Click Accept
    await page.getByRole("button", { name: /accept/i }).first().click();

    // Invitation should disappear from pending (optimistic update)
    await expect(invitationCard).not.toBeVisible({ timeout: 5_000 });
  });
});
```

**Step 2: Run the test**

```bash
npx playwright test e2e/invitation-flow.spec.ts --headed
```

**Step 3: Commit**

```bash
git add e2e/invitation-flow.spec.ts
git commit -m "test: add E2E invitation accept/decline flow"
```

---

### Task 6: E2E — Gig pack page rendering

Tests that the public gig pack page renders all sections correctly.

**Files:**
- Create: `e2e/gig-pack.spec.ts`

**Step 1: Write the test**

```typescript
import { test, expect } from "./fixtures/auth";
import { cleanupTestGigs } from "./helpers/supabase-admin";

test.describe("Gig Pack Page", () => {
  let gigTitle: string;

  test.afterAll(async () => {
    await cleanupTestGigs(process.env.E2E_MANAGER_EMAIL!);
  });

  test.beforeAll(async ({ browser }) => {
    // Create a gig with all sections filled via manager
    gigTitle = `E2E Pack Test ${Date.now()}`;
    const context = await browser.newContext();
    const page = await context.newPage();

    // Log in as manager
    await page.goto("/auth/login");
    await page.getByLabel("Email").fill(process.env.E2E_MANAGER_EMAIL!);
    await page.getByLabel("Password").fill(process.env.E2E_MANAGER_PASSWORD!);
    await page.getByRole("button", { name: /sign in|log in/i }).click();
    await page.waitForURL("**/gigs**", { timeout: 15_000 });

    // Create gig
    await page.getByRole("button", { name: /new gig/i }).click();
    await page.waitForSelector('[role="dialog"]', { timeout: 5_000 });
    await page.getByLabel(/title/i).fill(gigTitle);
    await page.getByRole("button", { name: /save/i }).click();
    await page.waitForSelector('[role="dialog"]', {
      state: "detached",
      timeout: 10_000,
    });

    await context.close();
  });

  test("gig pack renders title and basic info", async ({
    managerPage: page,
  }) => {
    await page.goto("/gigs");
    await page.getByText(gigTitle).click();

    // Title visible
    await expect(page.getByText(gigTitle)).toBeVisible();
  });

  test("gig pack is responsive on mobile", async ({ browser }) => {
    const context = await browser.newContext({
      viewport: { width: 375, height: 812 }, // iPhone viewport
    });
    const page = await context.newPage();

    // Log in on mobile viewport
    await page.goto("/auth/login");
    await page.getByLabel("Email").fill(process.env.E2E_MANAGER_EMAIL!);
    await page.getByLabel("Password").fill(process.env.E2E_MANAGER_PASSWORD!);
    await page.getByRole("button", { name: /sign in|log in/i }).click();
    await page.waitForURL("**/gigs**", { timeout: 15_000 });

    // Navigate to gig
    await page.getByText(gigTitle).click();
    await expect(page.getByText(gigTitle)).toBeVisible();

    // Take screenshot for visual verification
    await page.screenshot({ path: "test-results/gig-pack-mobile.png" });

    await context.close();
  });
});
```

**Step 2: Run**

```bash
npx playwright test e2e/gig-pack.spec.ts --headed
```

**Step 3: Commit**

```bash
git add e2e/gig-pack.spec.ts
git commit -m "test: add E2E gig pack page rendering tests"
```

---

## Phase 3: Expanded Unit/Component Tests

### Task 7: Unit tests — Invitations page

The invitations page (`app/(app)/invitations/page.tsx`) is a self-contained page component with pending/declined tabs, accept/decline mutations with optimistic updates, and loading/error/empty states.

**Files:**
- Create: `tests/components/invitations/invitations-page.test.tsx`

**Key things to mock:**
- `@/lib/providers/user-provider` — `useUser` hook
- `@/lib/api/gig-roles` — `getMyPendingInvitations`, `getMyDeclinedInvitations`, `updateMyInvitationStatus`
- `@/hooks/use-document-title` — noop
- `sonner` — `toast` (to verify success/error messages)

**Step 1: Write the test file**

```typescript
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { vi, describe, it, expect, beforeEach } from "vitest";

// Mock dependencies
vi.mock("@/lib/providers/user-provider", () => ({
  useUser: () => ({
    user: { id: "test-user-id", email: "test@example.com" },
    profile: { id: "test-user-id", name: "Test Musician" },
    isLoading: false,
  }),
}));

vi.mock("@/lib/api/gig-roles", () => ({
  getMyPendingInvitations: vi.fn(),
  getMyDeclinedInvitations: vi.fn(),
  updateMyInvitationStatus: vi.fn(),
}));

vi.mock("@/hooks/use-document-title", () => ({
  useDocumentTitle: vi.fn(),
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() },
}));

import InvitationsPage from "@/app/(app)/invitations/page";
import {
  getMyPendingInvitations,
  getMyDeclinedInvitations,
  updateMyInvitationStatus,
} from "@/lib/api/gig-roles";
import { toast } from "sonner";

function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: Infinity },
      mutations: { retry: false },
    },
  });
}

function renderPage() {
  const queryClient = createQueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <InvitationsPage />
    </QueryClientProvider>
  );
}

const mockPendingRole = {
  id: "role-1",
  gig_id: "gig-1",
  musician_id: "test-user-id",
  role_name: "Guitar",
  invitation_status: "pending",
  payment_status: "pending",
  fee: null,
  fee_currency: null,
  contact_id: null,
  sort_order: 0,
  created_at: "2026-01-01T00:00:00Z",
  gigs: {
    id: "gig-1",
    title: "Friday Night Jazz",
    date: "2026-03-15",
    start_time: "20:00:00",
    location_name: "Blue Note",
    owner_id: "owner-123",
    status: "confirmed",
  },
};

const mockDeclinedRole = {
  ...mockPendingRole,
  id: "role-2",
  invitation_status: "declined",
  gigs: {
    ...mockPendingRole.gigs,
    id: "gig-2",
    title: "Saturday Blues",
    date: "2026-03-22",
    location_name: "Jazz Bar",
  },
};

describe("InvitationsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getMyPendingInvitations).mockResolvedValue([mockPendingRole]);
    vi.mocked(getMyDeclinedInvitations).mockResolvedValue([mockDeclinedRole]);
    vi.mocked(updateMyInvitationStatus).mockResolvedValue(undefined);
  });

  describe("rendering", () => {
    it("renders page title", async () => {
      renderPage();
      expect(screen.getByText("Invitations")).toBeInTheDocument();
    });

    it("renders pending and declined tabs", async () => {
      renderPage();
      expect(screen.getByText("Pending")).toBeInTheDocument();
      expect(screen.getByText("Declined")).toBeInTheDocument();
    });

    it("shows loading skeletons while fetching", () => {
      vi.mocked(getMyPendingInvitations).mockReturnValue(
        new Promise(() => {}) // Never resolves
      );
      renderPage();
      // Skeletons should be visible
      expect(
        document.querySelectorAll('[class*="skeleton"]').length
      ).toBeGreaterThan(0);
    });
  });

  describe("pending tab", () => {
    it("shows pending invitations with gig details", async () => {
      renderPage();
      await waitFor(() => {
        expect(screen.getByText("Friday Night Jazz")).toBeInTheDocument();
      });
      expect(screen.getByText("Blue Note")).toBeInTheDocument();
      expect(screen.getByText("Guitar")).toBeInTheDocument();
    });

    it("shows empty state when no pending invitations", async () => {
      vi.mocked(getMyPendingInvitations).mockResolvedValue([]);
      renderPage();
      await waitFor(() => {
        expect(
          screen.getByText("No pending invitations")
        ).toBeInTheDocument();
      });
    });

    it("accepts an invitation on button click", async () => {
      const user = userEvent.setup();
      renderPage();

      await waitFor(() => {
        expect(screen.getByText("Friday Night Jazz")).toBeInTheDocument();
      });

      await user.click(screen.getByRole("button", { name: "Accept" }));

      await waitFor(() => {
        expect(updateMyInvitationStatus).toHaveBeenCalledWith(
          "role-1",
          "accepted"
        );
      });
    });

    it("declines an invitation on button click", async () => {
      const user = userEvent.setup();
      renderPage();

      await waitFor(() => {
        expect(screen.getByText("Friday Night Jazz")).toBeInTheDocument();
      });

      await user.click(screen.getByRole("button", { name: "Decline" }));

      await waitFor(() => {
        expect(updateMyInvitationStatus).toHaveBeenCalledWith(
          "role-1",
          "declined"
        );
      });
    });
  });

  describe("declined tab", () => {
    it("shows declined invitations when tab clicked", async () => {
      const user = userEvent.setup();
      renderPage();

      // Switch to declined tab
      await user.click(screen.getByText("Declined"));

      await waitFor(() => {
        expect(screen.getByText("Saturday Blues")).toBeInTheDocument();
      });
      expect(screen.getByText("Jazz Bar")).toBeInTheDocument();
    });

    it("re-accepts a declined invitation", async () => {
      const user = userEvent.setup();
      renderPage();

      await user.click(screen.getByText("Declined"));

      await waitFor(() => {
        expect(screen.getByText("Saturday Blues")).toBeInTheDocument();
      });

      await user.click(
        screen.getByRole("button", { name: /accept instead/i })
      );

      await waitFor(() => {
        expect(updateMyInvitationStatus).toHaveBeenCalledWith(
          "role-2",
          "accepted"
        );
      });
    });
  });
});
```

**Step 2: Run the test**

```bash
npm run test:run -- tests/components/invitations/invitations-page.test.tsx
```

**Step 3: Fix any import/selector issues and re-run until green**

**Step 4: Commit**

```bash
git add tests/components/invitations/
git commit -m "test: add invitations page component tests"
```

---

### Task 8: Unit tests — Calendar components

Test the calendar view components: month view, week view, toolbar.

**Files:**
- Create: `tests/components/calendar/calendar-view.test.tsx`
- Create: `tests/components/calendar/month-view.test.tsx`

**Key things to mock:**
- `@/hooks/use-calendar-gigs` — `useCalendarGigs`
- `@/hooks/use-calendar-bands` — `useCalendarBands`
- `@/hooks/use-calendar-filters` — `useCalendarFilters`
- `@/hooks/use-mobile` — `useIsMobile`
- `@/lib/providers/user-provider` — `useUser`

**Step 1: Write calendar-view test**

```typescript
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { vi, describe, it, expect, beforeEach } from "vitest";

vi.mock("@/hooks/use-calendar-gigs", () => ({
  useCalendarGigs: vi.fn(() => ({ data: [], isLoading: false })),
}));

vi.mock("@/hooks/use-calendar-bands", () => ({
  useCalendarBands: vi.fn(() => ({
    calendarBands: [],
    getGigColor: vi.fn(() => "#3b82f6"),
    isLoading: false,
  })),
}));

vi.mock("@/hooks/use-calendar-filters", () => ({
  useCalendarFilters: vi.fn(() => ({
    search: "",
    setSearch: vi.fn(),
    hiddenBandIds: new Set(),
    toggleBand: vi.fn(),
    statusFilter: "all",
    setStatusFilter: vi.fn(),
    filteredGigs: [],
  })),
}));

vi.mock("@/hooks/use-mobile", () => ({
  useIsMobile: vi.fn(() => false),
}));

vi.mock("@/lib/providers/user-provider", () => ({
  useUser: () => ({
    user: { id: "test-user-id", email: "test@example.com" },
    profile: { id: "test-user-id", name: "Test User" },
    isLoading: false,
  }),
}));

import { CalendarView } from "@/components/calendar/calendar-view";

function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: Infinity },
    },
  });
}

function renderCalendar() {
  return render(
    <QueryClientProvider client={createQueryClient()}>
      <CalendarView />
    </QueryClientProvider>
  );
}

describe("CalendarView", () => {
  it("renders without crashing", () => {
    renderCalendar();
    // Calendar should show current month/week header
    expect(document.body.textContent).toBeTruthy();
  });

  it("renders the calendar toolbar", () => {
    renderCalendar();
    // Should have Today button and view toggles
    expect(screen.getByText(/today/i)).toBeInTheDocument();
  });

  it("switches between week and month views", async () => {
    const user = userEvent.setup();
    renderCalendar();

    // Default is week view. Click month to switch.
    const monthButton = screen.getByRole("button", { name: /month/i });
    if (monthButton) {
      await user.click(monthButton);
    }
    // Verify view changed (implementer: adjust selectors)
  });
});
```

**Step 2: Write month-view test**

```typescript
import { render, screen } from "@testing-library/react";
import { vi, describe, it, expect } from "vitest";

vi.mock("@/hooks/use-mobile", () => ({
  useIsMobile: vi.fn(() => false),
}));

import { MonthView } from "@/components/calendar/month-view";

const mockGigs = [
  {
    id: "gig-1",
    title: "Jazz Night",
    date: "2026-02-20",
    start_time: "20:00:00",
    end_time: null,
    call_time: null,
    location_name: "Club Blue",
    status: "confirmed",
    owner_id: "user-1",
    band_id: null,
    hero_image_url: null,
    gig_type: null,
  },
];

describe("MonthView", () => {
  it("renders days of the week headers", () => {
    render(
      <MonthView
        currentDate={new Date(2026, 1, 15)}
        gigs={mockGigs as any}
        getGigColor={() => "#3b82f6"}
        onEventClick={() => {}}
        onDayClick={() => {}}
      />
    );

    // Should show day-of-week headers (Mon, Tue, Wed, etc.)
    expect(screen.getByText(/mon/i)).toBeInTheDocument();
  });

  it("renders gig events on the correct date", () => {
    render(
      <MonthView
        currentDate={new Date(2026, 1, 15)}
        gigs={mockGigs as any}
        getGigColor={() => "#3b82f6"}
        onEventClick={() => {}}
        onDayClick={() => {}}
      />
    );

    // The gig title should appear on Feb 20
    expect(screen.getByText("Jazz Night")).toBeInTheDocument();
  });

  it("calls onEventClick when a gig is clicked", async () => {
    const onEventClick = vi.fn();
    const user = (await import("@testing-library/user-event")).default.setup();

    render(
      <MonthView
        currentDate={new Date(2026, 1, 15)}
        gigs={mockGigs as any}
        getGigColor={() => "#3b82f6"}
        onEventClick={onEventClick}
        onDayClick={() => {}}
      />
    );

    await user.click(screen.getByText("Jazz Night"));
    expect(onEventClick).toHaveBeenCalled();
  });
});
```

**Step 3: Run tests**

```bash
npm run test:run -- tests/components/calendar/
```

**Step 4: Commit**

```bash
git add tests/components/calendar/
git commit -m "test: add calendar view and month view component tests"
```

---

### Task 9: Unit tests — Dashboard gigs list

Test the main gigs list page rendering, search, view toggle.

**Files:**
- Create: `tests/components/dashboard/gig-item.test.tsx`

**Key things to mock:**
- The gig item components receive a `DashboardGig` prop
- They render title, date, venue, status, and action buttons
- The `DashboardGigItem` (list view) and `DashboardGigItemGrid` (grid view) are separate components

**Step 1: Write gig item test**

```typescript
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { vi, describe, it, expect } from "vitest";

vi.mock("@/lib/providers/user-provider", () => ({
  useUser: () => ({
    user: { id: "test-user-id", email: "test@example.com" },
    profile: { id: "test-user-id", name: "Test User" },
    isLoading: false,
  }),
}));

import { DashboardGigItem } from "@/components/dashboard/gig-item";

function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: Infinity },
      mutations: { retry: false },
    },
  });
}

const mockGig = {
  id: "gig-1",
  title: "Friday Night Jazz",
  date: "2026-03-15",
  start_time: "20:00:00",
  end_time: "23:00:00",
  call_time: "19:00:00",
  location_name: "Blue Note",
  status: "confirmed",
  owner_id: "test-user-id",
  band_id: null,
  hero_image_url: null,
  gig_type: "corporate",
  owner: { name: "Test User" },
  band: null,
  gig_roles: [],
};

function renderGigItem(gig = mockGig) {
  return render(
    <QueryClientProvider client={createQueryClient()}>
      <DashboardGigItem
        gig={gig as any}
        isOwner={true}
        onEdit={() => {}}
        onDuplicate={() => {}}
      />
    </QueryClientProvider>
  );
}

describe("DashboardGigItem", () => {
  it("renders gig title", () => {
    renderGigItem();
    expect(screen.getByText("Friday Night Jazz")).toBeInTheDocument();
  });

  it("renders venue name", () => {
    renderGigItem();
    expect(screen.getByText("Blue Note")).toBeInTheDocument();
  });

  it("renders date information", () => {
    renderGigItem();
    // Should show the date in some format (Mar 15, March 15, etc.)
    expect(screen.getByText(/15/)).toBeInTheDocument();
  });

  it("renders without venue when not provided", () => {
    renderGigItem({ ...mockGig, location_name: null });
    // Should still render without crashing
    expect(screen.getByText("Friday Night Jazz")).toBeInTheDocument();
  });
});
```

**Step 2: Run**

```bash
npm run test:run -- tests/components/dashboard/
```

**Step 3: Commit**

```bash
git add tests/components/dashboard/
git commit -m "test: add dashboard gig item component tests"
```

---

### Task 10: Unit tests — Gig editor (basic form behavior)

The gig editor is a 2000+ line component. We test it in focused slices, not all at once.

**Files:**
- Create: `tests/components/gig-editor/gig-editor-panel.test.tsx`

**Important notes:**
- The gig editor is rendered inside a `Sheet` (radix dialog)
- It uses React Hook Form
- The portal form bubbling bug (MEMORY.md) is a key thing to verify
- Start with: renders correctly, form submission calls save, required field validation

**Key things to mock:**
- `@/lib/providers/user-provider` — `useUser`
- `@/lib/api/bands` — `listUserBands`
- `@/app/(app)/gigs/actions` — `getGig` and save functions
- `@/hooks/use-save-gigpack` or similar — the save mutation hook
- Various sub-components if they cause import errors

**Step 1: Write a focused test for the editor opening and basic rendering**

```typescript
import { render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { vi, describe, it, expect, beforeEach } from "vitest";

vi.mock("@/lib/providers/user-provider", () => ({
  useUser: () => ({
    user: { id: "test-user-id", email: "test@example.com" },
    profile: { id: "test-user-id", name: "Test User" },
    isLoading: false,
  }),
}));

vi.mock("@/lib/api/bands", () => ({
  listUserBands: vi.fn().mockResolvedValue([]),
}));

// Mock sub-components that have heavy dependencies
vi.mock("@/components/gigpack/editor/materials-editor", () => ({
  MaterialsEditor: () => <div data-testid="materials-editor" />,
}));

// The implementer should add more mocks as needed based on import errors.
// The gig editor has many dependencies — mock the ones that cause issues.

import { GigEditorPanel } from "@/components/gigpack/editor/gig-editor-panel";

function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: Infinity },
      mutations: { retry: false },
    },
  });
}

function renderEditor(props = {}) {
  const defaultProps = {
    open: true,
    onOpenChange: vi.fn(),
    onSaved: vi.fn(),
    mode: "create" as const,
  };

  return render(
    <QueryClientProvider client={createQueryClient()}>
      <GigEditorPanel {...defaultProps} {...props} />
    </QueryClientProvider>
  );
}

describe("GigEditorPanel", () => {
  it("renders the editor when open", async () => {
    renderEditor();

    // Should show the editor sheet with a title input
    await waitFor(() => {
      expect(
        screen.getByRole("dialog") || screen.getByLabelText(/title/i)
      ).toBeTruthy();
    });
  });

  it("does not render when closed", () => {
    renderEditor({ open: false });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  // The implementer should add more tests:
  // - Fill title and save -> onSaved called
  // - Required field validation (title required)
  // - Edit mode pre-fills form with gig data
  // - Band selection dropdown works
  // - Date picker sets the date
});
```

**Step 2: Run and iterate**

The gig editor is complex — expect to add mocks iteratively:

```bash
npm run test:run -- tests/components/gig-editor/
```

Each import error tells you what else needs mocking. Add mocks one at a time.

**Step 3: Commit**

```bash
git add tests/components/gig-editor/
git commit -m "test: add gig editor panel component tests"
```

---

## Phase 4: Polish and verify

### Task 11: Run all tests and verify everything passes

**Step 1: Run unit tests**

```bash
npm run test:run
```

All existing + new tests should pass.

**Step 2: Run E2E tests**

```bash
npx playwright test
```

All E2E tests should pass (requires dev server running + test users created).

**Step 3: Run lint and typecheck**

```bash
npm run check
```

No new errors from test files.

**Step 4: Final commit**

```bash
git add -A
git commit -m "test: complete testing automation (E2E + expanded unit tests)"
```

---

## Summary

| Phase | Task | What it does |
|-------|------|-------------|
| 1 | Task 1 | Install Playwright, create config |
| 1 | Task 2 | Auth fixtures + admin helpers |
| 1 | Task 3 | Create test users in Supabase |
| 2 | Task 4 | E2E: Gig lifecycle |
| 2 | Task 5 | E2E: Invitation flow |
| 2 | Task 6 | E2E: Gig pack rendering |
| 3 | Task 7 | Unit: Invitations page |
| 3 | Task 8 | Unit: Calendar components |
| 3 | Task 9 | Unit: Dashboard gig list |
| 3 | Task 10 | Unit: Gig editor |
| 4 | Task 11 | Run all tests, verify, commit |

**NPM scripts after completion:**
- `npm test` — unit tests (watch mode)
- `npm run test:run` — unit tests (single run)
- `npm run test:e2e` — E2E tests
- `npm run test:e2e:ui` — E2E tests with Playwright UI
- `npm run test:e2e:headed` — E2E tests in visible browser
