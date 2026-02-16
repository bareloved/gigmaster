"use client";

import { useRouter } from "next/navigation";
import { useUser } from "@/lib/providers/user-provider";
import { useTheme } from "@/lib/providers/theme-provider";
import { createClient } from "@/lib/supabase/client";
import { SettingsRow } from "./settings-row";
import { Switch } from "@/components/ui/switch";
import {
  UserRound,
  SunMoon,
  CalendarDays,
  Shield,
  LogOut,
} from "lucide-react";

type TabId = "profile" | "calendar" | "account";

interface MobileSettingsListProps {
  onSelectTab: (tab: TabId) => void;
  calendarConnected?: boolean;
}

export function MobileSettingsList({
  onSelectTab,
  calendarConnected,
}: MobileSettingsListProps) {
  const { user } = useUser();
  const { mode, setMode } = useTheme();
  const router = useRouter();

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/auth/sign-in");
    router.refresh();
  };

  return (
    <div className="px-2">
      {/* User email chip */}
      {user?.email && (
        <div className="mb-4 rounded-lg bg-muted px-4 py-3">
          <span className="text-sm text-foreground">{user.email}</span>
        </div>
      )}

      {/* Group 1: Personal */}
      <div className="mb-2">
        <SettingsRow
          icon={UserRound}
          label="Profile"
          onClick={() => onSelectTab("profile")}
        />
        <SettingsRow icon={SunMoon} label="Dark mode">
          <Switch
            checked={mode === "dark"}
            onCheckedChange={(checked) => setMode(checked ? "dark" : "light")}
          />
        </SettingsRow>
      </div>

      <div className="mx-2 border-t" />

      {/* Group 2: Integrations */}
      <div className="my-2">
        <SettingsRow
          icon={CalendarDays}
          label="Calendar"
          value={calendarConnected ? "Connected" : undefined}
          onClick={() => onSelectTab("calendar")}
        />
      </div>

      <div className="mx-2 border-t" />

      {/* Group 3: Account */}
      <div className="mt-2">
        <SettingsRow
          icon={Shield}
          label="Account"
          onClick={() => onSelectTab("account")}
        />
        <SettingsRow
          icon={LogOut}
          label="Log Out"
          onClick={handleSignOut}
          destructive
        />
      </div>
    </div>
  );
}
