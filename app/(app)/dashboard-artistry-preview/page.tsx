"use client";

/**
 * ARTIST-FOCUSED DASHBOARD - PREVIEW/MOCK PAGE
 * 
 * This is a visual preview of an artistry-first dashboard for working musicians.
 * It answers: "Am I ready for my upcoming gigs – musically and logistically?"
 * 
 * Route: /dashboard-artistry-preview
 * 
 * All data is hardcoded mock data - no backend/Supabase calls.
 * Uses existing app layout shell (TopNav + ProjectBar).
 */

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
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
  CheckCircle2,
  AlertTriangle,
  Circle,
  Headphones,
  Repeat2,
  MessageSquare,
  Plus,
  User,
  PlayCircle,
  FileText,
  Briefcase,
  Euro,
  ChevronRight,
  Eye,
  EyeOff,
  ChevronDown,
  ChevronUp,
  Zap,
  Crown,
  Mail,
} from "lucide-react";
import { useState, useMemo, useEffect } from "react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

// ========================================
// MOCK DATA
// ========================================

// Extended mock gigs with full details for gig selector
const MOCK_ALL_GIGS = [
  {
    id: "1",
    date: "2025-11-27", // Thursday
    weekday: "THU",
    shortDate: "Nov 27",
    title: "hana paid",
    bandName: "החברים של חברים",
    venueName: "The Blue Note",
    city: "Tel Aviv",
    callTime: "19:00",
    stageTime: "21:00",
    hostedBy: "You",
    role: "Keys & Vocals",
    gigType: "Club",
    readiness: {
      songsTotal: 13,
      songsLearned: 10,
      chartsReady: true,
      soundsReady: false,
      travelChecked: false,
      gearPacked: true,
    },
  },
  {
    id: "2",
    date: "2025-11-28",
    weekday: "FRI",
    shortDate: "Nov 28",
    title: "Shabbat Live Session",
    bandName: "Acoustic Vibes",
    venueName: "Cafe Nola",
    city: "Tel Aviv",
    callTime: "18:00",
    stageTime: "19:30",
    hostedBy: "You",
    role: "MD",
    gigType: "Cafe",
    readiness: {
      songsTotal: 8,
      songsLearned: 8,
      chartsReady: true,
      soundsReady: true,
      travelChecked: true,
      gearPacked: true,
    },
  },
  {
    id: "3",
    date: "2025-11-29",
    weekday: "SAT",
    shortDate: "Nov 29",
    title: "Wedding - Dana & Amit",
    bandName: "Elite Events Band",
    venueName: "Garden Hall",
    city: "Jerusalem",
    callTime: "17:00",
    stageTime: "20:00",
    hostedBy: "Sarah Cohen",
    role: "Keys",
    gigType: "Wedding",
    readiness: {
      songsTotal: 15,
      songsLearned: 11,
      chartsReady: false,
      soundsReady: true,
      travelChecked: false,
      gearPacked: false,
    },
  },
  {
    id: "4",
    date: "2025-11-30",
    weekday: "SUN",
    shortDate: "Nov 30",
    title: "Jazz Brunch",
    bandName: "Sunday Collective",
    venueName: "Riverside Bistro",
    city: "Tel Aviv",
    callTime: "10:00",
    stageTime: "11:00",
    hostedBy: "David Miller",
    role: "Keys",
    gigType: "Brunch",
    readiness: {
      songsTotal: 12,
      songsLearned: 12,
      chartsReady: true,
      soundsReady: true,
      travelChecked: true,
      gearPacked: true,
    },
  },
  {
    id: "5",
    date: "2025-12-01",
    weekday: "MON",
    shortDate: "Dec 1",
    title: "Corporate Event",
    bandName: "Pro Events Ensemble",
    venueName: "Hilton TLV",
    city: "Tel Aviv",
    callTime: "18:30",
    stageTime: "20:30",
    hostedBy: "Michael Brown",
    role: "Sub for Sarah",
    gigType: "Corporate",
    readiness: {
      songsTotal: 10,
      songsLearned: 5,
      chartsReady: false,
      soundsReady: false,
      travelChecked: false,
      gearPacked: false,
    },
  },
];

