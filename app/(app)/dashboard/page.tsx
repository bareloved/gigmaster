"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Music, Briefcase, Calendar, Grid3x3, List, CalendarDays, Search, X, History, ChevronDown, ChevronUp, ArrowRight, SlidersHorizontal, Plus } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useInfiniteQuery, useQuery, useQueryClient } from "@tanstack/react-query";
import { listDashboardGigs, listRecentPastGigs, type DashboardGig } from "@/lib/api/dashboard-gigs";
import { DashboardGigItem } from "@/components/dashboard-gig-item";
import { DashboardGigItemGrid } from "@/components/dashboard-gig-item-grid";
import { useUser } from "@/lib/providers/user-provider";
import { CreateGigDialog } from "@/components/create-gig-dialog";
import { useState, useMemo, useRef, useEffect } from "react";
import { 
  parseISO,
  format as formatDate,
  addDays,
  format
} from "date-fns";

type RoleFilter = "all" | "manager" | "player";
type ViewMode = "list" | "grid";
type DateRangePreset = "7days" | "30days" | "90days" | "custom";
type SortBy = "date" | "project" | "status" | "payment" | "location";
type SortOrder = "asc" | "desc";

// Quirky messages for "no gigs today" empty state
const NO_GIGS_TODAY_MESSAGES = [
  "Day off! Time to practice those tricky licks.",
  "Free bird today! Maybe catch up on some listening?",
  "No gigs = chill day. Enjoy the break!",
  "Clear schedule today. Perfect for that side project.",
  "Rest day unlocked! Your future self will thank you.",
  "Nothing on the books today. Time to recharge.",
  "Today's gig is... self-care. Enjoy it!",
  "Empty calendar = full possibilities. What will you create?",
];

// Date range presets
const getDateRangePreset = (preset: DateRangePreset) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  switch (preset) {
    case "7days":
      return { from: today, to: addDays(today, 7) };
    case "30days":
      return { from: today, to: addDays(today, 30) };
    case "90days":
      return { from: today, to: addDays(today, 90) };
    default:
      return { from: today, to: addDays(today, 90) };
  }
};

// LocalStorage keys for dashboard preferences
const DASHBOARD_PREFS_KEY = "ensemble-dashboard-preferences";

interface DashboardPreferences {
  todayViewMode: ViewMode;
  upcomingViewMode: ViewMode;
  roleFilter: RoleFilter;
  sortBy: SortBy;
  sortOrder: SortOrder;
  showRecentGigs: boolean;
  dateRangePreset: DateRangePreset;
  dateRangeFrom?: string;
  dateRangeTo?: string;
}

// Load preferences from localStorage
const loadPreferences = (): Partial<DashboardPreferences> => {
  if (typeof window === "undefined") return {};
  
  try {
    const stored = localStorage.getItem(DASHBOARD_PREFS_KEY);
    if (stored) {
      return JSON.parse(stored) as Partial<DashboardPreferences>;
    }
  } catch (error) {
    console.warn("Failed to load dashboard preferences:", error);
  }
  
  return {};
};

// Save preferences to localStorage
const savePreferences = (prefs: Partial<DashboardPreferences>) => {
  if (typeof window === "undefined") return;
  
  try {
    localStorage.setItem(DASHBOARD_PREFS_KEY, JSON.stringify(prefs));
  } catch (error) {
    console.warn("Failed to save dashboard preferences:", error);
  }
};

