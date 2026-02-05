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
  Navigation,
  Guitar,
  Piano,
  Mic2,
  Drum,
  Radio,
} from "lucide-react";
import { useState, useMemo } from "react";
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

function getRoleIcon(role: string | null | undefined) {
  if (!role) return Music;
  const r = role.toLowerCase();
  if (r.includes("guitar") || r.includes("bass")) return Guitar;
  if (r.includes("key") || r.includes("piano") || r.includes("organ")) return Piano;
  if (r.includes("vocal") || r.includes("singer") || r.includes("lead")) return Mic2;
  if (r.includes("drum") || r.includes("percussion")) return Drum;
  if (r.includes("dj") || r.includes("track")) return Radio;
  return Music;
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
    <div className="space-y-4 sm:space-y-5 lg:space-y-6">
      {/* Page Header - Concert Poster Energy */}
      <div className="flex items-start justify-between gap-4 pb-2 border-b-4 border-primary/20">
        <div>
          <h1 className="font-display text-2xl sm:text-4xl lg:text-6xl font-bold tracking-tighter uppercase text-foreground">
            Dashboard
          </h1>
          <p className="text-muted-foreground mt-1 sm:mt-2 text-sm sm:text-base lg:text-lg font-medium">Get ready for your next gigs.</p>
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
                className="p-4 sm:p-6 lg:p-8 relative bg-cover bg-center"
                style={{
                  backgroundImage: `linear-gradient(to bottom, hsl(var(--card) / 0.85), hsl(var(--card) / 0.92)), url('${nextGig.heroImageUrl || getGigFallbackImage({ title: nextGig.gigTitle, venue_name: nextGig.locationName, gig_type: nextGig.gigType }, nextGig.gigId)}')`,
                }}
              >
                {/* Card Title + Gig Selector Row */}
                <div className="flex items-center justify-between mb-4 sm:mb-6">
                  <h3 className="font-display text-lg sm:text-2xl lg:text-3xl font-bold tracking-tight text-primary uppercase">
                    {todayGigs.includes(nextGig) ? "Tonight!" : "Next Up"}
                  </h3>
                  {/* Gig Selector */}
                  {allGigs.length > 1 && (
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
                  )}
                </div>

                {/* Header Row - Square date box on all sizes */}
                <div className="flex items-start gap-3 sm:gap-6 mb-4 sm:mb-6">
                  {/* Date Box - Square format on all screen sizes */}
                  <div className="flex flex-shrink-0 flex-col items-center justify-center bg-primary rounded-xl px-2 py-1.5 sm:px-4 sm:py-2 lg:px-5 lg:py-3 min-w-[45px] sm:min-w-[60px] lg:min-w-[80px] shadow-stage text-primary-foreground">
                    <div className="font-mono text-[10px] sm:text-xs lg:text-sm font-bold uppercase tracking-wider">
                      {getWeekdayAndDate(nextGig.date).weekday}
                    </div>
                    <div className="font-display text-xl sm:text-2xl lg:text-4xl font-bold leading-none mt-0.5 sm:mt-1">
                      {format(parseISO(nextGig.date), "d")}
                    </div>
                  </div>

                  {/* Gig Info */}
                  <div className="flex-1 min-w-0">
                    {/* Title row with badge right-aligned */}
                    <div className="flex items-start justify-between gap-2 mb-2 sm:mb-3">
                      <h2 className="flex-1 min-w-0 font-display text-xl sm:text-3xl lg:text-5xl font-bold tracking-tight leading-tight line-clamp-2">{nextGig.gigTitle}</h2>
                      {/* Host/Invited Badge - right aligned with marquee for long names */}
                      {nextGig.isManager ? (
                        <Badge variant="outline" className="shrink-0 mt-0.5 sm:mt-2 px-2 py-0.5 text-[10px] border rounded-md bg-orange-50 border-orange-200 text-orange-700 dark:bg-orange-950 dark:border-orange-800 dark:text-orange-300">
                          <Crown className="h-3 w-3 mr-1 shrink-0" />
                          <span>You</span>
                        </Badge>
                      ) : nextGig.hostName ? (
                        <Badge variant="outline" className="shrink-0 mt-0.5 sm:mt-2 px-0 py-0.5 text-[10px] border rounded-md bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-950 dark:border-blue-800 dark:text-blue-300 max-w-[70px] sm:max-w-[90px] overflow-hidden">
                          <span className="inline-flex items-center gap-1 animate-marquee whitespace-nowrap px-2">
                            <Mail className="h-3 w-3 shrink-0" />
                            {nextGig.hostName}
                          </span>
                        </Badge>
                      ) : null}
                    </div>
                    {/* Location row */}
                    <div className="flex items-center gap-2 sm:gap-4 text-sm sm:text-base flex-wrap font-medium">
                      {nextGig.locationName && (
                        <div className="flex items-center gap-1.5 sm:gap-2">
                          <MapPin className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                          <span className="text-foreground/90 truncate max-w-[200px] sm:max-w-none">{nextGig.locationName}</span>
                          <a
                            href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(nextGig.locationName)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-muted-foreground hover:text-primary transition-colors"
                            title="Google Maps directions"
                          >
                            <Navigation className="h-4 w-4" />
                          </a>
                          <a
                            href={`https://waze.com/ul?q=${encodeURIComponent(nextGig.locationName)}&navigate=yes`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-muted-foreground hover:text-primary transition-colors"
                            title="Waze directions"
                          >
                            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor"><path d="M20.54 6.63A8.99 8.99 0 0 0 12.04 2c-2.4 0-4.6.9-6.28 2.52A8.58 8.58 0 0 0 3.04 11c0 1.42.36 2.78 1.02 4 .28.52.42 1.1.42 1.7v1.3c0 .55.45 1 1 1h1.2c.37 1.16 1.46 2 2.72 2s2.35-.84 2.72-2h1.76c.37 1.16 1.46 2 2.72 2s2.35-.84 2.72-2h1.2c.55 0 1-.45 1-1v-1.3c0-.6.14-1.18.42-1.7a7.94 7.94 0 0 0 1.02-4c0-2.2-.82-4.26-2.42-5.37ZM9.5 12a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3Zm5 0a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3Z"/></svg>
                          </a>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Times & Role - 3 column grid */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-4 mb-4 sm:mb-6 bg-card/50 backdrop-blur-sm rounded-lg sm:rounded-xl p-3 sm:p-4 border border-border/50">
                  {nextGig.callTime && (
                    <div className="flex items-center gap-2 sm:gap-3">
                      <Clock className="h-4 w-4 sm:h-5 sm:w-5 text-secondary" />
                      <div>
                        <div className="text-[10px] sm:text-xs font-medium text-muted-foreground uppercase tracking-wider">Arrival</div>
                        <div className="font-mono text-sm sm:text-lg font-bold">{formatTime(nextGig.callTime)}</div>
                      </div>
                    </div>
                  )}
                  {nextGig.endTime && (
                    <div className="flex items-center gap-2 sm:gap-3">
                      <Clock className="h-4 w-4 sm:h-5 sm:w-5 text-secondary" />
                      <div>
                        <div className="text-[10px] sm:text-xs font-medium text-muted-foreground uppercase tracking-wider">End</div>
                        <div className="font-mono text-sm sm:text-lg font-bold">{formatTime(nextGig.endTime)}</div>
                      </div>
                    </div>
                  )}
                  {nextGig.playerRoleName && (() => {
                    const RoleIcon = getRoleIcon(nextGig.playerRoleName);
                    return (
                    <div className="flex items-center gap-2 sm:gap-3 col-span-2 sm:col-span-1">
                      <RoleIcon className="h-4 w-4 sm:h-5 sm:w-5 text-accent" />
                      <div>
                        <div className="text-[10px] sm:text-xs font-medium text-muted-foreground uppercase tracking-wider">Your Role</div>
                        <div className="font-mono text-sm sm:text-lg font-bold">{nextGig.playerRoleName}</div>
                      </div>
                    </div>
                    );
                  })()}
                </div>

                <Separator className="my-3 sm:my-4" />

                {/* Footer: Actions + Status */}
                <div className="flex items-center justify-between flex-wrap gap-2">
                  {/* Left: Action buttons */}
                  <div className="flex items-center gap-2 flex-wrap">
                    {nextGig.isManager && (
                      <Button
                        variant="default"
                        size="sm"
                        className="gap-1.5 sm:gap-2 h-9 text-xs sm:text-sm"
                        onClick={() => handleEditGig(nextGig.gigId)}
                      >
                        <FileText className="h-4 w-4" />
                        <span className="hidden xs:inline">Edit Gig</span>
                        <span className="xs:hidden">Edit</span>
                      </Button>
                    )}

                    <Link href={`/gigs/${nextGig.gigId}/pack`}>
                      <Button variant={nextGig.isManager ? "outline" : "default"} size="sm" className="gap-1.5 sm:gap-2 h-9 text-xs sm:text-sm">
                        <Briefcase className="h-4 w-4" />
                        <span className="hidden xs:inline">Gig Pack</span>
                        <span className="xs:hidden">Pack</span>
                      </Button>
                    </Link>
                  </div>

                  {/* Right: Status badges */}
                  <div className="flex items-center gap-2 [&_div]:px-2 [&_div]:py-0.5 [&_div]:text-[10px] [&_div]:border [&_div]:rounded-md">
                    <GigStatusBadge status={nextGig.status ?? 'draft'} />
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
          <Card className="min-h-[300px] sm:min-h-[400px] shadow-stage border-2 animate-fade-in">
              <CardHeader className="border-b-2 border-dashed border-border/50 px-4 py-3 sm:px-6 sm:py-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="font-display text-xl sm:text-2xl lg:text-3xl font-bold uppercase tracking-tight">
                    This Week on Stage
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent className="min-h-[200px] sm:min-h-[300px] p-3 sm:p-4 lg:p-6">
                {isLoadingGigs ? (
                  <div className="space-y-3 min-h-[300px]">
                    <Skeleton className="h-24 w-full" />
                    <Skeleton className="h-24 w-full" />
                    <Skeleton className="h-24 w-full" />
                  </div>
                ) : upcomingGigs.length === 0 ? (
                  <div className="text-center py-6 sm:py-8 text-sm text-muted-foreground min-h-[200px] sm:min-h-[300px]">
                    No gigs for this week.
                  </div>
                ) : (
                  <div className="space-y-2 sm:space-y-3 lg:space-y-4">
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
                        <Card className="ticket-card overflow-hidden hover:shadow-stage transition-all duration-300 hover:scale-[1.01] sm:hover:scale-[1.02] border-l-4">
                          <CardContent
                            className="p-2.5 sm:p-3 relative bg-cover bg-center"
                            style={{
                              backgroundImage: `linear-gradient(to right, hsl(var(--card) / 0.92), hsl(var(--card) / 0.85)), url('${gig.heroImageUrl || getGigFallbackImage({ title: gig.gigTitle, venue_name: gig.locationName, gig_type: gig.gigType }, gig.gigId)}')`,
                            }}
                          >
                            <div className="flex items-center gap-2 sm:gap-3">
                              {/* Date badge - compact on mobile */}
                              <div className="flex-shrink-0 flex flex-col items-center justify-center bg-secondary/20 rounded-md sm:rounded-lg px-2 py-1 sm:px-2.5 sm:py-1.5 min-w-[40px] sm:min-w-[50px] border border-secondary/30">
                                <div className="font-mono text-[9px] sm:text-[10px] font-bold text-muted-foreground uppercase">
                                  {getWeekdayAndDate(gig.date).weekday}
                                </div>
                                <div className="font-display text-base sm:text-lg font-bold text-secondary leading-tight">
                                  {getWeekdayAndDate(gig.date).shortDate.split(" ")[1]}
                                </div>
                              </div>

                              {/* Gig Info */}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-1 sm:gap-1.5 mb-0.5">
                                  <h4 className="font-bold text-sm sm:text-base truncate">{gig.gigTitle}</h4>
                                  {gig.isManager ? (
                                    <Badge variant="outline" className="hidden sm:inline-flex gap-0.5 text-[9px] h-4 px-1 py-0 border rounded bg-orange-500/10 border-orange-200/50 text-orange-600 dark:bg-orange-950 dark:border-orange-800/50 dark:text-orange-400 whitespace-nowrap shrink-0">
                                      <Crown className="h-2 w-2" />
                                      You
                                    </Badge>
                                  ) : gig.hostName ? (
                                    <Badge variant="outline" className="hidden sm:inline-flex gap-0.5 text-[9px] h-4 px-1 py-0 border rounded bg-blue-500/10 border-blue-200/50 text-blue-600 dark:bg-blue-950 dark:border-blue-800/50 dark:text-blue-400 whitespace-nowrap shrink-0">
                                      <Mail className="h-2 w-2" />
                                      {gig.hostName}
                                    </Badge>
                                  ) : null}
                                </div>
                                <div className="flex items-center gap-1 sm:gap-1.5 text-[10px] sm:text-xs text-muted-foreground">
                                  {gig.callTime && <span className="font-mono font-medium">{formatTime(gig.callTime)}</span>}
                                  {gig.callTime && gig.locationName && <span className="hidden xs:inline">·</span>}
                                  {gig.locationName && <span className="truncate max-w-[100px] sm:max-w-none">{gig.locationName}</span>}
                                  {gig.playerRoleName && <span className="hidden xs:inline">·</span>}
                                  {gig.playerRoleName && <span className="font-medium whitespace-nowrap hidden xs:inline">{gig.playerRoleName}</span>}
                                </div>
                              </div>

                              {/* Right side: status dot on mobile, full badge on desktop + arrow */}
                              <div className="flex items-center gap-1 sm:gap-2 shrink-0">
                                {/* Mobile: just a colored dot */}
                                <div className="sm:hidden">
                                  <span className={`inline-block w-2 h-2 rounded-full ${
                                    gig.status === 'confirmed' ? 'bg-green-500' :
                                    gig.status === 'cancelled' ? 'bg-red-500' :
                                    gig.status === 'completed' ? 'bg-blue-500' :
                                    'bg-yellow-500'
                                  }`} />
                                </div>
                                {/* Desktop: full badge */}
                                <div className="hidden sm:block [&_div]:px-1.5 [&_div]:py-0 [&_div]:text-[9px] [&_div]:h-4 [&_div]:border [&_div]:rounded">
                                  <GigStatusBadge status={gig.status ?? 'draft'} />
                                </div>
                                <ChevronRight className="h-4 w-4 text-muted-foreground" />
                              </div>
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
