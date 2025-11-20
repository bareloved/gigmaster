"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Music,
  Plus,
  Search,
  X,
  Grid3x3,
  List,
} from "lucide-react";
import { useInfiniteQuery, useQuery, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { useUser } from "@/lib/providers/user-provider";
import { DashboardGigItem } from "@/components/dashboard-gig-item";
import { DashboardGigItemGrid } from "@/components/dashboard-gig-item-grid";
import { CreateGigDialog } from "@/components/create-gig-dialog";
import type { DashboardGig } from "@/lib/types/shared";
import { parseISO } from "date-fns";

type ViewMode = "list" | "grid";

export default function AllGigsPage() {
  const { user } = useUser();
  const router = useRouter();
  const queryClient = useQueryClient();

  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [projectFilter, setProjectFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");
  const [createGigDialogOpen, setCreateGigDialogOpen] = useState(false);

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Fetch user's projects for filter dropdown (excluding personal projects)
  const { data: projects = [] } = useQuery({
    queryKey: ["projects", user?.id],
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("projects")
        .select("id, name, is_personal")
        .eq("owner_id", user!.id)
        .neq("is_personal", true)
        .order("name");

      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
  });

  // Fetch all gigs (with and without projects) using infinite query
  const {
    data,
    isLoading,
    hasNextPage,
    fetchNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: ["all-gigs", user?.id],
    queryFn: async ({ pageParam = 0 }) => {
      const supabase = createClient();
      const limit = 20;
      const from = pageParam * limit;
      const to = from + limit - 1;

      const { data: gigs, error } = await supabase
        .from("gigs")
        .select(
          `
          id,
          title,
          date,
          start_time,
          end_time,
          location_name,
          status,
          project_id,
          projects (
            id,
            name,
            owner_id,
            is_personal,
            owner:profiles!projects_owner_id_fkey (
              name
            )
          ),
          gig_roles (
            id,
            musician_id,
            role_name,
            invitation_status,
            agreed_fee,
            is_paid
          )
        `
        )
        .gte("date", new Date().toISOString().split("T")[0])
        .order("date", { ascending: true })
        .range(from, to);

      if (error) throw error;

      // Transform to DashboardGig format
      // Filter and transform gigs where user is either manager or player
      const transformedGigs: DashboardGig[] = (gigs || [])
        .filter((gig: any) => {
          const roles = Array.isArray(gig.gig_roles) ? gig.gig_roles : [];
          const userRoles = roles.filter((r: any) => r?.musician_id === user?.id);
          // Check if user is manager (owner of the project)
          const isManager = gig.projects?.owner_id === user?.id;
          const isPlayer = userRoles.length > 0;
          // Only include gigs where user is manager or player
          return isManager || isPlayer;
        })
        .map((gig: any) => {
          const roles = Array.isArray(gig.gig_roles) ? gig.gig_roles : [];
          const userRoles = roles.filter((r: any) => r?.musician_id === user?.id);
          // Check if user is manager (owner of the project)
          const isManager = gig.projects?.owner_id === user?.id;
          const isPlayer = userRoles.length > 0;

          const playerRole = userRoles[0];
          let paymentStatus: "paid" | "unpaid" | null = null;
          if (isPlayer && playerRole) {
            paymentStatus = playerRole.is_paid ? "paid" : "unpaid";
          }

          // Extract host name from project owner
          const projectOwner = gig.projects
            ? (Array.isArray(gig.projects.owner)
              ? gig.projects.owner[0]
              : gig.projects.owner)
            : null;
          const hostName = projectOwner?.name || null;

          return {
            gigId: gig.id,
            gigTitle: gig.title,
            date: gig.date,
            startTime: gig.start_time,
            endTime: gig.end_time,
            locationName: gig.location_name,
            status: gig.status,
            projectId: gig.project_id,
            projectName: gig.projects?.name || null,
            isManager,
            isPlayer,
            playerRoleName: playerRole?.role_name || null,
            invitationStatus: playerRole?.invitation_status || null,
            paymentStatus,
            hostName,
            isPersonalProject: gig.projects?.is_personal || false,
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

  // Filter by project
  const projectFilteredGigs = useMemo(() => {
    if (projectFilter === "all") return allGigs;
    if (projectFilter === "none") {
      return allGigs.filter((g) => !g.projectId);
    }
    return allGigs.filter((g) => g.projectId === projectFilter);
  }, [allGigs, projectFilter]);

  // Filter by search query
  const searchFilteredGigs = useMemo(() => {
    if (!debouncedSearchQuery.trim()) return projectFilteredGigs;

    const query = debouncedSearchQuery.toLowerCase().trim();

    return projectFilteredGigs.filter((gig) => {
      return (
        gig.gigTitle.toLowerCase().includes(query) ||
        (gig.projectName && gig.projectName.toLowerCase().includes(query)) ||
        (gig.locationName && gig.locationName.toLowerCase().includes(query))
      );
    });
  }, [projectFilteredGigs, debouncedSearchQuery]);

  const filteredGigs = searchFilteredGigs;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">All Gigs</h2>
          <p className="text-muted-foreground">Manage all your gigs in one place</p>
        </div>

        <Button onClick={() => setCreateGigDialogOpen(true)} size="sm" className="gap-2">
          <Plus className="h-4 w-4" />
          Create Gig
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-2 border-b">
        {/* Project Filter */}
        <Select value={projectFilter} onValueChange={setProjectFilter}>
          <SelectTrigger className="w-[200px] h-9 text-sm">
            <SelectValue placeholder="Filter by project" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Projects</SelectItem>
            <SelectItem value="none">My Gigs</SelectItem>
            {projects.map((project) => (
              <SelectItem key={project.id} value={project.id}>
                {project.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Search and View Controls */}
        <div className="flex items-center gap-2">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search gigs..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 pr-8 h-9 w-[200px] sm:w-[250px]"
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

          {/* View Mode Toggle */}
          <div className="flex items-center gap-1 border rounded-md p-1">
            <Button
              variant={viewMode === "list" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setViewMode("list")}
              className="h-7 px-2"
            >
              <List className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === "grid" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setViewMode("grid")}
              className="h-7 px-2"
            >
              <Grid3x3 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Link to History */}
      <div className="flex items-center justify-start">
        <Button
          variant="link"
          onClick={() => router.push('/history')}
          className="text-sm text-muted-foreground hover:text-foreground px-0 h-auto py-1"
        >
          View past gigs →
        </Button>
      </div>

      {/* Gigs List/Grid */}
      {isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      ) : filteredGigs.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <div className="flex flex-col items-center text-center">
              <Music className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-1">No gigs found</h3>
              <p className="text-sm text-muted-foreground mb-4">
                {searchQuery || projectFilter !== "all"
                  ? "Try adjusting your filters or search query."
                  : "Create your first gig to get started."}
              </p>
              <Button onClick={() => setCreateGigDialogOpen(true)} size="sm" className="gap-2">
                <Plus className="h-4 w-4" />
                Create Gig
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          {viewMode === "list" ? (
            <div className="space-y-3">
              {filteredGigs.map((gig) => (
                <DashboardGigItem key={gig.gigId} gig={gig} />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredGigs.map((gig) => (
                <DashboardGigItemGrid key={gig.gigId} gig={gig} />
              ))}
            </div>
          )}

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

      {/* Create Gig Dialog */}
      <CreateGigDialog
        open={createGigDialogOpen}
        onOpenChange={setCreateGigDialogOpen}
        projectId={null}
        onSuccess={(gigId) => {
          queryClient.invalidateQueries({ queryKey: ["all-gigs"] });
          queryClient.invalidateQueries({ queryKey: ["dashboard-gigs"] });
          queryClient.invalidateQueries({ queryKey: ["gigs"] });
          setCreateGigDialogOpen(false);
          router.push(`/gigs/${gigId}?returnUrl=/gigs`);
        }}
      />
    </div>
  );
}

