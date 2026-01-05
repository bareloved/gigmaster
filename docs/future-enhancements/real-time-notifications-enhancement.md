# Real-Time Notifications Enhancement: Instagram-Like UX

## Status: Future Enhancement

**Priority:** Medium  
**Effort:** 4-8 hours  
**Impact:** High UX improvement  
**Dependencies:** Existing notification system (already built)

---

## Current State

We already have a solid real-time notification system built:

### ✅ What's Already Implemented

1. **Database & Backend**
   - `notifications` table with proper indexes
   - RLS policies for security
   - Notification types: invitations, status changes, gig updates, cancellations, payments
   - API functions for CRUD operations
   - Real-time subscription via Supabase Realtime (postgres_changes)

2. **Frontend**
   - Bell icon with unread badge in header
   - Dropdown menu with scrollable notification list
   - Mark as read/unread functionality
   - Delete notifications
   - Time-relative timestamps ("2 minutes ago")
   - Click to navigate to related gig/project
   - TanStack Query caching with optimistic updates
   - Real-time updates via WebSocket subscription

3. **Performance**
   - Proper indexes on `user_id`, `read_at`, `created_at`
   - 30-second polling fallback if WebSocket drops
   - Efficient cache invalidation strategies

### 🎯 What's Missing for "Instagram-Like" Feel

The main gap is **visual feedback** when notifications arrive in real-time. Currently:
- ❌ No toast/banner when new notification arrives
- ❌ No sound/haptic feedback
- ❌ No browser push notifications (when tab is closed)
- ❌ No notification grouping
- ❌ No user avatars in notification list

---

## Proposed Enhancements

### Phase 1: Core UX Improvements (Priority: HIGH)

#### 1.1 Toast Notifications ⭐ HIGHEST IMPACT

**Goal:** Show a temporary banner/toast when a new notification arrives in real-time.

**Implementation:**

```bash
npm install sonner
```

**Changes Required:**

```typescript
// app/layout.tsx
import { Toaster } from 'sonner'

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        {children}
        <Toaster position="top-right" expand={false} richColors />
      </body>
    </html>
  )
}
```

```typescript
// components/notifications-dropdown.tsx
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'

// In the subscription useEffect:
useEffect(() => {
  if (!user) return;

  const router = useRouter();
  
  const unsubscribe = subscribeToNotifications(user.id, (notification) => {
    // Existing cache updates...
    queryClient.setQueryData(/*...*/);
    
    // NEW: Show toast with action
    toast.info(notification.title, {
      description: notification.message,
      duration: 5000, // 5 seconds
      action: notification.link_url ? {
        label: 'View',
        onClick: () => {
          router.push(notification.link_url);
          toast.dismiss(); // Close toast after clicking
        }
      } : undefined,
      icon: getNotificationIcon(notification.type), // Bell, Calendar, DollarSign, etc.
    });
  });

  return unsubscribe;
}, [user, queryClient]);
```

**Helper function for icons:**

```typescript
import { Bell, Calendar, DollarSign, AlertCircle, UserPlus } from 'lucide-react';

function getNotificationIcon(type: string) {
  switch (type) {
    case 'invitation_received':
      return <UserPlus className="h-4 w-4" />;
    case 'gig_updated':
    case 'gig_cancelled':
      return <Calendar className="h-4 w-4" />;
    case 'payment_received':
      return <DollarSign className="h-4 w-4" />;
    case 'status_changed':
      return <AlertCircle className="h-4 w-4" />;
    default:
      return <Bell className="h-4 w-4" />;
  }
}
```

**Files to modify:**
- `app/layout.tsx` (add Toaster)
- `components/notifications-dropdown.tsx` (add toast triggers)

**Testing:**
1. Open app in two browser windows (same user)
2. In one window, create a gig invitation for yourself
3. Should see toast appear in real-time in other window
4. Click "View" button → should navigate to gig

**Estimated time:** 1-2 hours

---

#### 1.2 Optional: Notification Sound

