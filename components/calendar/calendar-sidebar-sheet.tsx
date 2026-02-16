"use client";

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetDescription,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { CalendarSidebar } from "./calendar-sidebar";
import type { CalendarBand } from "@/hooks/use-calendar-bands";
import type { CalendarViewType } from "./calendar-toolbar";
import type { DashboardGig } from "@/lib/types/shared";

interface CalendarSidebarSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentDate: Date;
  onDateSelect: (date: Date) => void;
  bands: CalendarBand[];
  gigs: DashboardGig[];
  search: string;
  onSearchChange: (value: string) => void;
  hiddenBandIds: Set<string>;
  onToggleBand: (bandId: string) => void;
  isPersonalHidden: boolean;
  onTogglePersonal: () => void;
  viewType: CalendarViewType;
  onViewChange: (view: CalendarViewType) => void;
  onImport?: () => void;
}

export function CalendarSidebarSheet({
  open,
  onOpenChange,
  viewType,
  onViewChange,
  onImport,
  ...sidebarProps
}: CalendarSidebarSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="left" className="w-[280px] p-4 pt-10">
        <SheetHeader className="mb-4">
          <SheetTitle>Calendar</SheetTitle>
          <SheetDescription className="sr-only">Calendar view options and band filters</SheetDescription>
        </SheetHeader>

        {/* View toggle + Import */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center rounded-lg border bg-muted p-0.5">
            <Button
              variant={viewType === "3day" ? "default" : "ghost"}
              size="sm"
              className="h-7 text-xs"
              onClick={() => { onViewChange("3day"); onOpenChange(false); }}
            >
              3 Day
            </Button>
            <Button
              variant={viewType === "week" ? "default" : "ghost"}
              size="sm"
              className="h-7 text-xs"
              onClick={() => { onViewChange("week"); onOpenChange(false); }}
            >
              Week
            </Button>
            <Button
              variant={viewType === "month" ? "default" : "ghost"}
              size="sm"
              className="h-7 text-xs"
              onClick={() => { onViewChange("month"); onOpenChange(false); }}
            >
              Month
            </Button>
          </div>
          {onImport && (
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => { onImport(); onOpenChange(false); }}
            >
              <Download className="h-4 w-4" />
            </Button>
          )}
        </div>

        <CalendarSidebar {...sidebarProps} />
      </SheetContent>
    </Sheet>
  );
}
