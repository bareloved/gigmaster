"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import { useDocumentTitle } from "@/hooks/use-document-title";
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
  Trash2,
  Download,
  Mail,
  MoreVertical,
  Check,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import Link from "next/link";
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
  musician_name: string | null;
  invitation_status: string | null;
  payment_status: string | null;
  role_name: string | null;
}

interface GigOwnerProfile {
  name: string | null;
}

interface GigBandRow {
  id: string;
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
  band_id: string | null;
  hero_image_url: string | null;
  gig_type: string | null;
  owner: GigOwnerProfile | GigOwnerProfile[] | null;
  band: GigBandRow | GigBandRow[] | null;
  gig_roles: GigRoleRow[];
}

const GigEditorPanel = dynamic(
  () => import("@/components/gigpack/editor/gig-editor-panel").then((mod) => mod.GigEditorPanel),
  { ssr: false }
);

const CalendarImportSheet = dynamic(
  () => import("@/components/calendar/calendar-import-sheet").then((mod) => mod.CalendarImportSheet),
  { ssr: false }
);

type ViewMode = "list" | "grid";
type TimeFilter = "upcoming" | "previous";

export default function AllGigsPage() {
  useDocumentTitle("Gigs");
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

  // Import sheet state
  const [isImportSheetOpen, setIsImportSheetOpen] = useState(false);

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
          band_id,
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
          band:bands (
            id,
            name
          ),
          gig_roles (
            id,
            musician_id,
            musician_name,
            role_name,
            invitation_status,
            agreed_fee,
            payment_status
          )
        `
        );

      // Exclude trashed gigs
      query = query.is("deleted_at", null);

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

          const acceptedMusicians = roles
            .filter(r => r?.invitation_status === 'accepted' && r?.musician_name)
            .map(r => ({ name: r.musician_name! }));

          const ownerData = Array.isArray(gig.owner) ? gig.owner[0] : gig.owner;
          const hostName = ownerData?.name || null;
          const bandData = Array.isArray(gig.band) ? gig.band[0] : gig.band;

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
            bandId: gig.band_id || null,
            bandName: bandData?.name || null,
            heroImageUrl: gig.hero_image_url || null,
            gigType: gig.gig_type || null,
            playerGigRoleId: playerRole?.id || null,
            acceptedMusicians,
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
        (gig.locationName && gig.locationName.toLowerCase().includes(query)) ||
        (gig.bandName && gig.bandName.toLowerCase().includes(query))
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
      {/* ===== MOBILE Header (below sm) ===== */}
      <div className="sm:hidden relative flex items-center justify-between">
        <h2 className="text-xl font-bold tracking-tight whitespace-nowrap">All Gigs</h2>
        <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-1 border rounded-md p-0.5">
          <Button
            variant={timeFilter === "previous" ? "secondary" : "ghost"}
            size="sm"
            onClick={() => setTimeFilter("previous")}
            className="gap-1.5 h-7 px-1.5 text-xs text-muted-foreground"
          >
            <History className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant={timeFilter === "upcoming" ? "secondary" : "ghost"}
            size="sm"
            onClick={() => setTimeFilter("upcoming")}
            className="gap-1.5 h-7 px-1.5 text-xs"
          >
            <CalendarDays className="h-3.5 w-3.5" />
          </Button>
        </div>
        <Button onClick={handleCreateGig} className="gap-2 h-9 text-sm shrink-0">
          <Plus className="h-4 w-4" />
          <span className="hidden xs:inline">Create Gig</span>
          <span className="xs:hidden sr-only">New gig</span>
        </Button>
      </div>
      {/* Mobile Search + More menu */}
      <div className="sm:hidden flex items-center gap-2">
        <div className="relative flex-1 min-w-0">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 pr-8 h-9 text-sm rounded-full border-border bg-card"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="h-9 w-9 p-0 shrink-0">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => { setViewMode("list"); localStorage.setItem("gigs-view-mode", "list"); }}>
              <List className="h-4 w-4 mr-2" />
              List view
              {viewMode === "list" && <Check className="h-4 w-4 ml-auto" />}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => { setViewMode("grid"); localStorage.setItem("gigs-view-mode", "grid"); }}>
              <Grid3x3 className="h-4 w-4 mr-2" />
              Grid view
              {viewMode === "grid" && <Check className="h-4 w-4 ml-auto" />}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => setIsImportSheetOpen(true)}>
              <Download className="h-4 w-4 mr-2" />
              Import gigs
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/invitations">
                <Mail className="h-4 w-4 mr-2" />
                Invitations
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/gigs/trash">
                <Trash2 className="h-4 w-4 mr-2" />
                Trash
              </Link>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* ===== DESKTOP Header (sm and above) ===== */}
      <div className="hidden sm:flex items-center gap-4">
        <div className="flex-1">
          <h2 className="text-2xl lg:text-3xl font-bold tracking-tight">All Gigs</h2>
          <p className="text-sm text-muted-foreground">
            Manage all your gigs in one place
          </p>
        </div>
        <div className="flex items-center gap-1 border rounded-md p-1">
          <Link href="/gigs/trash">
            <Button variant="ghost" size="sm" className="h-8 px-2.5 text-muted-foreground">
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </Link>
          <div className="w-px h-4 bg-border" />
          <Button
            variant={timeFilter === "previous" ? "secondary" : "ghost"}
            size="sm"
            onClick={() => setTimeFilter("previous")}
            className="gap-1.5 h-8 px-3 text-sm text-muted-foreground"
          >
            <History className="h-3.5 w-3.5" />
            Previous
          </Button>
          <Button
            variant={timeFilter === "upcoming" ? "secondary" : "ghost"}
            size="sm"
            onClick={() => setTimeFilter("upcoming")}
            className="gap-1.5 h-8 px-3 text-sm"
          >
            <CalendarDays className="h-3.5 w-3.5" />
            Upcoming
          </Button>
        </div>
        <div className="flex-1 flex justify-end gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsImportSheetOpen(true)}
            className="gap-1.5 h-10 text-sm"
          >
            <Download className="h-4 w-4" />
            Import
          </Button>
          <Button onClick={handleCreateGig} className="gap-2 h-10 text-sm">
            <Plus className="h-4 w-4" />
            Create Gig
          </Button>
        </div>
      </div>
      {/* Desktop View Toggle + Search + Invitations */}
      <div className="hidden sm:flex items-center justify-between">
        <div className="flex items-center gap-1 border border-border/60 bg-muted/40 rounded-lg p-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => { setViewMode("list"); localStorage.setItem("gigs-view-mode", "list"); }}
            className={`h-8 w-8 p-0 ${viewMode === "list" ? "bg-white dark:bg-zinc-800 shadow-sm border border-border/50" : "hover:bg-background/60"}`}
          >
            <List className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => { setViewMode("grid"); localStorage.setItem("gigs-view-mode", "grid"); }}
            className={`h-8 w-8 p-0 ${viewMode === "grid" ? "bg-white dark:bg-zinc-800 shadow-sm border border-border/50" : "hover:bg-background/60"}`}
          >
            <Grid3x3 className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative w-56">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-8 h-10 text-sm rounded-full border-border bg-card"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
          <Link href="/invitations">
            <Button variant="outline" size="sm" className="gap-1.5 h-10 text-sm">
              <Mail className="h-4 w-4" />
              Invitations
            </Button>
          </Link>
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
          setIsEditorOpen(false);
          setEditingGigId(null);
        }}
      />

      {/* Calendar Import Sheet */}
      <CalendarImportSheet
        open={isImportSheetOpen}
        onOpenChange={setIsImportSheetOpen}
      />
    </div>
  );
}
