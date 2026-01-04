"use client";

import React, { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "@/lib/gigpack/i18n";
import { GigPack, GigPackTheme } from "@/lib/gigpack/types";
import { RefreshCw, Eye } from "lucide-react";
import { MinimalLayout } from "@/components/gigpack/layouts/minimal-layout";
// RehearsalView is skipped for now, mapping to MinimalLayout for MVP phase
// import { RehearsalView } from "@/components/gigpack/rehearsal-view";
import { DarkModeToggle as ThemeToggle } from "@/components/layout/dark-mode-toggle";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

class PublicGigPackErrorBoundary extends React.Component<
  { children: React.ReactNode; slug: string },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: React.ReactNode; slug: string }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("[PublicGigPackErrorBoundary] Error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background p-8">
          <div className="max-w-md w-full bg-card border rounded-lg p-6 text-center">
            <h2 className="text-xl font-semibold mb-4 text-destructive">Something went wrong</h2>
            <p className="text-muted-foreground mb-4">
              There was an error loading this gig pack.
            </p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

interface PublicGigPackViewProps {
  initialGigPack: Omit<GigPack, "internal_notes" | "owner_id">;
  slug: string;
  locale?: string;
}

export function PublicGigPackView({ initialGigPack, slug, locale = "en" }: PublicGigPackViewProps) {

  const searchParams = useSearchParams();
  const t = useTranslations("publicView");
  const [gigPack, setGigPack] = useState(initialGigPack);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [isChecking, setIsChecking] = useState(false);
  const [isUserActive, setIsUserActive] = useState(true);

  const [isRehearsalMode, setIsRehearsalMode] = useState(() => {
    const viewParam = searchParams.get("view");
    const modeParam = searchParams.get("mode");
    if (viewParam === "stage" || modeParam === "rehearsal") {
      return true;
    }
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem(`gigpack_rehearsal_mode_${slug}`);
      return stored === "true";
    }
    return false;
  });

  const theme: GigPackTheme = (gigPack.theme || "minimal") as GigPackTheme;

  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem(`gigpack_rehearsal_mode_${slug}`, String(isRehearsalMode));
    }
  }, [isRehearsalMode, slug]);

  // Polling logic omitted for MVP to simplify - data is static from initial props for now
  // unless we implement the polling API endpoint.

  const openMaps = () => {
    if (gigPack.venue_maps_url) {
      window.open(gigPack.venue_maps_url, "_blank");
    }
  };

  return (
    <PublicGigPackErrorBoundary slug={slug}>
    <TooltipProvider>
      <MinimalLayout gigPack={gigPack as GigPack} openMaps={openMaps} slug={slug} locale={locale} />
      
      <div className="fixed top-4 right-4 z-50 flex items-center gap-2">
        <div className="bg-background/80 backdrop-blur-sm rounded-lg border border-border/50 shadow-lg">
        <ThemeToggle />
        </div>
      </div>
      
      <div className="fixed bottom-4 right-4 z-50">
        <div className="bg-card border rounded-lg shadow-lg px-3 py-2 flex items-center gap-2 text-xs text-muted-foreground">
          <span className="hidden sm:inline">
            GigPack
          </span>
        </div>
      </div>
    </TooltipProvider>
    </PublicGigPackErrorBoundary>
  );
}