// Simplified list for "This Week on Stage" section
const MOCK_GIGS_THIS_WEEK = MOCK_ALL_GIGS.map(gig => ({
  ...gig,
  isHostedByYou: gig.hostedBy === "You",
  status: "confirmed" as const,
  prepStatus: gig.readiness.songsLearned === gig.readiness.songsTotal && 
              gig.readiness.chartsReady && gig.readiness.soundsReady
    ? ("ready" as const)
    : ("in_progress" as const),
  prepSummary: gig.readiness.songsLearned === gig.readiness.songsTotal
    ? "All set"
    : `${gig.readiness.songsTotal - gig.readiness.songsLearned} songs left to learn`,
}));

const MOCK_PRACTICE_ITEMS = [
  {
    id: "1",
    songTitle: "Song A",
    gigLabel: "New for Saturday's wedding",
    type: "new" as const,
  },
  {
    id: "2",
    songTitle: "Levitating (Dua Lipa)",
    gigLabel: "Refresh for hana paid",
    type: "refresh" as const,
  },
  {
    id: "3",
    songTitle: "Hallelujah",
    gigLabel: "Intro section - tighten up",
    type: "section" as const,
  },
  {
    id: "4",
    songTitle: "Just the Way You Are",
    gigLabel: "New for wedding",
    type: "new" as const,
  },
];

const MOCK_UPDATES = [
  {
    id: "1",
    icon: "music",
    message: "Miki updated the setlist for hana paid",
    detail: "3 new songs added",
    gigName: "hana paid",
    timeAgo: "2h ago",
  },
  {
    id: "2",
    icon: "plus",
    message: "Hani added reference tracks",
    detail: "for TESTTTT",
    gigName: "TESTTTT",
    timeAgo: "Today",
  },
  {
    id: "3",
    icon: "message",
    message: "New invite: 'Dana's Wedding 2'",
    detail: "Sat, Nov 22",
    gigName: "Dana's Wedding 2",
    timeAgo: "Yesterday",
  },
  {
    id: "4",
    icon: "message",
    message: "Note from MD on hana's first gig",
    detail: "We changed the ending of Song 3",
    gigName: "hana's first gig",
    timeAgo: "Yesterday",
  },
  {
    id: "5",
    icon: "user",
    message: "Sarah confirmed for Jazz Brunch",
    detail: "Drummer slot filled",
    gigName: "Jazz Brunch",
    timeAgo: "2 days ago",
  },
];

// ========================================
// HELPER FUNCTIONS
// ========================================

function getPrepStatusBadge(status: "ready" | "in_progress" | "needs_sub", summary?: string) {
  switch (status) {
    case "ready":
      return <Badge variant="default" className="bg-green-500/10 text-green-700 dark:text-green-400 hover:bg-green-500/20">Ready</Badge>;
    case "needs_sub":
      return <Badge variant="destructive">Needs Sub</Badge>;
    case "in_progress":
      return <Badge variant="secondary" className="bg-amber-500/10 text-amber-700 dark:text-amber-400">{summary || "In Progress"}</Badge>;
  }
}

function getGigStatusBadge(status: "confirmed" | "pending" | "cancelled") {
  switch (status) {
    case "confirmed":
      return <Badge variant="default" className="bg-blue-500/10 text-blue-700 dark:text-blue-400 hover:bg-blue-500/20">Confirmed</Badge>;
    case "pending":
      return <Badge variant="secondary">Pending</Badge>;
    case "cancelled":
      return <Badge variant="destructive">Cancelled</Badge>;
  }
}

function getUpdateIcon(iconType: string) {
  switch (iconType) {
    case "music":
      return <Music className="h-4 w-4" />;
    case "plus":
      return <Plus className="h-4 w-4" />;
    case "message":
      return <MessageSquare className="h-4 w-4" />;
    case "user":
      return <User className="h-4 w-4" />;
    default:
      return <Circle className="h-4 w-4" />;
  }
}

