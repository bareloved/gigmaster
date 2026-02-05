# Mobile Integration Guide

Guide for building the GigMaster iOS/Android companion app using Expo and React Native.

**Last Updated:** February 2026

---

## Overview

GigMaster's web codebase is architected to support a mobile companion app:

- **Shared types** - `/lib/types/shared.ts`
- **Shared API functions** - `/lib/api/*`
- **Shared utilities** - `/lib/utils/*`
- **Same Supabase backend** - Database, Auth, Storage, RLS policies

### Current Web Stack (Reference)

| Technology | Version | Purpose |
|------------|---------|---------|
| Next.js | 16.x | Web framework |
| React | 19.x | UI library |
| TypeScript | 5.x | Type safety |
| Supabase | 2.81+ | Backend (Postgres, Auth, Storage) |
| TanStack Query | 5.x | Server state management |
| Tailwind CSS | 3.4 | Styling |

### Recommended Mobile Stack

| Technology | Version | Purpose |
|------------|---------|---------|
| Expo SDK | 52+ | React Native framework |
| Expo Router | 4.x | File-based navigation |
| React Native | 0.76+ | Mobile runtime |
| TypeScript | 5.x | Type safety (shared with web) |
| Supabase JS | 2.x | Backend client |
| TanStack Query | 5.x | Server state (same as web) |
| NativeWind | 4.x | Tailwind for React Native |
| expo-secure-store | Latest | Secure token storage |

---

## Step 1: Initialize Expo Project

### Create New Expo App

```bash
# Using the latest Expo template with TypeScript and Expo Router
npx create-expo-app@latest gigmaster-mobile --template

cd gigmaster-mobile
```

### Project Structure

Expo Router uses file-based routing similar to Next.js App Router:

```
gigmaster-mobile/
├── app/                    # Routes (like Next.js app directory)
│   ├── _layout.tsx         # Root layout
│   ├── index.tsx           # Home screen (/)
│   ├── (auth)/             # Auth group
│   │   ├── login.tsx
│   │   └── signup.tsx
│   ├── (tabs)/             # Tab navigator group
│   │   ├── _layout.tsx     # Tab bar configuration
│   │   ├── index.tsx       # Dashboard tab
│   │   ├── gigs.tsx        # Gigs list tab
│   │   └── money.tsx       # Money tab
│   └── gig/
│       └── [id].tsx        # Dynamic gig detail route
├── components/             # Reusable components
├── lib/                    # Shared code (copied from web)
│   ├── api/                # API functions (mobile-ready ✅)
│   ├── types/              # TypeScript types (mobile-ready ✅)
│   ├── utils/              # Utilities (mobile-ready ✅)
│   └── supabase.ts         # Mobile Supabase client
├── hooks/                  # Custom hooks
├── assets/                 # Images, fonts
├── app.json                # Expo config
├── tsconfig.json           # TypeScript config
└── package.json
```

### Install Dependencies

```bash
# Core Supabase
npx expo install @supabase/supabase-js

# Secure storage for auth tokens (recommended over AsyncStorage)
npx expo install expo-secure-store

# TanStack Query (same version as web)
npm install @tanstack/react-query

# NativeWind (Tailwind for RN - optional but recommended)
npm install nativewind
npm install --save-dev tailwindcss

# Additional useful packages
npx expo install expo-linking expo-constants
```

---

## Step 2: Configure Supabase Client

### Secure Storage Setup

Create `/lib/storage.ts`:

```typescript
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

// Platform-aware storage adapter
export const secureStorage = {
  getItem: async (key: string): Promise<string | null> => {
    if (Platform.OS === 'web') {
      return localStorage.getItem(key);
    }
    return await SecureStore.getItemAsync(key);
  },
  setItem: async (key: string, value: string): Promise<void> => {
    if (Platform.OS === 'web') {
      localStorage.setItem(key, value);
      return;
    }
    await SecureStore.setItemAsync(key, value);
  },
  removeItem: async (key: string): Promise<void> => {
    if (Platform.OS === 'web') {
      localStorage.removeItem(key);
      return;
    }
    await SecureStore.deleteItemAsync(key);
  },
};
```

### Supabase Client

Create `/lib/supabase.ts`:

```typescript
import { createClient } from '@supabase/supabase-js';
import { secureStorage } from './storage';
import type { Database } from './types/database';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: secureStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false, // Important for mobile - no URL-based auth
  },
});
```

### Environment Variables

Create `.env`:

