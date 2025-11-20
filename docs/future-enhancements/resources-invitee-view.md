# Resources - Invitee View Enhancements

## Priority: High
**Related to:** Step 7 - Resources (Files & Materials)

---

## Overview

Currently, the Resources section shows all controls (edit, delete) to everyone. This needs to be enhanced to provide different views based on the user's relationship to the gig:

- **Owners/Managers**: Full control (current implementation)
- **Invitees**: View-only, streamlined access

---

## Requirements

### For Invitees (Musicians invited to the gig)

**Behavior:**
1. **Clickable Resource Cards**
   - The entire resource item should be clickable
   - Clicking anywhere on the card opens the URL in a new tab
   - No need for separate "Open in new tab" button

2. **Hide Edit/Delete Actions**
   - Remove the Edit button (pencil icon)
   - Remove the Delete button (trash icon)
   - These actions are not available to invitees

3. **Visual Simplification**
   - Resource items become clean, clickable cards
   - Maintain file type icon (left)
   - Maintain hosting service logo (top right)
   - Maintain file label
   - No action buttons cluttering the view

**User Story:**
> As a musician invited to a gig, I want to quickly access charts, backing tracks, and other materials by clicking on them, so I can prepare for the gig without needing to manage the resources.

---

## Implementation Details

### Permission Check

Determine if current user is owner/manager vs. invitee:

```typescript
const isOwnerOrManager = gig?.project?.owner_id === user?.id;
// or check if user has a gig_role with manager permissions
```

### Conditional Rendering

**For Owners/Managers (current behavior):**
```tsx
<div className="relative flex items-center gap-3 p-2.5 border rounded-lg hover:bg-muted/50">
  <FileTypeIcon />
  <div className="flex-1">
    <h4>{file.label}</h4>
  </div>
  {/* Action buttons */}
  <Button onClick={openUrl}>...</Button>
  <Button onClick={edit}>...</Button>
  <Button onClick={delete}>...</Button>
</div>
```

**For Invitees (simplified):**
```tsx
<a
  href={file.url}
  target="_blank"
  rel="noopener noreferrer"
  className="relative flex items-center gap-3 p-2.5 border rounded-lg hover:bg-muted/50 hover:border-primary transition-colors cursor-pointer"
>
  <FileTypeIcon />
  <div className="flex-1">
    <h4>{file.label}</h4>
  </div>
  <ExternalLink className="h-4 w-4 text-muted-foreground" />
</a>
```

---

## Visual Mockups

### Current View (Owner/Manager)
```
┌──────────────────────────────────────────────────────────────┐
│ [📄] Complete Lead Sheet                          [🔵 📁]     │
│                                       [🔗][✏️][🗑️]            │
└──────────────────────────────────────────────────────────────┘
```

### Proposed Invitee View
```
┌──────────────────────────────────────────────────────────────┐
│ [📄] Complete Lead Sheet                    [🔗] [🔵 📁]     │
│      (entire card is clickable)                              │
└──────────────────────────────────────────────────────────────┘
```

---

## Benefits

1. **Faster Access**: Invitees can click anywhere on the card to open resources
2. **Less Clutter**: No edit/delete buttons that invitees can't use anyway
3. **Clear Intent**: Card becomes obviously clickable (hover effects, cursor)
4. **Better Mobile UX**: Larger tap target for opening resources
5. **Role Clarity**: Visual difference reinforces user's permissions

---

## Technical Considerations

### Permission Logic

- Already have RLS policies enforcing edit/delete permissions at DB level
- UI should match backend permissions
- Check user role on gig load
- Cache permission status to avoid repeated checks

### Accessibility

- Use semantic `<a>` tag for invitee view (better for screen readers)
- Ensure keyboard navigation works (Enter key opens link)
- Add aria-label: "Open [label] in new tab"

### Edge Cases

- What if user is both owner and invitee? (owner of project, invited as musician)
  - Show owner view (more permissions)
- What if gig has no resources?
  - Invitees see empty state but without "Add URL" button

---

## Implementation Checklist

- [ ] Add permission check logic (isOwnerOrManager)
- [ ] Create invitee-specific resource card component
- [ ] Update GigDetailPage to conditionally render based on permissions
- [ ] Add hover effects for clickable cards
- [ ] Add ExternalLink icon to invitee view
- [ ] Test with multiple user roles
- [ ] Test on mobile devices
- [ ] Update documentation

---

## Related Enhancements

- **Step 8**: Dashboard Views (As Player vs. As Manager) - will establish permission patterns
- **People/Lineup View**: Similar permission logic (invitees can't edit their own role)
- **Setlist View**: Consider read-only view for invitees too

---

## Notes

This enhancement aligns with the overall product philosophy:
> Different personas need different views. The same person can be a manager on one gig and just a player on another.

Resources should be easily accessible to everyone on the gig, but only manageable by those with proper permissions.


