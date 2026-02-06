# Operations Runbook

> Auto-generated on 2026-02-05. Update when deployment or operational procedures change.

## Deployment

**Platform:** Vercel (automatic deploys from `main` branch)

### Pre-deploy checklist

```bash
npm run check          # Lint + TypeScript
npm run test:run       # All tests pass
npm run build          # Production build succeeds
```

### Environment variables

All variables must be set in Vercel > Settings > Environment Variables for Production, Preview, and Development environments. See `ENVIRONMENT_VARIABLES.md` for the full list and where to find each value.

**Required:** `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`

**Optional (features degrade gracefully):**
- `GOOGLE_CALENDAR_*` — Google Calendar import disabled without these
- `RESEND_API_KEY` — Email invitations disabled
- `NEXT_PUBLIC_GOOGLE_PLACES_API_KEY` — Venue autocomplete falls back to text input
- `NEXT_PUBLIC_APP_URL` — Invitation links fall back to localhost

### Database migrations

Migrations are applied **manually** via Supabase Dashboard SQL Editor. There is no automated migration pipeline.

1. Write migration SQL in `supabase/migrations/`
2. Open Supabase Dashboard > SQL Editor
3. Paste and run the migration
4. Verify with `SELECT * FROM supabase_migrations.schema_migrations ORDER BY version DESC LIMIT 5;`
5. Update `lib/types/database.ts` if schema changed

See `docs/deployment/migration-testing-checklist.md` for the full testing protocol.

## Monitoring

### What to check after deploy

- [ ] App loads at production URL (no white screen)
- [ ] Sign in works
- [ ] Dashboard loads gigs
- [ ] Creating a gig works
- [ ] Calendar ICS feed responds (`/api/calendar.ics?token=...`)

### Logs

- **Vercel:** Functions tab > Runtime Logs for server-side errors
- **Supabase:** Logs Explorer for database/auth/storage errors
- **Browser:** Console for client-side errors

### Health indicators

| Signal | Where to check | Healthy |
|--------|---------------|---------|
| Page load | Browser | < 2s |
| API response | Vercel Functions logs | < 500ms |
| Database queries | Supabase Logs Explorer | < 200ms |
| ICS feed | `curl /api/calendar.ics?token=...` | < 1s, valid ICS |

## Common Issues and Fixes

### "Module not found" after deploy

**Cause:** Import path mismatch or missing dependency.
**Fix:** Run `npm run build` locally to reproduce, then fix the import.

### RLS policy errors (403 / empty data)

**Cause:** Row Level Security blocking queries.
**Fix:**
```sql
-- Check current policies
SELECT policyname, cmd, qual FROM pg_policies WHERE tablename = 'your_table';
```
See `docs/troubleshooting/rls-debugging-saga.md`.

### Google Calendar OAuth fails

**Cause:** Redirect URI mismatch or expired credentials.
**Fix:**
1. Verify `GOOGLE_CALENDAR_REDIRECT_URI` matches the Google Cloud Console config exactly
2. Check token expiry in `calendar_connections` table
3. User can disconnect and reconnect in Settings > Calendar

### Stale cache / cross-user data leak

**Cause:** Missing `user?.id` in TanStack Query key.
**Fix:** Ensure all query keys include `user?.id`:
```ts
queryKey: ['gigs', user?.id]
```

### Build fails with TypeScript errors

**Cause:** Type mismatch with Supabase-generated types.
**Fix:** Regenerate types from Supabase or update `lib/types/database.ts` manually. Run `npm run check` to verify.

### Invitation magic links not working

**Cause:** `NEXT_PUBLIC_APP_URL` not set or `RESEND_API_KEY` missing.
**Fix:** Set both in Vercel environment variables and redeploy.

## Rollback Procedures

### Application rollback (Vercel)

1. Go to Vercel > Deployments
2. Find the last working deployment
3. Click "..." > "Promote to Production"
4. Verify the app works

### Database rollback

There is no automated rollback. Options:

1. **Forward fix:** Write a new migration to undo the change
2. **Point-in-time recovery:** Use Supabase Dashboard > Database > Backups (Pro plan)
3. **Manual revert:** Run inverse SQL in the SQL Editor

**Before any risky migration:** Note the current state so you can write a manual revert if needed.

## Operational contacts

- **Vercel dashboard:** vercel.com/dashboard
- **Supabase dashboard:** supabase.com/dashboard
- **Google Cloud Console:** console.cloud.google.com (for Calendar OAuth)
- **Resend dashboard:** resend.com/dashboard (for email delivery)
