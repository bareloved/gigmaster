# Safety Safeguards for Cursor AI

**Created:** 2024-11-16  
**Purpose:** Prevent AI agents from running destructive commands without explicit user approval

---

## 🛡️ Safeguards Implemented

### 1. `.cursorrules` File (Primary Protection)

**Location:** `/.cursorrules`

This file is read by ALL Cursor AI agents and explicitly forbids:
- `supabase db reset` - Wipes local database
- `supabase db push` - Modifies remote database  
- `git push --force` - Breaks remote repo
- `rm -rf` - Deletes files permanently
- Any other destructive operations

**Enforcement:**
- AI agents MUST stop before running these commands
- AI agents MUST explain consequences
- AI agents MUST wait for explicit "yes, proceed" from user

---

### 2. Supabase Safety Wrapper Script

**Location:** `/scripts/safe-supabase.sh`

A shell wrapper that intercepts dangerous Supabase commands and requires manual confirmation.

**Usage:**
```bash
# Instead of: supabase db reset
# Use: ./scripts/safe-supabase.sh db reset

# You'll be prompted to type 'YES I UNDERSTAND' before proceeding
```

**Optional:** Create an alias in your `~/.zshrc` or `~/.bashrc`:
```bash
alias supabase='"/Users/bareloved/Cursor Projects/Ensemble/scripts/safe-supabase.sh"'
```

This way, even if you manually run `supabase db reset`, you'll get a confirmation prompt.

---

### 3. Cursor Workspace Rules

**Location:** Cursor Settings → Rules → Workspace Rules

You can add these rules in Cursor's settings:

1. Open Cursor Settings (Cmd+,)
2. Go to "Features" → "Rules"  
3. Click "Edit Workspace Rules"
4. Add:

```
CRITICAL DATABASE SAFETY RULE:
- NEVER run 'supabase db reset' without explicit user confirmation
- NEVER run 'supabase db push' without explicit user confirmation
- ALWAYS explain consequences and wait for approval
- Suggest safe alternatives first (migrations, backups, etc.)
```

---

## 🚨 Dangerous Commands Reference

### Database Operations
| Command | Risk | What It Does |
|---------|------|--------------|
| `supabase db reset` | 🔴 CRITICAL | Wipes entire local database |
| `supabase db push` | 🔴 CRITICAL | Pushes to remote/production |
| `supabase link` | 🟡 HIGH | Links to production project |
| SQL `DROP`, `TRUNCATE` | 🔴 CRITICAL | Deletes data permanently |

### Git Operations  
| Command | Risk | What It Does |
|---------|------|--------------|
| `git push --force` | 🔴 CRITICAL | Overwrites remote history |
| `git reset --hard` | 🟡 HIGH | Loses uncommitted changes |
| `git clean -fd` | 🟡 HIGH | Deletes untracked files |

### File Operations
| Command | Risk | What It Does |
|---------|------|--------------|
| `rm -rf` | 🔴 CRITICAL | Deletes files permanently |
| `rm -r` | 🟡 HIGH | Deletes directories |

---

## ✅ Safe Alternatives

### Instead of `supabase db reset`:
```bash
# Apply only new migrations (preserves data)
supabase migration up

# Check migration status
supabase migration list

# Repair migration versions
supabase migration repair
```

### Before any destructive operation:
```bash
# Backup local database
pg_dump postgresql://postgres:postgres@127.0.0.1:54322/postgres > backup.sql

# Restore from backup
psql postgresql://postgres:postgres@127.0.0.1:54322/postgres < backup.sql
```

---

## 📋 If Data Loss Occurs

1. **Stop immediately** - Don't run more commands
2. **Check if backup exists** - `backup.sql` or `supabase/seed.sql`
3. **Restore from backup** if available
4. **Recreate test data** manually if no backup
5. **Update seed file** with essential test data

---

## 🔧 Recommended Setup

### Create a Seed File

Create `supabase/seed.sql` with test data that auto-restores after resets:

```sql
-- Test user (gets created by auth)
-- INSERT test projects, gigs, roles here

INSERT INTO public.projects (id, name, owner_id) VALUES
  ('uuid-here', 'Test Project', 'user-id-here');

-- Add more test data...
```

### Git Ignore Backup Files

Add to `.gitignore`:
```
backup-*.sql
*.dump
```

---

## 🎯 Summary

With these safeguards:
1. ✅ `.cursorrules` prevents AI from running destructive commands
2. ✅ Safety wrapper requires manual confirmation
3. ✅ Workspace rules remind AI agents of restrictions
4. ✅ Safe alternatives documented
5. ✅ Recovery procedures in place

**The AI will now ALWAYS ask before running destructive commands.**

---

**Last Updated:** 2024-11-16  
**Tested:** ✅ Yes