**Goal:** Play subtle sound when notification arrives (like Instagram's "ding").

**Implementation:**

```typescript
// lib/utils/notification-sound.ts
let audioContext: AudioContext | null = null;
let soundEnabled = true;

// Simple beep using Web Audio API (no file needed)
export function playNotificationSound() {
  if (!soundEnabled) return;
  
  try {
    if (!audioContext) {
      audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.frequency.value = 800; // Frequency in Hz
    oscillator.type = 'sine';
    
    gainNode.gain.setValueAtTime(0.1, audioContext.currentTime); // Low volume
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
    
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.1);
  } catch (error) {
    console.error('Failed to play notification sound:', error);
  }
}

export function setSoundEnabled(enabled: boolean) {
  soundEnabled = enabled;
  localStorage.setItem('notification-sound-enabled', enabled.toString());
}

export function getSoundEnabled(): boolean {
  if (typeof window === 'undefined') return true;
  const stored = localStorage.getItem('notification-sound-enabled');
  return stored === null ? true : stored === 'true';
}

// Initialize from localStorage
if (typeof window !== 'undefined') {
  soundEnabled = getSoundEnabled();
}
```

**Usage in subscription:**

```typescript
import { playNotificationSound } from '@/lib/utils/notification-sound';

const unsubscribe = subscribeToNotifications(user.id, (notification) => {
  // Cache updates...
  // Toast...
  
  // Play sound
  playNotificationSound();
});
```

**Add to settings page:**

```typescript
// app/(app)/settings/page.tsx
import { Switch } from '@/components/ui/switch';
import { getSoundEnabled, setSoundEnabled } from '@/lib/utils/notification-sound';

function NotificationSettings() {
  const [soundEnabled, setSoundEnabledState] = useState(getSoundEnabled());
  
  const handleToggle = (enabled: boolean) => {
    setSoundEnabled(enabled);
    setSoundEnabledState(enabled);
  };
  
  return (
    <div className="flex items-center justify-between">
      <div>
        <Label>Notification Sound</Label>
        <p className="text-sm text-muted-foreground">
          Play a sound when new notifications arrive
        </p>
      </div>
      <Switch checked={soundEnabled} onCheckedChange={handleToggle} />
    </div>
  );
}
```

**Files to create/modify:**
- `lib/utils/notification-sound.ts` (new)
- `components/notifications-dropdown.tsx` (add sound call)
- `app/(app)/settings/page.tsx` (add sound toggle)

**Estimated time:** 30 minutes

---

### Phase 2: Browser Push Notifications (Priority: MEDIUM)

#### 2.1 Web Push Infrastructure

**Goal:** Send notifications even when the app tab is closed or in background.

**Requirements:**
- Service Worker for handling push events
- Push subscription management (save to database)
- Backend integration with Web Push API
- User permission flow

**Implementation Steps:**

**Step 1: Install dependencies**

```bash
npm install web-push
```

**Step 2: Generate VAPID keys** (one-time setup)

```bash
npx web-push generate-vapid-keys
```

Add to `.env.local`:
```env
NEXT_PUBLIC_VAPID_PUBLIC_KEY=<public_key>
VAPID_PRIVATE_KEY=<private_key>
VAPID_SUBJECT=mailto:your-email@example.com
```

**Step 3: Create Service Worker**

```javascript
// public/sw.js
self.addEventListener('push', function(event) {
  const data = event.data.json();
  
  const options = {
    body: data.message,
    icon: '/icon-192.png',
    badge: '/badge-72.png',
    data: {
      url: data.link_url || '/',
      notificationId: data.id
    },
    actions: data.link_url ? [
      { action: 'view', title: 'View' },
      { action: 'dismiss', title: 'Dismiss' }
    ] : [],
    requireInteraction: false,
    vibrate: [200, 100, 200] // Vibration pattern (mobile)
  };
  
  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  
  if (event.action === 'view' || !event.action) {
    event.waitUntil(
      clients.openWindow(event.notification.data.url)
    );
  }
});
```

**Step 4: Database migration for push subscriptions**

```sql
-- supabase/migrations/YYYYMMDDHHMMSS_push_subscriptions.sql

CREATE TABLE push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_used_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Prevent duplicate subscriptions
  UNIQUE(user_id, endpoint)
);

CREATE INDEX idx_push_subscriptions_user ON push_subscriptions(user_id);

ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Users can manage their own subscriptions
CREATE POLICY "Users can manage their own push subscriptions"
  ON push_subscriptions
  FOR ALL
  USING (user_id = auth.uid());
```

**Step 5: API endpoints for subscription management**

```typescript
// lib/api/push-subscriptions.ts

export async function savePushSubscription(
  userId: string,
  subscription: PushSubscription
): Promise<void> {
  const supabase = createClient();
  
  const { endpoint, keys } = subscription.toJSON();
  
  const { error } = await supabase
    .from('push_subscriptions')
    .upsert({
      user_id: userId,
      endpoint: endpoint!,
      p256dh: keys!.p256dh,
      auth: keys!.auth,
      last_used_at: new Date().toISOString()
    }, {
      onConflict: 'user_id,endpoint'
    });
  
  if (error) throw error;
}

export async function deletePushSubscription(
  userId: string,
  endpoint: string
): Promise<void> {
  const supabase = createClient();
  
  const { error } = await supabase
    .from('push_subscriptions')
    .delete()
    .eq('user_id', userId)
    .eq('endpoint', endpoint);
  
  if (error) throw error;
}

export async function getPushSubscriptions(
  userId: string
): Promise<PushSubscription[]> {
  const supabase = createClient();
  
  const { data, error } = await supabase
    .from('push_subscriptions')
    .select('*')
    .eq('user_id', userId);
  
  if (error) throw error;
  return data || [];
}
```

**Step 6: Frontend subscription flow**

```typescript
// lib/utils/push-notifications.ts

export async function requestPushPermission(
  userId: string
): Promise<boolean> {
  if (!('Notification' in window) || !('serviceWorker' in navigator)) {
    console.warn('Push notifications not supported');
    return false;
  }
  
  try {
    // Request permission
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      return false;
    }
    
    // Register service worker
    const registration = await navigator.serviceWorker.register('/sw.js');
    await navigator.serviceWorker.ready;
    
    // Subscribe to push
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(
        process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!
      )
    });
    
    // Save to database
    await savePushSubscription(userId, subscription);
    
    return true;
  } catch (error) {
    console.error('Failed to subscribe to push:', error);
    return false;
  }
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/\-/g, '+')
    .replace(/_/g, '/');
  
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}
```

**Step 7: Backend push sender**

```typescript
// app/api/send-push/route.ts (internal API)
import { NextResponse } from 'next/server';
import webpush from 'web-push';
import { createClient } from '@/lib/supabase/server';

// Configure web-push
webpush.setVapidDetails(
  process.env.VAPID_SUBJECT!,
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
);

export async function POST(request: Request) {
  const { userId, notification } = await request.json();
  
  const supabase = await createClient();
  
  // Get user's push subscriptions
  const { data: subscriptions } = await supabase
    .from('push_subscriptions')
    .select('*')
    .eq('user_id', userId);
  
  if (!subscriptions || subscriptions.length === 0) {
    return NextResponse.json({ sent: 0 });
  }
  
  // Send to all subscriptions
  const results = await Promise.allSettled(
    subscriptions.map(async (sub) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: {
              p256dh: sub.p256dh,
              auth: sub.auth
            }
          },
          JSON.stringify(notification)
        );
      } catch (error: any) {
        // Delete invalid subscriptions
        if (error.statusCode === 410 || error.statusCode === 404) {
          await supabase
            .from('push_subscriptions')
            .delete()
            .eq('id', sub.id);
        }
        throw error;
      }
    })
  );
  
  const sent = results.filter(r => r.status === 'fulfilled').length;
  
  return NextResponse.json({ sent });
}
```

**Step 8: Update notification creation to trigger push**

```typescript
// lib/api/notifications.ts

export async function createNotification(
  data: NotificationInsert
): Promise<void> {
  const supabase = createClient();
  
  // Insert notification
  const { data: notification, error } = await supabase
    .from('notifications')
    .insert(data)
    .select()
    .single();
  
  if (error) {
    console.error('Failed to create notification:', error);
    return;
  }
  
  // Trigger push notification (fire and forget)
  fetch('/api/send-push', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      userId: data.user_id,
      notification: {
        id: notification.id,
        title: data.title,
        message: data.message,
        link_url: data.link_url
      }
    })
  }).catch(err => {
    console.error('Failed to send push:', err);
  });
}
```

**Step 9: Add to Settings page**

```typescript
// app/(app)/settings/page.tsx

function PushNotificationSettings() {
  const { user } = useUser();
  const [enabled, setEnabled] = useState(false);
  
  useEffect(() => {
    // Check if permission is already granted
    if ('Notification' in window) {
      setEnabled(Notification.permission === 'granted');
    }
  }, []);
  
  const handleToggle = async (checked: boolean) => {
    if (checked) {
      const success = await requestPushPermission(user.id);
      setEnabled(success);
      if (!success) {
        toast.error('Could not enable push notifications');
      }
    } else {
      // Optionally implement unsubscribe
      toast.info('Push notifications disabled');
    }
  };
  
  return (
    <div className="flex items-center justify-between">
      <div>
        <Label>Browser Push Notifications</Label>
        <p className="text-sm text-muted-foreground">
          Receive notifications even when the tab is closed
        </p>
      </div>
      <Switch checked={enabled} onCheckedChange={handleToggle} />
    </div>
  );
}
```

**Files to create:**
- `public/sw.js`
- `supabase/migrations/YYYYMMDDHHMMSS_push_subscriptions.sql`
- `lib/api/push-subscriptions.ts`
- `lib/utils/push-notifications.ts`
- `app/api/send-push/route.ts`

**Files to modify:**
- `lib/api/notifications.ts` (add push trigger)
- `app/(app)/settings/page.tsx` (add push settings)

**Testing:**
1. Enable push notifications in settings
2. Close the browser tab
3. Create a notification for yourself (from another device/browser)
4. Should see native OS notification appear

**Estimated time:** 4-6 hours

**Note:** Push notifications require HTTPS (works on localhost for dev).

---

### Phase 3: Polish & Advanced Features (Priority: LOW)

#### 3.1 Notification Grouping

**Goal:** Group similar notifications together (like "3 new invitations").

```typescript
// lib/utils/notification-grouping.ts

export function groupNotifications(notifications: Notification[]) {
  const groups: Record<string, Notification[]> = {};
  
  notifications.forEach(notif => {
    const today = new Date().toDateString();
    const notifDate = new Date(notif.created_at).toDateString();
    const isToday = today === notifDate;
    
    let key: string;
    if (isToday) {
      // Group by type for today
      key = `today-${notif.type}`;
    } else {
      // Individual items for older notifications
      key = `old-${notif.id}`;
    }
    
    if (!groups[key]) groups[key] = [];
    groups[key].push(notif);
  });
  
  return groups;
}
```

**Display in dropdown:**

```typescript
const grouped = groupNotifications(notifications);

{Object.entries(grouped).map(([key, items]) => {
  if (items.length > 1) {
    // Show grouped item
    return (
      <div key={key} className="p-4">
        <p className="font-medium">
          {items.length} {getGroupTitle(items[0].type)}
        </p>
        <Collapsible>
          <CollapsibleTrigger>Show all</CollapsibleTrigger>
          <CollapsibleContent>
            {items.map(notif => (
              <NotificationItem key={notif.id} notification={notif} />
            ))}
          </CollapsibleContent>
        </Collapsible>
      </div>
    );
  } else {
    // Show individual item
    return <NotificationItem key={items[0].id} notification={items[0]} />;
  }
})}
```

**Estimated time:** 2 hours

---

#### 3.2 User Avatars in Notifications

**Goal:** Show avatar of user who triggered the notification.

**Database changes:**

```sql
-- Add triggered_by_user_id to notifications
ALTER TABLE notifications
ADD COLUMN triggered_by_user_id UUID REFERENCES auth.users(id);

COMMENT ON COLUMN notifications.triggered_by_user_id IS 
  'User who triggered this notification (e.g., invited you, changed status)';
```

**Update notification creation:**

```typescript
await createNotification({
  user_id: invitee.id,
  type: 'invitation_received',
  title: 'New Gig Invitation',
  message: `${inviter.name} invited you to play ${role.role_name}`,
  triggered_by_user_id: inviter.id, // NEW
  link_url: `/gigs/${gig.id}`,
  gig_id: gig.id
});
```

**Fetch with user data:**

```typescript
// lib/api/notifications.ts

export async function getMyNotifications(userId: string): Promise<Notification[]> {
  const supabase = createClient();
  
  const { data, error } = await supabase
    .from('notifications')
    .select(`
      *,
      triggered_by:triggered_by_user_id (
        id,
        name,
        avatar_url
      )
    `)
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(50);
  
  if (error) throw error;
  return data || [];
}
```

**Display avatar:**

```typescript
// components/notification-item.tsx

export function NotificationItem({ notification }) {
  return (
    <div className="flex items-start gap-3 p-4">
      {notification.triggered_by && (
        <Avatar>
          <AvatarImage src={notification.triggered_by.avatar_url} />
          <AvatarFallback>
            {notification.triggered_by.name.substring(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>
      )}
      <div className="flex-1">
        {/* ... rest of notification content */}
      </div>
    </div>
  );
}
```

**Estimated time:** 1-2 hours

---

#### 3.3 Notification Preferences

**Goal:** Let users choose what notifications they want to receive.

**Database:**

```sql
CREATE TABLE notification_preferences (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  invitation_received BOOLEAN DEFAULT true,
  status_changed BOOLEAN DEFAULT true,
  gig_updated BOOLEAN DEFAULT true,
  gig_cancelled BOOLEAN DEFAULT true,
  payment_received BOOLEAN DEFAULT true,
  push_enabled BOOLEAN DEFAULT false,
  sound_enabled BOOLEAN DEFAULT true,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own preferences"
  ON notification_preferences
  FOR ALL
  USING (user_id = auth.uid());
```

**Settings UI:**

```typescript
// app/(app)/settings/page.tsx

function NotificationPreferences() {
  const { user } = useUser();
  const { data: prefs } = useQuery({
    queryKey: ['notification-prefs', user?.id],
    queryFn: () => getNotificationPreferences(user!.id)
  });
  
  const updatePref = useMutation({
    mutationFn: ({ key, value }: { key: string, value: boolean }) =>
      updateNotificationPreference(user!.id, key, value)
  });
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Notification Preferences</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <Label>Gig Invitations</Label>
          <Switch
            checked={prefs?.invitation_received ?? true}
            onCheckedChange={(checked) =>
              updatePref.mutate({ key: 'invitation_received', value: checked })
            }
          />
        </div>
        {/* ... more preference toggles */}
      </CardContent>
    </Card>
  );
}
```

**Check preferences before creating notification:**

```typescript
// lib/api/notifications.ts

export async function createNotification(data: NotificationInsert): Promise<void> {
  const supabase = createClient();
  
  // Check user preferences
  const { data: prefs } = await supabase
    .from('notification_preferences')
    .select(data.type)
    .eq('user_id', data.user_id)
    .single();
  
  // Skip if user disabled this type
  if (prefs && prefs[data.type] === false) {
    return;
  }
  
  // Create notification...
}
```

**Estimated time:** 2-3 hours

---

## Performance Considerations

### Current Performance (Already Good)

✅ **Indexes:** Proper indexes on `user_id`, `read_at`, `created_at`  
✅ **Caching:** TanStack Query with 1-minute stale time  
✅ **Pagination:** Limit 50 notifications by default  
✅ **Real-time:** Supabase Realtime uses efficient WebSocket connections  
✅ **RLS:** Policies ensure users only see their own notifications

### Additional Optimizations for Phase 2+

1. **Push subscriptions:** Add index on `endpoint` for faster lookups
2. **Notification preferences:** Cache in localStorage for instant checks
3. **Grouping:** Only group last 24 hours (limit computation)
4. **Avatars:** Use CDN URLs from Supabase Storage for fast loading

---

## Security Considerations

### Current Security (Already Good)

✅ **RLS policies:** Users can only access their own notifications  
✅ **Service role:** Only backend can create notifications for any user  
✅ **Input validation:** Notification types are enum-constrained

### Additional Security for Phase 2+

1. **Push subscriptions:**
   - Validate VAPID keys are kept secret (never expose private key)
   - Rate limit push endpoint to prevent abuse
   - Clean up old/invalid subscriptions automatically

2. **Notification creation:**
   - Add rate limiting (max 100 notifications per user per hour)
   - Validate triggered_by_user_id actually has permission to trigger

3. **Service Worker:**
   - Use Content Security Policy (CSP) headers
   - Validate notification data before displaying

---

## Testing Checklist

### Phase 1 (Toast Notifications)
- [ ] Toast appears when notification arrives in real-time
- [ ] Toast shows correct icon based on notification type
- [ ] Click "View" navigates to correct page
- [ ] Toast auto-dismisses after 5 seconds
- [ ] Multiple toasts stack correctly
- [ ] Sound plays (if enabled in settings)
- [ ] Sound toggle persists in localStorage

### Phase 2 (Browser Push)
- [ ] Permission request appears correctly
- [ ] Subscription saved to database
- [ ] Push notification appears when tab is closed
- [ ] Click on push notification opens app to correct page
- [ ] Works on Chrome, Firefox, Safari (different implementations)
- [ ] Invalid subscriptions cleaned up automatically
- [ ] Push works after browser restart

### Phase 3 (Polish)
- [ ] Notifications group by type for today
- [ ] Avatars load correctly
- [ ] Preference toggles work
- [ ] Disabled notification types don't create notifications
- [ ] Grouping performance is good with 50+ notifications

---

## Browser Compatibility

| Feature | Chrome | Firefox | Safari | Edge |
|---------|--------|---------|--------|------|
| Toast (sonner) | ✅ | ✅ | ✅ | ✅ |
| Sound (Web Audio) | ✅ | ✅ | ✅ | ✅ |
| Push Notifications | ✅ | ✅ | ⚠️ (Limited) | ✅ |
| Service Worker | ✅ | ✅ | ✅ | ✅ |

**Note:** Safari on iOS has limited push notification support (requires iOS 16.4+).

---

## Mobile App Considerations

When building the Expo companion app:

1. **Use native push:** Expo Notifications API instead of web push
2. **Reuse backend:** Same `notifications` table and API
3. **Different subscriptions:** Store FCM/APNs tokens instead of web push endpoints
4. **Unified logic:** Same notification creation logic triggers both web and mobile push

---

## Migration Path

If implementing all phases:

1. **Start with Phase 1** (toast) - Lowest effort, highest immediate impact
2. **Add Phase 2** (browser push) - When you want always-on notifications
3. **Add Phase 3** (polish) - When you have time for UX refinement

Each phase is independent and can be implemented separately.

---

## Estimated Total Effort

| Phase | Time | Complexity |
|-------|------|------------|
| Phase 1: Toast + Sound | 1-2 hours | Low |
| Phase 2: Browser Push | 4-6 hours | Medium-High |
| Phase 3: Polish | 3-5 hours | Low-Medium |
| **Total** | **8-13 hours** | **Medium** |

---

## Related Documentation

- Current notification system: `docs/build-process/step-19-notifications-system.md`
- Supabase Realtime: [docs.supabase.com/guides/realtime](https://supabase.com/docs/guides/realtime)
- Web Push API: [MDN Web Push](https://developer.mozilla.org/en-US/docs/Web/API/Push_API)
- Sonner docs: [sonner.emilkowal.ski](https://sonner.emilkowal.ski/)

---

## Next Steps

When ready to implement:

1. Read this document fully
2. Start with Phase 1 (toast notifications)
3. Test thoroughly with real-time updates
4. Get user feedback before proceeding to Phase 2
5. Consider Phase 2 only if users want always-on notifications
6. Phase 3 is optional polish for later

**Note:** The foundation is already solid. These enhancements are purely UX improvements on top of existing infrastructure.

