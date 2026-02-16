# Compact Share Dialog Design

**Date:** 2026-02-16
**Status:** Approved
**File:** `components/gigpack/gigpack-share-dialog.tsx`

## Problem

The share popup is too tall — it requires scrolling and feels overwhelming. Most of the time users just want to copy the link or tap a share button, but the QR code and prewritten messages take up most of the space.

## Solution

Compact the dialog to show only the essential sharing actions by default, with QR code and prewritten messages tucked into a collapsible section.

## Default View (no scrolling)

```
┌──────────────────────────────────┐
│  Share GigPack           [X]     │
│  Send this to your band          │
│                                  │
│  ┌─────────────────────┐ [Copy]  │
│  │ gigmaster.app/p/abc  │        │
│  └─────────────────────┘         │
│                                  │
│  [WA] [Share] [Email] [Open]     │
│                                  │
│  ▸ QR Code & Messages            │
└──────────────────────────────────┘
```

## Expanded View (collapsible open)

QR code (150px) + two prewritten message blocks appear below the trigger.

## Changes

| What | Before | After |
|------|--------|-------|
| Dialog width | `max-w-2xl` (672px) | `max-w-md` (448px) |
| Title size | `text-2xl` | `text-lg` |
| Section spacing | `space-y-6` | `space-y-4` |
| Quick actions | 2x2 grid with text | Single row, icon-only with title attrs |
| QR code size | 200px | 150px |
| QR + messages | Always visible | Inside `<Collapsible>`, closed by default |

## Components Used

- Existing `Collapsible` / `CollapsibleTrigger` / `CollapsibleContent` from `components/ui/collapsible.tsx`
- Existing `GigPackQr` with `size={150}`

## Scope

Single file change: `components/gigpack/gigpack-share-dialog.tsx`
