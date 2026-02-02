"use client";

/**
 * ARTIST-FOCUSED DASHBOARD
 * 
 * Real implementation using existing APIs.
 * Features that work now:
 * - Next Gig Hero with real data
 * - This Week on Stage list with filtering
 * - Band & Changes activity feed (real-time activity log)
 * - Quick actions with keyboard shortcuts
 */

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Music,
  Calendar,
  Clock,
  MapPin,
  Briefcase,
  ChevronRight,
  FileText,
  Plus,
  CheckCircle2,
  ChevronDown,
  Crown,
  Mail,
} from "lucide-react";
import { useState, useMemo } from "react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useUser } from "@/lib/providers/user-provider";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { listDashboardGigs } from "@/lib/api/dashboard-gigs";
import { Skeleton } from "@/components/ui/skeleton";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { format, parseISO } from "date-fns";
import dynamic from "next/dynamic";
import { GigStatusBadge } from "@/components/gigs/shared/status-badge";
import { GigActivityWidget } from "@/components/dashboard/activity-widget";
import { useDashboardKeyboardShortcuts } from "@/hooks/use-dashboard-keyboard-shortcuts";
import { getGig } from "../gigs/actions";
import { AppLoadingScreen } from "@/components/layout/app-loading-screen";
import { getGigFallbackImage } from "@/lib/gigpack/gig-visual-theme";

const GigEditorPanel = dynamic(
  () => import("@/components/gigpack/editor/gig-editor-panel").then((mod) => mod.GigEditorPanel),
  { ssr: false }
);

// ========================================
// HELPER FUNCTIONS
// ========================================

