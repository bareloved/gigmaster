"use client";

import { SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { DarkModeToggle } from "./dark-mode-toggle";
import { NotificationsDropdown } from "./notifications-dropdown";
import { useUser } from "@/lib/providers/user-provider";
import { getUserInitials } from "@/lib/utils/avatar";
import Link from "next/link";

export function AppHeader() {
  const { user, profile } = useUser();

  return (
    <header className="sticky top-0 z-10 flex h-16 items-center gap-4 border-b bg-background px-4">
      <SidebarTrigger />
      <Separator orientation="vertical" className="h-6" />
      
      <div className="flex-1">
        <h1 className="text-lg font-semibold md:text-xl">Gig Brain</h1>
      </div>
      
      <NotificationsDropdown />
      <DarkModeToggle />
      
      {user && (
        <Link href="/settings">
          <Avatar className="h-8 w-8 cursor-pointer hover:ring-2 hover:ring-offset-2 hover:ring-primary transition-all">
            <AvatarImage src={profile?.avatar_url || undefined} alt={profile?.name || "User"} />
            <AvatarFallback>
              {getUserInitials(profile?.name || null)}
            </AvatarFallback>
          </Avatar>
        </Link>
      )}
    </header>
  );
}
