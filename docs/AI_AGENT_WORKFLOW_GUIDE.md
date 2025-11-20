# AI Agent Workflow Guide

**How to Work Effectively with Multiple AI Agents**

---

## 📋 **When to Open a New Agent**

### ✅ **Open a New Agent When:**

1. **Starting a major new feature** (different domain area)
   - Example: Moving from "Optional Projects" to "Notifications System"
   - Example: Switching from backend database work to frontend UI components
   
2. **Context is getting heavy** (70k+ tokens)
   - Long debugging sessions accumulate a lot of context
   - Fresh agent = faster responses
   - Current token count visible in agent interface
   
3. **Switching tech areas**
   - Example: From backend/database work to UI/styling work
   - Example: From app features to deployment/infrastructure
   
4. **Need fresh perspective**
   - Stuck on a problem? New agent might see it differently
   - Debugging in circles? Fresh eyes help
   
5. **After major completion**
   - Feature is done, documented, and tested
   - Starting next item on roadmap

### ⚠️ **Keep Same Agent When:**

1. **Continuing same feature** (small iterations)
   - Example: "Now add validation to this form"
   - Example: "Add a loading state to that button"
   
2. **Debugging related issues**
   - Agent already understands the problem context
   - Working through a specific bug systematically
   
3. **Making related changes**
   - Example: Updating docs after implementing a feature
   - Example: Adding tests for code just written
   
4. **Quick refinements**
   - UI tweaks
   - Copy changes
   - Minor bug fixes in code you just wrote

---

## 📦 **Essential Context for New Agent**

### **Every New Agent Needs:**

```
Hi! I'm working on [FEATURE_NAME] for my Ensemble app (gig management for musicians).

Context files:
- @.cursorrules (project rules & architecture)
- @BUILD_STEPS.md (current project status)
- @docs/build-process/step-X-[relevant-feature].md (if working on related feature)

Current task: [clear description of what you want to build]

[Any specific questions or requirements]
```

### **Example: Starting a New Feature**

```
Hi! I'm working on the Notifications System for my Ensemble app.

Context:
- @.cursorrules (our full project rules)
- @BUILD_STEPS.md (see completed steps 1-18)
- @docs/future-enhancements/next-steps.md (see Step 3 - Notifications)

We just finished:
- Optional projects for gigs (Step 18)
- Calendar integration (Steps 15-16)

Now I want to build:
- Email notifications for gig invitations
- In-app notification center
- Push notifications (later)

Let's start with Phase 1: Email notifications when users get invited to gigs.
```

---

## 🎯 **Context Strategy by Task Type**

### **1. New Feature (Fresh Domain)**

**Context needed:**
- `.cursorrules`
- `BUILD_STEPS.md`
- Relevant `docs/future-enhancements/` file
- Any related existing code files

**Example:**
```
Building notifications system.
@.cursorrules 
@BUILD_STEPS.md 
@docs/future-enhancements/next-steps.md (Step 3)

I want to implement email notifications for gig invitations.
```

---

### **2. Bug Fix or Refinement**

**Context needed:**
- `.cursorrules`
- The specific file(s) with the bug
- Related feature documentation

**Example:**
```
Fixing a bug in the dashboard filters.
@.cursorrules 
@app/(app)/dashboard/page.tsx
@docs/build-process/dashboard-improvements.md

Issue: When I filter by "This Week", it's showing next week's gigs instead.
Expected: Should show gigs from today through next 7 days.
```

---

### **3. Continuing Previous Work**

**Context needed:**
- Previous agent's summary (if available)
- `.cursorrules`
- Files being worked on
- Feature documentation

**Example:**
```
Continuing notifications system from previous session.

Previous agent built:
- Email templates ✅
- Database schema for notifications ✅
- API endpoints for sending emails ✅

Now need to:
- Build the in-app notification UI
- Add notification center to header
- Mark as read functionality

@.cursorrules 
@docs/build-process/step-X-notifications.md
@components/notification-center.tsx (if exists)
```