function getPracticeIcon(type: "new" | "refresh" | "section") {
  switch (type) {
    case "new":
      return <Music className="h-4 w-4 text-blue-500" />;
    case "refresh":
      return <Repeat2 className="h-4 w-4 text-amber-500" />;
    case "section":
      return <Headphones className="h-4 w-4 text-purple-500" />;
  }
}

function getPracticeTypePill(type: "new" | "refresh" | "section") {
  switch (type) {
    case "new":
      return <Badge variant="outline" className="text-xs border-blue-500/30 text-blue-600 dark:text-blue-400">New</Badge>;
    case "refresh":
      return <Badge variant="outline" className="text-xs border-amber-500/30 text-amber-600 dark:text-amber-400">Refresh</Badge>;
    case "section":
      return <Badge variant="outline" className="text-xs border-purple-500/30 text-purple-600 dark:text-purple-400">Section</Badge>;
  }
}

// ========================================
// MAIN COMPONENT
// ========================================

export default function DashboardArtistryPreview() {
  // Filter state for "This Week on Stage"
  const [roleFilter, setRoleFilter] = useState<"all" | "hosted" | "playing" | "subbing" | "md">("all");
  const [timeFilter, setTimeFilter] = useState<"week" | "7days" | "month">("week");
  
  // Focus mode state
  const [focusMode, setFocusMode] = useState(false);
  
  // Readiness breakdown expansion
  const [showReadinessBreakdown, setShowReadinessBreakdown] = useState(false);
  
  // Selected gig index (for cycling through gigs)
  const [selectedGigIndex, setSelectedGigIndex] = useState(0);
  
  // Gig selector popover state
  const [gigSelectorOpen, setGigSelectorOpen] = useState(false);
  
  // Get selected gig
  const selectedGig = MOCK_ALL_GIGS[selectedGigIndex];
  
  // Navigation functions
  const goToPreviousGig = () => {
    setSelectedGigIndex(prev => (prev > 0 ? prev - 1 : MOCK_ALL_GIGS.length - 1));
  };
  
  const goToNextGig = () => {
    setSelectedGigIndex(prev => (prev < MOCK_ALL_GIGS.length - 1 ? prev + 1 : 0));
  };
  
  const resetToNextGig = () => {
    setSelectedGigIndex(0);
  };

  // Calculate readiness percentage and breakdown for selected gig
  const readinessData = useMemo(() => {
    const { songsTotal, songsLearned, chartsReady, soundsReady, travelChecked, gearPacked } = selectedGig.readiness;
    
    // Individual percentages
    const songPercent = Math.round((songsLearned / songsTotal) * 100);
    const chartsPercent = chartsReady ? 100 : 0;
    const soundsPercent = soundsReady ? 100 : 0;
    const travelPercent = travelChecked ? 100 : 0;
    const gearPercent = gearPacked ? 100 : 0;
    
    // Overall calculation (weighted)
    const songProgress = (songsLearned / songsTotal) * 40; // 40% weight
    const checklistItems = [chartsReady, soundsReady, travelChecked, gearPacked];
    const checklistComplete = checklistItems.filter(Boolean).length;
    const checklistProgress = (checklistComplete / checklistItems.length) * 60; // 60% weight
    const overallPercent = Math.round(songProgress + checklistProgress);
    
    return {
      overall: overallPercent,
      songs: songPercent,
      charts: chartsPercent,
      sounds: soundsPercent,
      travel: travelPercent,
      gear: gearPercent,
    };
  }, [selectedGig]);
  
  const readinessPercent = readinessData.overall;

  // Filter gigs by role
  const filteredGigs = useMemo(() => {
    if (roleFilter === "all") return MOCK_GIGS_THIS_WEEK;
    if (roleFilter === "hosted") return MOCK_GIGS_THIS_WEEK.filter(g => g.isHostedByYou);
    if (roleFilter === "playing") return MOCK_GIGS_THIS_WEEK.filter(g => !g.isHostedByYou && g.role !== "MD" && !g.role.includes("Sub"));
    if (roleFilter === "subbing") return MOCK_GIGS_THIS_WEEK.filter(g => g.role.includes("Sub"));
    if (roleFilter === "md") return MOCK_GIGS_THIS_WEEK.filter(g => g.role === "MD");
    return MOCK_GIGS_THIS_WEEK;
  }, [roleFilter]);
  
  // Keyboard shortcuts for gig navigation (arrow keys)
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      // Don't trigger if user is typing
      const target = e.target as HTMLElement;
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable
      ) {
        return;
      }

      if (e.key === "ArrowLeft") {
        e.preventDefault();
        goToPreviousGig();
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        goToNextGig();
      }
    };

    window.addEventListener("keydown", handleKeyPress);
    return () => window.removeEventListener("keydown", handleKeyPress);
  }, []);

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
              <p className="text-xs">Hide distractions - show only Next Gig + Practice Focus</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      {/* Focus Mode Active Indicator */}
      {focusMode && (
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="py-3 px-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm">
                <Eye className="h-4 w-4 text-primary" />
                <span className="font-medium">Focus Mode Active</span>
                <span className="text-muted-foreground">• Showing only Next Gig + Practice Focus</span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setFocusMode(false)}
                className="h-7 text-xs"
              >
                Exit
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Top KPI Cards - Hidden in Focus Mode */}
      {!focusMode && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6 pb-5">
              <div className="text-2xl font-bold">4</div>
              <div className="text-sm text-muted-foreground mt-1">Gigs this week</div>
              <div className="text-xs text-muted-foreground mt-1">2 hosted • 2 playing</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6 pb-5">
              <div className="text-2xl font-bold">7</div>
              <div className="text-sm text-muted-foreground mt-1">Songs to learn</div>
              <div className="text-xs text-muted-foreground mt-1">across 3 gigs</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6 pb-5">
              <div className="text-2xl font-bold">3</div>
              <div className="text-sm text-muted-foreground mt-1">Changes since last visit</div>
              <div className="text-xs text-muted-foreground mt-1">setlists & notes</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6 pb-5">
              <div className="text-2xl font-bold">1</div>
              <div className="text-sm text-muted-foreground mt-1">Open sub requests</div>
              <div className="text-xs text-muted-foreground mt-1">needs replacement</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Two-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* LEFT COLUMN (Main - 2/3 width) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Next Gig Hero Card */}
          <Card className="overflow-hidden">
            <CardContent className="p-6 relative">
              {/* Gig Selector - Top Right Corner */}
              <div className="absolute top-4 right-4">
                <Popover open={gigSelectorOpen} onOpenChange={setGigSelectorOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="gap-1 h-7 text-xs"
                    >
                      <Calendar className="h-3 w-3" />
                      <span className="hidden sm:inline">{selectedGigIndex + 1}/{MOCK_ALL_GIGS.length}</span>
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
                          {MOCK_ALL_GIGS.map((gig, index) => (
                            <button
                              key={index}
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
                                  <div className="font-medium text-sm truncate">{gig.title}</div>
                                  <div className="text-xs text-muted-foreground">{gig.weekday}, {gig.shortDate}</div>
                                  <div className="text-xs text-muted-foreground">{gig.bandName}</div>
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

              {/* Card Title */}
              <div className="mb-4">
                <h3 className="text-lg font-semibold text-muted-foreground">
                  {selectedGigIndex === 0 ? "Next Gig" : "Selected Gig"}
                </h3>
              </div>

              {/* Header Row with Date Pill */}
              <div className="flex items-start gap-4 mb-4 pr-16">
                {/* Date Pill - Smaller, non-dominant */}
                <div className="flex-shrink-0 flex flex-col items-center justify-center bg-primary/10 rounded-lg px-3 py-2 min-w-[60px]">
                  <div className="text-xs font-medium text-muted-foreground uppercase">{selectedGig.weekday}</div>
                  <div className="text-xl font-bold">{selectedGig.shortDate.split(" ")[1]}</div>
                </div>
                
                {/* Gig Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-2">
                    <h2 className="text-2xl font-bold">{selectedGig.title}</h2>
                    {selectedGig.hostedBy === "You" ? (
                      <Badge variant="outline" className="bg-orange-50 border-orange-200 text-orange-700 dark:bg-orange-950 dark:border-orange-800 dark:text-orange-300">
                        <Crown className="h-3 w-3 mr-1" />
                        You
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-950 dark:border-blue-800 dark:text-blue-300">
                        <Mail className="h-3 w-3 mr-1" />
                        {selectedGig.hostedBy}
                      </Badge>
                    )}
                  </div>
                  <div className="text-sm text-muted-foreground mb-1">
                    Project: <span className="font-medium">{selectedGig.bandName}</span>
                  </div>
                  <div className="flex items-center gap-4 text-sm flex-wrap">
                    <div className="flex items-center gap-1.5">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      <span>{selectedGig.venueName}, {selectedGig.city}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Times & Role */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                <div className="flex items-center gap-2 text-sm">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <div className="text-xs text-muted-foreground">Call Time</div>
                    <div className="font-medium">{selectedGig.callTime}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <div className="text-xs text-muted-foreground">Stage Time</div>
                    <div className="font-medium">{selectedGig.stageTime}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Music className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <div className="text-xs text-muted-foreground">Your Role</div>
                    <Badge variant="secondary" className="mt-0.5">{selectedGig.role}</Badge>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <div className="text-xs text-muted-foreground">Type</div>
                    <Badge variant="outline" className="mt-0.5">{selectedGig.gigType}</Badge>
                  </div>
                </div>
              </div>

              <Separator className="my-4" />

              {/* Quick Actions with Keyboard Shortcuts */}
              <div className="flex flex-wrap gap-2 mb-4">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="default" size="sm" className="gap-2 group relative">
                        <FileText className="h-4 w-4" />
                        Open Setlist
                        <kbd className="hidden group-hover:inline-flex ml-2 pointer-events-none h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100">
                          S
                        </kbd>
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="text-xs">Press <kbd className="px-1.5 py-0.5 text-xs font-semibold border rounded">S</kbd> to open</p>
                    </TooltipContent>
                  </Tooltip>
                  
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="outline" size="sm" className="gap-2 group relative">
                        <FileText className="h-4 w-4" />
                        Charts & Files
                        <kbd className="hidden group-hover:inline-flex ml-2 pointer-events-none h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100">
                          F
                        </kbd>
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="text-xs">Press <kbd className="px-1.5 py-0.5 text-xs font-semibold border rounded">F</kbd> to open</p>
                    </TooltipContent>
                  </Tooltip>
                  
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="outline" size="sm" className="gap-2 group relative">
                        <PlayCircle className="h-4 w-4" />
                        Practice Playlist
                        <kbd className="hidden group-hover:inline-flex ml-2 pointer-events-none h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100">
                          P
                        </kbd>
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="text-xs">Press <kbd className="px-1.5 py-0.5 text-xs font-semibold border rounded">P</kbd> to play</p>
                    </TooltipContent>
                  </Tooltip>
                  
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="outline" size="sm" className="gap-2 group relative">
                        <Briefcase className="h-4 w-4" />
                        Open Gig Pack
                        <kbd className="hidden group-hover:inline-flex ml-2 pointer-events-none h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100">
                          G
                        </kbd>
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="text-xs">Press <kbd className="px-1.5 py-0.5 text-xs font-semibold border rounded">G</kbd> to open</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>

              <Separator className="my-4" />

              {/* Readiness Section with Breakdown */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold flex items-center gap-2">
                    <Zap className="h-4 w-4 text-primary" />
                    Readiness
                  </h3>
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-bold">{readinessPercent}%</span>
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
                      style={{ width: `${(readinessData.songs / 100) * 40}%` }}
                      title={`Songs: ${readinessData.songs}%`}
                    />
                    {/* Charts segment - 15% of total width */}
                    <div 
                      className="bg-green-500 transition-all duration-300"
                      style={{ width: `${(readinessData.charts / 100) * 15}%` }}
                      title={`Charts: ${readinessData.charts}%`}
                    />
                    {/* Sounds segment - 15% of total width */}
                    <div 
                      className="bg-purple-500 transition-all duration-300"
                      style={{ width: `${(readinessData.sounds / 100) * 15}%` }}
                      title={`Sounds: ${readinessData.sounds}%`}
                    />
                    {/* Travel segment - 15% of total width */}
                    <div 
                      className="bg-amber-500 transition-all duration-300"
                      style={{ width: `${(readinessData.travel / 100) * 15}%` }}
                      title={`Travel: ${readinessData.travel}%`}
                    />
                    {/* Gear segment - 15% of total width */}
                    <div 
                      className="bg-emerald-500 transition-all duration-300"
                      style={{ width: `${(readinessData.gear / 100) * 15}%` }}
                      title={`Gear: ${readinessData.gear}%`}
                    />
                  </div>
                </div>
                
                {/* Breakdown Legend (only when expanded) */}
                {showReadinessBreakdown && (
                  <div className="mb-4 p-3 bg-muted/50 rounded-lg space-y-2">
                    <p className="text-xs font-semibold text-muted-foreground mb-2">Breakdown by Category:</p>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="flex items-center gap-2">
                        <div className="h-3 w-3 rounded-full bg-blue-500" />
                        <span>Songs: {readinessData.songs}%</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="h-3 w-3 rounded-full bg-green-500" />
                        <span>Charts: {readinessData.charts}%</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="h-3 w-3 rounded-full bg-purple-500" />
                        <span>Sounds: {readinessData.sounds}%</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="h-3 w-3 rounded-full bg-amber-500" />
                        <span>Travel: {readinessData.travel}%</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="h-3 w-3 rounded-full bg-emerald-500" />
                        <span>Gear: {readinessData.gear}%</span>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground mt-2 pt-2 border-t">
                      💡 Click items below to mark as complete
                    </p>
                  </div>
                )}
                
                <div className="space-y-2.5">
                  {/* Songs */}
                  <div className="flex items-center gap-2.5">
                    {selectedGig.readiness.songsLearned === selectedGig.readiness.songsTotal ? (
                      <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0" />
                    ) : (
                      <AlertTriangle className="h-5 w-5 text-amber-500 flex-shrink-0" />
                    )}
                    <div className="flex-1 text-sm">
                      Songs learned: <span className="font-medium">{selectedGig.readiness.songsLearned} / {selectedGig.readiness.songsTotal}</span>
                    </div>
                  </div>

                  {/* Charts */}
                  <div className="flex items-center gap-2.5">
                    {selectedGig.readiness.chartsReady ? (
                      <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0" />
                    ) : (
                      <Circle className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                    )}
                    <div className="flex-1 text-sm">
                      Charts attached: <span className="font-medium">{selectedGig.readiness.chartsReady ? "All songs" : "Not ready"}</span>
                    </div>
                  </div>

                  {/* Sounds */}
                  <div className="flex items-center gap-2.5">
                    {selectedGig.readiness.soundsReady ? (
                      <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0" />
                    ) : (
                      <AlertTriangle className="h-5 w-5 text-amber-500 flex-shrink-0" />
                    )}
                    <div className="flex-1 text-sm">
                      Sounds programmed in rig: <span className="font-medium">{selectedGig.readiness.soundsReady ? "Ready" : "Not ready"}</span>
                    </div>
                  </div>

                  {/* Travel */}
                  <div className="flex items-center gap-2.5">
                    {selectedGig.readiness.travelChecked ? (
                      <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0" />
                    ) : (
                      <Circle className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                    )}
                    <div className="flex-1 text-sm">
                      Travel plan checked: <span className="font-medium">{selectedGig.readiness.travelChecked ? "Done" : "Not yet"}</span>
                    </div>
                  </div>

                  {/* Gear */}
                  <div className="flex items-center gap-2.5">
                    {selectedGig.readiness.gearPacked ? (
                      <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0" />
                    ) : (
                      <Circle className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                    )}
                    <div className="flex-1 text-sm">
                      Gear checklist: <span className="font-medium">{selectedGig.readiness.gearPacked ? "Packed" : "Not packed"}</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

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
              <div className="space-y-3">
                {filteredGigs.map((gig) => (
                  <Card key={gig.id} className="overflow-hidden hover:shadow-md transition-shadow">
                    <CardContent className="p-4 relative">
                      {/* Gig Status Badge - Top Right */}
                      <div className="absolute top-3 right-3 scale-90 origin-top-right">
                        {getGigStatusBadge(gig.status)}
                      </div>

                      <div className="flex items-start gap-3">
                        {/* Date badge */}
                        <div className="flex-shrink-0 flex flex-col items-center justify-center bg-muted rounded-md px-2.5 py-1.5 min-w-[50px]">
                          <div className="text-xs font-medium text-muted-foreground">{gig.weekday}</div>
                          <div className="text-sm font-bold">{gig.shortDate.split(" ")[1]}</div>
                        </div>

                        {/* Gig Info */}
                        <div className="flex-1 min-w-0 pr-16">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <h4 className="font-semibold text-sm">{gig.title}</h4>
                            {/* Host/Invited Badge */}
                            {gig.isHostedByYou ? (
                              <Badge variant="outline" className="gap-0.5 text-[10px] h-5 px-1.5 bg-orange-50 border-orange-200 text-orange-700 dark:bg-orange-950 dark:border-orange-800 dark:text-orange-300 whitespace-nowrap">
                                <Crown className="h-2.5 w-2.5" />
                                You
                              </Badge>
                            ) : gig.hostedBy !== "You" ? (
                              <Badge variant="outline" className="gap-0.5 text-[10px] h-5 px-1.5 bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-950 dark:border-blue-800 dark:text-blue-300 whitespace-nowrap">
                                <Mail className="h-2.5 w-2.5" />
                                {gig.hostedBy}
                              </Badge>
                            ) : null}
                          </div>
                          <div className="text-xs text-muted-foreground mb-2">
                            {gig.bandName} • {gig.venueName}
                          </div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge variant="outline" className="text-xs">{gig.role}</Badge>
                            {getPrepStatusBadge(gig.prepStatus, gig.prepSummary)}
                          </div>
                        </div>

                        {/* Arrow */}
                        <ChevronRight className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
          )}
        </div>

        {/* RIGHT COLUMN (Side - 1/3 width) */}
        <div className="space-y-6">
          {/* Practice Focus Today */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Headphones className="h-5 w-5" />
                Practice Focus
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[280px] pr-3">
                <div className="space-y-3">
                  {MOCK_PRACTICE_ITEMS.map((item) => (
                    <div key={item.id} className="flex items-start gap-3 pb-3 border-b last:border-0">
                      <div className="flex-shrink-0 mt-1">
                        {getPracticeIcon(item.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h5 className="font-medium text-sm">{item.songTitle}</h5>
                          {getPracticeTypePill(item.type)}
                        </div>
                        <p className="text-xs text-muted-foreground">{item.gigLabel}</p>
                      </div>
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0 flex-shrink-0">
                        <PlayCircle className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Band & Changes - Hidden in Focus Mode */}
          {!focusMode && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <MessageSquare className="h-5 w-5" />
                  Band & Changes
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[280px] pr-3">
                  <div className="space-y-3">
                    {MOCK_UPDATES.map((update) => (
                      <div key={update.id} className="flex items-start gap-3 pb-3 border-b last:border-0">
                        <div className="flex-shrink-0 mt-1 text-muted-foreground">
                          {getUpdateIcon(update.icon)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm mb-0.5">
                            {update.message}
                            {update.detail && (
                              <span className="text-muted-foreground"> ({update.detail})</span>
                            )}
                          </div>
                          <div className="text-xs text-muted-foreground">{update.timeAgo}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          )}

          {/* Money Snapshot (Low Emphasis) - Hidden in Focus Mode */}
          {!focusMode && (
            <Card className="border-dashed">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2 text-muted-foreground">
                  <Euro className="h-4 w-4" />
                  Money Snapshot
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  <div className="text-xs text-muted-foreground uppercase tracking-wide">This month</div>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-lg font-semibold">€1,250</span>
                    <span className="text-xs text-muted-foreground">fee (4 gigs)</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <Badge variant="outline" className="text-xs">2 unpaid</Badge>
                  </div>
                  <Separator className="my-3" />
                  <Button variant="ghost" size="sm" className="w-full justify-between text-xs h-8">
                    Go to Money view
                    <ChevronRight className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

