# Project Audit & Cleanup Playbook

## Purpose

This playbook provides a comprehensive checklist and step-by-step guide for performing thorough project audits. Use this when:
- Completing a major feature
- Before production releases
- After refactoring core functionality
- Detecting code smell or inconsistencies
- Periodically (every 2-3 months)

## Overview

A comprehensive audit takes 1-2 hours and covers:
- Code consistency and quality
- Type definitions and imports
- Component usage patterns
- Database state and migrations
- Security (RLS policies)
- Performance considerations
- Documentation

## Pre-Audit Checklist

Before starting the audit:
- [ ] Commit or stash any uncommitted changes
- [ ] Note the feature/work that was just completed
- [ ] Have access to Supabase MCP tools
- [ ] Terminal and dev server ready
- [ ] Create audit date stamp: `YYYY-MM-DD`

## Audit Protocol

### Setup: Create TODO List

Create a TODO list to track progress:

```typescript
todo_write({
  merge: false,
  todos: [
    {id: "audit-1", content: "Check for hardcoded values", status: "pending"},
    {id: "audit-2", content: "Verify component prop handling", status: "pending"},
    {id: "audit-3", content: "Ensure consistent component usage", status: "pending"},
    {id: "audit-4", content: "Check prop passing patterns", status: "pending"},
    {id: "audit-5", content: "Verify type definitions", status: "pending"},
    {id: "audit-6", content: "Clean up debug code", status: "pending"},
    {id: "audit-7", content: "Check database state", status: "pending"},
    {id: "audit-8", content: "Find orphaned code", status: "pending"},
    {id: "audit-9", content: "Verify RLS policies", status: "pending"},
    {id: "audit-10", content: "Run linter", status: "pending"},
    {id: "audit-11", content: "Create documentation", status: "pending"}
  ]
});
```

---

## Audit 1: Check for Hardcoded Values

**Goal:** Find hardcoded strings, magic numbers, or default values that should be constants or configuration.

### Commands to Run

```bash
# Search for common hardcoded patterns (adjust based on recent work)
grep -r "hardcoded_value" /path/to/codebase
grep -r "'string_literal'" components/
grep -r "invitation_status.*'invited'" lib/
```

### What to Look For

- Hardcoded status strings (e.g., `'invited'`, `'draft'`)
- Magic numbers that should be constants
- Duplicate default values across files
- Configuration that should be in env variables

### How to Fix

✅ **Good:** Centralized constants
```typescript
const DEFAULT_STATUS = 'pending';
```

❌ **Bad:** Scattered hardcoded values
```typescript
invitation_status: 'invited' // in 5 different files
```

### Mark Complete

```typescript
todo_write({
  merge: true,
  todos: [{id: "audit-1", content: "Check for hardcoded values", status: "completed"}]
});
```

---

## Audit 2: Verify Component Prop Handling

**Goal:** Ensure components correctly handle all prop variations, especially new values.

### Commands to Run

```bash
# Find component definitions
grep -r "interface.*Props" components/
grep -r "type.*Props" components/

# Check prop usage
grep -r "PropName" components/
```

### What to Look For

- Components missing new enum values in dropdowns
- Props not being passed down correctly
- Optional props without default values
- Type mismatches between prop definitions and usage

### Common Issues

**Issue:** Dropdown missing new status
```typescript
// BEFORE
const STATUSES = [
  { value: "invited", label: "Invited" },
  { value: "accepted", label: "Accepted" },
];

// AFTER
const STATUSES = [
  { value: "pending", label: "Pending" }, // ← Added
  { value: "invited", label: "Invited" },
  { value: "accepted", label: "Accepted" },
];
```

---

## Audit 3: Ensure Consistent Component Usage

**Goal:** Verify standardized components are used everywhere, not ad-hoc implementations.

### Commands to Run

```bash
# Find all uses of a component
grep -r "ComponentName" /path/to/codebase --files-with-matches

# Check for old Badge usage instead of new custom badge
grep -r "Badge.*status" components/
grep -r "<Badge" app/
```

### What to Look For

