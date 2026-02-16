# Compact Share Dialog Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Shrink the GigPack share dialog so it fits without scrolling by default, with QR code and prewritten messages in a collapsible section.

**Architecture:** Single-file refactor of `gigpack-share-dialog.tsx`. Swap the always-visible QR/messages sections into a Radix `Collapsible` (already in the project). Shrink dialog width, make quick-action buttons icon-only, tighten spacing.

**Tech Stack:** React, shadcn/ui (Dialog, Collapsible, Button), Lucide icons, Tailwind CSS

---

### Task 1: Add Collapsible import and shrink dialog container

**Files:**
- Modify: `components/gigpack/gigpack-share-dialog.tsx:1-17` (imports) and `:107-109` (DialogContent classes)

**Step 1: Add Collapsible imports**

At the top of the file, after the Dialog imports, add:

```tsx
import {
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
} from "@/components/ui/collapsible";
import { ChevronRight } from "lucide-react";
```

Also add `ChevronRight` to the existing lucide-react import (or as a separate import).

**Step 2: Shrink the dialog and tighten spacing**

Change the `DialogContent` className from:
```
"max-w-2xl max-h-[90vh] overflow-y-auto"
```
to:
```
"max-w-md max-h-[90vh] overflow-y-auto"
```

Change the `DialogTitle` className from `"text-2xl"` to `"text-lg"`.

Change the outer `div.space-y-6` (line 121) to `space-y-4`.

**Step 3: Verify it still renders**

Run: `npm run dev` and open a gig's share dialog in the browser.
Expected: Dialog is narrower, title is smaller, spacing is tighter. Content still all visible (haven't moved anything yet).

**Step 4: Commit**

```bash
git add components/gigpack/gigpack-share-dialog.tsx
git commit -m "refactor: shrink share dialog width and tighten spacing"
```

---

### Task 2: Convert quick-action buttons to icon-only in a single row

**Files:**
- Modify: `components/gigpack/gigpack-share-dialog.tsx:122-192` (Quick Actions section)

**Step 1: Replace the 2x2 grid with a single-row flex layout**

Replace the entire Quick Actions section (from `{/* Quick Actions Section */}` through its closing `</div>`) with:

```tsx
{/* Quick Actions */}
<div className="flex gap-2">
  {/* WhatsApp */}
  <Button
    variant="outline"
    size="icon"
    title={t("whatsapp")}
    className="flex-1 h-10"
    onClick={() => {
      const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message1)}`;
      window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
    }}
  >
    <MessageCircle className="h-4 w-4" />
  </Button>

  {/* Native Share */}
  <Button
    variant="outline"
    size="icon"
    title={t("shareNative")}
    className="flex-1 h-10"
    onClick={async () => {
      if (navigator.share) {
        try {
          await navigator.share({
            title: gigPack.title,
            text: t("shareText", { title: gigPack.title }),
            url: publicUrl,
          });
        } catch {
          // User cancelled
        }
      } else {
        copyToClipboard(publicUrl, setCopiedLink, t("linkCopied"));
      }
    }}
  >
    <Share className="h-4 w-4" />
  </Button>

  {/* Email */}
  <Button
    variant="outline"
    size="icon"
    title={t("email")}
    className="flex-1 h-10"
    onClick={() => {
      const subject = t("emailSubject", { title: gigPack.title });
      const body = encodeURIComponent(message2);
      const mailtoUrl = `mailto:?subject=${encodeURIComponent(subject)}&body=${body}`;
      window.open(mailtoUrl, '_blank', 'noopener,noreferrer');
    }}
  >
    <Mail className="h-4 w-4" />
  </Button>

  {/* Open Link */}
  <Button
    variant="outline"
    size="icon"
    title={t("openLink")}
    className="flex-1 h-10"
    onClick={() => {
      window.open(publicUrl, '_blank', 'noopener,noreferrer');
    }}
  >
    <ExternalLink className="h-4 w-4" />
  </Button>
