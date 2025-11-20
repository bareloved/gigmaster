# AI Agent Protocols

**Mandatory protocols for AI agents working on Ensemble**

This directory contains critical protocols that **all AI agents must follow** when working on the Ensemble codebase. These protocols exist to prevent costly debugging sessions, data loss, and architectural problems.

---

## 📋 Protocol Index

### 1. [Database Safety Protocol](./database-safety.md) ⚠️ CRITICAL

**When to use**: Before ANY database-related work (migrations, RLS, schema changes)

**What it covers**:
- Supabase MCP tools reference and usage
- Pre-migration mandatory checklist
- RLS policy debugging protocol
- Remote Supabase workflow (not local)
- Common query patterns
- Verification procedures

**Why it matters**: We spent 2+ hours debugging RLS issues because we assumed policy names instead of checking actual database state. This protocol prevents that nightmare.

**Status**: MANDATORY - All agents must follow

---

## 🔒 General Safety Rules

All agents must also follow the rules in [`.cursorrules`](../../.cursorrules):

### Database Operations
- NEVER run destructive commands without explicit user confirmation
- `supabase db reset` - WIPES ALL LOCAL DATA
- `supabase db push` - MODIFIES REMOTE DATABASE
- Always suggest safe alternatives first

### MCP Tools Usage
- Use `mcp_supabase_READ-ONLY_*` tools for all database work
- We work DIRECTLY with Supabase (remote), not local instance
- Run advisors before every migration
- Query actual state, never assume

### RLS Debugging
- ALWAYS check what exists first (query `pg_policies`)
- Use EXACT policy names from database
- Watch for circular dependencies
- Verify changes after applying

---

## 📖 Related Documentation

### Agent Workflow
- [AI Agent Workflow Guide](../AI_AGENT_WORKFLOW_GUIDE.md) - How to work with multiple agents effectively
- [Build Process Docs](../build-process/) - Completed feature documentation
- [Troubleshooting](../troubleshooting/) - Common issues and solutions

### Project Rules
- [.cursorrules](../../.cursorrules) - Complete project rules and architecture
- [BUILD_STEPS.md](../../BUILD_STEPS.md) - Current project status
- [Next Steps Roadmap](../future-enhancements/next-steps.md) - Future features

### Troubleshooting Case Studies
- [RLS Debugging Saga](../troubleshooting/rls-debugging-saga.md) - Why the database safety protocol exists

---

## 🚀 Quick Start for New Agents

When starting work on Ensemble:

1. **Read the project rules**: `.cursorrules` (comprehensive architecture and guidelines)
2. **Understand current state**: `BUILD_STEPS.md` (what's been built)
3. **Check your task type**:
   - Database work? → Read [Database Safety Protocol](./database-safety.md) FIRST
   - New feature? → Read [AI Agent Workflow Guide](../AI_AGENT_WORKFLOW_GUIDE.md)
   - Bug fix? → Check [Troubleshooting](../troubleshooting/)

### For Database/Migration Work

**MANDATORY Pre-Flight Checklist**:

```
1. Run advisors:
   - mcp_supabase_READ-ONLY_get_advisors (security)
   - mcp_supabase_READ-ONLY_get_advisors (performance)

2. Check current state:
   - mcp_supabase_READ-ONLY_list_tables
   - mcp_supabase_READ-ONLY_list_migrations

3. If touching RLS:
   - Query pg_policies for actual policy names
   - Never assume names, always check

4. Apply migration:
   - Use mcp_supabase_READ-ONLY_apply_migration
   - NOT local SQL files or supabase CLI

5. Verify:
   - Query to confirm changes applied
   - Re-run advisors
   - Test relevant queries
```

---

## 🎯 Key Principles

### 1. MCP First
Use MCP tools to check database state **before** suggesting changes. Never guess or assume.

### 2. No Local Workflow
We work directly with Supabase remote database. Do NOT run local migrations or use local Supabase instance.

### 3. Advisors Required
Run security and performance advisors **before every migration**. Catch issues early.

### 4. Never Assume
Query actual database state. Policy names, table structure, indexes - check everything.

### 5. Verify Always
After changes, verify with MCP queries that they actually applied correctly.

### 6. Safety First
Never run destructive commands without explicit user confirmation. Suggest safe alternatives.

---

## 📊 Protocol Compliance

### Before Database Work
- [ ] Read Database Safety Protocol
- [ ] Run security advisors
- [ ] Run performance advisors
- [ ] Query current database state
- [ ] Check migration history

### During Development
- [ ] Use MCP tools exclusively
- [ ] Query actual policy/table names
- [ ] Check for circular RLS dependencies
- [ ] Use descriptive migration names

### After Changes
- [ ] Verify with MCP queries
- [ ] Re-run advisors
- [ ] Test relevant queries
- [ ] Document changes
- [ ] Update build process docs

---

## ❌ Common Mistakes to Avoid

1. **Assuming policy names** instead of querying `pg_policies`
   - Caused 2+ hour debugging session
   - Use MCP to check actual names

2. **Running local migrations** instead of using MCP tools
   - We work directly with Supabase remote
   - Use `mcp_supabase_READ-ONLY_apply_migration`

3. **Skipping advisors** before migrations
   - Catches missing RLS, security issues, performance problems
   - Takes 10 seconds, saves hours

4. **Creating circular RLS dependencies**
   - Table A checks Table B, Table B checks Table A
   - Break cycle by making one table permissive

5. **Not verifying changes** after applying
   - Always query to confirm changes actually applied
   - Re-run advisors to catch new issues

---

## 🔄 Protocol Updates

When adding new protocols:

1. Create new `.md` file in this directory
2. Update this `README.md` index
3. Reference from `.cursorrules` if critical
4. Reference from `AI_AGENT_WORKFLOW_GUIDE.md` if workflow-related
5. Update relevant troubleshooting docs

---

## 📞 Questions?

If you're unsure about a protocol:

1. **Check the protocol doc** - Most answers are there
2. **Check `.cursorrules`** - Comprehensive project rules
3. **Check troubleshooting docs** - See what went wrong before
4. **Ask the user** - If truly unsure, ask for clarification

**When in doubt, err on the side of caution.** It's better to ask than to cause a multi-hour debugging session.

---

**Last Updated**: November 19, 2024  
**Version**: 1.0  
**Status**: Active - All protocols mandatory

