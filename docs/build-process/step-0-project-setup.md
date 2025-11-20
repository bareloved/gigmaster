# Step 0: Project & Tooling Setup

**Status**: ✅ Complete  
**Date**: November 11, 2025  
**Goal**: Set up the Next.js foundation with modern tooling, UI components, and theming system

---

## Overview

This step established the core frontend infrastructure for Ensemble. We scaffolded a Next.js 15 app with TypeScript, added shadcn/ui for beautiful components, implemented a flexible theming system with dark mode, and created the basic app layout structure.

---

## What We Built

### 1. Project Scaffolding
- **Next.js 15** with App Router
- **TypeScript** configuration
- **Tailwind CSS** for styling
- **ESLint** for code quality

### 2. UI Component System
Installed shadcn/ui with these components:
- `button` - Buttons with variants (default, destructive, outline, ghost, link)
- `card` - Card layouts with header, content, footer
- `avatar` - User avatars with fallbacks
- `tabs` - Tabbed interfaces
- `table` - Data tables
- `scroll-area` - Custom scrollbars
- `sheet` - Slide-out drawers (for mobile sidebar)

### 3. Theme System
- **7 color themes**: Slate, Zinc, Violet, Orange, Green, Rose, Blue
- **Dark mode** with theme-aware color palettes
- **Theme provider** with React Context
- **LocalStorage persistence** for user preferences
- **Theme selector UI** in Profile page
- **Quick toggle** in app header

### 4. App Layout
- **Responsive sidebar** (desktop + mobile)
- **Top header** with dark mode toggle and user avatar
- **Route-based navigation**:
  - Dashboard (with "As Player" / "As Manager" tabs)
  - Projects
  - Money
  - Profile
  - Test DB (for development)

### 5. Data Fetching Setup
- **TanStack Query** (React Query) installed and configured
- Query provider wrapped around app

### 6. Supabase Client
- **@supabase/supabase-js** installed (ready for Step 1)

---

## Technical Decisions

### Why Next.js 15 App Router?
- Server Components by default (better performance)
- Built-in data fetching patterns
- Easy API routes for backend logic
- Great TypeScript support
- Future-ready for mobile (can reuse API layer)

### Why shadcn/ui?
- Not a traditional component library (we own the code)
- Built on Radix UI (accessible primitives)
- Highly customizable with Tailwind
- Beautiful defaults with "New York" style
- Easy to extend and modify

### Why Custom Theme System?
- Users want personalization
- Musicians appreciate creative control
- Dark mode is essential for nighttime use
- All themes work in both light and dark modes
- Easy to add more themes later

### Architecture Choices
- **Route grouping**: `(app)` for authenticated routes
- **Client vs Server**: Clear separation with `"use client"` directive
- **Providers**: Wrapped in root layout for global access
- **Utilities**: Centralized in `lib/` folder

---

## Files Created

### Core Configuration
```
package.json                    - Dependencies and scripts
tsconfig.json                   - TypeScript configuration
next.config.ts                  - Next.js configuration
tailwind.config.ts              - Tailwind + theme variables
postcss.config.mjs              - PostCSS configuration
components.json                 - shadcn/ui configuration
.eslintrc.json                  - ESLint rules
.gitignore                      - Git ignore patterns
.env.local.example              - Environment variables template
```

### Styling
```
app/globals.css                 - Global styles + Tailwind + CSS variables
```

### Components
```
components/ui/
  button.tsx                    - Button component
  card.tsx                      - Card components
  avatar.tsx                    - Avatar component
  tabs.tsx                      - Tabs component
  table.tsx                     - Table component
  scroll-area.tsx               - Scroll area component
  sheet.tsx                     - Sheet/drawer component

components/
  app-sidebar.tsx               - Main navigation sidebar
  app-header.tsx                - Top header bar
  dark-mode-toggle.tsx          - Dark mode toggle button
  theme-selector.tsx            - Theme picker UI
```

### Layout & Pages
```
app/layout.tsx                  - Root layout with providers
app/page.tsx                    - Root page (redirects to dashboard)

app/(app)/
  layout.tsx                    - Authenticated app layout
  dashboard/page.tsx            - Dashboard page
  projects/page.tsx             - Projects page
  money/page.tsx                - Money page
  profile/page.tsx              - Profile page with theme selector
```

### Lib & Utilities
```
lib/
  utils.ts                      - Utility functions (cn for classnames)
  themes.ts                     - Theme configurations
  providers/
    query-provider.tsx          - TanStack Query provider
    theme-provider.tsx          - Theme context provider
```

### Documentation
```
README.md                       - Project overview
STEP_0_COMPLETE.md              - Step 0 completion summary
THEMES.md                       - Theme customization guide
```

---

## How to Test

1. **Start dev server**: `npm run dev`
2. **Visit**: http://localhost:3000
3. **Verify**:
   - ✅ Sidebar shows on desktop
   - ✅ Hamburger menu works on mobile
   - ✅ All navigation links work
   - ✅ Dark mode toggle works
   - ✅ Theme selector in Profile works
   - ✅ Theme persists after refresh
   - ✅ No console errors

---

## Key Dependencies

```json
{
  "next": "^15.1.0",
  "react": "^19.0.0",
  "react-dom": "^19.0.0",
  "typescript": "^5",
  "tailwindcss": "^3.4.1",
  "@supabase/supabase-js": "^2.81.1",
  "@tanstack/react-query": "^5.90.7",
  "lucide-react": "^0.553.0",
  "@radix-ui/react-*": "various",
  "clsx": "^2.1.1",
  "tailwind-merge": "^3.4.0",
  "class-variance-authority": "^0.7.1",
  "tailwindcss-animate": "^1.0.7"
}
```

---

## Known Limitations

- No authentication yet (all pages are public)
- No real data (all placeholder content)
- Theme selector shows light colors only (could show dark preview too)
- No system theme preference detection
- Mobile sidebar doesn't close automatically on navigation

---

## Performance Considerations

✅ **What We Did Right**:
- Used Server Components where possible
- Minimal client-side JavaScript
- Lazy-loaded theme system
- LocalStorage for theme (no network requests)
- CSS variables for instant theme switching

⚠️ **Future Improvements**:
- Consider prefetching navigation routes
- Add loading states for page transitions
- Optimize theme color preview generation

---

## Next Steps

**Step 1**: Connect to Supabase and create database schema
- Set up Supabase project
- Create core tables (profiles, projects, gigs)
- Add Row Level Security policies
- Test database connection

---

## Screenshots Reference

Key UI states to verify:
- Light mode (default Slate theme)
- Dark mode (any theme)
- Mobile sidebar open
- Theme selector showing all options
- Dashboard with tabs

---

**Completion Criteria Met**: ✅
- [x] Next.js running with no errors
- [x] All shadcn components working
- [x] Theme system functional
- [x] Dark mode working
- [x] Responsive layout working
- [x] Navigation working
- [x] No linter errors

---

*Last updated: November 11, 2025*

