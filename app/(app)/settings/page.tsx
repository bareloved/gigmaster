"use client";

import { useState } from "react";
import { useDocumentTitle } from "@/hooks/use-document-title";
import { useSearchParams, useRouter } from "next/navigation";
import { ProfileTab } from "@/components/settings/profile-tab";
import { GeneralTab } from "@/components/settings/general-tab";
import { CalendarTab } from "@/components/settings/calendar-tab";
import { AccountTab } from "@/components/settings/account-tab";
import { Button } from "@/components/ui/button";
import { UserRound, Globe, CalendarDays, Shield, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";

const NAV_ITEMS = [
  { id: "profile", label: "Profile", icon: UserRound },
  { id: "general", label: "General", icon: Globe },
  { id: "calendar", label: "Calendar", icon: CalendarDays },
  { id: "account", label: "Account", icon: Shield },
] as const;

type TabId = (typeof NAV_ITEMS)[number]["id"];

const VALID_TABS = NAV_ITEMS.map((item) => item.id) as unknown as TabId[];

const TAB_CONTENT: Record<TabId, React.FC> = {
  profile: ProfileTab,
  general: GeneralTab,
  calendar: CalendarTab,
  account: AccountTab,
};

export default function SettingsPage() {
  useDocumentTitle("Settings");
  const searchParams = useSearchParams();
  const router = useRouter();
  const tabParam = searchParams.get("tab");
  const initialTab = VALID_TABS.includes(tabParam as TabId)
    ? (tabParam as TabId)
    : "profile";

  const [activeTab, setActiveTab] = useState<TabId>(initialTab);

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/auth/sign-in");
    router.refresh();
  };

  const ActiveContent = TAB_CONTENT[activeTab];

  return (
    <div className="container max-w-5xl py-8">
      <div className="flex flex-col md:flex-row gap-8">
        {/* Left nav */}
        <nav className="md:w-56 shrink-0">
          <h1 className="text-2xl font-bold mb-6 hidden md:block">Settings</h1>

          {/* Mobile: horizontal scroll */}
          <div className="flex md:hidden gap-1 overflow-x-auto pb-2 -mx-1 px-1">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={cn(
                    "flex items-center gap-2 whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium transition-colors",
                    activeTab === item.id
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </button>
              );
            })}
          </div>

          {/* Desktop: vertical list */}
          <ul className="hidden md:flex flex-col">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              return (
                <li key={item.id}>
                  <button
                    onClick={() => setActiveTab(item.id)}
                    className={cn(
                      "flex w-full items-center gap-3 border-b py-3 text-[15px] transition-colors",
                      activeTab === item.id
                        ? "text-foreground font-semibold border-b-2 border-foreground"
                        : "text-muted-foreground hover:text-foreground border-border"
                    )}
                  >
                    <Icon className="h-[18px] w-[18px]" />
                    {item.label}
                  </button>
                </li>
              );
            })}
          </ul>

          {/* Sign out at bottom of sidebar */}
          <div className="hidden md:block mt-8">
            <Button
              variant="outline"
              className="w-full rounded-full"
              onClick={handleSignOut}
            >
              <LogOut className="h-4 w-4 mr-2" />
              Log Out
            </Button>
          </div>
        </nav>

        {/* Divider */}
        <div className="hidden md:block w-px bg-border" />

        {/* Content */}
        <main className="flex-1 min-w-0">
          <ActiveContent />
        </main>
      </div>
    </div>
  );
}
