"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import {
  Music,
  Plus,
  Search,
  X,
  Grid3x3,
  List,
  CalendarDays,
  History,
} from "lucide-react";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { useUser } from "@/lib/providers/user-provider";
import { DashboardGigItem } from "@/components/dashboard/gig-item";
import { DashboardGigItemGrid } from "@/components/dashboard/gig-item-grid";
import type { DashboardGig } from "@/lib/types/shared";
import dynamic from "next/dynamic";
import { getGig } from "./actions";

// Type definitions for database join results
interface GigRoleRow {
  id: string;
  musician_id: string | null;
  invitation_status: string | null;
  payment_status: string | null;
  role_name: string | null;
}

interface GigOwnerProfile {
  name: string | null;
}

interface GigWithRoles {
  id: string;
  title: string;
  date: string;
  start_time: string | null;
  end_time: string | null;
  call_time: string | null;
  location_name: string | null;
  status: string | null;
  owner_id: string;
  hero_image_url: string | null;
  gig_type: string | null;
  owner: GigOwnerProfile | GigOwnerProfile[] | null;
  gig_roles: GigRoleRow[];
}

const GigEditorPanel = dynamic(
  () => import("@/components/gigpack/editor/gig-editor-panel").then((mod) => mod.GigEditorPanel),
  { ssr: false }
);

type ViewMode = "list" | "grid";
type TimeFilter = "upcoming" | "previous";

