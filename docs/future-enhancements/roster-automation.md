# Future Enhancement: Roster Automation & Friction Reduction

## Status
**Not yet implemented** - Ideas for reducing manual work when adding roles to gigs

## Problem
Manually adding roles for every gig is repetitive and time-consuming. Users have to fill in the same roles (Keys, Drums, Bass, etc.) for every gig in the same project.

---

## Proposed Solutions

### **Option 1: Project Default Roster** ⭐ (Highest Priority)

**Concept:**
- Define a "default roster" at the Project level
- When creating a gig → auto-populate roles from project's default
- Example: "80s Cover Band" always needs Keys, MD, Drums, Bass, Vocals
- Users can still customize per gig (add sax, remove guitar, etc.)

**Implementation:**
1. Add `default_roles` JSONB field to `projects` table
2. Store structure: 
   ```json
   [
     {"role_name": "Keys", "default_fee": 150},
     {"role_name": "Drums", "default_fee": 150},
     {"role_name": "Bass", "default_fee": 120}
   ]
   ```
3. Add "Default Roster" section in Project Settings page
4. In "Create Gig" dialog, add checkbox: ☑️ "Use project's default roster"
5. On gig creation, if checked → auto-insert roles from project defaults

**User Workflow:**
1. Create project → define default roster once
2. Create gig → checkbox auto-selected, roles pre-populated
3. Customize if needed for this specific gig

**Benefits:**
- Set up once, use forever
- Consistent lineup across project
- Still flexible per gig
- Saves 80% of repetitive data entry

---

### **Option 2: Copy from Previous Gig**

**Concept:**
- When adding roles to a gig, show "Copy from..." dropdown
- Select previous gig → copy all roles & musicians
- Great for one-off variations or when project roster changes

**Implementation:**
1. In Gig Detail "People" section, add "Quick Add" button
2. Dropdown: "Copy lineup from previous gig"
3. Show list of recent gigs in same project
4. Click → copies all roles with same names, fees, musicians

**User Workflow:**
1. Open gig detail
2. Click "Copy from Previous Gig"
3. Select gig → all roles copied
4. Adjust as needed

**Benefits:**
- Handles evolving lineups
- Good for similar but not identical gigs
- Faster than manual entry

---

### **Option 3: Quick Add Templates**

**Concept:**
- Pre-defined role templates for common band sizes
- "Add 5-piece band" button → adds Keys, Drums, Bass, Guitar, Vocals at once

**Implementation:**
1. Create templates:
   - Trio (Keys, Bass, Drums)
   - Quartet (Keys, Bass, Drums, Guitar)
   - 5-piece (Keys, Bass, Drums, Guitar, Vocals)
   - DJ Set (DJ, Track Operator, FOH)
2. "Quick Add" button in AddRoleDialog
3. Select template → all roles added at once

**Benefits:**
- Zero setup required
- Works for new projects immediately
- Good for standard configurations

---

## Recommended Implementation Order

**Phase 1: Project Default Roster** (High Impact, Medium Effort)
- Most valuable long-term
- Set once, use forever
- Requires DB schema change

**Phase 2: Copy from Previous Gig** (Medium Impact, Low Effort)
- Nice complement to defaults
- Handles edge cases
- No schema changes needed

**Phase 3: Quick Add Templates** (Low Impact, Low Effort)
- Good for new users
- Simple fallback
- Hardcoded templates

---

## Technical Details

### Database Schema Changes

**Add to `projects` table:**
```sql
ALTER TABLE projects ADD COLUMN default_roles JSONB;
```

**Example data:**
```json
{
  "roles": [
    {
      "role_name": "Keys / MD",
      "default_fee": 150,
      "notes": "Bring laptop for backing tracks"
    },
    {
      "role_name": "Drums",
      "default_fee": 150
    },
    {
      "role_name": "Bass",
      "default_fee": 120
    }
  ]
}
```

### API Functions Needed

1. `updateProjectDefaultRoster(projectId, roles)`
2. `copyRolesFromGig(sourceGigId, targetGigId)`
3. `addRolesFromTemplate(gigId, templateName)`

---

## UI/UX Considerations

### Where to manage default roster?
**Option A:** Project Settings page (dedicated "Default Roster" tab)
- Most discoverable
- Clear purpose
- Best practice

**Option B:** First gig creation prompts "Save as default?"
- Just-in-time learning
- Less upfront setup
- Could be annoying if user says no repeatedly

**Option C:** Both
- Best of both worlds
- Recommended approach

### Auto-populate behavior?
**Option A:** Always auto-populate (can delete unwanted)
- Faster for 90% of cases
- Might surprise users

**Option B:** Checkbox "Use default roster" (opt-in)
- More control
- Clearer intent
- **Recommended**

---

## Success Metrics

- Average time to create gig (should decrease 50%+)
- Number of roles added per gig (should stay consistent)
- % of gigs using default roster feature
- User feedback on setup friction

---

## Dependencies

- Requires Step 5 (GigRoles) to be complete ✅
- Works best after Projects page is polished
- Could integrate with Step 8 (Dashboard views)

---

## Timeline Recommendation

**Earliest implementation:** Right after Step 5, before Step 6

**Why?**
- High ROI (saves tons of time immediately)
- Low complexity (mostly UI + small schema change)
- Makes testing Steps 6-10 faster (less manual role entry)

**Estimated effort:** 2-3 hours of focused work

---

## Source
User feedback on November 13, 2025 after completing Step 5
Identified as major friction point in gig creation workflow