---

### **4. Code Review / Cleanup**

**Context needed:**
- `.cursorrules`
- Specific area of codebase
- Any known issues or concerns

**Example:**
```
Code review and cleanup for the dashboard section.
@.cursorrules 
@app/(app)/dashboard/
@lib/api/dashboard-gigs.ts

Looking for:
- Performance issues
- Code duplication
- Unused code
- Opportunities for refactoring
```

---

### **5. UI/UX Refinement**

**Context needed:**
- `.cursorrules`
- Specific component files
- Design requirements

**Example:**
```
UI refinement for the gig detail page.
@.cursorrules
@app/(app)/gigs/[id]/page.tsx

Need to:
- Make it more mobile-friendly
- Improve spacing and layout
- Add animations for better UX
```

---

## 💡 **Pro Tips**

### **1. Use File References Wisely**

✅ **Good:**
```
@.cursorrules 
@BUILD_STEPS.md 
@specific-file.tsx
```

❌ **Bad:**
```
@entire-app-directory (too much context, agent gets overwhelmed)
```

### **2. State Your Goal First**

✅ **Good:**
```
"I want to add pagination to the projects page"
@app/(app)/projects/page.tsx
```

❌ **Bad:**
```
"Look at @app/(app)/projects/page.tsx"
(Agent doesn't know what you want to do)
```

### **3. Reference Patterns, Not Everything**

✅ **Good:**
```
"Following the same pattern as dashboard filters"
@app/(app)/dashboard/page.tsx (lines 50-80)
```

❌ **Bad:**
```
Attaching 10 files hoping the agent figures it out
```

### **4. For Complex Features, Attach the Plan**

✅ **Good:**
```
@docs/future-enhancements/next-steps.md (Step 3 - lines 50-150)

"Let's implement Phase 1 of the notifications system as described"
```

❌ **Bad:**
```
"Let's build notifications" with no plan or context
```

### **5. Be Specific About Scope**

✅ **Good:**
```
"Add email notifications for gig invitations only (not for all gig updates)"
```

❌ **Bad:**
```
"Add notifications"
(Too vague - agent doesn't know what to notify about)
```

### **6. Mention What NOT to Change**

✅ **Good:**
```
"Refactor the dashboard filters logic, but DON'T change the UI or styling"
```

❌ **Bad:**
```
"Refactor the dashboard"
(Agent might change things you don't want changed)
```

---

## 📚 **Your Key Reference Files**

These are the files you'll most commonly attach to new agents:

### **Always Attach:**

1. ✅ `.cursorrules` - Your project DNA
   - Architecture principles
   - Tech stack
   - Coding patterns
   - Performance guidelines
   - Security rules

2. ✅ `BUILD_STEPS.md` - Current status
   - What's been built
   - What's in progress
   - What's next

### **Often Attach:**

3. ✅ `docs/future-enhancements/next-steps.md` - Feature roadmap
   - Planned features
   - Priority levels
   - Implementation notes

4. ✅ `docs/build-process/step-X-[feature].md` - Relevant feature docs
   - How specific features were built
   - Design decisions
   - Technical details

### **Sometimes Attach:**

5. ✅ Specific code files for the feature
   - Components being modified
   - API endpoints
   - Database queries

6. ✅ Type definitions (`lib/types/`)
   - Database types
   - Shared types
   - API interfaces

7. ✅ API files (`lib/api/`)
   - Data fetching logic
   - Mutations
   - Server actions

### **Rarely Needed:**

8. ⚠️ UI component library files
   - Agent knows shadcn/ui patterns
   - Only attach if customized

9. ⚠️ Config files
   - Only if changing configuration
   - Agent knows standard setups

---

## 🔄 **Workflow Example (Real Scenario)**