export default function AllGigsPage() {
  const { user } = useUser();
  const router = useRouter();

  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("gigs-view-mode");
      if (saved === "list" || saved === "grid") return saved;
    }
    return "grid";
  });
  const [timeFilter, setTimeFilter] = useState<TimeFilter>("upcoming");
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");

  // Editor state
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingGigId, setEditingGigId] = useState<string | null>(null);

  // Fetch gig data when editing
  const { data: editingGig, isLoading: isLoadingEditingGig } = useQuery({
    queryKey: ["gig-editor", editingGigId],
    queryFn: async () => {
      if (!editingGigId) return null;
      return await getGig(editingGigId);
    },
    enabled: !!editingGigId && isEditorOpen,
    staleTime: 0, // Always refetch
  });


  const handleCreateGig = () => {
    setEditingGigId(null);
    setIsEditorOpen(true);
  };

  const handleEditGig = (gig: DashboardGig) => {
    if (gig.isManager) {
      setEditingGigId(gig.gigId);
      setIsEditorOpen(true);
    } else {
      // Players go to pack
      router.push(`/gigs/${gig.gigId}/pack`);
    }
  };

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Fetch all gigs (with and without projects) using infinite query
  const {
    data,
    isLoading,
    hasNextPage,
    fetchNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: ["all-gigs", user?.id, timeFilter],
    queryFn: async ({ pageParam = 0 }) => {
      const supabase = createClient();
      const limit = 20;
      const from = pageParam * limit;
      const to = from + limit - 1;
      const today = new Date().toISOString().split("T")[0];
      const isUpcoming = timeFilter === "upcoming";

      let query = supabase
        .from("gigs")
        .select(
          `
          id,
          owner_id,
          title,
          date,
          start_time,
          end_time,
          call_time,
          location_name,
          status,
          hero_image_url,
          gig_type,
          owner:profiles!gigs_owner_profiles_fkey (
            id,
            name
          ),
          gig_roles (
            id,
            musician_id,
            role_name,
            invitation_status,
            agreed_fee,
            payment_status
          )
        `
        );

      if (isUpcoming) {
        query = query.gte("date", today).order("date", { ascending: true });
      } else {
        query = query.lt("date", today).order("date", { ascending: false });
      }

      const { data: gigs, error } = await query.range(from, to);

      if (error) throw error;

      // Transform to DashboardGig format
      // Filter and transform gigs where user is either manager or player
      // Exclude declined invitations from player perspective
      const transformedGigs: DashboardGig[] = ((gigs || []) as GigWithRoles[])
        .filter((gig) => {
          const roles = Array.isArray(gig.gig_roles) ? gig.gig_roles : [];
          // Only consider roles that are not pending or declined
          const userRoles = roles.filter((r) =>
            r?.musician_id === user?.id &&
            r?.invitation_status !== 'pending' &&
            r?.invitation_status !== 'declined'
          );
          // Check if user is manager (owner of the gig)
          const isManager = gig.owner_id === user?.id;
          const isPlayer = userRoles.length > 0;
          // Only include gigs where user is manager or player (with active invitation)
          return isManager || isPlayer;
        })
        .map((gig) => {
          const roles = Array.isArray(gig.gig_roles) ? gig.gig_roles : [];
          // Only consider roles that are not pending or declined
          const userRoles = roles.filter((r) =>
            r?.musician_id === user?.id &&
            r?.invitation_status !== 'pending' &&
            r?.invitation_status !== 'declined'
          );
          // Check if user is manager (owner of the gig)
          const isManager = gig.owner_id === user?.id;
          const isPlayer = userRoles.length > 0;

          const playerRole = userRoles[0];
          let paymentStatus: "paid" | "unpaid" | null = null;
          if (isPlayer && playerRole) {
            paymentStatus = playerRole.payment_status === 'paid' ? "paid" : "unpaid";
          }

          const ownerData = Array.isArray(gig.owner) ? gig.owner[0] : gig.owner;
          const hostName = ownerData?.name || null;

          return {
            gigId: gig.id,
            gigTitle: gig.title,
            date: gig.date,
            startTime: gig.start_time,
            endTime: gig.end_time,
            callTime: gig.call_time,
            locationName: gig.location_name,
            status: gig.status,
            isManager,
            isPlayer,
            playerRoleName: playerRole?.role_name || null,
            invitationStatus: playerRole?.invitation_status || null,
            paymentStatus,
            hostId: gig.owner_id,
            hostName,
            heroImageUrl: gig.hero_image_url || null,
            gigType: gig.gig_type || null,
            playerGigRoleId: playerRole?.id || null,
          };
        });

      return {
        gigs: transformedGigs,
        nextPage: transformedGigs.length === limit ? pageParam + 1 : undefined,
      };
    },
    getNextPageParam: (lastPage) => lastPage.nextPage,
    enabled: !!user?.id,
    initialPageParam: 0,
  });

  // Flatten all pages into a single array
  const allGigs = useMemo(() => {
    return data?.pages.flatMap((page) => page.gigs) || [];
  }, [data]);

  // Infinite scroll observer
  const loadMoreRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!loadMoreRef.current || !hasNextPage || isFetchingNextPage) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          fetchNextPage();
        }
      },
      { threshold: 0.1 }
    );

    observer.observe(loadMoreRef.current);

    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  // Filter by search query
  const searchFilteredGigs = useMemo(() => {
    if (!debouncedSearchQuery.trim()) return allGigs;

    const query = debouncedSearchQuery.toLowerCase().trim();

    return allGigs.filter((gig) => {
      return (
        gig.gigTitle.toLowerCase().includes(query) ||
        (gig.hostName && gig.hostName.toLowerCase().includes(query)) ||
        (gig.locationName && gig.locationName.toLowerCase().includes(query))
      );
    });
  }, [allGigs, debouncedSearchQuery]);

  const filteredGigs = searchFilteredGigs;

  // Group gigs by month
  const gigsByMonth = useMemo(() => {
    const groups: { [key: string]: { label: string; gigs: DashboardGig[] } } = {};

    filteredGigs.forEach((gig) => {
      const date = new Date(gig.date);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const monthLabel = date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

      if (!groups[monthKey]) {
        groups[monthKey] = { label: monthLabel, gigs: [] };
      }
      groups[monthKey].gigs.push(gig);
    });

    // Sort chronologically for upcoming, reverse for previous
    return Object.entries(groups)
      .sort(([a], [b]) => timeFilter === "upcoming" ? a.localeCompare(b) : b.localeCompare(a))
      .map(([key, value]) => ({ key, ...value }));
  }, [filteredGigs, timeFilter]);

  return (
    <div className="space-y-4 sm:space-y-5 lg:space-y-6">
      {/* Header + Toggle */}
      <div className="flex items-center gap-3 sm:gap-4">
        <div className="flex-1">
          <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight">All Gigs</h2>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Manage all your gigs in one place
          </p>
        </div>
        {/* Upcoming / Previous Toggle - centered */}
        <div className="flex items-center gap-1 border rounded-md p-0.5 sm:p-1">
          <Button
            variant={timeFilter === "previous" ? "secondary" : "ghost"}
            size="sm"
            onClick={() => setTimeFilter("previous")}
            className="gap-1.5 h-7 sm:h-8 px-2.5 sm:px-3 text-xs sm:text-sm text-muted-foreground"
          >
            <History className="h-3.5 w-3.5" />
            Previous
          </Button>
          <Button
            variant={timeFilter === "upcoming" ? "secondary" : "ghost"}
            size="sm"
            onClick={() => setTimeFilter("upcoming")}
            className="gap-1.5 h-7 sm:h-8 px-2.5 sm:px-3 text-xs sm:text-sm"
          >
            <CalendarDays className="h-3.5 w-3.5" />
            Upcoming
          </Button>
        </div>
        <div className="flex-1 flex justify-end">
          <Button onClick={handleCreateGig} className="gap-2 h-9 sm:h-10 text-sm">
            <Plus className="h-4 w-4" />
            <span className="hidden xs:inline">Create Gig</span>
            <span className="xs:hidden">New</span>
          </Button>
        </div>
      </div>

      {/* Filters - Search and View Controls */}
      <div className="flex items-center justify-between gap-2 sm:gap-3 pb-2 border-b">
        {/* View Mode Toggle */}
        <div className="flex items-center gap-1 border rounded-md p-0.5 sm:p-1">
          <Button
            variant={viewMode === "list" ? "secondary" : "ghost"}
            size="sm"
            onClick={() => { setViewMode("list"); localStorage.setItem("gigs-view-mode", "list"); }}
            className="h-7 w-7 sm:h-8 sm:w-8 p-0"
          >
            <List className="h-4 w-4" />
          </Button>
          <Button
            variant={viewMode === "grid" ? "secondary" : "ghost"}
            size="sm"
            onClick={() => { setViewMode("grid"); localStorage.setItem("gigs-view-mode", "grid"); }}
            className="h-7 w-7 sm:h-8 sm:w-8 p-0"
          >
            <Grid3x3 className="h-4 w-4" />
          </Button>
        </div>

        {/* Search */}
        <div className="relative flex-1 max-w-[200px] sm:max-w-[250px]">
          <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8 pr-8 h-8 sm:h-9 text-sm"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-2 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* Gigs List/Grid */}
      {isLoading ? (
        <div className="space-y-2 sm:space-y-3">
          <Skeleton className="h-32 sm:h-40 w-full" />
          <Skeleton className="h-32 sm:h-40 w-full" />
          <Skeleton className="h-32 sm:h-40 w-full" />
        </div>
      ) : filteredGigs.length === 0 ? (
        <Card className="p-3 sm:p-4 lg:p-6">
          <CardContent className="py-8 sm:py-12 px-0">
            <div className="flex flex-col items-center text-center">
              <Music className="h-10 w-10 sm:h-12 sm:w-12 text-muted-foreground mb-3 sm:mb-4" />
              <h3 className="text-base sm:text-lg font-semibold mb-1">
                {timeFilter === "upcoming" ? "No upcoming gigs" : "No previous gigs"}
              </h3>
              <p className="text-xs sm:text-sm text-muted-foreground mb-3 sm:mb-4">
                {searchQuery
                  ? "Try adjusting your search query."
                  : timeFilter === "upcoming"
                    ? "Create your first gig to get started."
                    : "Your past gigs will appear here."}
              </p>
              {timeFilter === "upcoming" && (
                <Button onClick={handleCreateGig} size="sm" className="gap-2 h-9">
                  <Plus className="h-4 w-4" />
                  Create Gig
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          {gigsByMonth.map((monthGroup) => (
            <div key={monthGroup.key} className={`space-y-2 sm:space-y-3 ${timeFilter === "previous" ? "opacity-75" : ""}`}>
              {/* Month Header */}
              <h3 className="text-base sm:text-lg font-semibold text-muted-foreground sticky top-0 bg-background py-1.5 sm:py-2 z-10">
                {monthGroup.label}
              </h3>

              {viewMode === "list" ? (
                <div className="space-y-2 sm:space-y-3">
                  {monthGroup.gigs.map((gig) => (
                    <DashboardGigItem
                      key={gig.gigId}
                      gig={gig}
                      onClick={() => handleEditGig(gig)}
                    />
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                  {monthGroup.gigs.map((gig, index) => (
                    <DashboardGigItemGrid
                      key={gig.gigId}
                      gig={gig}
                      onClick={() => handleEditGig(gig)}
                      index={index}
                    />
                  ))}
                </div>
              )}
            </div>
          ))}

          {/* Load More Trigger */}
          {hasNextPage && (
            <div ref={loadMoreRef} className="py-4 text-center">
              {isFetchingNextPage ? (
                <Skeleton className="h-24 w-full" />
              ) : (
                <p className="text-sm text-muted-foreground">Loading more gigs...</p>
              )}
            </div>
          )}
        </>
      )}

      {/* Gig Editor Sliding Panel */}
      <GigEditorPanel
        key={editingGigId || "create"}
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
          // Cache invalidation handled by useSaveGigPack hook
          setIsEditorOpen(false);
          setEditingGigId(null);
        }}
        onUpdateSuccess={() => {
          // Cache invalidation handled by useSaveGigPack hook
          // Just keep the sheet open for continued editing
        }}
      />
    </div>
  );
}
