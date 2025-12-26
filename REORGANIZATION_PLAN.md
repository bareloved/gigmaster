# Repository Reorganization Plan

## Current Issues
- [ ] vendor/gigpack directory not integrated
- [ ] Schema conflicts (Ensemble vs GigPack)
- [ ] Duplicate files (user-templates.ts)
- [ ] Mixed naming conventions
- [ ] No testing infrastructure
- [ ] Build artifacts in git

## Proposed Structure

```
gigmaster/
├── app/                          # Next.js App Router (KEEP)
│   ├── (app)/                   # Authenticated routes
│   ├── auth/                    # Auth routes
│   ├── api/                     # API routes
│   └── p/                       # Public sharing
│
├── components/                   # React components (KEEP)
│   ├── ui/                      # shadcn/ui primitives
│   ├── gigpack/                 # GigPack feature
│   ├── gigs/                    # Gig management
│   ├── dashboard/               # Dashboard widgets
│   ├── money/                   # Financial tracking
│   ├── roles/                   # Role management
│   ├── contacts/                # Contact management
│   ├── setlists/                # Setlist components
│   ├── layout/                  # App layout
│   ├── profile/                 # Profile components
│   └── shared/                  # Shared components
│
├── lib/                          # Core business logic (REORGANIZE)
│   ├── api/                     # Data fetching (REORGANIZE INTO SUBDIRS)
│   │   ├── gigs/               # NEW - group gig-related APIs
│   │   │   ├── index.ts
│   │   │   ├── actions.ts
│   │   │   ├── roles.ts
│   │   │   ├── files.ts
│   │   │   ├── pack.ts
│   │   │   ├── invitations.ts
│   │   │   ├── activity.ts
│   │   │   └── readiness.ts
│   │   ├── calendar/           # NEW - group calendar APIs
│   │   │   ├── index.ts
│   │   │   └── google.ts
│   │   ├── money/              # NEW - group financial APIs
│   │   │   ├── index.ts
│   │   │   └── player.ts
│   │   ├── setlists/           # NEW - group setlist APIs
│   │   │   ├── items.ts
│   │   │   └── learning.ts
│   │   ├── dashboard/          # NEW - group dashboard APIs
│   │   │   ├── gigs.ts
│   │   │   └── kpis.ts
│   │   ├── contacts.ts
│   │   ├── users.ts
│   │   └── notifications.ts
│   ├── types/                   # TypeScript definitions (KEEP)
│   ├── supabase/                # Database clients (KEEP)
│   ├── providers/               # React providers (KEEP)
│   ├── utils/                   # Utility functions (KEEP)
│   ├── integrations/            # External services (KEEP)
│   ├── emails/                  # Email templates (KEEP)
│   ├── gigpack/                 # GigPack logic (KEEP - FIX DUPLICATES)
│   ├── constants/               # NEW - app constants
│   │   ├── gigs.ts
│   │   ├── roles.ts
│   │   ├── currencies.ts
│   │   └── index.ts
│   ├── config/                  # NEW - app configuration
│   │   ├── features.ts
│   │   └── index.ts
│   ├── utils.ts                 # (KEEP)
│   ├── themes.ts                # (KEEP)
│   └── fonts.ts                 # (KEEP)
│
├── hooks/                        # Custom React hooks (KEEP)
│
├── __tests__/                    # NEW - test files
│   ├── components/
│   ├── lib/
│   ├── hooks/
│   └── integration/
│
├── supabase/                     # Database management (KEEP)
│   └── migrations/              # SQL migrations
│
├── docs/                         # Documentation (CONSOLIDATE)
│   ├── README.md
│   ├── architecture/            # NEW - single source of truth
│   │   ├── overview.md
│   │   ├── database.md
│   │   ├── api-design.md
│   │   └── component-patterns.md
│   ├── features/                # (KEEP)
│   ├── deployment/              # (KEEP)
│   ├── troubleshooting/         # (KEEP)
│   └── archive/                 # NEW - completed build steps
│       └── build-process/       # MOVE from root
│
├── scripts/                      # Utility scripts (KEEP)
├── public/                       # Static assets (KEEP)
│
├── vendor/                       # DECIDE: integrate or remove
│
└── [config files]               # Root config (KEEP + UPDATE .gitignore)
```

## Action Plan

### Phase 1: Critical Fixes (Do Immediately)

1. **Resolve vendor/gigpack**
   ```bash
   # Option A: Remove if integration complete
   rm -rf vendor/

   # Option B: Add to gitignore if keeping temporarily
   echo "vendor/" >> .gitignore
   ```

2. **Fix duplicate files**
   ```bash
   # Decide which to keep, merge content, delete duplicate
   # Then standardize on kebab-case
   ```

3. **Update .gitignore**
   ```
   # Add these lines:
   tsconfig.tsbuildinfo
   .env.local
   vendor/
   ```

4. **Schema Decision**
   - Choose: Keep Ensemble schema OR adopt GigPack schema
   - Remove conflicting migration files
   - Document decision in docs/architecture/database.md

### Phase 2: Structure Improvements

5. **Reorganize /lib/api**
   - Create subdirectories: gigs/, calendar/, money/, setlists/, dashboard/
   - Move related files into subdirectories
   - Add index.ts exports for clean imports

6. **Create /lib/constants**
   - Extract magic strings from components
   - Create constant files by domain

7. **Standardize naming**
   - Rename all camelCase files to kebab-case
   - Update imports

8. **Set up testing**
   ```bash
   npm install -D vitest @testing-library/react @testing-library/jest-dom
   # Create vitest.config.ts
   # Create __tests__/ structure
   ```

### Phase 3: Documentation & Cleanup

9. **Consolidate docs**
   - Create docs/architecture/ directory
   - Merge build-process files into single file
   - Move completed steps to docs/archive/

10. **Remove empty directories**
    - Delete or document purpose of app/ui/playground

## Migration Notes

### Import Path Changes

After reorganization, update imports:

```typescript
// Before
import { createGig } from '@/lib/api/gigs'
import { getCalendarEvents } from '@/lib/api/calendar'

// After
import { createGig } from '@/lib/api/gigs'
import { getCalendarEvents } from '@/lib/api/calendar'
// (paths stay the same due to index.ts exports)
```

### Breaking Changes
- None if using index.ts re-exports
- Only internal file movements

## Success Criteria

- [ ] No duplicate files
- [ ] Single data model/schema
- [ ] All files follow kebab-case naming
- [ ] Build artifacts not in git
- [ ] vendor/ resolved (integrated or removed)
- [ ] API organized by domain
- [ ] Testing infrastructure set up
- [ ] Documentation consolidated
- [ ] All imports working
- [ ] Build succeeds
- [ ] Deploy succeeds

## Timeline

- **Week 1**: Phase 1 (Critical fixes)
- **Week 2**: Phase 2 (Structure improvements)
- **Week 3**: Phase 3 (Documentation & cleanup)

## Rollback Plan

- Create branch `pre-reorganization` before starting
- Each phase commits separately for easy rollback
- Test build after each phase
