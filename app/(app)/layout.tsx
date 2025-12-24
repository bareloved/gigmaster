"use client";

import { TopNav } from "@/components/layout/top-nav";
import { useUser } from "@/lib/providers/user-provider";
import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isLoading: isUserLoading, user } = useUser();
  const router = useRouter();
  const pathname = usePathname();

  // Client-side auth check (fallback in case middleware doesn't catch it)
  useEffect(() => {
    if (!isUserLoading && !user) {
      // User is not authenticated, redirect to sign-in
      const redirectUrl = `/auth/sign-in?redirectTo=${encodeURIComponent(pathname)}`;
      router.push(redirectUrl);
    }
  }, [isUserLoading, user, router, pathname]);

  // Show full-screen loading while user is loading
  const isLoading = isUserLoading;

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
    <div className="min-h-screen bg-background">
      {/* Row 1 - Global App Bar */}
      <TopNav />
      
      {/* Main Content Area */}
      <main className="container mx-auto p-6 max-w-7xl">
        {children}
      </main>
    </div>
  );
}
