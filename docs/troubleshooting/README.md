# Troubleshooting Documentation

This directory contains detailed troubleshooting guides and debugging sagas for issues encountered during development.

## Available Guides

### [RLS Debugging Saga](./rls-debugging-saga.md)
**Date**: November 18, 2025  
**Issue**: Infinite recursion in RLS policies  
**Key Learning**: Always check actual policy names in `pg_policies` before attempting to drop them

A detailed account of debugging RLS (Row Level Security) circular dependencies between `gigs` and `gig_roles` tables. This document covers:
- 7 debugging attempts (6 failed, 1 succeeded)
- Root cause analysis (circular dependencies)
- The breakthrough moment (checking actual policy names)
- Final solution (permissive policy for gig_roles)
- Lessons learned for future RLS work

---

## When to Add Documentation Here

Add troubleshooting documentation when:
1. **Complex bugs** that took significant time to resolve (>1 hour)
2. **Non-obvious solutions** that might help future debugging
3. **Pattern issues** that could occur again in different contexts
4. **Infrastructure problems** (like the Supabase outage during RLS debugging)

## Document Format

Each troubleshooting document should include:
- **Date** and **Duration** of the issue
- **Problem summary** (TL;DR at the top)
- **Symptoms** (what the user/developer experienced)
- **Debugging steps** (what was tried, what failed, what worked)
- **Root cause** (why it happened)
- **Solution** (what fixed it)
- **Lessons learned** (how to avoid/fix faster next time)
- **Related files/migrations** (for reference)

---

## Related Documentation

- [Build Process](../build-process/) - Step-by-step feature implementation
- [Future Enhancements](../future-enhancements/) - Planned features and improvements
- [Setup Guides](../setup/) - Configuration and deployment guides

---

Last Updated: November 18, 2025

