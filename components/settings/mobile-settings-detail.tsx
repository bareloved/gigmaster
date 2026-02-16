"use client";

import { ArrowLeft } from "lucide-react";
import { ProfileTab } from "./profile-tab";
import { CalendarTab } from "./calendar-tab";
import { AccountTab } from "./account-tab";

type TabId = "profile" | "calendar" | "account";

const TAB_LABELS: Record<TabId, string> = {
  profile: "Profile",
  calendar: "Calendar",
  account: "Account",
};

const TAB_CONTENT: Record<TabId, React.FC> = {
  profile: ProfileTab,
  calendar: CalendarTab,
  account: AccountTab,
};

interface MobileSettingsDetailProps {
  tab: TabId;
  onBack: () => void;
}

export function MobileSettingsDetail({
  tab,
  onBack,
}: MobileSettingsDetailProps) {
  const Content = TAB_CONTENT[tab];

  return (
    <div>
      <button
        onClick={onBack}
        className="flex items-center gap-2 px-2 py-3 text-sm font-medium text-muted-foreground active:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Settings
      </button>

      <h2 className="px-2 text-2xl font-bold mb-4">{TAB_LABELS[tab]}</h2>

      <Content />
    </div>
  );
}
