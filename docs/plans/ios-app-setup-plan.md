# iOS Mobile App Setup Plan

**Created:** February 2026
**Status:** Ready to implement
**Estimated effort:** 2-3 hours (after Xcode is installed)

---

## Overview

This plan sets up a GigMaster iOS companion app using Expo and React Native. The mobile app will share the same Supabase backend as the web app and reuse existing API functions, types, and utilities.

### Key Decisions Made

- **Location:** Create as subfolder `gigmaster-mobile/` in the existing repo (not a separate repo or monorepo)
- **Framework:** Expo SDK 52+ with Expo Router (file-based navigation like Next.js)
- **Code sharing:** Copy `lib/api`, `lib/types`, `lib/utils` from web app (manual copy, not symlinks)

---

## Prerequisites

Before starting implementation:

### Required
- [ ] **macOS computer** - iOS development requires a Mac
- [ ] **Xcode installed** - Download from App Store (free, ~12GB, takes 1-2 hours)
- [ ] **Node.js 24+** - Already configured in the project

### Not Required Yet
- Apple Developer Account ($99/year) - Only needed for App Store distribution, not development

---

## Context for Implementing Agent

### Must Read First
1. **`/docs/mobile-integration-guide.md`** - Comprehensive guide with all code examples, patterns, and best practices. This is the primary reference.
2. **`/lib/README.md`** - Explains which code is mobile-ready and which is web-only
3. **`CLAUDE.md`** - Project conventions (TanStack Query patterns, cache key patterns with user.id, etc.)

### Key Technical Context

**Web app tech stack:**
- Next.js 16, React 19, TypeScript 5
- Supabase 2.81+ (Postgres, Auth, Storage)
- TanStack Query 5.x for server state
- Tailwind CSS for styling

**Mobile app tech stack (to use):**
- Expo SDK 52+, React Native 0.76+
- Expo Router 4.x (file-based routing)
- Same Supabase backend (same credentials)
- TanStack Query 5.x (same patterns as web)
- expo-secure-store for auth token storage

**Code that can be reused (copy these):**
- `/lib/api/*` - All API functions (mobile-ready)
- `/lib/types/*` - All TypeScript types (mobile-ready)
- `/lib/utils/*` - All utility functions (mobile-ready)

**Code that CANNOT be reused:**
- `/lib/supabase/client.ts` - Uses browser-specific `@supabase/ssr`
- `/lib/providers/*` - Uses Next.js-specific patterns
- `/components/*` - Uses web-specific React DOM

---

## Implementation Steps

### Phase 1: Project Setup

#### Step 1.1: Create Expo Project
```bash
cd /Users/bareloved/Github/gigmaster
npx create-expo-app@latest gigmaster-mobile --template
cd gigmaster-mobile
```

#### Step 1.2: Install Dependencies
```bash
# Core Supabase
npx expo install @supabase/supabase-js

# Secure storage for auth tokens
npx expo install expo-secure-store

# TanStack Query (same version as web)
npm install @tanstack/react-query

# Optional: Icons
npm install lucide-react-native
npx expo install react-native-svg
```

#### Step 1.3: Update Root .gitignore
Add to `/Users/bareloved/Github/gigmaster/.gitignore`:
```gitignore
# Mobile app build artifacts
gigmaster-mobile/node_modules/
gigmaster-mobile/.expo/
gigmaster-mobile/ios/
gigmaster-mobile/android/
gigmaster-mobile/dist/
```

---

### Phase 2: Copy Shared Code

#### Step 2.1: Create lib directory structure
```bash
mkdir -p gigmaster-mobile/lib
```

#### Step 2.2: Copy types
```bash
cp -r lib/types gigmaster-mobile/lib/types
```

#### Step 2.3: Copy API functions
```bash
cp -r lib/api gigmaster-mobile/lib/api
```

#### Step 2.4: Copy utilities
```bash
cp -r lib/utils gigmaster-mobile/lib/utils
```

#### Step 2.5: Update API imports
After copying, update all API files in `gigmaster-mobile/lib/api/` to use the mobile Supabase client:

**Find and replace in all files:**
```typescript
// FROM (web pattern):
import { createClient } from '@/lib/supabase/client';
// ...
const supabase = createClient();

// TO (mobile pattern):
import { supabase } from '../supabase';
// Remove: const supabase = createClient();
```

---

### Phase 3: Configure Supabase

#### Step 3.1: Create Storage Adapter
Create `gigmaster-mobile/lib/storage.ts`:

```typescript
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

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

#### Step 3.2: Create Supabase Client
Create `gigmaster-mobile/lib/supabase.ts`:

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
    detectSessionInUrl: false,
  },
});
```

#### Step 3.3: Create Environment File
Create `gigmaster-mobile/.env`:

```env
EXPO_PUBLIC_SUPABASE_URL=<copy from web app .env.local>
EXPO_PUBLIC_SUPABASE_ANON_KEY=<copy from web app .env.local>
```

**Important:** Use the same values as the web app's `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`.

---

### Phase 4: Build Auth Flow

#### Step 4.1: Create Auth Context
Create `gigmaster-mobile/contexts/auth.tsx`:

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

