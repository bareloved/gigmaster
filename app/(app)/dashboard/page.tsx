"use client";

/**
 * ARTIST-FOCUSED DASHBOARD
 * 
 * Real implementation using existing APIs.
 * Features that work now:
 * - Next Gig Hero with real data + Readiness tracking (interactive!)
 * - This Week on Stage list with filtering
 * - Practice Focus widget (shows songs to learn from upcoming gigs)
 * - Band & Changes activity feed (real-time activity log)
 * - Money Snapshot from player-money API
 * - Focus Mode (UI only)
 * - Quick actions with keyboard shortcuts
 */

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
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
  Euro,
  ChevronRight,
  Eye,
  EyeOff,
  FileText,
  PlayCircle,
  Plus,
  CheckCircle2,
  AlertTriangle,
  Circle,
  ChevronDown,
  ChevronUp,
  Zap,
  Crown,
  Mail,
} from "lucide-react";
import { useState, useMemo, useEffect } from "react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useUser } from "@/lib/providers/user-provider";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { listDashboardGigs, type DashboardGig } from "@/lib/api/dashboard-gigs";
import { getPlayerMoneySummary } from "@/lib/api/player-money";
import { getGigReadiness, updateGigReadiness, calculateReadinessScore, getOrCreateGigReadiness } from "@/lib/api/gig-readiness";
import type { ReadinessScore } from "@/lib/types/shared";
import { Skeleton } from "@/components/ui/skeleton";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { format, parseISO, startOfWeek, endOfWeek, isWithinInterval } from "date-fns";
import dynamic from "next/dynamic";
import { GigStatusBadge } from "@/components/gigs/shared/status-badge";
import { PracticeFocusWidget } from "@/components/dashboard/practice-widget";
import { GigActivityWidget } from "@/components/dashboard/activity-widget";
import { DashboardKPICards } from "@/components/dashboard/kpi-cards";
import { fetchDashboardKPIs, updateLastVisit, getLastVisit } from "@/lib/api/dashboard-kpis";
import { useFocusMode } from "@/hooks/use-focus-mode";
import { useDashboardFilters } from "@/hooks/use-dashboard-filters";
import { useDashboardKeyboardShortcuts } from "@/hooks/use-dashboard-keyboard-shortcuts";

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
  
  // UI State - with localStorage persistence
  const [focusMode, setFocusMode] = useFocusMode(user?.id);
  const [roleFilter, setRoleFilter] = useDashboardFilters(user?.id);
  const [showReadinessBreakdown, setShowReadinessBreakdown] = useState(false);
  
  // Gig selector state
  const [selectedGigIndex, setSelectedGigIndex] = useState(0);
  const [gigSelectorOpen, setGigSelectorOpen] = useState(false);

  // Fetch gigs for next 7 days
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const sevenDaysFromNow = new Date(today);
  sevenDaysFromNow.setDate(today.getDate() + 7);

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

  // Fetch money summary for this month
  const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const lastDayOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);

  const {
    data: moneySummary,
    isLoading: isLoadingMoney,
  } = useQuery({
    queryKey: ["player-money-summary", user?.id, firstDayOfMonth.toISOString(), lastDayOfMonth.toISOString()],
    queryFn: () => getPlayerMoneySummary(user!.id, {
      from: format(firstDayOfMonth, "yyyy-MM-dd"),
      to: format(lastDayOfMonth, "yyyy-MM-dd"),
    }),
    enabled: !!user,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  // Fetch dashboard KPIs
  const {
    data: dashboardKPIs,
    isLoading: isLoadingKPIs,
  } = useQuery({
    queryKey: ["dashboard-kpis", user?.id],
    queryFn: () => {
      // Get last visit from localStorage
      const lastVisitStr = typeof window !== 'undefined' 
        ? localStorage.getItem(`dashboard_last_visit_${user!.id}`)
        : null;
      const lastVisit = lastVisitStr ? new Date(lastVisitStr) : undefined;
      
      return fetchDashboardKPIs(lastVisit);
    },
    enabled: !!user,
    staleTime: 1000 * 60 * 2, // 2 minutes
  });

  // Update last visit timestamp on mount
  useEffect(() => {
    if (user) {
      updateLastVisit();
    }
  }, [user]);

  const allGigs = gigsData?.gigs || [];

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
  
  // Reset to next gig function
  const resetToNextGig = () => {
    setSelectedGigIndex(0);
  };

  // Fetch readiness for next gig
  const {
    data: readiness,
    isLoading: isLoadingReadiness,
  } = useQuery({
    queryKey: ["gig-readiness", nextGig?.gigId, user?.id],
    queryFn: () => getGigReadiness(nextGig!.gigId, user!.id),
    enabled: !!nextGig && !!user,
    staleTime: 1000 * 60 * 2, // 2 minutes
  });

  // Calculate readiness score
  const readinessScore: ReadinessScore = useMemo(() => {
    return calculateReadinessScore(readiness ?? null);
  }, [readiness]);

  // Mutation to update readiness
  const updateReadinessMutation = useMutation({
    mutationFn: async (updates: { field: string; value: boolean | number }) => {
      if (!nextGig || !user) throw new Error("No gig or user");
      
      // If no readiness exists yet, create it first
      if (!readiness) {
        await getOrCreateGigReadiness(nextGig.gigId, user.id, 0);
      }
      
      const updateData: any = {};
      updateData[updates.field] = updates.value;
      
      return updateGigReadiness(nextGig.gigId, user.id, updateData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["gig-readiness", nextGig?.gigId, user?.id] });
    },
  });

  // Filter gigs by role
  const filteredGigs = useMemo(() => {
    if (roleFilter === "all") return upcomingGigs;
    if (roleFilter === "hosted") return upcomingGigs.filter(g => g.isManager);
    if (roleFilter === "playing") return upcomingGigs.filter(g => g.isPlayer && !g.isManager);
    if (roleFilter === "subbing") return upcomingGigs.filter(g => g.invitationStatus === "needs_sub");
    if (roleFilter === "md") return upcomingGigs.filter(g => g.playerRoleName?.toLowerCase().includes("md"));
    return upcomingGigs;
  }, [upcomingGigs, roleFilter]);

  // Keyboard shortcuts (G, P, S, F)
  useDashboardKeyboardShortcuts(nextGig?.gigId, !!nextGig);

  return (
    <div className="space-y-6">
      {/* Page Header with Focus Mode Toggle */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground mt-1">Get ready for your next gigs.</p>
        </div>
        
        {/* Focus Mode Toggle */}
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={focusMode ? "default" : "outline"}
                size="sm"
                onClick={() => setFocusMode(!focusMode)}
                className="gap-2"
              >
                {focusMode ? (
                  <>
                    <EyeOff className="h-4 w-4" />
                    Exit Focus
                  </>
                ) : (
                  <>
                    <Eye className="h-4 w-4" />
                    Focus Mode
                  </>
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p className="text-xs">Hide distractions - show only Next Gig</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      {/* Focus Mode Active Indicator */}
      {focusMode && (
        <Card className="bg-primary/5 border-primary/20 animate-in fade-in slide-in-from-top-2 duration-300">
          <CardContent className="py-3 px-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm">
                <Eye className="h-4 w-4 text-primary animate-pulse" />
                <span className="font-medium">Focus Mode Active</span>
                <span className="text-muted-foreground">• Showing only Next Gig</span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setFocusMode(false)}
                className="h-7 text-xs hover:bg-primary/10 transition-colors"
              >
                Exit
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Top KPI Cards - Hidden in Focus Mode */}
      {!focusMode && (
        <DashboardKPICards kpis={dashboardKPIs ?? null} isLoading={isLoadingKPIs} />
      )}

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
            <Card className="overflow-hidden hover:shadow-lg transition-shadow duration-200">
              <CardContent className="p-6 relative">
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
                                  className={`w-full text-left px-2 py-2 rounded-md hover:bg-accent transition-colors ${
                                    index === selectedGigIndex ? 'bg-accent' : ''
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
                <div className="mb-4">
                  <h3 className="text-lg font-semibold text-muted-foreground">
                    {todayGigs.includes(nextGig) ? "Today's Gig" : "Next Gig"}
                  </h3>
                </div>

                {/* Header Row with Date Pill */}
                <div className="flex items-start gap-4 mb-4 pr-16">
                  {/* Date Pill */}
                  <div className="flex-shrink-0 flex flex-col items-center justify-center bg-primary/10 rounded-lg px-3 py-2 min-w-[60px]">
                    <div className="text-xs font-medium text-muted-foreground uppercase">
                      {getWeekdayAndDate(nextGig.date).weekday}
                    </div>
                    <div className="text-xl font-bold">
                      {format(parseISO(nextGig.date), "d")}
                    </div>
                  </div>
                  
                  {/* Gig Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-2">
                      <h2 className="text-2xl font-bold">{nextGig.gigTitle}</h2>
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
                    <div className="flex items-center gap-4 text-sm flex-wrap">
                      {nextGig.locationName && (
                        <div className="flex items-center gap-1.5">
                          <MapPin className="h-4 w-4 text-muted-foreground" />
                          <span>{nextGig.locationName}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Times & Role */}
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4">
                  {nextGig.startTime && (
                    <div className="flex items-center gap-2 text-sm">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <div className="text-xs text-muted-foreground">Start Time</div>
                        <div className="font-medium">{formatTime(nextGig.startTime)}</div>
                      </div>
                    </div>
                  )}
                  {nextGig.endTime && (
                    <div className="flex items-center gap-2 text-sm">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <div className="text-xs text-muted-foreground">End Time</div>
                        <div className="font-medium">{formatTime(nextGig.endTime)}</div>
                      </div>
                    </div>
                  )}
                  {nextGig.playerRoleName && (
                    <div className="flex items-center gap-2 text-sm">
                      <Music className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <div className="text-xs text-muted-foreground">Your Role</div>
                        <Badge variant="secondary" className="mt-0.5">{nextGig.playerRoleName}</Badge>
                      </div>
                    </div>
                  )}
                </div>

                <Separator className="my-4" />

                {/* Quick Actions with Keyboard Shortcuts */}
                <div className="flex flex-wrap gap-2 mb-2">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Link href={`/gigs/${nextGig.gigId}`}>
                          <Button variant="default" size="sm" className="gap-2 group relative">
                            <FileText className="h-4 w-4" />
                            View Gig Details
                            <kbd className="hidden group-hover:inline-flex ml-2 pointer-events-none h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100">
                              G
                            </kbd>
                          </Button>
                        </Link>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="text-xs">Press <kbd className="px-1.5 py-0.5 text-xs font-semibold border rounded">G</kbd> to open</p>
                      </TooltipContent>
                    </Tooltip>
                    
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Link href={`/gigs/${nextGig.gigId}/pack`}>
                          <Button variant="outline" size="sm" className="gap-2 group relative">
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
                    
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Link href={`/gigs/${nextGig.gigId}?tab=setlist`}>
                          <Button variant="outline" size="sm" className="gap-2 group relative">
                            <Music className="h-4 w-4" />
                            Open Setlist
                            <kbd className="hidden group-hover:inline-flex ml-2 pointer-events-none h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100">
                              S
                            </kbd>
                          </Button>
                        </Link>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="text-xs">Press <kbd className="px-1.5 py-0.5 text-xs font-semibold border rounded">S</kbd> to open</p>
                      </TooltipContent>
                    </Tooltip>
                    
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Link href={`/gigs/${nextGig.gigId}?tab=resources`}>
                          <Button variant="outline" size="sm" className="gap-2 group relative">
                            <FileText className="h-4 w-4" />
                            Charts & Files
                            <kbd className="hidden group-hover:inline-flex ml-2 pointer-events-none h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100">
                              F
                            </kbd>
                          </Button>
                        </Link>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="text-xs">Press <kbd className="px-1.5 py-0.5 text-xs font-semibold border rounded">F</kbd> to open</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>

                {/* Status Badges */}
                <div className="flex items-center gap-2 mt-4">
                  <GigStatusBadge status={nextGig.status ?? 'draft'} />
                  {nextGig.invitationStatus && getInvitationStatusBadge(nextGig.invitationStatus)}
                  {nextGig.paymentStatus === "paid" && (
                    <Badge variant="default" className="bg-green-500/10 text-green-700 dark:text-green-400 hover:bg-green-500/20">
                      Paid
                    </Badge>
                  )}
                  {nextGig.paymentStatus === "unpaid" && (
                    <Badge variant="outline" className="border-amber-500/30 text-amber-600 dark:text-amber-400">
                      Unpaid
                    </Badge>
                  )}
                </div>

                <Separator className="my-4" />

                {/* Readiness Section */}
                {isLoadingReadiness ? (
                  <div className="space-y-3">
                    <Skeleton className="h-6 w-48" />
                    <Skeleton className="h-3 w-full" />
                    <Skeleton className="h-20 w-full" />
                  </div>
                ) : (
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-sm font-semibold flex items-center gap-2">
                        <Zap className="h-4 w-4 text-primary" />
                        Prep Checklist
                      </h3>
                      <div className="flex items-center gap-2">
                        <span className="text-lg font-bold">{readinessScore.overall}%</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0"
                          onClick={() => setShowReadinessBreakdown(!showReadinessBreakdown)}
                        >
                          {showReadinessBreakdown ? (
                            <ChevronUp className="h-4 w-4" />
                          ) : (
                            <ChevronDown className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </div>
                    
                    {/* Segmented Progress Bar */}
                    <div className="relative mb-2">
                      <div className="flex h-3 w-full overflow-hidden rounded-full bg-secondary">
                        {/* Songs segment - 40% of total width */}
                        <div 
                          className="bg-blue-500 transition-all duration-300"
                          style={{ width: `${(readinessScore.songs / 100) * 40}%` }}
                          title={`Songs: ${readinessScore.songs}%`}
                        />
                        {/* Charts segment - 15% of total width */}
                        <div 
                          className="bg-green-500 transition-all duration-300"
                          style={{ width: `${(readinessScore.charts / 100) * 15}%` }}
                          title={`Charts: ${readinessScore.charts}%`}
                        />
                        {/* Sounds segment - 15% of total width */}
                        <div 
                          className="bg-purple-500 transition-all duration-300"
                          style={{ width: `${(readinessScore.sounds / 100) * 15}%` }}
                          title={`Sounds: ${readinessScore.sounds}%`}
                        />
                        {/* Travel segment - 15% of total width */}
                        <div 
                          className="bg-amber-500 transition-all duration-300"
                          style={{ width: `${(readinessScore.travel / 100) * 15}%` }}
                          title={`Travel: ${readinessScore.travel}%`}
                        />
                        {/* Gear segment - 15% of total width */}
                        <div 
                          className="bg-emerald-500 transition-all duration-300"
                          style={{ width: `${(readinessScore.gear / 100) * 15}%` }}
                          title={`Gear: ${readinessScore.gear}%`}
                        />
                      </div>
                    </div>
                    
                    {/* Breakdown Legend (only when expanded) */}
                    {showReadinessBreakdown && (
                      <div className="mb-4 p-3 bg-muted/50 rounded-lg space-y-2 animate-in fade-in slide-in-from-top-1 duration-200">
                        <p className="text-xs font-semibold text-muted-foreground mb-2">Breakdown by Category:</p>
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div className="flex items-center gap-2 transition-transform hover:scale-105">
                            <div className="h-3 w-3 rounded-full bg-blue-500" />
                            <span>Songs: {readinessScore.songs}%</span>
                          </div>
                          <div className="flex items-center gap-2 transition-transform hover:scale-105">
                            <div className="h-3 w-3 rounded-full bg-green-500" />
                            <span>Charts: {readinessScore.charts}%</span>
                          </div>
                          <div className="flex items-center gap-2 transition-transform hover:scale-105">
                            <div className="h-3 w-3 rounded-full bg-purple-500" />
                            <span>Sounds: {readinessScore.sounds}%</span>
                          </div>
                          <div className="flex items-center gap-2 transition-transform hover:scale-105">
                            <div className="h-3 w-3 rounded-full bg-amber-500" />
                            <span>Travel: {readinessScore.travel}%</span>
                          </div>
                          <div className="flex items-center gap-2 transition-transform hover:scale-105">
                            <div className="h-3 w-3 rounded-full bg-emerald-500" />
                            <span>Gear: {readinessScore.gear}%</span>
                          </div>
                        </div>
                        <p className="text-xs text-muted-foreground mt-2 pt-2 border-t">
                          💡 Click items below to mark as complete
                        </p>
                      </div>
                    )}
                    
                    <div className="space-y-2.5">
                      {/* Songs */}
                      <button
                        onClick={() => {
                          if (!readiness) {
                            // Create initial readiness if it doesn't exist
                            updateReadinessMutation.mutate({ field: 'songsLearned', value: 0 });
                          }
                        }}
                        className="w-full flex items-center gap-2.5 text-left hover:bg-muted/50 rounded p-1.5 transition-all duration-200 hover:scale-[1.01] active:scale-[0.99]"
                        disabled={updateReadinessMutation.isPending}
                      >
                        {readiness?.songsLearned === readiness?.songsTotal && (readiness?.songsTotal ?? 0) > 0 ? (
                          <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0" />
                        ) : (
                          <AlertTriangle className="h-5 w-5 text-amber-500 flex-shrink-0" />
                        )}
                        <div className="flex-1 text-sm">
                          Songs learned: <span className="font-medium">
                            {readiness ? `${readiness.songsLearned} / ${readiness.songsTotal}` : '0 / 0'}
                          </span>
                        </div>
                      </button>

                      {/* Charts */}
                      <button
                        onClick={() => updateReadinessMutation.mutate({ 
                          field: 'chartsReady', 
                          value: !readiness?.chartsReady 
                        })}
                        className="w-full flex items-center gap-2.5 text-left hover:bg-muted/50 rounded p-1.5 transition-all duration-200 hover:scale-[1.01] active:scale-[0.99]"
                        disabled={updateReadinessMutation.isPending}
                      >
                        {readiness?.chartsReady ? (
                          <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0" />
                        ) : (
                          <Circle className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                        )}
                        <div className="flex-1 text-sm">
                          Charts attached: <span className="font-medium">
                            {readiness?.chartsReady ? 'All songs' : 'Not ready'}
                          </span>
                        </div>
                      </button>

                      {/* Sounds */}
                      <button
                        onClick={() => updateReadinessMutation.mutate({ 
                          field: 'soundsReady', 
                          value: !readiness?.soundsReady 
                        })}
                        className="w-full flex items-center gap-2.5 text-left hover:bg-muted/50 rounded p-1.5 transition-all duration-200 hover:scale-[1.01] active:scale-[0.99]"
                        disabled={updateReadinessMutation.isPending}
                      >
                        {readiness?.soundsReady ? (
                          <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0" />
                        ) : (
                          <AlertTriangle className="h-5 w-5 text-amber-500 flex-shrink-0" />
                        )}
                        <div className="flex-1 text-sm">
                          Sounds programmed in rig: <span className="font-medium">
                            {readiness?.soundsReady ? 'Ready' : 'Not ready'}
                          </span>
                        </div>
                      </button>

                      {/* Travel */}
                      <button
                        onClick={() => updateReadinessMutation.mutate({ 
                          field: 'travelChecked', 
                          value: !readiness?.travelChecked 
                        })}
                        className="w-full flex items-center gap-2.5 text-left hover:bg-muted/50 rounded p-1.5 transition-all duration-200 hover:scale-[1.01] active:scale-[0.99]"
                        disabled={updateReadinessMutation.isPending}
                      >
                        {readiness?.travelChecked ? (
                          <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0" />
                        ) : (
                          <Circle className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                        )}
                        <div className="flex-1 text-sm">
                          Travel plan checked: <span className="font-medium">
                            {readiness?.travelChecked ? 'Done' : 'Not yet'}
                          </span>
                        </div>
                      </button>

                      {/* Gear */}
                      <button
                        onClick={() => updateReadinessMutation.mutate({ 
                          field: 'gearPacked', 
                          value: !readiness?.gearPacked 
                        })}
                        className="w-full flex items-center gap-2.5 text-left hover:bg-muted/50 rounded p-1.5 transition-all duration-200 hover:scale-[1.01] active:scale-[0.99]"
                        disabled={updateReadinessMutation.isPending}
                      >
                        {readiness?.gearPacked ? (
                          <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0" />
                        ) : (
                          <Circle className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                        )}
                        <div className="flex-1 text-sm">
                          Gear checklist: <span className="font-medium">
                            {readiness?.gearPacked ? 'Packed' : 'Not packed'}
                          </span>
                        </div>
                      </button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="py-12">
                <div className="flex flex-col items-center justify-center text-center">
                  <Calendar className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No upcoming gigs</h3>
                  <p className="text-sm text-muted-foreground max-w-sm mb-4">
                    You don't have any gigs in the next 7 days.
                  </p>
                  <Button onClick={() => router.push("/gigs/new")} className="gap-2">
                    <Plus className="h-4 w-4" />
                    Create a Gig
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* This Week on Stage - Hidden in Focus Mode */}
          {!focusMode && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-xl">This Week on Stage</CardTitle>
                </div>
                {/* Filter Chips */}
                <div className="flex flex-wrap gap-2 mt-3">
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground mr-2">
                    Role:
                  </div>
                  <Button
                    variant={roleFilter === "all" ? "default" : "outline"}
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => setRoleFilter("all")}
                  >
                    All
                  </Button>
                  <Button
                    variant={roleFilter === "hosted" ? "default" : "outline"}
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => setRoleFilter("hosted")}
                  >
                    Hosted
                  </Button>
                  <Button
                    variant={roleFilter === "playing" ? "default" : "outline"}
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => setRoleFilter("playing")}
                  >
                    Playing
                  </Button>
                  <Button
                    variant={roleFilter === "subbing" ? "default" : "outline"}
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => setRoleFilter("subbing")}
                  >
                    Subbing
                  </Button>
                  <Button
                    variant={roleFilter === "md" ? "default" : "outline"}
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => setRoleFilter("md")}
                  >
                    MD
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {isLoadingGigs ? (
                  <div className="space-y-3">
                    <Skeleton className="h-24 w-full" />
                    <Skeleton className="h-24 w-full" />
                    <Skeleton className="h-24 w-full" />
                  </div>
                ) : filteredGigs.length === 0 ? (
                  <div className="text-center py-8 text-sm text-muted-foreground">
                    No gigs match your current filters.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {filteredGigs.map((gig) => (
                      <Link key={gig.gigId} href={`/gigs/${gig.gigId}`}>
                        <Card className="overflow-hidden hover:shadow-md transition-shadow cursor-pointer">
                          <CardContent className="p-4 relative">
                            {/* Gig Status Badge - Top Right */}
                            <div className="absolute top-3 right-3 scale-90 origin-top-right">
                              <GigStatusBadge status={gig.status ?? 'draft'} />
                            </div>

                            <div className="flex items-start gap-3">
                              {/* Date badge */}
                              <div className="flex-shrink-0 flex flex-col items-center justify-center bg-muted rounded-md px-2.5 py-1.5 min-w-[50px]">
                                <div className="text-xs font-medium text-muted-foreground">
                                  {getWeekdayAndDate(gig.date).weekday}
                                </div>
                                <div className="text-sm font-bold">
                                  {getWeekdayAndDate(gig.date).shortDate.split(" ")[1]}
                                </div>
                              </div>

                              {/* Gig Info */}
                              <div className="flex-1 min-w-0 pr-16">
                                <div className="flex items-center gap-2 flex-wrap mb-1">
                                  <h4 className="font-semibold text-sm">{gig.gigTitle}</h4>
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
                      </Link>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* RIGHT COLUMN (Side - 1/3 width) - Hidden in Focus Mode */}
        {!focusMode && (
          <div className="space-y-6">
            {/* Band & Changes Activity Feed */}
            {nextGig && (
              <GigActivityWidget 
                gigId={nextGig.gigId} 
                limit={10}
                showViewAll={true}
              />
            )}

            {/* Practice Focus Widget */}
            {user && <PracticeFocusWidget userId={user.id} limit={5} />}

            {/* Money Snapshot */}
            <Card className="border-dashed">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2 text-muted-foreground">
                  <Euro className="h-4 w-4" />
                  Money Snapshot
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isLoadingMoney ? (
                  <div className="space-y-2">
                    <Skeleton className="h-6 w-24" />
                    <Skeleton className="h-4 w-32" />
                  </div>
                ) : moneySummary ? (
                  <div className="space-y-2 text-sm">
                    <div className="text-xs text-muted-foreground uppercase tracking-wide">This month</div>
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-lg font-semibold">
                        ₪{(moneySummary.totalEarned + moneySummary.totalUnpaid).toLocaleString('en-US', { maximumFractionDigits: 0 })}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        total ({moneySummary.gigCount} gigs)
                      </span>
                    </div>
                    {moneySummary.totalUnpaid > 0 && (
                      <div className="flex items-center gap-2 text-xs">
                        <Badge variant="outline" className="text-xs">
                          ₪{moneySummary.totalUnpaid.toLocaleString('en-US', { maximumFractionDigits: 0 })} unpaid
                        </Badge>
                      </div>
                    )}
                    <Separator className="my-3" />
                    <Link href="/money">
                      <Button variant="ghost" size="sm" className="w-full justify-between text-xs h-8">
                        Go to Money view
                        <ChevronRight className="h-3.5 w-3.5" />
                      </Button>
                    </Link>
                  </div>
                ) : (
                  <div className="text-xs text-muted-foreground">No financial data available</div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>

    </div>
  );
}
