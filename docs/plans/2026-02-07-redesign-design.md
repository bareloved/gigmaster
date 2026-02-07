# GigMaster Redesign: Clean Minimal UI

**Date:** 2026-02-07
**Branch:** `redesign`
**Inspiration:** uaudio.com (Universal Audio) — clean, confident, lots of whitespace

## Goal

Strip away the "Vintage Stage" visual theme and replace it with a clean, minimal, professional design. Same layout structure (top nav + mobile bottom nav), same pages — just a dramatically simpler, calmer look.

## Scope

**In scope:**
- Color palette overhaul (warm neutrals + copper accent)
- Typography swap (Inter, single font family)
- Navigation bar redesign (simplified, UA-style)
- Card and component restyling (borders over shadows, no effects)
- Remove all decorative CSS (film grain, poster skins, glow, neon, ticket cards)
- Dark mode simplification (stays, toggle moves to user menu)
- Footer simplification

**Out of scope:**
- New features (no global search, no new pages)
- Layout restructuring (pages stay the same)
- Database or API changes
- Mobile app considerations

---

## 1. Color Palette

### Light Mode

| Token                  | Value              | Description                        |
|------------------------|--------------------|------------------------------------|
| `--background`         | `0 0% 100%`       | Pure white                         |
| `--foreground`         | `220 20% 16%`     | Dark charcoal text                 |
| `--card`               | `0 0% 100%`       | White (same as background)         |
| `--card-foreground`    | `220 20% 16%`     | Dark charcoal                      |
| `--muted`              | `40 10% 96%`      | Light warm gray (hover, surfaces)  |
| `--muted-foreground`   | `220 10% 46%`     | Medium gray (secondary text)       |
| `--primary`            | `25 60% 45%`      | Warm copper/bronze                 |
| `--primary-foreground` | `0 0% 100%`       | White (text on copper)             |
| `--secondary`          | `40 10% 96%`      | Light warm gray                    |
| `--secondary-foreground` | `220 20% 16%`   | Dark charcoal                      |
| `--accent`             | `40 10% 96%`      | Same as muted                      |
| `--accent-foreground`  | `220 20% 16%`     | Dark charcoal                      |
| `--border`             | `40 8% 90%`       | Very light gray                    |
| `--ring`               | `25 60% 45%`      | Copper (focus rings)               |
| `--destructive`        | `0 72% 50%`       | Red (keep for delete actions)      |

### Dark Mode

| Token                  | Value              | Description                        |
|------------------------|--------------------|------------------------------------|
| `--background`         | `220 15% 12%`     | Deep charcoal                      |
| `--foreground`         | `40 10% 93%`      | Warm off-white                     |
| `--card`               | `220 15% 16%`     | Slightly lighter charcoal          |
| `--card-foreground`    | `40 10% 93%`      | Warm off-white                     |
| `--muted`              | `220 15% 20%`     | Dark gray surface                  |
| `--muted-foreground`   | `220 10% 55%`     | Medium gray                        |
| `--primary`            | `25 60% 55%`      | Copper (slightly brighter)         |
| `--primary-foreground` | `0 0% 100%`       | White                              |
| `--secondary`          | `220 15% 20%`     | Dark gray                          |
| `--secondary-foreground` | `40 10% 93%`    | Off-white                          |
| `--accent`             | `220 15% 20%`     | Same as muted                      |
| `--accent-foreground`  | `40 10% 93%`      | Off-white                          |
| `--border`             | `220 15% 22%`     | Subtle dark border                 |
| `--ring`               | `25 60% 55%`      | Copper                             |
| `--destructive`        | `0 72% 55%`       | Red (brighter for dark bg)         |

### Removed Colors

- `--secondary` (amber) — replaced with neutral gray
- `--accent` (teal) — replaced with neutral gray
- All chart colors simplified to copper + grays
- All sidebar-specific color tokens removed

---