```env
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

> **Note:** Expo uses `EXPO_PUBLIC_` prefix (similar to `NEXT_PUBLIC_` in Next.js)

---

## Step 3: Copy Shared Code

### Option A: Direct Copy (MVP Approach)

Copy these directories from the web app to your mobile app:

1. `/lib/types/` → Mobile `/lib/types/`
2. `/lib/api/` → Mobile `/lib/api/`
3. `/lib/utils/` → Mobile `/lib/utils/`

Then update Supabase imports in API files:

```typescript
// Before (web)
import { createClient } from '@/lib/supabase/client';

export async function listUserProjects() {
  const supabase = createClient();
  // ...
}

// After (mobile) - modify to accept client as parameter
import type { SupabaseClient } from '@supabase/supabase-js';

export async function listUserProjects(supabase: SupabaseClient) {
  // ...
}

// Or use singleton pattern
import { supabase } from '../supabase';

export async function listUserProjects() {
  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}
```

### Option B: Monorepo with Shared Package (Production)

For production, set up a monorepo with Turborepo:

```
/
├── packages/
│   └── shared/
│       ├── api/           # Platform-agnostic API functions
│       ├── types/         # TypeScript types
│       ├── utils/         # Utility functions
│       └── package.json
├── apps/
│   ├── web/               # Next.js app
│   └── mobile/            # Expo app
├── package.json           # Root workspace
└── turbo.json             # Turborepo config
```

Both apps import from `@gigmaster/shared`:

```typescript
import { listUserProjects } from '@gigmaster/shared/api/projects';
import type { Project } from '@gigmaster/shared/types';
```

---

## Step 4: Authentication with Expo Router

### Root Layout with Auth

Create `/app/_layout.tsx`:

```typescript
import { useEffect, useState } from 'react';
import { Stack } from 'expo-router';
import { Session } from '@supabase/supabase-js';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import * as SplashScreen from 'expo-splash-screen';
import { supabase } from '../lib/supabase';
import { AuthContext } from '../contexts/auth';

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 2 * 60 * 1000, // 2 minutes (match web)
    },
  },
});

export default function RootLayout() {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setIsLoading(false);
      SplashScreen.hideAsync();
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  if (isLoading) {
    return null; // Splash screen still showing
  }

  return (
    <QueryClientProvider client={queryClient}>
      <AuthContext.Provider value={{ session, user: session?.user ?? null }}>
        <Stack screenOptions={{ headerShown: false }}>
          {!session ? (
            <Stack.Screen name="(auth)" />
          ) : (
            <Stack.Screen name="(tabs)" />
          )}
        </Stack>
      </AuthContext.Provider>
    </QueryClientProvider>
  );
}
```

### Auth Context

Create `/contexts/auth.tsx`:

```typescript
import { createContext, useContext } from 'react';
import type { Session, User } from '@supabase/supabase-js';

interface AuthContextType {
  session: Session | null;
  user: User | null;
}

export const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
});

export const useAuth = () => useContext(AuthContext);
```

### Login Screen

Create `/app/(auth)/login.tsx`:

```typescript
import { useState } from 'react';
import { View, TextInput, TouchableOpacity, Text, StyleSheet, Alert } from 'react-native';
import { supabase } from '../../lib/supabase';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  async function signIn() {
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      Alert.alert('Error', error.message);
    }
    // Navigation happens automatically via auth state change
    setLoading(false);
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>GigMaster</Text>

      <TextInput
        style={styles.input}
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
      />

      <TextInput
        style={styles.input}
        placeholder="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />

      <TouchableOpacity
        style={styles.button}
        onPress={signIn}
        disabled={loading}
      >
        <Text style={styles.buttonText}>
          {loading ? 'Signing in...' : 'Sign In'}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 20 },
  title: { fontSize: 32, fontWeight: 'bold', textAlign: 'center', marginBottom: 40 },
  input: { borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 16, marginBottom: 16 },
  button: { backgroundColor: '#000', borderRadius: 8, padding: 16 },
  buttonText: { color: '#fff', textAlign: 'center', fontWeight: '600' },
});
```

---

## Step 5: Main App Screens

### Tab Navigator

Create `/app/(tabs)/_layout.tsx`:

```typescript
import { Tabs } from 'expo-router';
import { Calendar, DollarSign, Home } from 'lucide-react-native';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#000',
        headerShown: true,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Dashboard',
          tabBarIcon: ({ color, size }) => <Home size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="gigs"
        options={{
          title: 'Gigs',
          tabBarIcon: ({ color, size }) => <Calendar size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="money"
        options={{
          title: 'Money',
          tabBarIcon: ({ color, size }) => <DollarSign size={size} color={color} />,
        }}
      />
    </Tabs>
  );
}
```

### Dashboard with TanStack Query

Create `/app/(tabs)/index.tsx`:

```typescript
import { View, Text, FlatList, StyleSheet, RefreshControl } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../contexts/auth';
import { listGigsAsPlayer } from '../../lib/api/gigs';
import { GigCard } from '../../components/GigCard';