### **Session 1: Start Feature**
```
Prompt:
"Let's build the notifications system - Phase 1: Email notifications

@.cursorrules
@BUILD_STEPS.md
@docs/future-enhancements/next-steps.md (Step 3)

Start with:
1. Database schema for notifications
2. Email templates
3. API endpoint to send emails"

Agent: 
→ Builds email infrastructure
→ Creates database schema
→ Implements basic email sending
→ Documents the work
→ 50k tokens used
```

### **Session 2: Continue Feature (New Agent)**
```
Prompt:
"Continuing notifications system. Previous agent built email infrastructure.
Now building UI notification center.

@.cursorrules
@BUILD_STEPS.md
@docs/build-process/step-X-notifications.md

What was done:
- Email templates ✅
- DB schema ✅
- Send email API ✅

What I need now:
- Notification center component in header
- Mark as read functionality
- Real-time updates with Supabase subscriptions"

Agent:
→ Builds notification UI
→ Implements mark as read
→ Adds real-time subscriptions
→ 40k tokens used
```

### **Session 3: Bug Fix (New Agent)**
```
Prompt:
"Bug in notifications: emails not sending after Supabase migration.

@.cursorrules
@lib/api/notifications.ts
@app/api/notifications/route.ts
@docs/build-process/step-X-notifications.md

Error message:
[paste error]

Context: Previous agents built this in sessions 1-2. 
Emails worked fine, but stopped after we added owner_id to gigs table."

Agent:
→ Investigates issue
→ Finds RLS policy blocking email trigger
→ Fixes policy
→ Tests and verifies
```

---

## 📊 **Decision Matrix**

| Scenario | New Agent? | Key Context | Reasoning |
|----------|------------|-------------|-----------|
| New major feature | ✅ Yes | `.cursorrules` + `BUILD_STEPS.md` + feature plan | Fresh start, different domain |
| Small iteration on same feature | ❌ No | Continue with same agent | Context already loaded |
| Bug fix (known code) | ✅ Maybe | `.cursorrules` + specific files | Depends on complexity |
| Bug fix (after long session) | ✅ Yes | Reset and provide error context | Fresh perspective helps |
| Code review | ✅ Yes | `.cursorrules` + target files | Need objective view |
| UI/UX tweaks | ❌ No | Continue if in same area | Quick iterations work well |
| After 70k+ tokens | ✅ Yes | Reset and start fresh | Performance improvement |
| After major completion | ✅ Yes | Document and start fresh | Clean slate for next feature |
| Stuck/debugging | ✅ Yes | Explain problem to fresh agent | New perspective often helps |

---

## 🎯 **Template: Starting a New Agent**

Copy this template and fill it in:

```
Hi! I'm working on [FEATURE_NAME] for my Ensemble app.

Context:
@.cursorrules
@BUILD_STEPS.md
@[relevant docs or code files]

Current Status:
- Recently completed: [list recent work]
- Current state: [describe where things are now]

Goal:
[Clear description of what you want to build/fix/improve]

Specific Requirements:
- [requirement 1]
- [requirement 2]
- [requirement 3]

Questions/Concerns:
- [any specific things you're unsure about]

Let's [make a plan / start building / debug this]!
```

---

## 🚀 **Quick Start Checklist**

Before opening a new agent, ask yourself:

- [ ] Have I completed the current task?
- [ ] Is everything documented?
- [ ] Do I know what I want the new agent to do?
- [ ] Have I identified the key files to attach?
- [ ] Is my goal specific and clear?
- [ ] Have I checked the token count (>70k = new agent)?

If yes to most of these, open a new agent! ✅

---

## 🎓 **Advanced Tips**

### **1. Agent Specialization**

Some agents might be better at different things:
- **Architecture Agent**: Design systems, plan features
- **Implementation Agent**: Build the feature
- **Cleanup Agent**: Refactor, optimize, clean up
- **Debug Agent**: Fix specific bugs

You can guide this by your initial prompt:
```
"I need an architecture review of the notifications system before we build it"
vs
"Let's implement the notifications UI now"
```

### **2. Iterative Refinement**

For complex features:
1. **Agent 1**: Plan and design
2. **Agent 2**: Implement core
3. **Agent 3**: Add refinements
4. **Agent 4**: Polish and document

