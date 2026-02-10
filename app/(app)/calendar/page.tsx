"use client";

import { CalendarView } from "@/components/calendar/calendar-view";
import { useDocumentTitle } from "@/hooks/use-document-title";

export default function CalendarPage() {
  useDocumentTitle("Calendar");
  return (
    <div className="-mx-4 -my-4 sm:-mx-5 sm:-my-5 lg:-mx-6 lg:-my-6 h-[calc(100vh-4rem)] lg:h-[calc(100vh-4rem)]">
      <CalendarView />
    </div>
  );
}
