"use client";

import { ProfileForm } from "@/components/profile/profile-form";
import { useUser } from "@/lib/providers/user-provider";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";

export function ProfileTab() {
  const { user, profile, isLoading } = useUser();

  if (isLoading) {
    return <Skeleton className="h-64 w-full" />;
  }

  if (!user) return null;

  return (
    <Card>
      <CardContent className="pt-6">
        <ProfileForm profile={profile} user={user} />
      </CardContent>
    </Card>
  );
}