#### Step 4.2: Create Root Layout
Create `gigmaster-mobile/app/_layout.tsx`:

See `/docs/mobile-integration-guide.md` → "Step 4: Authentication with Expo Router" → "Root Layout with Auth" for full implementation.

Key features:
- Session state management
- QueryClientProvider setup
- SplashScreen handling
- Auth state listener
- Conditional routing (auth vs main app)

#### Step 4.3: Create Auth Group Layout
Create `gigmaster-mobile/app/(auth)/_layout.tsx`:

```typescript
import { Stack } from 'expo-router';

export default function AuthLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
```

#### Step 4.4: Create Login Screen
Create `gigmaster-mobile/app/(auth)/login.tsx`:

See `/docs/mobile-integration-guide.md` → "Login Screen" for full implementation.

---

### Phase 5: Build Main Screens

#### Step 5.1: Create Tabs Layout
Create `gigmaster-mobile/app/(tabs)/_layout.tsx`:

See `/docs/mobile-integration-guide.md` → "Tab Navigator" for full implementation.

#### Step 5.2: Create Dashboard Screen
Create `gigmaster-mobile/app/(tabs)/index.tsx`:

See `/docs/mobile-integration-guide.md` → "Dashboard with TanStack Query" for full implementation.

**Critical pattern:** Include `user?.id` in all query keys:
```typescript
queryKey: ['gigs', 'player', user?.id]
```

#### Step 5.3: Create Placeholder Tabs
Create `gigmaster-mobile/app/(tabs)/gigs.tsx`:
```typescript
import { View, Text } from 'react-native';

export default function GigsScreen() {
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <Text>Gigs List - Coming Soon</Text>
    </View>
  );
}
```

Create `gigmaster-mobile/app/(tabs)/money.tsx`:
```typescript
import { View, Text } from 'react-native';

export default function MoneyScreen() {
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <Text>Money - Coming Soon</Text>
    </View>
  );
}
```

#### Step 5.4: Create Gig Detail Screen
Create `gigmaster-mobile/app/gig/[id].tsx`:

See `/docs/mobile-integration-guide.md` → "Gig Detail Screen" for full implementation.

---

### Phase 6: TypeScript Configuration

#### Step 6.1: Update tsconfig.json
Update `gigmaster-mobile/tsconfig.json`:

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

### Phase 7: Test & Verify

#### Step 7.1: Start Development Server
```bash
cd gigmaster-mobile
npx expo start
```

#### Step 7.2: Run on iOS Simulator
Press `i` in the terminal to open iOS Simulator (requires Xcode).

#### Step 7.3: Test Core Flows
- [ ] App launches without errors
- [ ] Login screen appears for unauthenticated users
- [ ] Can sign in with existing GigMaster account
- [ ] Dashboard shows upcoming gigs
- [ ] Can navigate to gig detail
- [ ] Session persists after closing and reopening app
- [ ] Pull-to-refresh works on dashboard

---

## Final File Structure

```
gigmaster/
├── app/                      # Web app routes (unchanged)
├── components/               # Web components (unchanged)
├── lib/                      # Web shared code (unchanged)
├── docs/
│   ├── mobile-integration-guide.md  # Reference guide
│   └── plans/
│       └── ios-app-setup-plan.md    # This file
├── gigmaster-mobile/         # NEW: Mobile app
│   ├── app/
│   │   ├── _layout.tsx       # Root layout with auth
│   │   ├── (auth)/
│   │   │   ├── _layout.tsx
│   │   │   └── login.tsx
│   │   ├── (tabs)/
│   │   │   ├── _layout.tsx   # Tab bar config
│   │   │   ├── index.tsx     # Dashboard
│   │   │   ├── gigs.tsx      # Gigs list
│   │   │   └── money.tsx     # Money tracking
│   │   └── gig/
│   │       └── [id].tsx      # Gig detail
│   ├── contexts/
│   │   └── auth.tsx
│   ├── lib/
│   │   ├── api/              # Copied from web
│   │   ├── types/            # Copied from web
│   │   ├── utils/            # Copied from web
│   │   ├── storage.ts        # NEW: Secure storage adapter
│   │   └── supabase.ts       # NEW: Mobile Supabase client
│   ├── .env
│   ├── app.json
│   ├── package.json
│   └── tsconfig.json
└── package.json              # Web app package.json
```

---

## Troubleshooting

### "Unable to resolve module" errors
```bash
npx expo start --clear
```

### iOS Simulator won't launch
- Ensure Xcode is fully installed (not just downloaded)
- Open Xcode once to accept license agreements
- Run `xcode-select --install` if needed

### Auth session not persisting
- Verify `expo-secure-store` is installed
- Check `detectSessionInUrl: false` is set in Supabase config

### Type errors after copying web code
- Ensure `database.ts` was copied correctly
- Update all Supabase client imports in API files

---

## Next Steps After MVP

Once the basic app is working:

1. **Push notifications** - Gig reminders, payment updates
2. **Offline mode** - Cache gigs for offline viewing
3. **Calendar view** - Monthly view of gigs
4. **Invitation responses** - Accept/decline in app

See `/docs/mobile-integration-guide.md` → "Features Roadmap" for full list.