## 2. Typography

### Font Stack

- **Primary:** Inter (weights 400, 500, 600, 700) — Google Fonts
- **Hebrew:** Noto Sans Hebrew (keep existing local font)
- **Remove:** Bebas Neue, JetBrains Mono, Anton

### Type Scale

| Use             | Size  | Weight | Color              |
|-----------------|-------|--------|--------------------|
| Page title      | 24px  | 600    | foreground         |
| Section heading | 16px  | 600    | foreground         |
| Body text       | 14px  | 400    | foreground         |
| Secondary text  | 14px  | 400    | muted-foreground   |
| Small label     | 12px  | 500    | muted-foreground   |

### Rules

- No uppercase transforms on headings
- No letter-spacing adjustments
- Dates and numbers use Inter with `font-variant-numeric: tabular-nums`
- No display font classes (`.display-bold` removed)
- No monospace data classes (`.mono-data` removed)

---

## 3. Navigation

### Desktop (lg+)

```
┌──────────────────────────────────────────────────────────┐
│  [Logo]    Dashboard  Gigs  Bands  Invitations      🔔 👤 │
└──────────────────────────────────────────────────────────┘
```

- Solid white background, subtle bottom border
- Height: `h-16` (64px) fixed across all breakpoints
- Logo left, sized down for subtlety
- Nav links: Inter 14px/500, left of center
- Active state: copper text color only (no underline, no indicator bar)
- Hover state: copper text color
- Right side: notification bell + user avatar
- Dark mode toggle: moved inside user menu dropdown
- No backdrop blur, no transparency, no film grain behind

### Mobile (below lg)

Top bar: Logo + notification bell + user avatar only

Bottom nav:
- 4 items: Dashboard, Gigs, Bands, Invitations
- Solid white background, subtle top border
- Active: copper icon + label
- Inactive: muted gray icon + label
- No dot indicators, no animated transitions
- Safe area padding for notched phones preserved

### User Menu Dropdown

- Avatar trigger
- User name + email
- Profile link
- Settings link
- Dark/Light mode toggle (new location)
- Sign out

---

## 4. Cards & Components

### Cards

- Background: white (same as page)
- Border: 1px solid `--border`
- Border radius: `rounded-lg` (12px)
- Padding: `p-6`
- No shadow by default
- Hover: `shadow-sm` only where interactive (clickable cards)
- No gradients, no ticket notches, no diagonal accents

### Buttons

| Variant   | Background       | Text      | Border           |
|-----------|------------------|-----------|------------------|
| Primary   | Copper           | White     | None             |
| Secondary | White            | Charcoal  | 1px border color |
| Ghost     | Transparent      | Charcoal  | None             |
| Destructive | Red            | White     | None             |

- All buttons: Inter 14px/500, `rounded-md`, `px-5 py-2.5`
- No shadows, no glow effects
- Ghost hover: copper text

### Badges & Status Pills

- Shape: `rounded-full`, `px-3 py-1`
- Font: Inter 12px/500

| Status    | Background          | Text             |
|-----------|---------------------|------------------|
| Confirmed | `hsl(140 40% 95%)` | `hsl(140 40% 30%)` |
| Tentative | `hsl(40 50% 95%)`  | `hsl(40 50% 35%)`  |
| Cancelled | `hsl(0 50% 95%)`   | `hsl(0 50% 35%)`   |
| Pending   | `hsl(220 10% 95%)` | `hsl(220 10% 40%)` |
| Paid      | `hsl(140 40% 95%)` | `hsl(140 40% 30%)` |
| Overdue   | `hsl(0 50% 95%)`   | `hsl(0 50% 35%)`   |

### Form Inputs

- Border: 1px solid `--border`
- Border radius: `rounded-md`
- Padding: `px-4 py-2.5`
- Focus: 2px copper ring
- No thick borders, no colored outlines

---

## 5. Spacing

### Page Layout

