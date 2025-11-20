"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ThemeSelector } from "@/components/theme-selector";
import { ProfileForm } from "@/components/profile-form";
import { useUser } from "@/lib/providers/user-provider";

export default function ProfilePage() {
  const { user, profile } = useUser();

  if (!user) {
    return null;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Profile</h2>
        <p className="text-muted-foreground">
          Manage your account settings
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Your Profile</CardTitle>
          <CardDescription>
            Update your personal information
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ProfileForm profile={profile} user={user} />
        </CardContent>
      </Card>

      <ThemeSelector />
    </div>
  );
}