function getInvitationStatusBadge(status: string | null) {
  if (!status) return null;

  switch (status) {
    case "accepted":
      return <Badge variant="default" className="bg-green-500/10 text-green-700 dark:text-green-400 hover:bg-green-500/20">Accepted</Badge>;
    case "invited":
      return <Badge variant="secondary" className="bg-blue-500/10 text-blue-700 dark:text-blue-400">Invited</Badge>;
    case "declined":
      return <Badge variant="destructive">Declined</Badge>;
    case "needs_sub":
      return <Badge variant="destructive">Needs Sub</Badge>;
    case "tentative":
      return <Badge variant="secondary" className="bg-amber-500/10 text-amber-700 dark:text-amber-400">Tentative</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
}

function formatTime(time: string | null): string {
  if (!time) return "";
  // Time comes as HH:MM:SS, we want HH:MM
  return time.substring(0, 5);
}

function getWeekdayAndDate(dateStr: string): { weekday: string; shortDate: string } {
  const date = parseISO(dateStr);
  return {
    weekday: format(date, "EEE").toUpperCase(),
    shortDate: format(date, "MMM d"),
  };
}

// ========================================
// MAIN COMPONENT
// ========================================

export default function DashboardPage() {
  const { user } = useUser();
  const router = useRouter();
  const queryClient = useQueryClient();

  // Gig selector state
  const [selectedGigIndex, setSelectedGigIndex] = useState(0);
  const [gigSelectorOpen, setGigSelectorOpen] = useState(false);

  // Editor state
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingGigId, setEditingGigId] = useState<string | null>(null);

  // Fetch gig data when editing
  const { data: editingGig, isLoading: isLoadingEditingGig } = useQuery({
    queryKey: ["gig-editor", editingGigId],
    queryFn: () => editingGigId ? getGig(editingGigId) : null,
    enabled: !!editingGigId && isEditorOpen,
  });

  const handleEditGig = (gigId: string) => {
    setEditingGigId(gigId);
    setIsEditorOpen(true);
  };

  // Fetch gigs for next 7 days - memoize dates to prevent unnecessary re-renders
  const { today, sevenDaysFromNow } = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const sevenDaysFromNow = new Date(today);
    sevenDaysFromNow.setDate(today.getDate() + 7);
    return { today, sevenDaysFromNow };
  }, []);

  const {
    data: gigsData,
    isLoading: isLoadingGigs,
  } = useQuery({
    queryKey: ["dashboard-gigs", user?.id, today.toISOString(), sevenDaysFromNow.toISOString()],
    queryFn: () => listDashboardGigs(user!.id, {
      from: today,
      to: sevenDaysFromNow,
      limit: 50,
    }),
    enabled: !!user,
    staleTime: 1000 * 60 * 2, // 2 minutes
  });

  // Memoize allGigs to prevent dependency issues
  const allGigs = useMemo(() => gigsData?.gigs || [], [gigsData?.gigs]);

  // Split gigs into today and upcoming
  const { todayGigs, upcomingGigs } = useMemo(() => {
    const todayStr = format(today, "yyyy-MM-dd");

    return {
      todayGigs: allGigs.filter(g => g.date === todayStr),
      upcomingGigs: allGigs.filter(g => g.date > todayStr),
    };
  }, [allGigs, today]);

  // Get next gig (based on selectedGigIndex, or today's first gig, or first upcoming gig)
  const nextGig = useMemo(() => {
    // If user selected a specific gig, use that
    if (selectedGigIndex > 0 && allGigs[selectedGigIndex]) {
      return allGigs[selectedGigIndex];
    }
    // Otherwise, default to next chronological gig
    if (todayGigs.length > 0) return todayGigs[0];
    if (upcomingGigs.length > 0) return upcomingGigs[0];
    return null;
  }, [todayGigs, upcomingGigs, allGigs, selectedGigIndex]);

  // Keyboard shortcuts (G, P, S, F for managers; G only for members)
  useDashboardKeyboardShortcuts(nextGig?.gigId, !!nextGig, nextGig?.isManager ?? false);

  // Show loading screen until all critical data is ready
  const isInitialLoading = isLoadingGigs;

  if (isInitialLoading) {
    return <AppLoadingScreen />;
  }

  return (
    <div className="space-y-6">
      {/* Page Header - Concert Poster Energy */}
      <div className="flex items-start justify-between gap-4 pb-2 border-b-4 border-primary/20">
        <div>
          <h1 className="font-display text-6xl font-bold tracking-tighter uppercase text-foreground">
            Dashboard
          </h1>
          <p className="text-muted-foreground mt-2 text-lg font-medium">Get ready for your next gigs.</p>
        </div>
      </div>

      {/* Two-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* LEFT COLUMN (Main - 2/3 width) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Next Gig Hero Card */}
          {isLoadingGigs ? (
            <Card className="overflow-hidden">
              <CardContent className="p-6 space-y-4">
                <div className="flex items-start gap-4">
                  <Skeleton className="h-20 w-20 rounded-lg" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-8 w-3/4" />
                    <Skeleton className="h-4 w-1/2" />
                    <Skeleton className="h-4 w-2/3" />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <Skeleton className="h-16" />
                  <Skeleton className="h-16" />
                  <Skeleton className="h-16" />
                </div>
                <Skeleton className="h-32 w-full" />
              </CardContent>
            </Card>
          ) : nextGig ? (
            <Card className="overflow-hidden shadow-stage-lg hover:shadow-glow-red transition-all duration-500 border-2 border-primary/20 animate-fade-in">
              <CardContent
                className="p-8 relative bg-cover bg-center"
                style={{
                  backgroundImage: `linear-gradient(to bottom, hsl(var(--card) / 0.85), hsl(var(--card) / 0.92)), url('${nextGig.heroImageUrl || getGigFallbackImage({ title: nextGig.gigTitle, venue_name: nextGig.locationName, gig_type: nextGig.gigType }, nextGig.gigId)}')`,
                }}
              >
                {/* Gig Selector - Top Right Corner */}
                {allGigs.length > 1 && (
                  <div className="absolute top-4 right-4">
                    <Popover open={gigSelectorOpen} onOpenChange={setGigSelectorOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="gap-1 h-7 text-xs"
                        >
                          <Calendar className="h-3 w-3" />
                          <span className="hidden sm:inline">{selectedGigIndex + 1}/{allGigs.length}</span>
                          <ChevronDown className="h-3 w-3" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-80 p-0" align="end">
                        <div>
                          <div className="text-xs font-semibold text-muted-foreground px-4 py-3 border-b">
                            Next 14 Days
                          </div>
                          <ScrollArea className="h-[400px]">
                            <div className="p-2 space-y-1">
                              {allGigs.map((gig, index) => (
                                <button
                                  key={gig.gigId}
                                  onClick={() => {
                                    setSelectedGigIndex(index);
                                    setGigSelectorOpen(false);
                                  }}
                                  className={`w-full text-left px-2 py-2 rounded-md hover:bg-accent transition-colors ${index === selectedGigIndex ? 'bg-accent' : ''
                                    }`}
                                >
                                  <div className="flex items-start justify-between gap-2">
                                    <div className="flex-1 min-w-0">
                                      <div className="font-medium text-sm truncate">{gig.gigTitle}</div>
                                      <div className="text-xs text-muted-foreground">
                                        {format(parseISO(gig.date), "EEE, MMM d")}
                                      </div>
                                    </div>
                                    {index === selectedGigIndex && (
                                      <CheckCircle2 className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
                                    )}
                                  </div>
                                </button>
                              ))}
                            </div>
                          </ScrollArea>
                        </div>
                      </PopoverContent>
                    </Popover>
                  </div>
                )}

                {/* Card Title */}
                <div className="mb-6">
                  <h3 className="font-display text-3xl font-bold tracking-tight text-primary uppercase">
                    {todayGigs.includes(nextGig) ? "Tonight!" : "Next Up"}
                  </h3>
                </div>

                {/* Header Row with Date Pill */}
                <div className="flex items-start gap-6 mb-6 pr-16">
                  {/* Date Pill - Enhanced */}
                  <div className="flex-shrink-0 flex flex-col items-center justify-center bg-primary rounded-xl px-5 py-3 min-w-[80px] shadow-stage text-primary-foreground">
                    <div className="font-mono text-sm font-bold uppercase tracking-wider">
                      {getWeekdayAndDate(nextGig.date).weekday}
                    </div>
                    <div className="font-display text-4xl font-bold leading-none mt-1">
                      {format(parseISO(nextGig.date), "d")}
                    </div>
                  </div>

                  {/* Gig Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 flex-wrap mb-3">
                      <h2 className="font-display text-5xl font-bold tracking-tight leading-tight">{nextGig.gigTitle}</h2>
                      {/* Host/Invited Badge */}
                      {nextGig.isManager ? (
                        <Badge variant="outline" className="bg-orange-50 border-orange-200 text-orange-700 dark:bg-orange-950 dark:border-orange-800 dark:text-orange-300">
                          <Crown className="h-3 w-3 mr-1" />
                          You
                        </Badge>
                      ) : nextGig.hostName ? (
                        <Badge variant="outline" className="bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-950 dark:border-blue-800 dark:text-blue-300">
                          <Mail className="h-3 w-3 mr-1" />
                          {nextGig.hostName}
                        </Badge>
                      ) : null}
                    </div>
                    <div className="flex items-center gap-4 text-base flex-wrap font-medium">
                      {nextGig.locationName && (
                        <div className="flex items-center gap-2">
                          <MapPin className="h-5 w-5 text-primary" />
                          <span className="text-foreground/90">{nextGig.locationName}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Times & Role */}
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6 bg-card/50 backdrop-blur-sm rounded-xl p-4 border border-border/50">
                  {nextGig.startTime && (
                    <div className="flex items-center gap-3">
                      <Clock className="h-5 w-5 text-secondary" />
                      <div>
                        <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Start</div>
                        <div className="font-mono text-lg font-bold">{formatTime(nextGig.startTime)}</div>
                      </div>
                    </div>
                  )}
                  {nextGig.endTime && (
                    <div className="flex items-center gap-3">
                      <Clock className="h-5 w-5 text-secondary" />
                      <div>
                        <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">End</div>
                        <div className="font-mono text-lg font-bold">{formatTime(nextGig.endTime)}</div>
                      </div>
                    </div>
                  )}
                  {nextGig.playerRoleName && (
                    <div className="flex items-center gap-3">
                      <Music className="h-5 w-5 text-accent" />
                      <div>
                        <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Your Role</div>
                        <Badge variant="secondary" className="mt-1 text-sm font-bold">{nextGig.playerRoleName}</Badge>
                      </div>
                    </div>
                  )}
                </div>

                <Separator className="my-4" />

                {/* Footer: Actions + Status */}
                <div className="flex items-center justify-between flex-wrap gap-2">
                  {/* Left: Action buttons */}
                  <div className="flex items-center gap-2">
                    <TooltipProvider>
                      {nextGig.isManager && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="default"
                              size="sm"
                              className="gap-2 group relative"
                              onClick={() => handleEditGig(nextGig.gigId)}
                            >
                              <FileText className="h-4 w-4" />
                              Edit Gig Details
                              <kbd className="hidden group-hover:inline-flex ml-2 pointer-events-none h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100">
                                G
                              </kbd>
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p className="text-xs">Press <kbd className="px-1.5 py-0.5 text-xs font-semibold border rounded">G</kbd> to open</p>
                          </TooltipContent>
                        </Tooltip>
                      )}

                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Link href={`/gigs/${nextGig.gigId}/pack`}>
                            <Button variant={nextGig.isManager ? "outline" : "default"} size="sm" className="gap-2 group relative">
                              <Briefcase className="h-4 w-4" />
                              Open Gig Pack
                              <kbd className="hidden group-hover:inline-flex ml-2 pointer-events-none h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100">
                                P
                              </kbd>
                            </Button>
                          </Link>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="text-xs">Press <kbd className="px-1.5 py-0.5 text-xs font-semibold border rounded">P</kbd> to open</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>

                  {/* Right: Status badges */}
                  <div className="flex items-center gap-2">
                    <GigStatusBadge status={nextGig.status ?? 'draft'} />
                    {nextGig.invitationStatus && getInvitationStatusBadge(nextGig.invitationStatus)}
                  </div>
                </div>

              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="py-12">
                <div className="flex flex-col items-center justify-center text-center">
                  <Calendar className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No upcoming gigs</h3>
                  <p className="text-sm text-muted-foreground max-w-sm mb-4">
                    You don&apos;t have any gigs in the next 7 days.
                  </p>
                  <Button onClick={() => router.push("/gigs/new")} className="gap-2">
                    <Plus className="h-4 w-4" />
                    Create a Gig
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* This Week on Stage - Ticket Style */}
          <Card className="min-h-[400px] shadow-stage border-2 animate-fade-in">
              <CardHeader className="border-b-2 border-dashed border-border/50">
                <div className="flex items-center justify-between">
                  <CardTitle className="font-display text-3xl font-bold uppercase tracking-tight">
                    This Week on Stage
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent className="min-h-[300px] p-6">
                {isLoadingGigs ? (
                  <div className="space-y-3 min-h-[300px]">
                    <Skeleton className="h-24 w-full" />
                    <Skeleton className="h-24 w-full" />
                    <Skeleton className="h-24 w-full" />
                  </div>
                ) : upcomingGigs.length === 0 ? (
                  <div className="text-center py-8 text-sm text-muted-foreground min-h-[300px]">
                    No gigs for this week.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {upcomingGigs.map((gig) => (
                      <div
                        key={gig.gigId}
                        onClick={() => {
                          if (gig.isManager) {
                            handleEditGig(gig.gigId);
                          } else {
                            router.push(`/gigs/${gig.gigId}/pack`);
                          }
                        }}
                        className="cursor-pointer animate-fade-in"
                      >
                        <Card className="ticket-card overflow-hidden hover:shadow-stage transition-all duration-300 hover:scale-[1.02] border-l-4">
                          <CardContent
                            className="p-5 relative bg-cover bg-center"
                            style={{
                              backgroundImage: `linear-gradient(to right, hsl(var(--card) / 0.92), hsl(var(--card) / 0.85)), url('${gig.heroImageUrl || getGigFallbackImage({ title: gig.gigTitle, venue_name: gig.locationName, gig_type: gig.gigType }, gig.gigId)}')`,
                            }}
                          >
                            {/* Gig Status Badge - Top Right */}
                            <div className="absolute top-3 right-3 scale-90 origin-top-right">
                              <GigStatusBadge status={gig.status ?? 'draft'} />
                            </div>

                            <div className="flex items-start gap-4">
                              {/* Date badge - Enhanced */}
                              <div className="flex-shrink-0 flex flex-col items-center justify-center bg-secondary/20 rounded-lg px-3 py-2 min-w-[60px] border-2 border-secondary/30">
                                <div className="font-mono text-xs font-bold text-muted-foreground uppercase">
                                  {getWeekdayAndDate(gig.date).weekday}
                                </div>
                                <div className="font-display text-xl font-bold text-secondary">
                                  {getWeekdayAndDate(gig.date).shortDate.split(" ")[1]}
                                </div>
                              </div>

                              {/* Gig Info */}
                              <div className="flex-1 min-w-0 pr-16">
                                <div className="flex items-center gap-2 flex-wrap mb-1">
                                  <h4 className="font-bold text-lg">{gig.gigTitle}</h4>
                                  {/* Host/Invited Badge */}
                                  {gig.isManager ? (
                                    <Badge variant="outline" className="gap-0.5 text-[10px] h-5 px-1.5 bg-orange-50 border-orange-200 text-orange-700 dark:bg-orange-950 dark:border-orange-800 dark:text-orange-300 whitespace-nowrap">
                                      <Crown className="h-2.5 w-2.5" />
                                      You
                                    </Badge>
                                  ) : gig.hostName ? (
                                    <Badge variant="outline" className="gap-0.5 text-[10px] h-5 px-1.5 bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-950 dark:border-blue-800 dark:text-blue-300 whitespace-nowrap">
                                      <Mail className="h-2.5 w-2.5" />
                                      {gig.hostName}
                                    </Badge>
                                  ) : null}
                                </div>
                                <div className="text-xs text-muted-foreground mb-2">
                                  {gig.locationName}
                                </div>
                                <div className="flex items-center gap-2 flex-wrap">
                                  {gig.playerRoleName && (
                                    <Badge variant="outline" className="text-xs">{gig.playerRoleName}</Badge>
                                  )}
                                  {gig.invitationStatus && getInvitationStatusBadge(gig.invitationStatus)}
                                </div>
                              </div>

                              {/* Arrow */}
                              <ChevronRight className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                            </div>
                          </CardContent>
                        </Card>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
        </div>

        {/* RIGHT COLUMN (Side - 1/3 width) */}
        <div className="space-y-6">
            {/* Band & Changes Activity Feed */}
            <GigActivityWidget
              limit={10}
              showViewAll={true}
            />

          </div>
      </div>

      {/* Gig Editor Sliding Panel */}
      <GigEditorPanel
        mode="sheet"
        open={isEditorOpen}
        loading={isLoadingEditingGig}
        isEditing={!!editingGigId}
        onOpenChange={(open) => {
          setIsEditorOpen(open);
          if (!open) setEditingGigId(null);
        }}
        gigPack={editingGig || undefined}
        onCreateSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ["dashboard-gigs", user?.id] });
          queryClient.invalidateQueries({ queryKey: ["all-gigs", user?.id] });
          setIsEditorOpen(false);
          setEditingGigId(null);
        }}
        onUpdateSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ["dashboard-gigs", user?.id] });
          queryClient.invalidateQueries({ queryKey: ["all-gigs", user?.id] });
          queryClient.invalidateQueries({ queryKey: ["gig-editor", editingGigId] });
        }}
      />
    </div>
  );
}
