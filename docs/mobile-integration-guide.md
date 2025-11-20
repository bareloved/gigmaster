# Mobile Integration Guide

Guide for building the React Native companion app using Expo.

---

## Overview

The web app codebase is organized to support a future mobile companion app:
- **Shared types** - `/lib/types/shared.ts`
- **Shared API functions** - `/lib/api/*`
- **Shared utilities** - `/lib/utils/*`
- **Same Supabase backend** - Database, Auth, Storage

---

## Step 1: Initialize Expo Project

### Create New Expo App

```bash
# In a separate directory or monorepo apps folder
npx create-expo-app gig-brain-mobile --template blank-typescript

cd gig-brain-mobile
```

### Install Dependencies

```bash
# Supabase
npm install @supabase/supabase-js

# AsyncStorage for session persistence
npm install @react-native-async-storage/async-storage

# URL polyfill (required for Supabase)
npm install react-native-url-polyfill

# Navigation (recommended)
npm install @react-navigation/native @react-navigation/native-stack
npm install react-native-screens react-native-safe-area-context

# TanStack Query (optional but recommended)
npm install @tanstack/react-query
```

---

## Step 2: Configure Supabase Client

Create `/lib/supabase.ts`:

```typescript
import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false, // Important for mobile
  },
});
```

Create `.env`:

```env
EXPO_PUBLIC_SUPABASE_URL=your-supabase-url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

---

## Step 3: Copy Shared Code

### Option A: Direct Copy (Simple, for MVP)

1. Copy `/lib/types/shared.ts` to your mobile app
2. Copy `/lib/types/database.ts` to your mobile app
3. Copy `/lib/api/*` files to your mobile app
4. Copy `/lib/utils/*` files to your mobile app

Update imports to use your mobile Supabase client:

```typescript
// Before (web)
import { createClient } from '@/lib/supabase/client';

// After (mobile)
import { supabase } from '../lib/supabase';

// Replace all createClient() calls with supabase
const { data } = await supabase.from('gigs').select('*');
```

### Option B: Monorepo with Shared Package (Recommended for Production)

Set up a monorepo with Turborepo or Nx:

```
/packages/
  └── shared/
      ├── api/
      ├── types/
      └── utils/

/apps/
  ├── web/        # Next.js
  └── mobile/     # Expo
```

Both apps import from `@workspace/shared`.

---

## Step 4: Implement Key Screens

### 1. Authentication

```typescript
// screens/LoginScreen.tsx
import { useState } from 'react';
import { View, TextInput, Button, Text } from 'react-native';
import { supabase } from '../lib/supabase';

export function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  async function signIn() {
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) alert(error.message);
    setLoading(false);
  }

  return (
    <View>
      <TextInput
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
      />
      <TextInput
        placeholder="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />
      <Button title="Sign In" onPress={signIn} disabled={loading} />
    </View>
  );
}
```

### 2. Dashboard - "My Gigs"

```typescript
// screens/DashboardScreen.tsx
import { useEffect, useState } from 'react';
import { View, Text, FlatList } from 'react-native';
import { listGigsAsPlayer } from '../lib/api/gigs';
import { supabase } from '../lib/supabase';

export function DashboardScreen() {
  const [gigs, setGigs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    // Get current user
    supabase.auth.getUser().then(({ data }) => {
      setUserId(data.user?.id || null);
    });
  }, []);

  useEffect(() => {
    if (!userId) return;
    
    fetchGigs();
  }, [userId]);

  async function fetchGigs() {
    try {
      const data = await listGigsAsPlayer(userId!);
      setGigs(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) return <Text>Loading...</Text>;

  return (
    <FlatList
      data={gigs}
      renderItem={({ item }) => (
        <View>
          <Text>{item.title}</Text>
          <Text>{item.date}</Text>
          <Text>{item.projects.name}</Text>
        </View>
      )}
      keyExtractor={(item) => item.id}
    />
  );
}
```

### 3. Gig Pack (Mobile-Optimized View)

```typescript
// screens/GigPackScreen.tsx
import { useEffect, useState } from 'react';
import { View, Text, ScrollView } from 'react-native';
import { getGigPack } from '../lib/api/gig-pack';
import type { GigPackData } from '../lib/types/shared';
import { supabase } from '../lib/supabase';

export function GigPackScreen({ route }) {
  const { gigId } = route.params;
  const [gigPack, setGigPack] = useState<GigPackData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadGigPack();
  }, [gigId]);

  async function loadGigPack() {
    try {
      const { data } = await supabase.auth.getUser();
      if (!data.user) return;

      const pack = await getGigPack(gigId, data.user.id);
      setGigPack(pack);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) return <Text>Loading...</Text>;
  if (!gigPack) return <Text>Gig not found</Text>;

  return (
    <ScrollView>
      {/* Logistics */}
      <View>
        <Text>{gigPack.title}</Text>
        <Text>{gigPack.date}</Text>
        <Text>{gigPack.locationName}</Text>
      </View>

      {/* Setlist */}
      {gigPack.setlist.length > 0 && (
        <View>
          <Text>Setlist</Text>
          {gigPack.setlist.map((item) => (
            <View key={item.id}>
              <Text>{item.title}</Text>
              {item.key && <Text>Key: {item.key}</Text>}
              {item.bpm && <Text>BPM: {item.bpm}</Text>}
            </View>
          ))}
        </View>
      )}

      {/* User's role & payment */}
      {gigPack.userRole && (
        <View>
          <Text>Your Role: {gigPack.userRole.roleName}</Text>
          <Text>
            Fee: {gigPack.userRole.agreedFee} {gigPack.userRole.currency}
          </Text>
          <Text>
            Status: {gigPack.userRole.isPaid ? 'Paid' : 'Unpaid'}
          </Text>
        </View>
      )}
    </ScrollView>
  );
}
```

---

## Step 5: Navigation Setup

```typescript
// App.tsx
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useEffect, useState } from 'react';
import { supabase } from './lib/supabase';

