"use client";

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { CalendarSidebar } from "./calendar-sidebar";
import type { CalendarBand } from "@/hooks/use-calendar-bands";
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
}

export function CalendarSidebarSheet({
  open,
  onOpenChange,
  ...sidebarProps
}: CalendarSidebarSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="left" className="w-[280px] p-4 pt-10">
        <SheetHeader className="mb-4">
          <SheetTitle>Calendar</SheetTitle>
        </SheetHeader>
        <CalendarSidebar {...sidebarProps} />
      </SheetContent>
    </Sheet>
  );
}