export default function DashboardScreen() {
  const { user } = useAuth();

  const { data: gigs, isLoading, error, refetch, isRefetching } = useQuery({
    queryKey: ['gigs', 'player', user?.id],
    queryFn: () => listGigsAsPlayer(user!.id),
    enabled: !!user,
  });

  if (isLoading) {
    return <LoadingSkeleton />;
  }

  if (error) {
    return <ErrorView message={error.message} onRetry={refetch} />;
  }

  const upcomingGigs = gigs?.filter(g => new Date(g.date) >= new Date()) || [];

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Upcoming Gigs</Text>

      <FlatList
        data={upcomingGigs}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <GigCard gig={item} />}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} />
        }
        ListEmptyComponent={
          <Text style={styles.empty}>No upcoming gigs</Text>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: { fontSize: 24, fontWeight: 'bold', padding: 16 },
  empty: { textAlign: 'center', color: '#666', marginTop: 40 },
});
```

### Gig Detail Screen

Create `/app/gig/[id].tsx`:

```typescript
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../contexts/auth';
import { getGigPack } from '../../lib/api/gig-pack';
import { formatCurrency } from '../../lib/utils/currency';

export default function GigDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();

  const { data: gigPack, isLoading } = useQuery({
    queryKey: ['gig-pack', id, user?.id],
    queryFn: () => getGigPack(id, user!.id),
    enabled: !!user && !!id,
  });

  if (isLoading || !gigPack) {
    return <LoadingSkeleton />;
  }

  return (
    <ScrollView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>{gigPack.title}</Text>
        <Text style={styles.date}>{formatDate(gigPack.date)}</Text>
        {gigPack.locationName && (
          <Text style={styles.location}>{gigPack.locationName}</Text>
        )}
      </View>

      {/* User's Role & Payment */}
      {gigPack.userRole && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Your Role</Text>
          <Text>{gigPack.userRole.roleName}</Text>
          <Text>
            {formatCurrency(gigPack.userRole.agreedFee, gigPack.userRole.currency)}
          </Text>
          <Text style={styles.status}>
            {gigPack.userRole.paymentStatus === 'paid' ? '✅ Paid' : '⏳ Pending'}
          </Text>
        </View>
      )}

      {/* Setlist */}
      {gigPack.setlist.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Setlist</Text>
          {gigPack.setlist.map((item, index) => (
            <View key={item.id} style={styles.setlistItem}>
              <Text style={styles.setlistNumber}>{index + 1}</Text>
              <View>
                <Text style={styles.songTitle}>{item.title}</Text>
                {item.key && <Text style={styles.songMeta}>Key: {item.key}</Text>}
              </View>
            </View>
          ))}
        </View>
      )}

      {/* Notes */}
      {gigPack.notes && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Notes</Text>
          <Text>{gigPack.notes}</Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: { padding: 16, borderBottomWidth: 1, borderBottomColor: '#eee' },
  title: { fontSize: 24, fontWeight: 'bold' },
  date: { fontSize: 16, color: '#666', marginTop: 4 },
  location: { fontSize: 14, color: '#888', marginTop: 2 },
  section: { padding: 16, borderBottomWidth: 1, borderBottomColor: '#eee' },
  sectionTitle: { fontSize: 18, fontWeight: '600', marginBottom: 12 },
  status: { marginTop: 8, fontWeight: '500' },
  setlistItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8 },
  setlistNumber: { width: 30, fontSize: 14, color: '#888' },
  songTitle: { fontSize: 16 },
  songMeta: { fontSize: 12, color: '#888' },
});
```

---

## Step 6: TypeScript Configuration

### tsconfig.json

```json
{
  "extends": "expo/tsconfig.base",
  "compilerOptions": {
    "strict": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["./*"]
    }
  },
  "include": ["**/*.ts", "**/*.tsx", ".expo/types/**/*.ts", "expo-env.d.ts"]
}
```

---

## Features Roadmap

### MVP (Phase 1)

| Feature | Status | Notes |
|---------|--------|-------|
| Authentication | 🔲 | Sign in/out with email |
| Dashboard | 🔲 | Upcoming gigs list |
| Gig Detail | 🔲 | Full gig pack view |
| Setlist View | 🔲 | Read-only setlist |
| Payment Status | 🔲 | See if you've been paid |
| Pull-to-refresh | 🔲 | Refresh gig data |

### Version 2

| Feature | Notes |
|---------|-------|
| Push Notifications | Gig reminders, payment updates |
| Calendar View | Monthly calendar of gigs |
| Offline Mode | Cache gigs for offline viewing |
| Invitation Response | Accept/decline gigs in app |
| Profile Management | Update name, photo |

### Version 3

| Feature | Notes |
|---------|-------|
| Manager View | Manage gigs, invite musicians |
| Setlist Editing | Reorder, add songs |
| File Downloads | Save PDFs offline |
| Widget | iOS home screen widget for next gig |
| Apple Watch | Glanceable gig info |

---

## Performance Best Practices

### 1. TanStack Query Caching

Match the web app's caching strategy:

```typescript
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 2 * 60 * 1000, // 2 minutes
      gcTime: 10 * 60 * 1000,   // 10 minutes (was cacheTime)
    },
  },
});
```

### 2. Image Optimization

```typescript
import { Image } from 'expo-image';

