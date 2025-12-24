"use client";

import { useState, ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface CollapsibleSectionProps {
  title: string;
  icon?: ReactNode;
  children: ReactNode;
  defaultOpen?: boolean;
  className?: string;
}

/**
 * A collapsible section with animated expand/collapse.
 * Used in forms to keep the UI clean while allowing access to all fields.
 */
export function CollapsibleSection({
  title,
  icon,
  children,
  defaultOpen = true,
  className,
}: CollapsibleSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className={cn("space-y-4", className)}>
      {/* Clickable header */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="gig-section-header w-full justify-between hover:text-primary transition-colors group"
      >
        <div className="flex items-center gap-2">
          {icon}
          <span>{title}</span>
        </div>
        <ChevronDown 
          className={cn(
            "h-4 w-4 transition-transform duration-200",
            isOpen ? "rotate-0" : "-rotate-90"
          )} 
        />
      </button>

      {/* Collapsible content with animation */}
      <div
        className={cn(
          "grid transition-all duration-200 ease-in-out",
          isOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
        )}
      >
        <div className="overflow-hidden">
          {children}
        </div>
      </div>
    </div>
  );
}

