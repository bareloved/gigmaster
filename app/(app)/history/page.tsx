"use client";

import { useDocumentTitle } from "@/hooks/use-document-title";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Music, Briefcase, Grid3x3, List, CalendarDays, Search, X, History as HistoryIcon } from "lucide-react";
import { useInfiniteQuery, useQuery, useQueryClient } from "@tanstack/react-query";
import { listAllPastGigs, type DashboardGig } from "@/lib/api/dashboard-gigs";
import { DashboardGigItem } from "@/components/dashboard/gig-item";
import { DashboardGigItemGrid } from "@/components/dashboard/gig-item-grid";
import { useUser } from "@/lib/providers/user-provider";
import { useState, useMemo, useRef, useEffect } from "react";
import dynamic from "next/dynamic";
import { getGig } from "../gigs/actions";

const GigEditorPanel = dynamic(
  () => import("@/components/gigpack/editor/gig-editor-panel").then((mod) => mod.GigEditorPanel),
  { ssr: false }
);
import {
  format as formatDate,
  subDays,
  subYears
} from "date-fns";

type RoleFilter = "all" | "manager" | "player";
type ViewMode = "list" | "grid";
type DateRangePreset = "30days" | "90days" | "1year" | "all" | "custom";

// Date range presets for past gigs
const getPastDateRangePreset = (preset: DateRangePreset) => {
  const today = new Date();
  today.setHours(23, 59, 59, 999); // End of today

  switch (preset) {
    case "30days":
      return { from: subDays(today, 30), to: today };
    case "90days":
      return { from: subDays(today, 90), to: today };
    case "1year":
      return { from: subYears(today, 1), to: today };
    case "all":
      // Very old date to get all past gigs
      return { from: new Date(2000, 0, 1), to: today };
    default:
      return { from: new Date(2000, 0, 1), to: today };
  }
};