- Max width: `max-w-7xl` (unchanged)
- Mobile padding: `px-6 py-8 pb-24` (pb for bottom nav clearance)
- Desktop padding: `px-8 py-10`
- Section gaps: `space-y-8`
- Card gaps in grids: `gap-6`

### General Principle

More whitespace everywhere. Let content breathe. When in doubt, add space.

---

## 6. What Gets Removed

### CSS Classes to Delete

- `.film-grain` — SVG noise overlay
- `.poster-gradient-red`, `.poster-gradient-warm`, `.poster-gradient-hero`
- `.ticket-card` — border + notch styling
- `.diagonal-accent` — colored stripe
- `.stage-border` — gradient border
- `.neon-text` — text-shadow glow
- `.gig-card` — hover scale animation
- `.date-pill` — complex badge styling
- `.gig-section-header` — uppercase small headers
- `.poster-skin-clean`, `.poster-skin-paper`, `.poster-skin-grain`
- `.display-bold`, `.mono-data`, `.hand-drawn-hover`
- All stage/glow box shadow utilities

### Tailwind Config Cleanup

- Remove custom `stage`, `stage-lg` box shadows
- Remove `glow-red`, `glow-amber`, `glow-cyan` shadows
- Remove `pulse-glow`, `bounce-soft`, `marquee` animations (keep `fade-in`, `slide-in`)
- Remove poster skin safelist entries

### Fonts to Remove

- Bebas Neue — display font
- JetBrains Mono — monospace
- Anton — setlist display font
- Remove corresponding font files from `/public/fonts/` (keep Noto Sans Hebrew)
- Remove font variables from `lib/fonts.ts`

### Components to Simplify

- `TopNav` — remove animated indicator, simplify structure
- `BottomNav` — remove dot indicator, simplify active states
- `AppLoadingScreen` — replace with simple centered logo + spinner
- `AppFooter` — collapse from 5-column grid to single row
- `DarkModeToggle` — move into user menu, remove from top nav

---

## 7. Footer

**Before:** 5-column grid with branding, product links, mobile app section, legal, company.

**After:**
```
┌──────────────────────────────────────────────────────────┐
│  © 2026 GigMaster          Privacy · Terms · Contact     │
└──────────────────────────────────────────────────────────┘
```

- Single row, border-top, `py-6`
- Copyright left, links right
- Muted gray text, Inter 12px
- Desktop only (hidden on mobile, same as before)

---

## 8. Loading Screen

**Before:** Logo with pulsing ring animation + bouncing dots + "Loading your gigs..." text.

**After:** Centered GigMaster logo with a simple opacity pulse. No text, no dots, no ring. Just the logo breathing.

---

## 9. Dark Mode

Same minimal approach, just inverted:

- Background: deep charcoal (`hsl(220 15% 12%)`)
- Cards: slightly lighter (`hsl(220 15% 16%)`)
- Text: warm off-white
- Borders: subtle (`hsl(220 15% 22%)`)
- Copper accent: same hue, slightly brighter for contrast
- No film grain, no poster effects, no glow

Toggle location: inside user menu dropdown (not in top nav).

---

## Implementation Order

1. **Colors** — Update CSS custom properties in `globals.css`
2. **Fonts** — Swap to Inter, remove old fonts from `lib/fonts.ts` and `layout.tsx`
3. **CSS cleanup** — Delete all decorative classes from `globals.css`
4. **Tailwind config** — Remove custom shadows, animations, safelist
5. **TopNav** — Rebuild with simplified UA-style layout
6. **BottomNav** — Simplify active states and styling
7. **User menu** — Add dark mode toggle
8. **Footer** — Collapse to single row
9. **Loading screen** — Simplify to logo pulse
10. **Component sweep** — Remove decorative classes from components across the app
11. **Page sweep** — Update page titles, section headers, spacing
12. **Dark mode** — Verify all tokens look right in dark mode
