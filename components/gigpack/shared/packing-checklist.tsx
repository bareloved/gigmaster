"use client";

import { useState, useEffect, useCallback } from "react";
import { PackingChecklistItem, PackingChecklistState } from "@/lib/types";
import { CheckSquare } from "lucide-react";

interface PackingChecklistProps {
  items: PackingChecklistItem[];
  gigSlug: string;
  accentColor?: string;
  variant?: "minimal" | "vintage" | "social" | "rehearsal";
  // Optional translations - fallback to English defaults when not in i18n context
  translations?: {
    packingChecklist?: string;
    packingChecklistHint?: string;
  };
}

// Default translations (English)
const DEFAULT_TRANSLATIONS = {
  packingChecklist: "Packing checklist",
  packingChecklistHint: "Tick these off as you pack your stuff.",
};

/**
 * PackingChecklist Component
 * 
 * Displays the packing checklist on the public gig page.
 * Stores checked state in localStorage per gig slug.
 * 
 * Features:
 * - Each musician can tick items off on their own device
 * - State persists across page reloads
 * - No auth required
 * - Works across all themes
 */
export function PackingChecklist({ items, gigSlug, accentColor, variant = "minimal", translations }: PackingChecklistProps) {
  const t = (key: keyof typeof DEFAULT_TRANSLATIONS) => 
    translations?.[key] ?? DEFAULT_TRANSLATIONS[key];
  const [checkedState, setCheckedState] = useState<PackingChecklistState>({});
  const [isHydrated, setIsHydrated] = useState(false);

  // localStorage key for this gig
  const storageKey = `gigpack_packing_${gigSlug}`;

  // Load state from localStorage on mount (external system sync)
  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem(storageKey);
        if (stored) {
          const parsed = JSON.parse(stored) as PackingChecklistState;
          // eslint-disable-next-line react-hooks/set-state-in-effect
          setCheckedState(parsed);
        }
      } catch (error) {
        console.error("Error loading packing checklist state:", error);
      }
      setIsHydrated(true);
    }
  }, [storageKey]);

  // Save state to localStorage whenever it changes
  const saveToLocalStorage = useCallback((state: PackingChecklistState) => {
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(storageKey, JSON.stringify(state));
      } catch (error) {
        console.error("Error saving packing checklist state:", error);
      }
    }
  }, [storageKey]);

  // Toggle a checkbox
  const toggleItem = (itemId: string) => {
    const newState = {
      ...checkedState,
      [itemId]: !checkedState[itemId],
    };
    setCheckedState(newState);
    saveToLocalStorage(newState);
  };

  // Don't render until hydrated to avoid mismatch
  if (!isHydrated) {
    return null;
  }

  // Count how many items are checked
  const checkedCount = items.filter(item => checkedState[item.id]).length;
  const allChecked = checkedCount === items.length;

  // Variant-specific styles
  const getContainerClass = () => {
    switch (variant) {
      case "rehearsal":
        return "bg-muted/50 border rounded-xl p-5 md:p-6";
      case "vintage":
        return "bg-background/50 rounded-lg p-4 md:p-6 border-2 border-dashed";
      case "social":
        return "bg-muted/30 rounded-lg p-4 md:p-6";
      default:
        return "p-4 border rounded-lg";
    }
  };

  const getTextClass = () => {
    switch (variant) {
      case "rehearsal":
        return "text-lg md:text-xl font-medium";
      default:
        return "text-sm md:text-base";
    }
  };

  const getCheckboxSize = () => {
    switch (variant) {
      case "rehearsal":
        return "w-6 h-6 md:w-7 md:h-7";
      default:
        return "w-5 h-5";
    }
  };

  return (
    <div className={getContainerClass()}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2 text-xs uppercase tracking-wider font-semibold text-muted-foreground">
          <CheckSquare className="h-3.5 w-3.5" />
          <span>{t("packingChecklist")}</span>
        </div>
        {items.length > 0 && (
          <div className="text-xs text-muted-foreground">
            {checkedCount}/{items.length}
            {allChecked && " ✓"}
          </div>
        )}
      </div>

      {/* Helper Text */}
      <p className="text-xs text-muted-foreground mb-4 italic">
        {t("packingChecklistHint")}
      </p>

      {/* Checklist Items */}
      <div className="space-y-3">
        {items.map((item) => {
          const isChecked = checkedState[item.id] || false;
          
          return (
            <label
              key={item.id}
              className={`flex items-center gap-3 cursor-pointer group transition-opacity ${
                isChecked ? "opacity-60" : ""
              }`}
            >
              {/* Custom Checkbox */}
              <div
                className={`${getCheckboxSize()} flex-shrink-0 rounded border-2 flex items-center justify-center transition-all ${
                  isChecked
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-muted-foreground/40 group-hover:border-primary/60"
                }`}
                style={isChecked && accentColor ? { 
                  backgroundColor: accentColor, 
                  borderColor: accentColor 
                } : {}}
              >
                {isChecked && (
                  <svg
                    className="w-3.5 h-3.5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={3}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                )}
              </div>

              {/* Hidden actual checkbox for accessibility */}
              <input
                type="checkbox"
                checked={isChecked}
                onChange={() => toggleItem(item.id)}
                className="sr-only"
                aria-label={item.label}
              />

              {/* Label */}
              <span className={`${getTextClass()} ${isChecked ? "line-through" : ""}`}>
                {item.label}
              </span>
            </label>
          );
        })}
      </div>
    </div>
  );
}