- Old/deprecated component usage
- Inconsistent implementations of same UI pattern
- Missing imports of shared components

### Checklist

- [ ] All status displays use `StatusBadge` component
- [ ] No ad-hoc badge implementations
- [ ] Consistent styling patterns
- [ ] Shared components imported correctly

---

## Audit 4: Check Prop Passing Patterns

**Goal:** Verify props are passed correctly throughout component trees.

### Commands to Run

```bash
# Find component that receives specific prop
grep -r "propName=" components/

# Check if prop is optional vs required
grep -r "propName\?" components/
```

### What to Look For

- Missing required props
- Props passed but not used
- Props with wrong types
- Inconsistent naming (camelCase vs snake_case)

### Example Check

```typescript
// Parent component
<ChildComponent 
  status={item.status}
  gigStatus={gig.status} // ← Is this prop being passed?
/>

// Child component
interface Props {
  status: string;
  gigStatus?: string; // ← Is this prop defined?
}
```

---

## Audit 5: Verify Type Definitions

**Goal:** Ensure single source of truth for types, no duplication, consistent imports.

### Commands to Run

```bash
# Find type definitions
grep -r "export type TypeName" lib/
grep -r "type TypeName =" lib/

# Check imports
grep -r "import.*TypeName" components/
grep -r "import.*TypeName" lib/
```

### What to Look For

- Duplicate type definitions
- Types defined in multiple files
- Inconsistent imports (some from A, some from B)
- Local types that should be shared

### How to Fix

1. **Consolidate types in `lib/types/shared.ts`:**
```typescript
// lib/types/shared.ts
export type InvitationStatus = 'pending' | 'invited' | 'accepted';
export type GigStatus = 'draft' | 'confirmed' | 'completed';
```

2. **Update all imports:**
```typescript
// Before
import type { InvitationStatus } from '@/lib/api/gig-actions';

// After
import type { InvitationStatus } from '@/lib/types/shared';
```

3. **Add re-exports for convenience (optional):**
```typescript
// lib/api/gig-actions.ts
import type { InvitationStatus, GigStatus } from '@/lib/types/shared';
export type { InvitationStatus, GigStatus }; // Re-export
```

---

## Audit 6: Clean Up Debug Code

**Goal:** Remove or document console.logs, debug statements, and test code.

### Commands to Run

```bash
# Find console statements
grep -r "console\." components/ lib/

# Find debug comments
grep -r "// DEBUG" .
grep -r "// TODO" .
grep -r "// FIXME" .
```

### What to Look For

- `console.log` statements
- Debug flags or variables
- Commented-out code blocks
- TODO/FIXME comments

### Decision Matrix

| Type | Action |
|------|--------|
| Dev-only console.log | Keep (low priority) |
| Production console.log | Remove or use proper logging |
| Commented code | Remove (use git history) |
| TODO with no plan | Remove or create issue |
| TODO with plan | Keep and document |

---

## Audit 7: Check Database State

**Goal:** Verify database schema, defaults, and data integrity.

### Commands to Run (MCP Supabase)

```typescript
// Check table defaults
mcp_supabase_READ-ONLY_execute_sql({
  query: `
    SELECT column_name, column_default, is_nullable, data_type
    FROM information_schema.columns
    WHERE table_name = 'table_name' AND column_name = 'column_name';
  `
});

// Check for data inconsistencies
mcp_supabase_READ-ONLY_execute_sql({
  query: `
    -- Example: Draft gigs with invited roles
    SELECT g.id, g.title, g.status, COUNT(gr.id) as count
    FROM gigs g
    LEFT JOIN gig_roles gr ON g.id = gr.gig_id AND gr.invitation_status = 'invited'
    WHERE g.status = 'draft'
    GROUP BY g.id, g.title, g.status
    HAVING COUNT(gr.id) > 0;
  `
});

// Check recent data
mcp_supabase_READ-ONLY_execute_sql({
  query: `
    SELECT * FROM table_name 
    WHERE created_at > NOW() - INTERVAL '1 day'
    LIMIT 10;
  `
});
```

### What to Look For

