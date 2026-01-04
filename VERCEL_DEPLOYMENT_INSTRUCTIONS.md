# Vercel Deployment Protocol & Agent Instructions

**Role:** Senior Next.js + Vercel Deployment Engineer
**Objective:** Run a full PREDEPLOY CHECK, fix anything that would cause a Vercel deployment failure, and provide evidence of success.

---

## 🚨 Critical Project Context (READ FIRST)

This project has specific constraints that you **MUST** respect. Do not refactor these away without explicit permission:

1.  **TypeScript Strategy (`ignoreBuildErrors: true`):**
    -   **Context:** The codebase contains ~300 legacy type errors, mostly due to mismatch between the Database Schema and Frontend Types.
    -   **Config:** `next.config.ts` has `typescript.ignoreBuildErrors: true`.
    -   **Instruction:** Do **NOT** remove this flag. Your goal is Deployment Reliability, not 100% Type Correctness.
    -   **Verification:** Run `npm run typecheck` to see errors, but `npm run build` should pass despite them.

2.  **ESLint Configuration (ESLint 9):**
    -   **Context:** This project uses ESLint 9 with a flat config file: `eslint.config.mjs`.
    -   **Instruction:** Do NOT create or rely on `.eslintrc.json`. It is ignored.
    -   **Script:** Use `npm run lint` or `npx eslint .`.

3.  **Vendor Code:**
    -   **Context:** Core logic exists in `vendor/gigpack`.
    -   **Instruction:** This directory is excluded from `tsconfig.json` to prevent vendor type errors from breaking the build.

---

## 🛠️ The Predeploy Check Workflow (Steps A-J)

Execute these steps in order to guarantee a successful deployment.

### A) Identify Project State
-   **Detect:** Next.js version (App Router), TypeScript, ESLint 9, npm (package-lock.json).
-   **Output:** Confirm strictness levels (e.g. "React 19, Next 16").

### B) Reproduce Build (The "Truth" Test)
-   **Command:** Run `npm run predeploy` locally.
    -   *Note:* This script runs `npm run typecheck` (allowing failure) followed by `npm run build`.
-   **Goal:** Capture the *first* failing error. If `npm run build` succeeds locally, Vercel should succeed.

### C) Dependency Integrity
-   **Lockfile:** Ensure only `package-lock.json` exists.
-   **Deps:** Check for missing critical runtime dependencies (e.g., `next-intl`, `@supabase/ssr`).
-   **Validation:** Run `npm ls` to check for peer dependency warnings that might crash a linux build.

### D) Node & Runtime Compatibility
-   **Engines:** Check `package.json` for `"engines": { "node": ">=20.0.0" }`.
-   **Verify:** Ensure local node version matches (run `node -v`).

### E) Next.js Build Blockers
-   **Typecheck:** Run `npm run typecheck`. (Expect legacy errors, but ensure no *new* critical errors in pages).
-   **Lint:** Run `npm run lint`. Fix any `next/core-web-vitals` errors that would fail the build (unless ignored/warn-only).
-   **Path Sensitivity:** Ensure all imports match filesystem casing exactly (e.g. `Component.tsx` vs `component.tsx`). Linux is case-sensitive!
-   **"Use Client":** Verify Client Components don't import Server-only modules (`server-only`).

### F) Environment Variables
-   **Scan:** Grep for `process.env`.
-   **Requirement:** Ensure the app does not crash at *build time* if standard runtime vars (like `GOOGLE_CLIENT_ID`) are missing.
-   **Vercel Vars:** Ensure `NEXT_PUBLIC_` vars needed for static generation are documented (see below).

### G) Serverless & Edge Constraints
-   **Writes:** Ensure no code attempts to write to the filesystem at runtime (`fs.writeFile`), as Vercel Lambdas are read-only.
-   **Bundles:** Watch for massive dependencies that could exceed lambda limits.

### H) Static Assets
-   **Public Dir:** Validate that images referenced in `src` or `public` actually exist.
-   **Config:** Check `next.config.ts` for strictly defined `images.remotePatterns`.

### I) Automation Validation
-   **Scripts:** Verify `package.json` has:
    ```json
    "predeploy": "npm run typecheck || echo '...' && npm run build"
    ```
-   **Test:** execute `npm run predeploy` yourself.

### J) Final Verification
-   **Re-run:** Run the full `npm run predeploy` sequence one last time.
-   **Evidence:** The output must end with `Exit code: 0`.

---

## 📦 Required Environment Variables (Vercel)

Ensure these are set in Vercel Project Settings:

```bash
# Core (App Crashes Without These)
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...

# Auth & Integrations
GOOGLE_CALENDAR_CLIENT_ID=...
GOOGLE_CALENDAR_CLIENT_SECRET=...
GOOGLE_CALENDAR_REDIRECT_URI=...
RESEND_API_KEY=...
NEXT_PUBLIC_APP_URL=...
```

---

## � Deliverable Format

When asking an agent to run this, expect the following output structure:

1.  **Diagnosis:** Bullet list of any root causes found (file paths).
2.  **Fix Plan:** Ordered steps taken.
3.  **Applied Changes:** Summary of files edited.
4.  **Validation:** Terminal output showing `npm run predeploy` success.
5.  **Final Status:** "Ready for Deployment" or "Blocked".