export default function HistoryPage() {
  useDocumentTitle("History");
  const { user } = useUser();
  const queryClient = useQueryClient();
  const [roleFilter, setRoleFilter] = useState<RoleFilter>("all");
  const [viewMode, setViewMode] = useState<ViewMode>("list");

  // Editor state
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingGigId, setEditingGigId] = useState<string | null>(null);

  // Fetch gig data when editing
  const { data: editingGig, isLoading: isLoadingEditingGig } = useQuery({
    queryKey: ["gig-editor", editingGigId],
    queryFn: () => editingGigId ? getGig(editingGigId) : null,
    enabled: !!editingGigId && isEditorOpen,
  });

  const handleEditGig = (gig: DashboardGig) => {
    if (gig.isManager) {
      setEditingGigId(gig.gigId);
      setIsEditorOpen(true);
    }
  };

  // Date range state (default: all time)
  const [dateRangePreset, setDateRangePreset] = useState<DateRangePreset>("all");
  const [dateRange, setDateRange] = useState<{ from: Date; to: Date }>(() => getPastDateRangePreset("all"));
  const [customDatePickerOpen, setCustomDatePickerOpen] = useState(false);

  // Search state with debouncing
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");

  // Debounce search input (300ms)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Fetch all past gigs with pagination
  const {
    data,
    isLoading,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
  } = useInfiniteQuery({
    queryKey: [
      "all-past-gigs",
      user?.id,
      dateRange.from.toISOString(),
      dateRange.to.toISOString()
    ],
    queryFn: ({ pageParam = 0 }) => listAllPastGigs(user!.id, {
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

  // Filter gigs by date range (client-side, since API returns all past)
  const dateFilteredGigs = useMemo(() => {
    if (dateRangePreset === "all") return allGigs;

    return allGigs.filter(gig => {
      const gigDate = new Date(gig.date);
      return gigDate >= dateRange.from && gigDate <= dateRange.to;
    });
  }, [allGigs, dateRange, dateRangePreset]);

  // Filter gigs by role perspective
  const roleFilteredGigs = useMemo(() => {
    let filtered = dateFilteredGigs;

    if (roleFilter === "manager") {
      filtered = filtered.filter(g => g.isManager);
    } else if (roleFilter === "player") {
      filtered = filtered.filter(g => g.isPlayer);
    }

    return filtered;
  }, [dateFilteredGigs, roleFilter]);

  // Filter gigs by search query (gig title, host name, location)
  const searchFilteredGigs = useMemo(() => {
    if (!debouncedSearchQuery.trim()) return roleFilteredGigs;

    const query = debouncedSearchQuery.toLowerCase().trim();

    return roleFilteredGigs.filter(gig => {
      const titleMatch = gig.gigTitle?.toLowerCase().includes(query);
      const hostMatch = gig.hostName?.toLowerCase().includes(query);
      const locationMatch = gig.locationName?.toLowerCase().includes(query);

      return titleMatch || hostMatch || locationMatch;
    });
  }, [roleFilteredGigs, debouncedSearchQuery]);

  // Group gigs by month (reverse chronological for history)
  const gigsByMonth = useMemo(() => {
    const groups: { [key: string]: { label: string; gigs: DashboardGig[] } } = {};

    searchFilteredGigs.forEach((gig) => {
      const date = new Date(gig.date);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const monthLabel = date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

      if (!groups[monthKey]) {
        groups[monthKey] = { label: monthLabel, gigs: [] };
      }
      groups[monthKey].gigs.push(gig);
    });

    // Return sorted by month key in reverse (most recent first for history)
    return Object.entries(groups)
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([key, value]) => ({ key, ...value }));
  }, [searchFilteredGigs]);

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

  // Handle preset button clicks
  const handlePresetChange = (preset: DateRangePreset) => {
    setDateRangePreset(preset);
    if (preset !== "custom") {
      setDateRange(getPastDateRangePreset(preset));
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

  if (!user) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <HistoryIcon className="h-8 w-8" />
          History
        </h2>
        <p className="text-muted-foreground">
          View all your past gigs
        </p>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          type="text"
          placeholder="Search by gig title, project, or location..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9 pr-9"
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

      {/* Filters */}
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
        <div className="flex flex-col sm:flex-row gap-4 lg:items-end">
          {/* Role Filter */}
          <div className="flex gap-2">
            <Button
              variant={roleFilter === "all" ? "default" : "outline"}
              size="sm"
              onClick={() => setRoleFilter("all")}
            >
              All Gigs
            </Button>
            <Button
              variant={roleFilter === "manager" ? "default" : "outline"}
              size="sm"
              onClick={() => setRoleFilter("manager")}
              className="gap-2"
            >
              <Briefcase className="h-4 w-4" />
              Managing
            </Button>
            <Button
              variant={roleFilter === "player" ? "default" : "outline"}
              size="sm"
              onClick={() => setRoleFilter("player")}
              className="gap-2"
            >
              <Music className="h-4 w-4" />
              Playing
            </Button>
          </div>

          <Separator orientation="vertical" className="hidden sm:block h-8" />

          {/* View Mode Toggle */}
          <div className="flex gap-1 border rounded-md p-1">
            <Button
              variant={viewMode === "list" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode("list")}
              className="h-8 w-8 p-0"
            >
              <List className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === "grid" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode("grid")}
              className="h-8 w-8 p-0"
            >
              <Grid3x3 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Date Range Filter Row */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-2 border-b">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <CalendarDays className="h-4 w-4" />
          <span>
            {dateRangePreset === "all"
              ? "All time"
              : `${formatDate(dateRange.from, "MMM d")} - ${formatDate(dateRange.to, "MMM d, yyyy")}`}
          </span>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            variant={dateRangePreset === "30days" ? "default" : "outline"}
            size="sm"
            onClick={() => handlePresetChange("30days")}
          >
            Last 30 days
          </Button>
          <Button
            variant={dateRangePreset === "90days" ? "default" : "outline"}
            size="sm"
            onClick={() => handlePresetChange("90days")}
          >
            Last 90 days
          </Button>
          <Button
            variant={dateRangePreset === "1year" ? "default" : "outline"}
            size="sm"
            onClick={() => handlePresetChange("1year")}
          >
            Last year
          </Button>
          <Button
            variant={dateRangePreset === "all" ? "default" : "outline"}
            size="sm"
            onClick={() => handlePresetChange("all")}
          >
            All time
          </Button>

          <Popover open={customDatePickerOpen} onOpenChange={setCustomDatePickerOpen}>
            <PopoverTrigger asChild>
              <Button
                variant={dateRangePreset === "custom" ? "default" : "outline"}
                size="sm"
              >
                Custom Range
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <div className="p-4 space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">From Date</label>
                  <CalendarComponent
                    mode="single"
                    selected={dateRange.from}
                    onSelect={(date) => date && handleCustomDateChange(date, dateRange.to)}
                  />
                </div>
                <Separator />
                <div className="space-y-2">
                  <label className="text-sm font-medium">To Date</label>
                  <CalendarComponent
                    mode="single"
                    selected={dateRange.to}
                    onSelect={(date) => date && handleCustomDateChange(dateRange.from, date)}
                    disabled={(date) => date > new Date() || date < dateRange.from}
                  />
                </div>
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="space-y-3">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      )}

      {/* Empty State */}
      {!isLoading && searchFilteredGigs.length === 0 && (
        <Card>
          <CardContent className="py-12">
            <div className="flex flex-col items-center justify-center text-center">
              <HistoryIcon className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">
                {debouncedSearchQuery ? "No gigs match your search" : "No past gigs found"}
              </h3>
              <p className="text-sm text-muted-foreground max-w-sm">
                {debouncedSearchQuery ? (
                  <>
                    No past gigs found matching &quot;{debouncedSearchQuery}&quot;. Try searching by gig title, project name, or location.
                  </>
                ) : roleFilter === "manager" ? (
                  "You haven't managed any past gigs yet."
                ) : roleFilter === "player" ? (
                  "You haven't played any past gigs yet."
                ) : (
                  "You don't have any past gigs yet."
                )}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Gigs List/Grid */}
      {!isLoading && searchFilteredGigs.length > 0 && (
        <>
          {gigsByMonth.map((monthGroup) => (
            <div key={monthGroup.key} className="space-y-3">
              {/* Month Header */}
              <h3 className="text-lg font-semibold text-muted-foreground sticky top-0 bg-background py-2 z-10">
                {monthGroup.label}
              </h3>

              {viewMode === "grid" ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {monthGroup.gigs.map((gig, index) => (
                    <DashboardGigItemGrid
                      key={gig.gigId}
                      gig={gig}
                      isPastGig={true}
                      returnUrl="/history"
                      onClick={() => handleEditGig(gig)}
                      index={index}
                    />
                  ))}
                </div>
              ) : (
                <div className="space-y-3">
                  {monthGroup.gigs.map((gig) => (
                    <DashboardGigItem
                      key={gig.gigId}
                      gig={gig}
                      isPastGig={true}
                      returnUrl="/history"
                      onClick={() => handleEditGig(gig)}
                    />
                  ))}
                </div>
              )}
            </div>
          ))}

          {/* Load More */}
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
      )}
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
        onUpdateSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ["all-past-gigs"] });
          queryClient.invalidateQueries({ queryKey: ["gig-editor", editingGigId] });
        }}
      />
    </div>
  );
}

