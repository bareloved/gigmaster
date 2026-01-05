# Money View v1 - Deployment Checklist

Before deploying Money View v1 to production, ensure all these items are checked:

## Pre-Deployment

### Database
- [ ] **CRITICAL:** Backup production database before running migration
- [ ] Review migration file: `supabase/migrations/20251120000005_money_view_v1.sql`
- [ ] Verify migration in staging environment first
- [ ] Confirm RLS policies are correct
- [ ] Test with production-like data volume

### Code Review
- [ ] All TypeScript compile without errors
- [ ] No linting errors: `npm run lint`
- [ ] No console errors in browser
- [ ] All components render correctly
- [ ] Test in both light and dark mode

### Testing
- [ ] Test as player (musician) role
- [ ] Test as manager role
- [ ] Test with empty state (no gigs)
- [ ] Test with large dataset (50+ gigs)
- [ ] Test all date filters (including February)
- [ ] Test "Paid" button functionality
- [ ] Test navigation to/from gig detail
- [ ] Test browser back button
- [ ] Test on mobile viewport

### Data Migration
- [ ] Plan for existing `is_paid` data
  - Migration automatically drops `is_paid` column
  - No data migration needed (field is dropped)
  - All gigs will start as "pending"
- [ ] Communicate to users about manual payment status updates needed
- [ ] Consider bulk update script if many paid gigs exist

## Deployment Steps

1. **Backup Database**
   ```bash
   # Use Supabase dashboard or CLI
   supabase db dump > backup_before_money_view.sql
   ```

2. **Apply Migration**
   ```bash
   # Option 1: Supabase Dashboard SQL Editor
   # Copy content from: supabase/migrations/20251120000005_money_view_v1.sql
   # Paste and run
   
   # Option 2: CLI
   supabase db push
   ```

3. **Verify Migration**
   ```sql
   -- Check new columns exist
   SELECT column_name, data_type 
   FROM information_schema.columns 
   WHERE table_name = 'gig_roles' 
   AND column_name IN ('payment_status', 'paid_amount', 'paid_date');
   
   -- Check old column is gone
   SELECT column_name 
   FROM information_schema.columns 
   WHERE table_name = 'gig_roles' 
   AND column_name = 'is_paid';
   -- Should return 0 rows
   
   -- Check currency field
   SELECT column_name 
   FROM information_schema.columns 
   WHERE table_name = 'gigs' 
   AND column_name = 'currency';
   ```

4. **Deploy Frontend**
   ```bash
   git add .
   git commit -m "feat: implement Money View v1 with payment tracking"
   git push origin main
   ```

5. **Verify Production**
   - [ ] Navigate to `/money` page
   - [ ] Confirm "In Progress" badge shows
   - [ ] Test filtering by month/year
   - [ ] Mark a test gig as paid
   - [ ] Verify KPI cards update immediately
   - [ ] Check manager view (if applicable)

## Post-Deployment

### Monitoring
- [ ] Check error logs for any issues
- [ ] Monitor database performance
- [ ] Watch for slow queries
- [ ] Check RLS policy performance

### User Communication
- [ ] Notify users about new Money feature
- [ ] Explain payment status system
- [ ] Provide documentation/tutorial
- [ ] Collect feedback

### Quick Wins
- [ ] Mark obviously paid gigs (if data exists elsewhere)
- [ ] Train power users first
- [ ] Gather initial feedback

## Rollback Plan

If critical issues arise:

1. **DO NOT** immediately rollback database
   - Data loss will occur (paid_amount, paid_date)
   - Try fixing forward first

2. **If Rollback Necessary:**
   ```sql
   -- See rollback instructions in:
   -- docs/build-process/step-22-money-view-v1.md
   -- Section: "Rollback Instructions"
   ```

3. **Alternative: Hotfix**
   - Fix bugs in code without touching schema
   - Deploy hotfix
   - Much safer than schema rollback

## Support Preparation

### Common Questions:
**Q: Where did my payment data go?**  
A: The old `is_paid` field was replaced. All gigs start as "pending". You'll need to mark them as paid manually.

**Q: How do I mark multiple gigs as paid?**  
A: Currently one at a time. Bulk actions coming in future update.

**Q: What does "overdue" mean?**  
A: Manually set status for payments past due. No automatic detection yet.

**Q: Can I export my payment data?**  
A: Not yet. CSV export planned for future update.

### Known Issues:
- Back navigation uses browser history (expected behavior)
- Overdue is manual (no auto-detection)
- Single currency only (ILS)
- No bulk actions

## Success Metrics

Track these after deployment:

- [ ] Number of users visiting `/money` page
- [ ] Number of payments marked as "paid"
- [ ] User feedback sentiment
- [ ] Error rate
- [ ] Page load time
- [ ] Database query performance

## Future Enhancements Prioritization

Based on user feedback, prioritize:
1. Most requested features
2. Biggest pain points
3. Quick wins (easy + high impact)

---

**Checklist Complete? You're ready to deploy Money View v1! 🚀**

Remember: Feature is marked "In Progress" in UI to set expectations for ongoing improvements.

