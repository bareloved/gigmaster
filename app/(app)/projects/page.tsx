"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Music2 } from "lucide-react";
import { listUserProjects } from "@/lib/api/projects";
import { CreateProjectDialog } from "@/components/create-project-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@/lib/providers/user-provider";
import { createClient } from "@/lib/supabase/client";

export default function ProjectsPage() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const queryClient = useQueryClient();
  const router = useRouter();
  const { user } = useUser();

  // Use TanStack Query for caching and automatic refetching
  // Include user.id in query key to prevent cross-user cache pollution
  const { data: projects = [], isLoading } = useQuery({
    queryKey: ["projects", user?.id],
    queryFn: listUserProjects,
    staleTime: 1000 * 60 * 5, // Consider data fresh for 5 minutes
    enabled: !!user,
  });

  // Fetch gigs for all projects
  const gigQueries = useQuery({
    queryKey: ["all-project-gigs", user?.id, projects.map(p => p.id).join(",")],
    queryFn: async () => {
      if (!projects.length || !user) return {};
      const supabase = createClient();
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) throw new Error("Not authenticated");

      // Fetch all gigs for all user projects in one query
      const projectIds = projects.map(p => p.id);
      const { data: gigs, error } = await supabase
        .from("gigs")
        .select("id, project_id, date")
        .in("project_id", projectIds);

      if (error) throw new Error(error.message || "Failed to fetch gigs");
      
      // Group by project_id
      const gigsByProject: Record<string, any[]> = {};
      (gigs || []).forEach(gig => {
        if (!gigsByProject[gig.project_id]) {
          gigsByProject[gig.project_id] = [];
        }
        gigsByProject[gig.project_id].push(gig);
      });
      
      return gigsByProject;
    },
    enabled: !!user && projects.length > 0,
    staleTime: 1000 * 60 * 5,
  });

  // Calculate upcoming gig counts per project
  const upcomingGigCounts = useMemo(() => {
    if (!gigQueries.data) return {};
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const counts: Record<string, number> = {};
    Object.entries(gigQueries.data).forEach(([projectId, gigs]) => {
      counts[projectId] = gigs.filter(gig => {
        const gigDate = new Date(gig.date);
        gigDate.setHours(0, 0, 0, 0);
        return gigDate >= today;
      }).length;
    });
    
    return counts;
  }, [gigQueries.data]);

  const handleProjectCreated = () => {
    // Invalidate and refetch projects for this user
    queryClient.invalidateQueries({ 
      queryKey: ["projects", user?.id],
      refetchType: 'active'
    });
    // Also invalidate gigs query so it refetches with new projects
    queryClient.invalidateQueries({ 
      queryKey: ["all-project-gigs", user?.id],
      refetchType: 'active'
    });
    setIsCreateDialogOpen(false);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <Skeleton className="h-9 w-48 mb-2" />
          <Skeleton className="h-5 w-64" />
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-32 mb-2" />
                <Skeleton className="h-4 w-full" />
              </CardHeader>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Projects</h2>
          <p className="text-muted-foreground">
            Manage your bands and acts
          </p>
        </div>
        <Button onClick={() => setIsCreateDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          New Project
        </Button>
      </div>

      {projects.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Music2 className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No projects yet</h3>
            <p className="text-sm text-muted-foreground mb-4 text-center max-w-sm">
              Create your first project to start organizing your gigs and managing your bands.
            </p>
            <Button onClick={() => setIsCreateDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Create Project
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => (
            <Card 
              key={project.id} 
              className="hover:border-primary transition-colors cursor-pointer"
              onClick={() => router.push(`/projects/${project.id}`)}
            >
              <CardHeader>
                <CardTitle>{project.name}</CardTitle>
                {project.description && (
                  <CardDescription className="line-clamp-2">
                    {project.description}
                  </CardDescription>
                )}
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  {upcomingGigCounts[project.id] ?? 0} upcoming {upcomingGigCounts[project.id] === 1 ? 'gig' : 'gigs'}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <CreateProjectDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        onSuccess={handleProjectCreated}
      />
    </div>
  );
}