// Use expo-image for better caching
<Image
  source={{ uri: project.imageUrl }}
  style={{ width: 100, height: 100 }}
  placeholder={blurhash}
  contentFit="cover"
  transition={200}
/>
```

### 3. List Virtualization

React Native's FlatList already virtualizes. For complex lists:

```typescript
<FlatList
  data={gigs}
  renderItem={renderGig}
  initialNumToRender={10}
  maxToRenderPerBatch={10}
  windowSize={5}
  removeClippedSubviews={true}
/>
```

### 4. Bundle Size

Expo's tree-shaking works well. Avoid:
- Importing entire icon libraries
- Large utility libraries (use native alternatives)

---

## Testing Checklist

### Development

- [ ] Auth: Sign in/out persists across app restarts
- [ ] Dashboard: Shows upcoming gigs correctly
- [ ] Navigation: Deep links work (`/gig/[id]`)
- [ ] Query caching: Data persists between screens
- [ ] Error handling: Network errors show gracefully
- [ ] Pull-to-refresh: Updates data

### Device Testing

- [ ] iOS Simulator: All screens render correctly
- [ ] Android Emulator: All screens render correctly
- [ ] Physical iPhone: Performance acceptable
- [ ] Physical Android: Performance acceptable

### Pre-Release

- [ ] Build succeeds: `eas build --platform ios`
- [ ] No TypeScript errors: `npx tsc --noEmit`
- [ ] No console warnings in production build

---

## Deployment

### Development

```bash
# Start Expo development server
npx expo start

# Run on iOS simulator
npx expo run:ios

# Run on Android emulator
npx expo run:android
```

### Production Builds with EAS

```bash
# Install EAS CLI
npm install -g eas-cli

# Configure EAS
eas build:configure

# Build for iOS
eas build --platform ios

# Build for Android
eas build --platform android

# Submit to App Store
eas submit --platform ios

# Submit to Play Store
eas submit --platform android
```

### Requirements

- **Apple Developer Account:** $99/year for App Store distribution
- **Google Play Developer Account:** $25 one-time for Play Store distribution
- **EAS Account:** Free tier available, paid for faster builds

---

## Resources

### Official Docs

- [Expo Documentation](https://docs.expo.dev/)
- [Expo Router](https://docs.expo.dev/router/introduction/)
- [Supabase + Expo Guide](https://docs.expo.dev/guides/using-supabase/)
- [TanStack Query](https://tanstack.com/query/latest)

### Project References

- `/lib/README.md` - Code portability matrix
- `/lib/supabase/CLIENTS_GUIDE.md` - Supabase client patterns
- `CLAUDE.md` - Project conventions and patterns

---

## Troubleshooting

### Common Issues

**"Unable to resolve module" errors:**
- Run `npx expo start --clear` to clear Metro cache
- Check `tsconfig.json` path aliases

**Auth session not persisting:**
- Ensure `expo-secure-store` is installed
- Check that `detectSessionInUrl: false` is set

**Slow performance on Android:**
- Enable Hermes (default in Expo SDK 52+)
- Use `useCallback` and `useMemo` for expensive renders

**Type errors after copying web code:**
- Ensure `database.ts` types are copied
- Update Supabase client imports in API files
