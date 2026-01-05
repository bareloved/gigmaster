# `/lib` Directory Structure

This directory contains the core business logic, types, and utilities for the Gigging Musicians app.

## 📁 Directory Overview

```
/lib/
  ├── api/              # Data access layer (mobile-ready ✅)
  ├── providers/        # React context providers (web-only ⚠️)
  ├── supabase/         # Supabase client configurations
  ├── types/            # TypeScript type definitions (mobile-ready ✅)
  ├── utils/            # Pure utility functions (mobile-ready ✅)
  └── README.md         # This file
```

---

## 🚀 Mobile-Ready Modules

These modules can be reused in a React Native mobile app without modification:

### ✅ `/lib/api/*` - Data Access Layer

All API functions are platform-agnostic and mobile-ready.

**Files:**
- `gigs.ts` - Gig CRUD operations
- `projects.ts` - Project management
- `gig-roles.ts` - Musician/role assignments
- `setlist-items.ts` - Setlist management
- `gig-files.ts` - File/resource links
- `player-money.ts` - Financial tracking
- `gig-pack.ts` - Mobile-optimized gig data

**Usage in mobile:**
```typescript
// Just replace the Supabase client import
import { createClient } from '../supabase/client'; // Your RN client
import { listDashboardGigs } from '@/lib/api/dashboard-gigs';

const { gigs } = await listDashboardGigs(userId);
```

### ✅ `/lib/types/*` - Type Definitions

**Files:**
- `database.ts` - Supabase generated types
- `shared.ts` - All API-related types

**Features:**
- Pure TypeScript interfaces
- No runtime dependencies
- Can be imported directly in React Native

### ✅ `/lib/utils/*` - Pure Functions

**Files:**
- `currency.ts` - Currency formatting
- `setlist-parser.ts` - Text parsing for bulk setlist import
- `text-formatting.ts` - Title case, musical key formatting
- `utils.ts` - General utilities (cn helper)

**Features:**
- No DOM dependencies
- No Next.js dependencies
- Pure JavaScript/TypeScript functions

---

## ⚠️ Web-Only Modules

These modules are specific to the Next.js web app and should NOT be used in mobile:

### `/lib/providers/*` - React Context Providers

**Files:**
- `query-provider.tsx` - TanStack Query setup
- `theme-provider.tsx` - Dark mode theme
- `user-provider.tsx` - Auth state management

**Why web-only:**
- Uses "use client" directive (Next.js specific)
- React Context API (different setup in React Native)
- Relies on browser APIs

**Mobile alternative:**
Set up similar providers in your React Native app, but adapted for mobile environment.

### `/lib/supabase/client.ts` - Browser Client

**Why web-only:**
- Uses `@supabase/ssr` package
- Browser-specific session management
- Relies on `window` and browser cookies

**Mobile alternative:**
See `/lib/supabase/CLIENTS_GUIDE.md` for React Native setup.

### `/lib/supabase/server.ts` - Next.js Server Client

**Why web-only:**
- Uses Next.js `cookies()` API
- Server-side only
- Not applicable to client-side mobile apps

---

## 📊 Code Portability Matrix

| Module | Web | Mobile | Notes |
|--------|-----|--------|-------|
| `/lib/api/*` | ✅ | ✅ | Just swap Supabase client |
| `/lib/types/*` | ✅ | ✅ | Pure TypeScript |
| `/lib/utils/*` | ✅ | ✅ | Pure JavaScript functions |
| `/lib/providers/*` | ✅ | ❌ | Web-only React contexts |
| `/lib/supabase/client.ts` | ✅ | ❌ | Browser-specific |
| `/lib/supabase/server.ts` | ✅ | ❌ | Next.js server-only |

---

## 🏗️ Architecture Principles

### 1. Separation of Concerns

- **API layer** (`/lib/api`) - Pure data access, no UI logic
- **UI components** (`/components`) - Presentation only
- **Providers** (`/lib/providers`) - State management
- **Utils** (`/lib/utils`) - Reusable functions

### 2. Platform Agnostic API

All functions in `/lib/api/*`:
- ✅ No Next.js imports
- ✅ No browser globals (`window`, `document`)
- ✅ Only Supabase client and type imports
- ✅ Return plain data (no JSX)

### 3. Type Safety

- All types exported from `/lib/types/shared.ts`
- Database types auto-generated from Supabase
- Strict TypeScript across all modules

---

## 🔄 Future: Monorepo Migration

When you're ready to build the mobile app, consider migrating to a monorepo:

```
/packages/
  └── shared/
      ├── api/       # from /lib/api
      ├── types/     # from /lib/types
      └── utils/     # from /lib/utils

/apps/
  ├── web/           # Next.js (current app)
  └── mobile/        # Expo/React Native (future)
```

Both apps import from `@workspace/shared`

See `/lib/supabase/CLIENTS_GUIDE.md` for more details.

---

## 📝 Adding New Features

When adding new features:

1. **Start with types** (`/lib/types/shared.ts`)
2. **Add API functions** (`/lib/api/*.ts`)
3. **Create UI components** (`/components/*.tsx`)
4. **Keep platform-agnostic** - No web-specific code in API layer

**Example workflow:**
```typescript
// 1. Add type to /lib/types/shared.ts
export interface NewFeature { ... }

// 2. Add API function to /lib/api/new-feature.ts
export async function getNewFeature() { ... }

// 3. Use in web component
import { getNewFeature } from '@/lib/api/new-feature';

// 4. Later: Reuse in mobile
import { getNewFeature } from '@workspace/shared/api/new-feature';
```

---

## 🔗 Related Documentation

- [Supabase Clients Guide](/lib/supabase/CLIENTS_GUIDE.md)
- [Mobile Integration Guide](/docs/mobile-integration-guide.md)
- [Build Steps](/BUILD_STEPS.md)

