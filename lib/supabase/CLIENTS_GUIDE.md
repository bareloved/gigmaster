# Supabase Client Guide

This guide explains the different Supabase client implementations and when to use each.

## Client Types

### 1. Browser Client (`client.ts`)

**Location:** `/lib/supabase/client.ts`

**Purpose:** For use in browser-side React components ("use client")

**When to use:**
- Client-side components
- API functions in `/lib/api/*`
- React hooks and state management
- Any browser-only code

**Example:**
```typescript
import { createClient } from '@/lib/supabase/client';

export async function listProjects() {
  const supabase = createClient();
  const { data } = await supabase.from('projects').select('*');
  return data;
}
```

**Features:**
- Automatic auth session management
- Works with browser cookies
- Persists auth state across page refreshes

---

### 2. Server Client (`server.ts`)

**Location:** `/lib/supabase/server.ts`

**Purpose:** For use in Next.js Server Components and Route Handlers

**When to use:**
- Server Components (default in Next.js App Router)
- API Route Handlers (`app/api/*`)
- Server Actions
- Any server-side rendering

**Example:**
```typescript
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  const supabase = await createClient();
  const { data } = await supabase.from('projects').select('*');
  return Response.json(data);
}
```

**Features:**
- Works with Next.js cookies API
- Server-side session validation
- Secure auth handling

---

### 3. Universal Client (React Native)

**Purpose:** For future React Native mobile app

**When to use:**
- React Native mobile app
- Expo projects
- Any non-browser JavaScript environment

**Setup for React Native:**

```typescript
// mobile/lib/supabase.ts
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
    detectSessionInUrl: false,
  },
});
```

**Features:**
- Works with React Native AsyncStorage
- Mobile-optimized session management
- Can reuse all `/lib/api/*` functions

---

## Current Project Structure

```
/lib/supabase/
  ├── client.ts         # Browser client (web app)
  ├── server.ts         # Next.js server client
  ├── queries.ts        # Shared query helpers
  └── CLIENTS_GUIDE.md  # This file
```

---

## Mobile App Integration

When you build the React Native app:

1. **Reuse API Functions:**
   - All functions in `/lib/api/*` are already mobile-ready
   - Just replace `createClient` import to use React Native client

2. **Shared Types:**
   - Import from `/lib/types/shared.ts`
   - All types work across web and mobile

3. **Utilities:**
   - `/lib/utils/*` functions are pure JavaScript
   - Can be used directly in React Native

4. **What NOT to reuse:**
   - `/lib/providers/*` - Web-only (Next.js context providers)
   - `/lib/supabase/client.ts` - Web-only (browser specific)
   - `/lib/supabase/server.ts` - Next.js only

---

## Environment Variables

### Web (Next.js)
```env
NEXT_PUBLIC_SUPABASE_URL=your-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-key
```

### Mobile (Expo/React Native)
```env
EXPO_PUBLIC_SUPABASE_URL=your-url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-key
```

Both use the same Supabase project!

---

## Migration Path to Monorepo

When ready to migrate to a monorepo:

```
/packages/
  └── shared/              # Shared package
      ├── types/           # Move from /lib/types
      ├── api/             # Move from /lib/api
      └── utils/           # Move from /lib/utils

/apps/
  ├── web/                 # Next.js app
  │   └── lib/
  │       ├── providers/   # Web-only
  │       └── supabase/    # Web clients
  │
  └── mobile/              # Expo app
      └── lib/
          └── supabase/    # Mobile client
```

Both apps import from `@workspace/shared`