- Incorrect default values
- Orphaned records (foreign keys pointing to deleted records)
- Data that violates business logic
- Old data format that needs migration

### Decision Matrix

| Issue | Solution |
|-------|----------|
| Wrong default | Create migration to fix |
| Old data | Check if UI handles gracefully |
| Inconsistent data | Fix with UPDATE query |
| Orphaned data | Clean up with DELETE |

---

## Audit 8: Find Orphaned Code

**Goal:** Identify unused components, functions, and files.

### Commands to Run

```bash
# List all components
ls components/

# Check if component is used anywhere
grep -r "ComponentName" app/ components/ lib/ --files-with-matches

# Check imports of a file
grep -r "from.*filename" .
```

### What to Look For

- Components not imported anywhere
- Functions defined but never called
- Files with no references
- Deprecated code marked for removal

### How to Verify

For each suspicious file:
1. Search for imports: `grep -r "from './filename'"`
2. Search for usage: `grep -r "FunctionName\|ComponentName"`
3. Check git history: When was it last modified?
4. If unused for 3+ months and no imports: Mark for deletion

### ⚠️ Warning

**DO NOT delete without confirmation:**
- Recently added code (may not be used yet)
- Code used in branches
- Code referenced in documentation
- Code planned for upcoming features

---

## Audit 9: Verify RLS Policies

**Goal:** Ensure security policies work with new features and don't have vulnerabilities.

### Commands to Run (MCP Supabase)

```typescript
// Check all policies on a table
mcp_supabase_READ-ONLY_execute_sql({
  query: `
    SELECT policyname, cmd, qual, with_check
    FROM pg_policies 
    WHERE tablename = 'table_name'
    ORDER BY policyname;
  `
});

// Test query with new feature
mcp_supabase_READ-ONLY_execute_sql({
  query: `
    SELECT * FROM table_name 
    WHERE new_column = 'new_value'
    LIMIT 5;
  `
});

// Run security advisor
mcp_supabase_READ-ONLY_get_advisors({
  type: "security"
});

// Run performance advisor
mcp_supabase_READ-ONLY_get_advisors({
  type: "performance"
});
```

### What to Look For

**Security Issues:**
- Policies not covering new columns
- Permissive policies that should be restrictive
- Missing policies on new tables
- Auth checks that can be bypassed

**Performance Issues:**
- Unindexed foreign keys
- RLS policies with `auth.uid()` (should be `(select auth.uid())`)
- Missing indexes on filtered columns
- Unused indexes

### RLS Policy Checklist

For each table with new/modified columns:
- [ ] SELECT policy covers new logic
- [ ] INSERT policy validates new fields
- [ ] UPDATE policy restricts new fields correctly
- [ ] DELETE policy unchanged (or updated if needed)

---

## Audit 10: Run Linter

**Goal:** Catch any TypeScript/linting errors introduced during development.

### Commands to Run

```typescript
// Check specific files
read_lints({
  paths: [
    "path/to/modified/file1.tsx",
    "path/to/modified/file2.ts",
    // ... all modified files
  ]
});

// Or run in terminal
run_terminal_cmd({
  command: "npm run lint",
  is_background: false
});
```

### What to Look For

- TypeScript errors
- ESLint warnings
- Unused variables
- Missing dependencies in hooks
- Type assertions that should be fixed

### Common Fixes

```typescript
// Unused variable
const [value, setValue] = useState(0); // If setValue never used

// Fix: Remove or prefix with underscore
const [value, _setValue] = useState(0);

// Missing dependency
useEffect(() => {
  doSomething(prop);
}, []); // ← Missing 'prop' in dependency array

// Fix: Add dependency
useEffect(() => {
  doSomething(prop);
}, [prop]);
```

---

## Audit 11: Create Documentation

**Goal:** Document what was built, decisions made, and how the system works.

### Required Documents

1. **Feature Documentation** (`docs/features/feature-name.md`)
2. **Audit Report** (`docs/maintenance/audit-YYYY-MM-DD.md`)

### Feature Documentation Template