</div>
```

Key changes:
- `grid grid-cols-2` becomes `flex`
- Buttons use `size="icon"` + `flex-1 h-10` (equal width, icon only)
- Text labels removed, `title` attribute added for hover/accessibility
- The "Quick actions" `<Label>` header is removed (self-evident from icons)

**Step 2: Verify in browser**

Run: `npm run dev`, open share dialog.
Expected: Four icon buttons in a single row, equally spaced. Hover shows tooltip text.

**Step 3: Commit**

```bash
git add components/gigpack/gigpack-share-dialog.tsx
git commit -m "refactor: convert share quick-actions to icon-only single row"
```

---

### Task 3: Wrap QR code and messages in a Collapsible

**Files:**
- Modify: `components/gigpack/gigpack-share-dialog.tsx:224-303` (QR Code + Prewritten Messages sections)

**Step 1: Replace QR + messages sections with a Collapsible**

Remove the three sections:
1. `{/* QR Code Section */}` (lines ~224-231)
2. `{/* Prewritten Messages Section */}` (lines ~234-303)

Replace them with a single `<Collapsible>` block:

```tsx
{/* QR Code & Messages (collapsible) */}
<Collapsible>
  <CollapsibleTrigger className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors w-full py-1 [&[data-state=open]>svg]:rotate-90">
    <ChevronRight className="h-4 w-4 transition-transform" />
    {t("qrCode")} & {t("prewrittenMessages")}
  </CollapsibleTrigger>
  <CollapsibleContent className="space-y-4 pt-3">
    {/* QR Code */}
    <div className="space-y-2">
      <p className="text-sm text-muted-foreground">{t("qrCodeHint")}</p>
      <div className="flex justify-center">
        <GigPackQr url={publicUrl} size={150} />
      </div>
    </div>

    {/* Message 1 - Band Chat Style */}
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium">
          {t("message1Label")}
        </Label>
        <Button
          onClick={() =>
            copyToClipboard(
              message1,
              setCopiedMessage1,
              t("messageCopied")
            )
          }
          variant="ghost"
          size="sm"
        >
          {copiedMessage1 ? (
            <Check className={cn("h-3.5 w-3.5", isRtl ? "ml-1.5" : "mr-1.5")} />
          ) : (
            <Copy className={cn("h-3.5 w-3.5", isRtl ? "ml-1.5" : "mr-1.5")} />
          )}
          {copiedMessage1 ? t("copiedButton") : t("copyMessage")}
        </Button>
      </div>
      <div className="bg-muted p-3 rounded-lg border text-sm whitespace-pre-wrap select-all">
        {message1}
      </div>
    </div>

    {/* Message 2 - Email Style */}
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium">
          {t("message2Label")}
        </Label>
        <Button
          onClick={() =>
            copyToClipboard(
              message2,
              setCopiedMessage2,
              t("messageCopied")
            )
          }
          variant="ghost"
          size="sm"
        >
          {copiedMessage2 ? (
            <Check className={cn("h-3.5 w-3.5", isRtl ? "ml-1.5" : "mr-1.5")} />
          ) : (
            <Copy className={cn("h-3.5 w-3.5", isRtl ? "ml-1.5" : "mr-1.5")} />
          )}
          {copiedMessage2 ? t("copiedButton") : t("copyMessage")}
        </Button>
      </div>
      <div className="bg-muted p-3 rounded-lg border text-sm whitespace-pre-wrap select-all">
        {message2}
      </div>
    </div>
  </CollapsibleContent>
</Collapsible>
```

Key changes:
- QR size reduced from 200 to 150
- Message block padding reduced from `p-4` to `p-3`
- QR code `<Label>` header removed (redundant with collapsible trigger)
- Chevron rotates 90 degrees when open via `[&[data-state=open]>svg]:rotate-90`

**Step 2: Verify in browser**

Run: `npm run dev`, open share dialog.
Expected:
- Default view: Copy link + 4 icon buttons + "QR code & Copy-paste messages" collapsed trigger. No scrolling needed.
- Click the trigger: QR code and two message blocks appear below with smooth reveal.
- Click again: Collapses back.

**Step 3: Commit**

```bash
git add components/gigpack/gigpack-share-dialog.tsx
git commit -m "feat: collapse QR code and messages in share dialog"
```

---

### Task 4: Final cleanup and build verification

**Files:**
- Modify: `components/gigpack/gigpack-share-dialog.tsx` (remove unused imports if any)

**Step 1: Remove the unused `Label` import if the Quick Actions label was the only usage**

Check if `Label` is still used anywhere in the file. It's used for "Gig link" (public link section) and the message labels inside the collapsible — so it stays.

**Step 2: Run lint and type check**

```bash
npm run check
```

Expected: No errors.

**Step 3: Run build**

```bash
npm run build
```

Expected: Build succeeds.

**Step 4: Run existing tests**

```bash
npm run test:run
```

Expected: All existing tests pass (this change doesn't affect any test logic since it's purely visual).

**Step 5: Manual verification checklist**

Open the share dialog in the browser and verify:
- [ ] Dialog is narrower (~448px)
- [ ] No scrolling needed in the default view
- [ ] Four icon buttons display in a single row
- [ ] Hovering buttons shows tooltip text (WhatsApp, Share..., Email, Open link)
- [ ] Copy link button works
- [ ] All four quick action buttons work (WhatsApp opens, Share triggers native API, Email opens mailto, Open opens link)
- [ ] Collapsible trigger shows "QR code & Copy-paste messages"
- [ ] Clicking trigger reveals QR code and two message blocks
- [ ] QR code renders at smaller size
- [ ] Copy message buttons work inside the collapsible
- [ ] RTL mode still works (if locale is Hebrew)

**Step 6: Commit**

```bash
git add components/gigpack/gigpack-share-dialog.tsx
git commit -m "chore: verify compact share dialog build and lint"
```
