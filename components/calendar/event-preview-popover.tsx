"use client";

import { useRef, useEffect } from "react";
import { DashboardGigItemGrid } from "@/components/dashboard/gig-item-grid";
import type { DashboardGig } from "@/lib/types/shared";

interface EventPreviewPopoverProps {
  gig: DashboardGig;
  color: string;
  anchorRect: DOMRect;
  onClose: () => void;
}

export function EventPreviewPopover({
  gig,
  color,
  anchorRect,
  onClose,
}: EventPreviewPopoverProps) {
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click / escape
  // Skip clicks inside Radix portals (DropdownMenu, Dialogs, etc.)
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      const target = e.target as HTMLElement;
      if (ref.current && ref.current.contains(target)) return;
      if (target.closest("[data-radix-popper-content-wrapper]")) return;
      if (target.closest("[role='dialog']")) return;
      // Let calendar event clicks pass through to the toggle handler
      if (target.closest("[data-calendar-event]")) return;
      onClose();
    }
    function handleEscape(e: KeyboardEvent) {
      if (e.key !== "Escape") return;
      const openPortal = document.querySelector(
        "[data-radix-popper-content-wrapper] [data-state='open']"
      );
      if (openPortal) return;
      onClose();
    }
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [onClose]);

  // Position: LEFT of anchor, flip right if no space
  const popoverWidth = 340;
  const popoverHeight = 320;
  let top = anchorRect.top;
  let left = anchorRect.left - popoverWidth - 12;

  if (left < 8) {
    left = anchorRect.right + 12;
  }

  if (left + popoverWidth > window.innerWidth - 8) {
    left = window.innerWidth - popoverWidth - 8;
  }

  if (top + popoverHeight > window.innerHeight - 8) {
    top = window.innerHeight - popoverHeight - 8;
  }
  if (top < 8) top = 8;

  return (
    <div
      ref={ref}
      className="fixed z-[70] w-[340px] animate-in fade-in-0 zoom-in-95"
      style={{ top, left }}
    >
      {/* The actual gig card — same grid card as /gigs page */}
      <DashboardGigItemGrid
        gig={gig}
        returnUrl="/calendar"
      />
    </div>
  );
}
