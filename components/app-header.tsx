"use client";

import { SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { DarkModeToggle } from "./dark-mode-toggle";
import { NotificationsDropdown } from "./notifications-dropdown";

export function AppHeader() {
  return (
    <header className="sticky top-0 z-10 flex h-16 items-center gap-4 border-b bg-background px-4">
      <SidebarTrigger />
      <Separator orientation="vertical" className="h-6" />
      
      <div className="flex-1">
        <h1 className="text-lg font-semibold md:text-xl">Gig Brain</h1>
      </div>
      
      <NotificationsDropdown />
      <DarkModeToggle />
    </header>
  );
}