export default function DashboardPage() {
  const { user } = useUser();
  const router = useRouter();
  const queryClient = useQueryClient();
  
  // Load preferences from localStorage on mount
  const savedPrefs = loadPreferences();
  
  const [roleFilter, setRoleFilter] = useState<RoleFilter>((savedPrefs.roleFilter as RoleFilter) || "all");
  const [todayViewMode, setTodayViewMode] = useState<ViewMode>((savedPrefs.todayViewMode as ViewMode) || "list");
  const [upcomingViewMode, setUpcomingViewMode] = useState<ViewMode>((savedPrefs.upcomingViewMode as ViewMode) || "list");
  
  // Sort state for upcoming gigs
  const [sortBy, setSortBy] = useState<SortBy>((savedPrefs.sortBy as SortBy) || "date");
  const [sortOrder, setSortOrder] = useState<SortOrder>((savedPrefs.sortOrder as SortOrder) || "asc");
  
  // Date range state - load from localStorage or default to next 7 days
  const [dateRangePreset, setDateRangePreset] = useState<DateRangePreset>(
    (savedPrefs.dateRangePreset as DateRangePreset) || "7days"
  );
  const [dateRange, setDateRange] = useState<{ from: Date; to: Date }>(() => {
    // If we have saved custom dates, use those
    if (savedPrefs.dateRangeFrom && savedPrefs.dateRangeTo) {
      return {
        from: new Date(savedPrefs.dateRangeFrom),
        to: new Date(savedPrefs.dateRangeTo),
      };
    }
    // Otherwise use the saved preset or default to 7 days
    const preset = (savedPrefs.dateRangePreset as DateRangePreset) || "7days";
    return getDateRangePreset(preset);
  });
  const [customDatePickerOpen, setCustomDatePickerOpen] = useState(false);
  
  // Search state with debouncing
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");
  
  // Recent past gigs toggle
  const [showRecentGigs, setShowRecentGigs] = useState(savedPrefs.showRecentGigs ?? false);
  
  // Random message index for "no gigs today" state
  const [randomMessageIndex] = useState(() => 
    Math.floor(Math.random() * NO_GIGS_TODAY_MESSAGES.length)
  );
  
  // Create gig dialog
  const [createGigDialogOpen, setCreateGigDialogOpen] = useState(false);
  
  // Save preferences to localStorage when they change
  useEffect(() => {
    savePreferences({
      todayViewMode,
      upcomingViewMode,
      roleFilter,
      sortBy,
      sortOrder,
      showRecentGigs,
      dateRangePreset,
      dateRangeFrom: dateRange.from.toISOString(),
      dateRangeTo: dateRange.to.toISOString(),
    });
  }, [todayViewMode, upcomingViewMode, roleFilter, sortBy, sortOrder, showRecentGigs, dateRangePreset, dateRange]);
  
  // Debounce search input (300ms)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 300);
    
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Fetch unified gigs list with date range and pagination
  const {
    data,
    isLoading,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
  } = useInfiniteQuery({
    queryKey: [
      "dashboard-gigs", 
      user?.id,
      dateRange.from.toISOString(),
      dateRange.to.toISOString()
    ],
    queryFn: ({ pageParam = 0 }) => listDashboardGigs(user!.id, {
      from: dateRange.from,
      to: dateRange.to,
      limit: 20,
      offset: pageParam * 20,
    }),
    getNextPageParam: (lastPage, allPages) => {
      if (lastPage.hasMore) {
        return allPages.length;
      }
      return undefined;
    },
    enabled: !!user,
    staleTime: 1000 * 60 * 2, // 2 minutes
    initialPageParam: 0,
  });

  // Flatten all pages into a single array
  const allGigs = useMemo(() => {
    if (!data?.pages) return [];
    return data.pages.flatMap(page => page.gigs);
  }, [data]);

  // Split gigs into today and upcoming (tomorrow onwards)
  const { todayGigs, upcomingGigs } = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = format(today, 'yyyy-MM-dd');
    
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = format(tomorrow, 'yyyy-MM-dd');
    
    return {
      todayGigs: allGigs.filter(g => g.date === todayStr),
      upcomingGigs: allGigs.filter(g => g.date >= tomorrowStr),
    };
  }, [allGigs]);

  // Infinite scroll: auto-load when scrolling to bottom
  const loadMoreRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!loadMoreRef.current || !hasNextPage || isFetchingNextPage) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          fetchNextPage();
        }
      },
      { threshold: 0.1 }
    );

    observer.observe(loadMoreRef.current);

    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  // Fetch recent past gigs (last 20 from past 30 days)
  const {
    data: recentPastGigs = [],
    isLoading: isLoadingRecent,
  } = useQuery({
    queryKey: ["recent-past-gigs", user?.id],
    queryFn: () => listRecentPastGigs(user!.id),
    enabled: !!user && showRecentGigs,
    staleTime: 1000 * 60 * 5, // 5 minutes (past gigs don't change often)
  });
  
  // Handle preset button clicks
  const handlePresetChange = (preset: DateRangePreset) => {
    setDateRangePreset(preset);
    if (preset !== "custom") {
      setDateRange(getDateRangePreset(preset));
    } else {
      setCustomDatePickerOpen(true);
    }
  };
  
  // Handle custom date range selection
  const handleCustomDateChange = (from: Date | undefined, to: Date | undefined) => {
    if (from && to) {
      setDateRange({ from, to });
      setDateRangePreset("custom");
      setCustomDatePickerOpen(false);
    }
  };

  // Filter gigs by role perspective (apply to upcoming gigs only, not today)
  const roleFilteredGigs = useMemo(() => {
    if (roleFilter === "manager") {
      return upcomingGigs.filter(g => g.isManager);
    }
    if (roleFilter === "player") {
      return upcomingGigs.filter(g => g.isPlayer);
    }
    return upcomingGigs;
  }, [upcomingGigs, roleFilter]);

  // Filter gigs by search query (gig title, project name, location)
  const searchFilteredGigs = useMemo(() => {
    if (!debouncedSearchQuery.trim()) return roleFilteredGigs;
    
    const query = debouncedSearchQuery.toLowerCase().trim();
    
    return roleFilteredGigs.filter(gig => {
      const titleMatch = gig.gigTitle?.toLowerCase().includes(query);
      const projectMatch = gig.projectName?.toLowerCase().includes(query);
      const locationMatch = gig.locationName?.toLowerCase().includes(query);
      
      return titleMatch || projectMatch || locationMatch;
    });
  }, [roleFilteredGigs, debouncedSearchQuery]);

  // Get sort label for display
  const getSortLabel = (sortBy: SortBy, sortOrder: SortOrder): string => {
    const labels: Record<SortBy, { asc: string; desc: string }> = {
      date: { asc: "Date ↑", desc: "Date ↓" },
      project: { asc: "Project A-Z", desc: "Project Z-A" },
      status: { asc: "Status A-Z", desc: "Status Z-A" },
      payment: { asc: "Payment ↑", desc: "Payment ↓" },
      location: { asc: "Location A-Z", desc: "Location Z-A" },
    };
    return labels[sortBy][sortOrder];
  };

  // Sorting function
  const sortGigs = (gigs: DashboardGig[], sortBy: SortBy, sortOrder: SortOrder): DashboardGig[] => {
    const sorted = [...gigs].sort((a, b) => {
      let comparison = 0;

      switch (sortBy) {
        case "date":
          const dateA = parseISO(a.date);
          const dateB = parseISO(b.date);
          comparison = dateA.getTime() - dateB.getTime();
          // If dates are equal, compare by start time
          if (comparison === 0 && a.startTime && b.startTime) {
            comparison = a.startTime.localeCompare(b.startTime);
          }
          break;
        case "project":
          comparison = (a.projectName || "").localeCompare(b.projectName || "");
          break;
        case "status":
          comparison = (a.status || "").localeCompare(b.status || "");
          break;
        case "payment":
          // Sort by payment status: paid first, then unpaid, then null
          const aPaid = a.paymentStatus === "paid" ? 0 : a.paymentStatus === "unpaid" ? 1 : 2;
          const bPaid = b.paymentStatus === "paid" ? 0 : b.paymentStatus === "unpaid" ? 1 : 2;
          comparison = aPaid - bPaid;
          break;
        case "location":
          comparison = (a.locationName || "").localeCompare(b.locationName || "");
          break;
        default:
          return 0;
      }

      return sortOrder === "asc" ? comparison : -comparison;
    });

    return sorted;
  };

  // Sort all upcoming gigs (using search-filtered gigs)
  const sortedGigs = useMemo(() => {
    return sortGigs(searchFilteredGigs, sortBy, sortOrder);
  }, [searchFilteredGigs, sortBy, sortOrder]);

  return (
    <div className="space-y-6">
      {/* Header with Filters */}
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
          <p className="text-muted-foreground">
            Your gigs at a glance
          </p>
        </div>

        {/* Filters and Create Button */}
        <div className="flex items-center gap-2">
          <Button onClick={() => setCreateGigDialogOpen(true)} size="sm" className="gap-2">
            <Plus className="h-4 w-4" />
            Create Gig
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2">
                <SlidersHorizontal className="h-4 w-4" />
                Filters
                {roleFilter !== "all" && (
                  <span className="ml-1 h-2 w-2 rounded-full bg-primary" />
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuLabel>Role</DropdownMenuLabel>
              <DropdownMenuItem onClick={() => setRoleFilter("all")}>
                <div className="flex items-center gap-2 w-full">
                  <div className={`h-2 w-2 rounded-full ${roleFilter === "all" ? "bg-primary" : "bg-transparent"}`} />
                  All Gigs
                </div>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setRoleFilter("manager")}>
                <div className="flex items-center gap-2 w-full">
                  <div className={`h-2 w-2 rounded-full ${roleFilter === "manager" ? "bg-primary" : "bg-transparent"}`} />
                  <Briefcase className="h-4 w-4" />
                  Managing
                </div>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setRoleFilter("player")}>
                <div className="flex items-center gap-2 w-full">
                  <div className={`h-2 w-2 rounded-full ${roleFilter === "player" ? "bg-primary" : "bg-transparent"}`} />
                  <Music className="h-4 w-4" />
                  Playing
                </div>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Today Section */}
      <section className="space-y-3">
        <div className="flex items-center justify-between gap-4">
          <h3 className="text-xl font-semibold flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Today
          </h3>
          {!isLoading && todayGigs.length > 0 && (
            <div className="flex gap-1 border rounded-md p-1 h-8 items-center">
              <Button
                variant={todayViewMode === "list" ? "default" : "ghost"}
                size="sm"
                onClick={() => setTodayViewMode("list")}
                className="h-7 w-7 p-0"
              >
                <List className="h-4 w-4" />
              </Button>
              <Button
                variant={todayViewMode === "grid" ? "default" : "ghost"}
                size="sm"
                onClick={() => setTodayViewMode("grid")}
                className="h-7 w-7 p-0"
              >
                <Grid3x3 className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
        
        {isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-24 w-full" />
          </div>
        ) : todayGigs.length === 0 ? (
          <Card>
            <CardContent className="py-12">
              <div className="flex flex-col items-center justify-center text-center">
                <Calendar className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No gigs today</h3>
                <p className="text-sm text-muted-foreground max-w-sm">
                  {NO_GIGS_TODAY_MESSAGES[randomMessageIndex]}
                </p>
              </div>
            </CardContent>
          </Card>
        ) : todayViewMode === "grid" ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {todayGigs.map((gig) => (
              <DashboardGigItemGrid key={gig.gigId} gig={gig} />
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            {todayGigs.map((gig) => (
              <DashboardGigItem key={gig.gigId} gig={gig} />
            ))}
          </div>
        )}
      </section>

      {/* Upcoming Gigs Section - Tomorrow onwards */}
      {!isLoading && (
        <section className="space-y-3">
          <div className="flex items-center justify-between gap-4">
            <h3 className="text-xl font-semibold flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Upcoming Gigs
            </h3>
          </div>

          {/* Date Range Filter and Search Bar */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-2 border-b">
            {/* Date Range Filter */}
            <div className="flex items-center gap-2">
              <CalendarDays className="h-4 w-4 text-muted-foreground" />
              <Select
                value={dateRangePreset}
                onValueChange={(value) => {
                  if (value === "custom") {
                    setCustomDatePickerOpen(true);
                  } else {
                    handlePresetChange(value as DateRangePreset);
                  }
                }}
              >
                <SelectTrigger className="w-[180px] h-8 text-xs">
                  <SelectValue>
                    {dateRangePreset === "custom" 
                      ? `${formatDate(dateRange.from, "MMM d")} - ${formatDate(dateRange.to, "MMM d, yyyy")}`
                      : dateRangePreset === "7days" ? "Next 7 days"
                      : dateRangePreset === "30days" ? "Next 30 days"
                      : dateRangePreset === "90days" ? "Next 90 days"
                      : "Custom Range"
                    }
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7days">Next 7 days</SelectItem>
                  <SelectItem value="30days">Next 30 days</SelectItem>
                  <SelectItem value="90days">Next 90 days</SelectItem>
                  <SelectItem value="custom">Custom Range...</SelectItem>
                </SelectContent>
              </Select>
              <Popover open={customDatePickerOpen} onOpenChange={setCustomDatePickerOpen}>
                <PopoverContent className="w-auto p-0" align="start">
                  <div className="p-4 space-y-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">From Date</label>
                      <CalendarComponent
                        mode="single"
                        selected={dateRange.from}
                        onSelect={(date) => date && handleCustomDateChange(date, dateRange.to)}
                        disabled={(date) => date < new Date()}
                      />
                    </div>
                    <Separator />
                    <div className="space-y-2">
                      <label className="text-sm font-medium">To Date</label>
                      <CalendarComponent
                        mode="single"
                        selected={dateRange.to}
                        onSelect={(date) => date && handleCustomDateChange(dateRange.from, date)}
                        disabled={(date) => date < dateRange.from || date > new Date()}
                      />
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
            </div>

            {/* Search Bar */}
            <div className="relative w-full sm:w-auto sm:min-w-[280px]">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search by gig title, project, or location..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 pr-9 h-8 overflow-hidden text-ellipsis"
              />
              {searchQuery && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-1 top-1/2 transform -translate-y-1/2 h-7 w-7 p-0"
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>

          {/* Sort and View Controls */}
          <div className="flex items-center justify-end gap-2">
            <div className="flex items-center gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-2 h-8">
                    <SlidersHorizontal className="h-3.5 w-3.5" />
                    {getSortLabel(sortBy, sortOrder)}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuLabel>Sort By</DropdownMenuLabel>
                  <DropdownMenuItem onClick={() => { setSortBy("date"); setSortOrder("asc"); }}>
                    Date ↑
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => { setSortBy("date"); setSortOrder("desc"); }}>
                    Date ↓
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => { setSortBy("project"); setSortOrder("asc"); }}>
                    Project A-Z
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => { setSortBy("project"); setSortOrder("desc"); }}>
                    Project Z-A
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => { setSortBy("status"); setSortOrder("asc"); }}>
                    Status A-Z
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => { setSortBy("status"); setSortOrder("desc"); }}>
                    Status Z-A
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => { setSortBy("payment"); setSortOrder("asc"); }}>
                    Payment ↑
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => { setSortBy("payment"); setSortOrder("desc"); }}>
                    Payment ↓
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => { setSortBy("location"); setSortOrder("asc"); }}>
                    Location A-Z
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => { setSortBy("location"); setSortOrder("desc"); }}>
                    Location Z-A
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <div className="flex gap-1 border rounded-md p-1 h-8 items-center">
                <Button
                  variant={upcomingViewMode === "list" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setUpcomingViewMode("list")}
                  className="h-7 w-7 p-0"
                >
                  <List className="h-4 w-4" />
                </Button>
                <Button
                  variant={upcomingViewMode === "grid" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setUpcomingViewMode("grid")}
                  className="h-7 w-7 p-0"
                >
                  <Grid3x3 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>

          {sortedGigs.length === 0 ? (
            <Card>
              <CardContent className="py-8">
                <p className="text-center text-sm text-muted-foreground">
                  {debouncedSearchQuery 
                    ? `No gigs found matching "${debouncedSearchQuery}".`
                    : "No upcoming gigs in the selected date range."}
                </p>
              </CardContent>
            </Card>
          ) : upcomingViewMode === "grid" ? (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {sortedGigs.map((gig) => (
                  <DashboardGigItemGrid key={gig.gigId} gig={gig} />
                ))}
              </div>
              {hasNextPage && (
                <div ref={loadMoreRef} className="flex justify-center pt-4">
                  {isFetchingNextPage ? (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                      Loading more gigs...
                    </div>
                  ) : (
                    <Button
                      onClick={() => fetchNextPage()}
                      variant="outline"
                    >
                      Load More
                    </Button>
                  )}
                </div>
              )}
            </>
          ) : (
            <div className="space-y-3">
              {sortedGigs.map((gig) => (
                <DashboardGigItem key={gig.gigId} gig={gig} />
              ))}
              {hasNextPage && (
                <div ref={loadMoreRef} className="py-4">
                  {isFetchingNextPage ? (
                    <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                      Loading more gigs...
                    </div>
                  ) : (
                    <div className="flex justify-center">
                      <Button
                        onClick={() => fetchNextPage()}
                        variant="outline"
                      >
                        Load More
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </section>
      )}

      {/* Recent Gigs Section */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowRecentGigs(!showRecentGigs)}
              className="gap-2"
            >
              <History className="h-5 w-5" />
              <h3 className="text-xl font-semibold">Recent Gigs</h3>
              {showRecentGigs ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </Button>
            <span className="text-sm text-muted-foreground">
              (Last 30 days)
            </span>
          </div>
        </div>

        {showRecentGigs && (
          <>
            {isLoadingRecent ? (
              <div className="space-y-3">
                <Skeleton className="h-24 w-full" />
                <Skeleton className="h-24 w-full" />
                <Skeleton className="h-24 w-full" />
              </div>
            ) : recentPastGigs.length === 0 ? (
              <Card>
                <CardContent className="py-8">
                  <p className="text-center text-sm text-muted-foreground">
                    No recent gigs in the past 30 days.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {recentPastGigs.map((gig) => (
                  <DashboardGigItem key={gig.gigId} gig={gig} />
                ))}
              </div>
            )}
            {/* View All Past Gigs Link */}
            <div className="pt-4">
              <Link href="/history">
                <Button variant="outline" className="w-full gap-2">
                  View All Past Gigs
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          </>
        )}
      </section>

      {/* Create Gig Dialog */}
      <CreateGigDialog
        open={createGigDialogOpen}
        onOpenChange={setCreateGigDialogOpen}
        projectId={null}
        onSuccess={(gigId) => {
          // Invalidate dashboard queries to refetch with new gig
          queryClient.invalidateQueries({ 
            queryKey: ["dashboard-gigs"],
            refetchType: 'active'
          });
          queryClient.invalidateQueries({ 
            queryKey: ["gigs"],
            refetchType: 'active'
          });
          setCreateGigDialogOpen(false);
          router.push(`/gigs/${gigId}?returnUrl=/dashboard`);
        }}
      />
    </div>
  );
}
