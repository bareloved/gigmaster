"use client";

import * as React from "react";
import { useState, useRef } from "react";
import { useTranslations, useLocale } from "@/lib/gigpack/i18n";
import { cn } from "@/lib/utils";
import {
  Mic,
  Star,
  Music,
  Headphones,
  Paperclip,
  Plus,
  MoreHorizontal,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  rehearsal: { icon: Mic, color: "text-primary" },
  performance: { icon: Star, color: "text-secondary" },
  charts: { icon: Music, color: "text-accent" },
  reference: { icon: Headphones, color: "text-[hsl(var(--chart-4))]" },
  other: { icon: Paperclip, color: "text-muted-foreground" },
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
        <p className="text-sm text-muted-foreground">
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
            <PopoverContent className="w-80 p-4" align="start" side="bottom">
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

      {/* Material list */}
      <div className="rounded-lg border bg-card">
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
                <MaterialRow
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
              className="w-80 p-4"
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
        <PopoverContent className="w-80 p-4" align="start" side="bottom">
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
// MaterialRow
// ============================================================================

interface MaterialRowProps {
  material: GigMaterial;
  disabled: boolean;
  onEdit: () => void;
  onRemove: () => void;
  onOpenLink: () => void;
}

function MaterialRow({
  material,
  disabled,
  onEdit,
  onRemove,
  onOpenLink,
}: MaterialRowProps) {
  const t = useTranslations("gigpack");
  const kindConfig = KIND_ICON[material.kind] || KIND_ICON.other;
  const Icon = kindConfig.icon;

  const hostname = (() => {
    if (!material.url) return null;
    try {
      return new URL(material.url).hostname;
    } catch {
      return material.url;
    }
  })();

  return (
    <div
      role="button"
      tabIndex={disabled ? -1 : 0}
      className={cn(
        "group flex items-center gap-3 py-2 px-3 rounded-lg cursor-pointer",
        "hover:bg-muted/50 transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset",
        disabled && "pointer-events-none opacity-60"
      )}
      onClick={(e) => {
        const target = e.target as HTMLElement;
        if (target.closest("[data-material-menu]") || target.closest("[data-material-link]")) {
          return;
        }
        onEdit();
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onEdit();
        }
      }}
    >
      {/* Kind icon */}
      <div className="shrink-0">
        <Icon className={cn("h-5 w-5", kindConfig.color)} />
      </div>

      {/* Label + secondary info */}
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm truncate">
          {material.label || t(`materials.type.${material.kind}`)}
        </p>
        <p className="text-xs text-muted-foreground truncate flex items-center gap-1">
          <span>{t(`materials.type.${material.kind}`)}</span>
          {hostname && (
            <>
              <span className="text-border">·</span>
              {material.url && (
                <button
                  type="button"
                  data-material-link
                  onClick={(e) => {
                    e.stopPropagation();
                    onOpenLink();
                  }}
                  className="inline-flex items-center gap-1 hover:text-foreground transition-colors truncate"
                >
                  <HostingServiceIcon url={material.url} className="h-3 w-3 shrink-0" />
                  <span className="truncate">{hostname}</span>
                </button>
              )}
            </>
          )}
        </p>
      </div>

      {/* Menu button */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            data-material-menu
            className={cn(
              "shrink-0 h-8 w-8 flex items-center justify-center rounded-md",
              "text-muted-foreground hover:text-foreground hover:bg-muted/50",
              "md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100 transition-opacity"
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
  );
}

// ============================================================================
// MaterialFormInner (shared by edit + add popovers)
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
  const locale = useLocale();

  const [label, setLabel] = useState(initial?.label ?? "");
  const [url, setUrl] = useState(initial?.url ?? "");
  const [kind, setKind] = useState<GigMaterialKind>(initial?.kind ?? "rehearsal");
  const kindManuallySet = useRef(!!initial);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation(); // Prevent bubbling to parent gig editor form via React portal
    onSave({
      id: initial?.id ?? crypto.randomUUID(),
      label,
      url,
      kind,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <Input
        value={label}
        onChange={(e) => setLabel(e.target.value)}
        placeholder={t("materials.labelPlaceholder")}
        disabled={disabled}
        autoFocus
      />
      <Select
        value={kind}
        onValueChange={(v: GigMaterialKind) => {
          kindManuallySet.current = true;
          setKind(v);
        }}
        disabled={disabled}
      >
        <SelectTrigger dir={locale === "he" ? "rtl" : "ltr"}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent dir={locale === "he" ? "rtl" : "ltr"}>
          <SelectItem value="rehearsal">{t("materials.type.rehearsal")}</SelectItem>
          <SelectItem value="performance">{t("materials.type.performance")}</SelectItem>
          <SelectItem value="charts">{t("materials.type.charts")}</SelectItem>
          <SelectItem value="reference">{t("materials.type.reference")}</SelectItem>
          <SelectItem value="other">{t("materials.type.other")}</SelectItem>
        </SelectContent>
      </Select>
      <Input
        value={url}
        onChange={(e) => {
          const newUrl = e.target.value;
          setUrl(newUrl);
          if (!label) {
            const parsed = parseNameFromUrl(newUrl);
            if (parsed) setLabel(parsed);
          }
          if (!kindManuallySet.current) {
            const detected = detectKindFromUrl(newUrl);
            if (detected) setKind(detected);
          }
        }}
        placeholder={t("materials.urlPlaceholder")}
        type="url"
        disabled={disabled}
      />
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
        <Button type="submit" size="sm" disabled={disabled}>
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