import { LoginScreen } from './screens/LoginScreen';
import { DashboardScreen } from './screens/DashboardScreen';
import { GigPackScreen } from './screens/GigPackScreen';

const Stack = createNativeStackNavigator();

export default function App() {
  const [session, setSession] = useState(null);

  useEffect(() => {
    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  return (
    <NavigationContainer>
      <Stack.Navigator>
        {!session ? (
          <Stack.Screen name="Login" component={LoginScreen} />
        ) : (
          <>
            <Stack.Screen name="Dashboard" component={DashboardScreen} />
            <Stack.Screen name="GigPack" component={GigPackScreen} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
```

---

## Step 6: Reusable API Functions

All functions in `/lib/api/*` can be reused directly:

```typescript
// In your mobile app screens
import { listGigsAsPlayer, listGigsAsManager } from '../lib/api/gigs';
import { listSetlistItemsForGig } from '../lib/api/setlist-items';
import { listFilesForGig } from '../lib/api/gig-files';
import { getPlayerMoneySummary } from '../lib/api/player-money';
import { getGigPack } from '../lib/api/gig-pack';

// All work exactly the same, just ensure you've replaced
// createClient() with your mobile supabase client
```

---

## Features to Implement (Priority Order)

### MVP (Must Have)
1. ✅ Authentication (sign in/out)
2. ✅ Dashboard - "My Gigs" list (as player)
3. ✅ Gig Pack view (all essential info)
4. ✅ Setlist display
5. ✅ Resources/files (clickable URLs)

### V2 (Nice to Have)
- 📅 Calendar view of gigs
- 💰 Money tracking (payment status)
- 🔔 Push notifications for gig updates
- 📍 Maps integration for venue locations
- 📥 Offline mode with local caching

### V3 (Future)
- ✏️ Status updates (accept/decline invitations)
- 📝 Notes per gig
- 📤 Export setlist as PDF
- 🎵 Link songs to Spotify/YouTube

---

## Performance Considerations

1. **Use TanStack Query** for caching
2. **Lazy load** heavy data (setlists, files)
3. **Pagination** for large lists (past gigs)
4. **Optimize images** (compress project covers)
5. **Offline support** with AsyncStorage

---

## Testing Checklist

- [ ] Auth: Sign in/out works
- [ ] Dashboard: Shows upcoming gigs
- [ ] Navigation: Can navigate to gig detail
- [ ] Gig Pack: All sections render correctly
- [ ] URLs: External links open in browser
- [ ] Session: Persists across app restarts
- [ ] Errors: Graceful error handling

---

## Deployment

### Development
```bash
npm start
# Scan QR code with Expo Go app
```

### Production
```bash
# iOS
eas build --platform ios

# Android
eas build --platform android
```

See [Expo documentation](https://docs.expo.dev/) for detailed build guides.

---

## Future: Monorepo Migration

When both apps are stable, consider migrating to a monorepo:

**Tools:**
- Turborepo (recommended)
- Nx
- Yarn Workspaces + Lerna

**Benefits:**
- Share code via `@workspace/shared`
- Single source of truth for types
- Synchronized deployments
- Easier refactoring

**Structure:**
```
/
├── packages/
│   └── shared/           # API, types, utils
├── apps/
│   ├── web/              # Next.js
│   └── mobile/           # Expo
├── package.json          # Root workspace
└── turbo.json            # Turborepo config
```

---

## Resources

- [Expo Documentation](https://docs.expo.dev/)
- [Supabase React Native Guide](https://supabase.com/docs/guides/getting-started/quickstarts/react-native)
- [React Navigation](https://reactnavigation.org/)
- [TanStack Query (React Query)](https://tanstack.com/query/latest)

---

## Need Help?

Refer to:
- `/lib/README.md` - Code structure guide
- `/lib/supabase/CLIENTS_GUIDE.md` - Supabase client setup
- `/BUILD_STEPS.md` - How features were built

