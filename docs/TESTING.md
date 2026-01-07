# Testing Guide

## Quick Commands

```bash
# Run all tests once (recommended for checking before commits)
npm run test:run

# Run tests in watch mode (re-runs when files change)
npm test

# Run tests with coverage report
npm run test:coverage
```

## Running Specific Tests

```bash
# Run a specific test file
npm run test:run -- tests/api/gigs.test.ts

# Run all tests in a folder
npm run test:run -- tests/api/

# Run tests matching a pattern
npm run test:run -- --grep "should create gig"
```

## Understanding Test Output

When tests pass, you'll see green checkmarks:
```
✓ should return gig data when found
✓ should throw error when not authenticated
```

When tests fail, you'll see red X marks with details:
```
× should return gig data when found
  → Expected: { id: "123" }
  → Received: null
```

## Test Structure

```
tests/
├── api/                    # API function tests
│   ├── gigs.test.ts        # Tests for lib/api/gigs.ts
│   ├── gig-roles.test.ts   # Tests for lib/api/gig-roles.ts
│   └── gig-invitations.test.ts
├── components/             # UI component tests
│   ├── roles/
│   └── shared/
├── fixtures/               # Mock data used in tests
│   ├── gigs.ts
│   └── users.ts
├── mocks/                  # Mock utilities
│   └── supabase.ts
└── setup.ts                # Global test configuration
```

## When to Run Tests

1. **Before committing** - Run `npm run test:run` to catch issues early
2. **After changing API functions** - Run the related test file
3. **After changing components** - Run the component's test file
4. **Before deploying** - Run full test suite

## Current Test Coverage

| Area | Tests | What's Tested |
|------|-------|---------------|
| API: gigs | 13 | CRUD operations, error handling |
| API: gig-roles | 34 | Role management, invitations, conflicts |
| API: gig-invitations | 23 | Email/WhatsApp invites, accept/decline |
| Component: EditRoleDialog | 19 | Form validation, submission, errors |
| Component: UnifiedMusicianSearch | 23 | Search, selection, invite options |
| **Total** | **112** | |

## Troubleshooting

### Tests are slow
Run a specific file instead of the full suite:
```bash
npm run test:run -- tests/api/gigs.test.ts
```

### Tests fail after pulling changes
Dependencies might have changed:
```bash
npm install
npm run test:run
```

### Can't find a test for something
Check if the file exists in `tests/`. Not everything is tested yet - feel free to add tests!
