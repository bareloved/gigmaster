"use client";

import * as React from "react";
import { useState, useRef } from "react";
import { useTranslations } from "@/lib/gigpack/i18n";
import { cn } from "@/lib/utils";
import {
  Mic,
  Star,
  Music,
  Headphones,
  Paperclip,
  Plus,
  MoreHorizontal,
  Link2,
  Pencil,
  Check,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { GigMaterial, GigMaterialKind } from "@/lib/gigpack/types";
import { HostingServiceIcon } from "@/components/shared/hosting-service-icon";

// ============================================================================
// URL Helpers
// ============================================================================

const STRIP_EXTENSIONS = /\.(mp3|wav|flac|aac|ogg|mp4|mov|avi|mkv|pdf|docx?|xlsx?|pptx?|txt|png|jpe?g|gif|webp|svg)$/i;
const UNHELPFUL_SEGMENTS = new Set(["view", "edit", "preview", "d", "s", "file", "folders"]);

function parseNameFromUrl(url: string): string {
  try {
    const { pathname } = new URL(url);
    const segments = pathname.split("/").filter(Boolean);
    for (let i = segments.length - 1; i >= 0; i--) {
      const seg = decodeURIComponent(segments[i]);
      if (UNHELPFUL_SEGMENTS.has(seg.toLowerCase()) || /^[a-zA-Z0-9_-]{20,}$/.test(seg)) {
        continue;
      }
      const cleaned = seg
        .replace(STRIP_EXTENSIONS, "")
        .replace(/[-_+]/g, " ")
        .trim();
      if (!cleaned) continue;
      return cleaned.replace(/\b\w/g, (c) => c.toUpperCase());
    }
    return "";
  } catch {
    return "";
  }
}

function detectKindFromUrl(url: string): GigMaterialKind | null {
  try {
    const hostname = new URL(url).hostname.toLowerCase();
    if (hostname.includes("youtube.com") || hostname.includes("youtu.be") || hostname.includes("vimeo.com")) {
      return "performance";
    }
    if (hostname.includes("spotify.com") || hostname.includes("soundcloud.com") || hostname.includes("music.apple.com")) {
      return "reference";
    }
    if (
      hostname.includes("drive.google.com") ||
      hostname.includes("docs.google.com") ||
      hostname.includes("dropbox.com") ||
      hostname.includes("onedrive.live.com") ||
      hostname.includes("1drv.ms")
    ) {
      return "charts";
    }
    return null;
  } catch {
    return null;
  }
}

// ============================================================================
// Kind Icon Config
// ============================================================================

const KIND_ICON: Record<GigMaterialKind, { icon: React.ElementType; color: string }> = {
  rehearsal: { icon: Mic, color: "text-amber-700 dark:text-amber-400" },
  performance: { icon: Star, color: "text-rose-600 dark:text-rose-400" },
  charts: { icon: Music, color: "text-blue-600 dark:text-blue-400" },
  reference: { icon: Headphones, color: "text-violet-600 dark:text-violet-400" },
  other: { icon: Paperclip, color: "text-slate-600 dark:text-slate-400" },
};

// ============================================================================
// MaterialsEditor (main export)
// ============================================================================

interface MaterialsEditorProps {
  value: GigMaterial[];
  onChange: (materials: GigMaterial[]) => void;
  disabled?: boolean;
}

export function MaterialsEditor({
  value: materials,
  onChange: setMaterials,
  disabled = false,
}: MaterialsEditorProps) {
  const t = useTranslations("gigpack");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);

  const handleAdd = (material: GigMaterial) => {
    setMaterials([...materials, material]);
    setAddOpen(false);
  };

  const handleUpdate = (updated: GigMaterial) => {
    setMaterials(
      materials.map((m) => (m.id === updated.id ? updated : m))
    );
    setEditingId(null);
  };

  const handleRemove = (id: string) => {
    setMaterials(materials.filter((m) => m.id !== id));
  };

  // Empty state
  if (materials.length === 0) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-muted-foreground px-4">
          {t("materials.description")}
        </p>
        {addOpen ? (
          <Popover open={addOpen} onOpenChange={setAddOpen}>
            <PopoverTrigger asChild>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={disabled}
              >
                <Plus className="mr-2 h-4 w-4 rtl:ml-2 rtl:mr-0" />
                {t("materials.addButton")}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[22rem] p-4" align="start" side="bottom">
              <MaterialFormInner
                onSave={handleAdd}
                onCancel={() => setAddOpen(false)}
                disabled={disabled}
              />
            </PopoverContent>
          </Popover>
        ) : (
          <MaterialsEmptyState
            onAdd={() => setAddOpen(true)}
            disabled={disabled}
          />
        )}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        {t("materials.description")}
      </p>

      {/* Material grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {materials.map((material) => (
          <Popover
            key={material.id}
            open={editingId === material.id}
            onOpenChange={(open) => {
              if (!open) setEditingId(null);
            }}
          >
            <PopoverTrigger asChild>
              <div>
                <MaterialCard
                  material={material}
                  disabled={disabled}
                  onEdit={() => setEditingId(material.id)}
                  onRemove={() => handleRemove(material.id)}
                  onOpenLink={() => {
                    if (material.url) {
                      window.open(material.url, "_blank", "noopener,noreferrer");
                    }
                  }}
                />
              </div>
            </PopoverTrigger>
            <PopoverContent
              className="w-[22rem] p-4"
              align="start"
              side="bottom"
            >
              <MaterialFormInner
                initial={material}
                onSave={handleUpdate}
                onCancel={() => setEditingId(null)}
                disabled={disabled}
              />
            </PopoverContent>
          </Popover>
        ))}
      </div>

      {/* Add button */}
      <Popover open={addOpen} onOpenChange={setAddOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={disabled}
            className="w-full"
          >
            <Plus className="mr-2 h-4 w-4 rtl:ml-2 rtl:mr-0" />
            {t("materials.addButton")}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[22rem] p-4" align="start" side="bottom">
          <MaterialFormInner
            onSave={handleAdd}
            onCancel={() => setAddOpen(false)}
            disabled={disabled}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}

// ============================================================================
// MaterialCard (grid card matching gigpack layout)
// ============================================================================

interface MaterialCardProps {
  material: GigMaterial;
  disabled: boolean;
  onEdit: () => void;
  onRemove: () => void;
  onOpenLink: () => void;
}

function MaterialCard({
  material,
  disabled,
  onEdit,
  onRemove,
  onOpenLink,
}: MaterialCardProps) {
  const t = useTranslations("gigpack");
  const kindConfig = KIND_ICON[material.kind] || KIND_ICON.other;
  const Icon = kindConfig.icon;

  return (
    <div
      role="button"
      tabIndex={disabled ? -1 : 0}
      className={cn(
        "group relative flex items-center gap-3.5 p-4 rounded-xl",
        "border border-transparent bg-white dark:bg-card",
        "hover:border-border/50 hover:shadow-sm transition-all cursor-pointer",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        disabled && "pointer-events-none opacity-60"
      )}
      onClick={(e) => {
        const target = e.target as HTMLElement;
        if (target.closest("[data-material-menu]")) return;
        onEdit();
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onEdit();
        }
      }}
    >
      {/* Hosting service icon (top-right) */}
      {material.url && (
        <div className="absolute top-2 right-2 rtl:right-auto rtl:left-2">
          <HostingServiceIcon url={material.url} className="h-4 w-4" />
        </div>
      )}

      {/* Menu button (top-right, shown on hover, overlaps hosting icon area) */}
      <div className="absolute top-1 right-1 rtl:right-auto rtl:left-1 md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100 transition-opacity">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              data-material-menu
              className={cn(
                "h-7 w-7 flex items-center justify-center rounded-md",
                "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              )}
              onClick={(e) => e.stopPropagation()}
            >
              <MoreHorizontal className="h-4 w-4" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-36">
            <DropdownMenuItem onClick={onEdit}>
              {t("materials.edit")}
            </DropdownMenuItem>
            {material.url && (
              <DropdownMenuItem onClick={onOpenLink}>
                {t("materials.openLink")}
              </DropdownMenuItem>
            )}
            <DropdownMenuItem
              onClick={onRemove}
              className="text-destructive focus:text-destructive"
            >
              {t("materials.remove")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Kind icon */}
      <div className="shrink-0">
        <Icon className={cn("h-7 w-7", kindConfig.color)} />
      </div>

      {/* Label + kind subtitle */}
      <div className="flex-1 min-w-0 pr-4">
        <p className="font-medium">
          {material.label || t(`materials.type.${material.kind}`)}
        </p>
        <p className="text-xs text-muted-foreground mt-0.5">
          {t(`materials.type.${material.kind}`)}
        </p>
      </div>
    </div>
  );
}

// ============================================================================
// Kind chips config (for the selectable pill buttons)
// ============================================================================

const KIND_CHIPS: { value: GigMaterialKind; icon: React.ElementType }[] = [
  { value: "rehearsal", icon: Mic },
  { value: "performance", icon: Star },
  { value: "charts", icon: Music },
  { value: "reference", icon: Headphones },
  { value: "other", icon: Paperclip },
];

// ============================================================================
// MaterialFormInner (URL-first smart form)
// ============================================================================

interface MaterialFormInnerProps {
  initial?: GigMaterial;
  onSave: (material: GigMaterial) => void;
  onCancel: () => void;
  disabled: boolean;
}

function MaterialFormInner({
  initial,
  onSave,
  onCancel,
  disabled,
}: MaterialFormInnerProps) {
  const t = useTranslations("gigpack");

  const [label, setLabel] = useState(initial?.label ?? "");
  const [url, setUrl] = useState(initial?.url ?? "");
  const [kind, setKind] = useState<GigMaterialKind>(initial?.kind ?? "rehearsal");
  const [editingLabel, setEditingLabel] = useState(false);
  const kindManuallySet = useRef(!!initial);
  const labelInputRef = useRef<HTMLInputElement>(null);

  const hasUrl = url.trim().length > 0;
  const kindConfig = KIND_ICON[kind] || KIND_ICON.other;
  const KindIcon = kindConfig.icon;

  const handleUrlChange = (newUrl: string) => {
    setUrl(newUrl);
    if (!label) {
      const parsed = parseNameFromUrl(newUrl);
      if (parsed) setLabel(parsed);
    }
    if (!kindManuallySet.current) {
      const detected = detectKindFromUrl(newUrl);
      if (detected) setKind(detected);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation(); // Prevent bubbling to parent gig editor form via React portal
    if (!url.trim()) return;
    onSave({
      id: initial?.id ?? crypto.randomUUID(),
      label: label || t(`materials.type.${kind}`),
      url,
      kind,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      {/* URL input — always visible, prominent */}
      <div className="relative">
        <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
        <Input
          value={url}
          onChange={(e) => handleUrlChange(e.target.value)}
          onPaste={(e) => {
            // Handle paste with a small delay so the value is updated
            const pasted = e.clipboardData.getData("text");
            if (pasted) {
              setTimeout(() => handleUrlChange(pasted), 0);
            }
          }}
          placeholder={t("materials.urlPlaceholder")}
          disabled={disabled}
          autoFocus
          className="pl-9"
        />
      </div>

      {/* Preview card — appears when URL is present */}
      {hasUrl && (
        <div className="rounded-xl border bg-white dark:bg-card p-3 space-y-3 animate-in fade-in slide-in-from-top-1 duration-200">
          {/* Card preview */}
          <div className="relative flex items-center gap-3">
            {/* Hosting service icon (top-right) */}
            {url && (
              <div className="absolute top-0 right-0">
                <HostingServiceIcon url={url} className="h-4 w-4" />
              </div>
            )}

            {/* Kind icon */}
            <div className="shrink-0">
              <KindIcon className={cn("h-7 w-7", kindConfig.color)} />
            </div>

            {/* Label — click to edit */}
            <div className="flex-1 min-w-0 pr-5">
              {editingLabel ? (
                <Input
                  ref={labelInputRef}
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                  onBlur={() => setEditingLabel(false)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      setEditingLabel(false);
                    }
                    if (e.key === "Escape") setEditingLabel(false);
                  }}
                  placeholder={t("materials.labelPlaceholder")}
                  className="h-7 text-sm font-medium px-1.5"
                  autoFocus
                  disabled={disabled}
                />
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setEditingLabel(true);
                    // Focus the input after render
                    setTimeout(() => labelInputRef.current?.focus(), 0);
                  }}
                  className={cn(
                    "flex items-center gap-1.5 text-left w-full group/label",
                    "rounded px-1.5 py-0.5 -mx-1.5",
                    "hover:bg-muted/60 transition-colors"
                  )}
                >
                  <span className="font-medium text-sm truncate">
                    {label || (
                      <span className="text-muted-foreground italic">
                        {t("materials.labelPlaceholder")}
                      </span>
                    )}
                  </span>
                  <Pencil className="h-3 w-3 shrink-0 text-muted-foreground opacity-0 group-hover/label:opacity-100 transition-opacity" />
                </button>
              )}
              <p className="text-xs text-muted-foreground mt-0.5 px-1.5">
                {t(`materials.type.${kind}`)}
              </p>
            </div>
          </div>

          {/* Kind chips */}
          <div className="flex flex-wrap gap-1.5">
            {KIND_CHIPS.map(({ value, icon: ChipIcon }) => {
              const selected = kind === value;
              const chipColor = KIND_ICON[value].color;
              return (
                <button
                  key={value}
                  type="button"
                  onClick={() => {
                    kindManuallySet.current = true;
                    setKind(value);
                  }}
                  disabled={disabled}
                  className={cn(
                    "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium",
                    "border transition-all",
                    selected
                      ? "border-current bg-muted/80 shadow-sm"
                      : "border-transparent hover:bg-muted/40 text-muted-foreground"
                  )}
                >
                  <ChipIcon className={cn("h-3.5 w-3.5", selected ? chipColor : "")} />
                  <span>{t(`materials.type.${value}`)}</span>
                  {selected && <Check className="h-3 w-3 ml-0.5" />}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex justify-end gap-2 pt-1">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onCancel}
          disabled={disabled}
        >
          {t("materials.cancel")}
        </Button>
        <Button type="submit" size="sm" disabled={disabled || !hasUrl}>
          {t("materials.save")}
        </Button>
      </div>
    </form>
  );
}

// ============================================================================
// MaterialsEmptyState
// ============================================================================

interface MaterialsEmptyStateProps {
  onAdd: () => void;
  disabled: boolean;
}

function MaterialsEmptyState({ onAdd, disabled }: MaterialsEmptyStateProps) {
  const t = useTranslations("gigpack");

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3 py-8 px-6",
        "rounded-lg border border-dashed border-border/50"
      )}
    >
      <Paperclip className="h-8 w-8 text-muted-foreground/50" />
      <div className="text-center space-y-1">
        <p className="text-sm font-medium text-muted-foreground">
          {t("materials.emptyTitle")}
        </p>
        <p className="text-xs text-muted-foreground/70">
          {t("materials.description")}
        </p>
      </div>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={onAdd}
        disabled={disabled}
        className="mt-1"
      >
        <Plus className="mr-2 h-4 w-4 rtl:ml-2 rtl:mr-0" />
        {t("materials.addFirst")}
      </Button>
    </div>
  );
}