Each agent gets clearer scope = better results.

### **3. Context Preservation**

After each session, the agent should document:
- What was built
- Design decisions
- Files modified
- What's next

This makes the next agent's job easier!

### **4. Reference Previous Work**

When continuing work:
```
"Previous agent built X. I reviewed the code in @file.tsx and it looks good.
Now let's add Y following the same pattern."
```

This shows you reviewed and understood, helping the new agent align.

---

## 🔒 **Mandatory Protocols for Database Work**

### **CRITICAL: Always Follow Database Safety Protocol**

Before doing ANY database-related work (migrations, RLS, schema changes), you MUST:

#### **Pre-Work Checklist**

1. **Run Supabase Advisors** (MANDATORY):
   ```
   - mcp_supabase_READ-ONLY_get_advisors with type "security"
   - mcp_supabase_READ-ONLY_get_advisors with type "performance"
   ```
   - Fix any critical issues found before proceeding
   - Document advisor findings in your work

2. **Check Current State**:
   ```
   - mcp_supabase_READ-ONLY_list_tables - Verify schema
   - mcp_supabase_READ-ONLY_list_migrations - Check history
   - mcp_supabase_READ-ONLY_execute_sql - Query specific state
   ```
   - NEVER assume policy names, table structure, or indexes
   - Always query the actual database state first

3. **For RLS Changes**:
   - Query `pg_policies` to see ACTUAL policy names
   - Use exact names from database (not assumed names)
   - Check for circular dependencies
   - Verify changes with MCP queries after applying

#### **We Work Directly with Supabase (Remote)**

- ✅ Use MCP tools to query and modify the database
- ✅ Use `mcp_supabase_READ-ONLY_apply_migration` for schema changes
- ❌ Do NOT run local SQL migrations or `supabase db` commands
- ❌ Do NOT use local Supabase instance or psql

#### **Verification Checklist**

After any database changes:

- [ ] Verified with MCP query that changes actually applied
- [ ] Re-ran advisors to check for new issues
- [ ] Tested relevant queries work
- [ ] Documented changes in migration file
- [ ] Updated build process documentation if needed

**Full Protocol**: See [`docs/agent-protocols/database-safety.md`](./agent-protocols/database-safety.md)

**Why This Matters**: We spent 2+ hours debugging RLS issues because we assumed policy names instead of checking. The MCP tools prevent this nightmare. Use them!

---

## 📖 **Related Documentation**

- [.cursorrules](../.cursorrules) - Project architecture and rules
- [BUILD_STEPS.md](../BUILD_STEPS.md) - Current project status
- [Next Steps Roadmap](./future-enhancements/next-steps.md) - Feature planning
- [Build Process Docs](./build-process/) - Completed feature documentation
- [Agent Protocols](./agent-protocols/) - Mandatory protocols for database, RLS, and safety
- [Database Safety Protocol](./agent-protocols/database-safety.md) - CRITICAL for all database work

---

## 💬 **Common Questions**

### **Q: Can I switch agents mid-feature?**
**A:** Yes! Just document what was done and what's next. The new agent can continue if given proper context.

### **Q: What if I forget to document?**
**A:** Ask the current agent to create a summary before you close it. You can paste this into the next agent.

### **Q: How do I know if I have too much context?**
**A:** If the agent is slow to respond (>10 seconds), or if token count is >70k, consider starting fresh.

### **Q: Should I attach code files or just reference them?**
**A:** Attach specific files you want modified. Reference files for patterns/examples.

### **Q: What if the new agent doesn't understand?**
**A:** Provide more specific context. Attach the actual code files and be very explicit about what you want.

### **Q: Can I work with multiple agents at once?**
**A:** Technically yes, but confusing! Stick to one agent at a time. Finish or pause before starting a new one.

---

**Last Updated:** November 18, 2025

**Pro Tip:** Bookmark this guide and reference it before starting each new agent session! 🔖