```markdown
# Feature Name

## Overview
Brief description of the feature

## Architecture
How it's structured

## Components
List of components and their purpose

## API Functions
List of API functions and what they do

## Database Schema
Tables, columns, relationships

## Workflows
Step-by-step user flows

## Best Practices
How to use the feature correctly

## Troubleshooting
Common issues and solutions

## Future Enhancements
Planned improvements
```

### Audit Report Template

```markdown
# Project Audit - YYYY-MM-DD

## Summary
What was audited and why

## Audits Performed
11 audits with status for each

## Files Modified
List of all files changed

## Issues Found & Fixed
Description of problems and solutions

## Database State
Current state and any migrations

## Code Quality Metrics
Type safety, performance, security

## Testing Performed
What was tested and results

## Recommendations
Immediate and future actions

## Lessons Learned
What went wrong/right

## Conclusion
Overall status
```

---

## Post-Audit Actions

### 1. Commit Changes

```bash
git add .
git commit -m "chore: comprehensive project audit and cleanup

- Fixed [list issues]
- Consolidated type definitions
- Updated documentation
- Verified RLS policies
- Zero linter errors

See docs/maintenance/audit-YYYY-MM-DD.md for full report"
```

### 2. Update Project Status

Create/update `PROJECT-STATUS.md`:

```markdown
## Latest Audit
- Date: YYYY-MM-DD
- Status: ✅ CLEAN
- Issues: 0 critical, X minor (fixed)
- Next Audit: [Date 2-3 months from now]
```

### 3. Create Follow-up Issues (if needed)

For non-urgent improvements:
- Create GitHub/Linear issues
- Tag with "technical-debt" or "optimization"
- Link to audit report

---

## Audit Checklist Summary

Quick reference for completing all audits:

- [ ] **Audit 1:** No hardcoded values
- [ ] **Audit 2:** Components handle all props correctly  
- [ ] **Audit 3:** Consistent component usage
- [ ] **Audit 4:** Props passed correctly
- [ ] **Audit 5:** Type definitions consolidated
- [ ] **Audit 6:** Debug code cleaned up
- [ ] **Audit 7:** Database state verified
- [ ] **Audit 8:** No orphaned code
- [ ] **Audit 9:** RLS policies secure and performant
- [ ] **Audit 10:** Zero linter errors
- [ ] **Audit 11:** Documentation complete

- [ ] **Post-Audit:** Changes committed
- [ ] **Post-Audit:** Project status updated
- [ ] **Post-Audit:** Follow-up issues created

---

## When NOT to Do Full Audit

A full audit is overkill for:
- ❌ Tiny bug fixes
- ❌ Copy/style changes
- ❌ Adding simple UI components
- ❌ Documentation-only updates

For these, just run:
- Linter check
- Quick grep for obvious issues
- Test the specific change

---

## Tips for AI Agents

### Stay Focused
- Mark todos as "in_progress" when starting
- Mark as "completed" when done
- Don't stop with unfinished todos without user input

### Be Thorough
- Actually run the grep/search commands
- Don't assume - verify
- Check multiple patterns for each audit

### Document Everything
- Note what you found
- Explain why you fixed it
- Show before/after code

### Ask When Uncertain
- Unsure if code is orphaned? Ask user
- Don't know if data should be migrated? Ask user
- Performance tradeoff unclear? Ask user

---

## Customization Guide

**Adapt this playbook for your project:**

1. **Audit 1-6:** Adjust grep patterns based on your recent work
2. **Audit 7:** Modify database queries for your schema
3. **Audit 9:** Update RLS checks for your security model
4. **Documentation:** Use your project's doc structure

**Add project-specific audits:**
- API route testing
- Mobile compatibility checks
- Accessibility audits
- Load testing
- E2E test coverage

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2025-01-19 | Initial playbook created |

---

## Related Documents

- `docs/features/` - Feature documentation
- `docs/maintenance/` - Audit reports
- `docs/database/` - Database documentation
- `.cursorrules` - Agent safety rules

---

**Last Updated:** 2025-01-19  
**Maintained By:** Project Team  
**Next Review:** [Add date 6 months from now]

