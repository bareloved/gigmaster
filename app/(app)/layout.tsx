"use client";

import { AppSidebar } from "@/components/app-sidebar";
import { AppHeader } from "@/components/app-header";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { useUser } from "@/lib/providers/user-provider";
import { useQueryClient } from "@tanstack/react-query";
import { listUserProjects } from "@/lib/api/projects";
import { useEffect, useState } from "react";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isLoading: isUserLoading, user } = useUser();
  const queryClient = useQueryClient();
  const [isDataPrefetched, setIsDataPrefetched] = useState(false);

  // Prefetch projects data once user is loaded
  // Reset when user changes to force re-prefetch
  useEffect(() => {
    // Reset prefetch flag when user changes
    setIsDataPrefetched(false);

    async function prefetchData() {
      if (isUserLoading) {
        // Still loading user, don't prefetch yet
        return;
      }

      if (!user) {
        // No user (shouldn't happen due to middleware, but be safe)
        setIsDataPrefetched(true);
        return;
      }

      try {
        // Include user.id in query key to prevent cross-user cache pollution
        await queryClient.prefetchQuery({
          queryKey: ["projects", user.id],
          queryFn: listUserProjects,
          staleTime: 1000 * 60 * 5,
        });
      } catch {
        // Unlock UI even if prefetch fails
      } finally {
        setIsDataPrefetched(true);
      }
    }

    prefetchData();
  }, [isUserLoading, user?.id, queryClient]);

  // Show full-screen loading until all data is fetched
  const isLoading = isUserLoading || !isDataPrefetched;

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center space-y-4">
          <div className="flex items-center justify-center gap-2 mb-4">
            <div className="rounded-lg bg-primary p-3">
              <span className="text-3xl">🎵</span>
            </div>
          </div>
          <div className="flex items-center gap-2 justify-center">
            <div className="w-2 h-2 bg-primary rounded-full animate-bounce [animation-delay:-0.3s]"></div>
            <div className="w-2 h-2 bg-primary rounded-full animate-bounce [animation-delay:-0.15s]"></div>
            <div className="w-2 h-2 bg-primary rounded-full animate-bounce"></div>
          </div>
          <p className="text-sm text-muted-foreground">Loading your gig brain...</p>
        </div>
      </div>
    );
  }

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <AppHeader />
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
