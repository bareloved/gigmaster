# Changelog

All notable changes to GigMaster are documented here. Update this file with every push to `main`.

## [Unreleased]

### Fixed
- TypeScript type errors resolved across 32 files (Json types, null safety, missing fields)
- Removed dead code: unused imports, debug console.logs, performance timing

### Added
- `docs/CONTRIB.md` — Contributing guide
- `docs/RUNBOOK.md` — Operations runbook
- `CHANGELOG.md` — This file

### Changed
- Updated README.md, APP_OVERVIEW.md, and BUILD_STEPS.md to reflect current state

---

## 2026-01-31

### Fixed
- Normalized z-index layering across the app
- Improved gigs page UX

## 2026-01-30

### Changed
- Made `role_name` optional for gig roles
- Removed accent color and poster style from band and gig editors

## 2026-01-29

### Added
- Proxy endpoint for setlist PDFs to hide Supabase storage URLs in public shares

## 2026-01-28

### Added
- PDF setlist upload with drag-and-drop and inline preview
- Setlist PDF proxy route (`/api/gigpack/[slug]/setlist-pdf`)

## 2026-01-27

### Fixed
- Empty lineup row in gig creator removed
- Label accessibility improvements

## 2026-01-26

### Added
- Gig drafts with auto-save
- Dashboard RPC functions (`list_dashboard_gigs`, `list_past_gigs`)
- Custom input for "Other" gig type

## 2026-01-20

### Changed
- Renamed app from Ensemble to GigMaster
- Applied vintage GigMaster design to all auth pages

## 2026-01-13

### Added
- Gig save performance v2 proposal
- Dead code cleanup documentation

## 2026-01-07

### Changed
- Updated testing guide

## 2026-01-03

### Added
- Performance overhaul results documentation (Phases 1-3)

---

## 2025-12-26

### Added
- Complete GigPack editor port with templates, themes, i18n
- Google Maps venue autocomplete integration
- Performance overhaul: parallel operations, smart merge for gig saves

### Changed
- Migrated to ESLint flat config
- Updated Vercel deployment instructions

## 2025-12-24

### Added
- GigPack port plan and editor port plan documentation
- Ensemble DB compatibility fixes

## 2025-12-23

### Added
- Initial repository with all features from Steps 0-22:
  - Authentication (email, magic link, Google OAuth)
  - Band/project management
  - Gig CRUD with status workflow
  - Lineup roles with invitation system (email + WhatsApp)
  - Setlist editor (drag-and-drop, bulk import, sections)
  - "My Circle" musician contacts with smart learning
  - Calendar integration (ICS feed + Google Calendar OAuth)
  - In-app notifications (Supabase Realtime)
  - Money view (player earnings + manager payouts)
  - Profile avatars (upload + Google OAuth auto-import)
  - Unified musician search
  - Dashboard with player/manager views, search, filters, infinite scroll
  - GigPack shareable gig pages
  - Vitest test suite (112 tests)
  - Comprehensive documentation
