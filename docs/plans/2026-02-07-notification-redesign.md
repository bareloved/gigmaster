# Notification Menu Redesign

## Summary

Redesign the notification dropdown to match a modern card-based layout with tabs, icon avatars, and pill-shaped action buttons.

## Decisions

- **Tabs**: "All", "Invitations", "Archive"
- **Avatars**: Icon-based circles colored by notification type (no profile photos)
- **Action buttons**: Black filled "Accept", white outlined "Decline", pill-shaped, text-only
- **Settings gear**: Not included
- **Archive**: New concept backed by `archived_at` column

---

## Database Change

Add one column to `notifications` table:

```sql
ALTER TABLE notifications ADD COLUMN archived_at timestamptz;
```

No index needed initially — filtering happens client-side.

---

## Layout Structure

```
┌──────────────────────────────────────┐
│ Notifications          Mark all as read │
│                                        │
│ All [8]   Invitations [3]   Archive    │
│────────────────────────────────────────│
│ [icon]  Bold action text            ✕  │
│         2h ago · Band Name             │
│         [Accept] [Decline]             │
│                                        │
│ [icon]  Bold action text            ✕  │
│         4h ago · Band Name             │
│ ...                                    │
└──────────────────────────────────────┘
```

- Dropdown width: `w-96` (up from `w-80`)
- "Notifications" in `text-lg font-bold`
- "Mark all as read" as underlined text link (not a button)
- No separator lines between items — whitespace only
- Scroll area: `h-96`

---

## Tab Bar

Three tabs with counts:

| Tab | Filter | Badge |
|---|---|---|
| All | `archived_at IS NULL` | Unread count (dark filled pill) |
| Invitations | `archived_at IS NULL AND type = 'invitation_received'` | Unread invitation count |
| Archive | `archived_at IS NOT NULL` | None |

Filtering is client-side from the full notification list.

---

## Notification Item Layout

Each item:
- **Icon avatar** (left): 40px colored circle with white icon
- **Content** (right): title, meta line, optional action buttons
- **Delete button** (top-right): X icon, visible on hover
- **Unread state**: Subtle background tint on the row

### Icon Avatars by Type

| Type | Icon | Background Color |
|---|---|---|
| `invitation_received` | Mail | Amber/Orange |
| `status_changed` | UserCheck | Blue |
| `gig_updated` | Calendar | Purple |
| `gig_cancelled` | CalendarX | Red |
| `payment_received` | DollarSign | Green |

### Title Line
Bold text, e.g. "You were invited to Jazz Night"

### Meta Line
Relative timestamp + band/context in muted text: "2h ago · Blue Note Quartet"

---

## Invitation Action Buttons

Only shown on `invitation_received` notifications that haven't been responded to.

- **Accept**: `rounded-full`, black bg, white text, ~h-7 px-4, text-only (no icon)
- **Decline**: `rounded-full`, white bg, black border, black text, same size, text-only
- After responding: brief "Confirmed"/"Declined" label, then notification disappears

---

## Archive Behavior

- Dismissing a notification sets `archived_at = now()` (instead of deleting)
- "Clear all" becomes "Archive all" — moves everything to archive
- Archive tab shows archived notifications
- Permanent delete available from archive tab
- Delete (X hover button) on individual items still permanently deletes

---

## New/Modified API Functions

### New
- `archiveNotification(id)` — sets `archived_at = now()`
- `archiveAllNotifications(userId)` — archives all non-archived for user

### Modified
- `getMyNotifications(userId)` — fetch both archived and non-archived (remove any archived_at filter, let client filter)
- `clearAllNotifications` — repurpose or keep alongside archive

---

## Files to Modify

1. **Database**: Add `archived_at` column via migration
2. **`lib/types/database.ts`**: Regenerate or add `archived_at` field
3. **`lib/api/notifications.ts`**: Add archive functions, update query
4. **`components/layout/notifications-dropdown.tsx`**: Full rewrite — tabs, wider layout, new header
5. **`components/layout/notification-item.tsx`**: Icon avatars, new button styles, remove separator reliance

No new files needed — everything fits in existing components.
