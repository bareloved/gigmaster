"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { GigStatusBadge } from "@/components/gig-status-badge";
import { ArrowLeft, Plus, Settings, Calendar, MapPin, Clock, Pencil, Trash2 } from "lucide-react";
import { getProject, deleteProject } from "@/lib/api/projects";
import { listGigsForProject } from "@/lib/api/gigs";
import { CreateGigDialog } from "@/components/create-gig-dialog";
import { EditProjectDialog } from "@/components/edit-project-dialog";
import { DeleteProjectDialog } from "@/components/delete-project-dialog";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useUser } from "@/lib/providers/user-provider";

export default function ProjectDetailPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.id as string;
  const queryClient = useQueryClient();
  const { user } = useUser();
  const [isCreateGigDialogOpen, setIsCreateGigDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  // Fetch project details
  const { 
    data: project, 
    isLoading: isProjectLoading,
    error: projectError 
  } = useQuery({
    queryKey: ["project", projectId],
    queryFn: () => getProject(projectId),
  });

  // Fetch gigs for this project
  const {
    data: gigs = [],
    isLoading: isGigsLoading,
  } = useQuery({
    queryKey: ["gigs", projectId],
    queryFn: () => listGigsForProject(projectId),
    enabled: !!project, // Only fetch gigs after project is loaded
  });

  const handleGigCreated = (gigId: string) => {
    queryClient.invalidateQueries({ 
      queryKey: ["gigs", projectId],
      refetchType: 'active'
    });
    setIsCreateGigDialogOpen(false);
    router.push(`/gigs/${gigId}?returnUrl=/projects/${projectId}`);
  };

  const handleProjectUpdated = () => {
    queryClient.invalidateQueries({ 
      queryKey: ["project", projectId],
      refetchType: 'active'
    });
    queryClient.invalidateQueries({ 
      queryKey: ["projects", user?.id],
      refetchType: 'active'
    });
    setIsEditDialogOpen(false);
  };

  const handleDeleteProject = async () => {
    await deleteProject(projectId);
    
    // Invalidate all related caches (only refetches active/mounted queries)
    queryClient.invalidateQueries({ 
      queryKey: ["projects", user?.id],
      refetchType: 'active'
    });
    queryClient.invalidateQueries({ 
      queryKey: ["dashboard-gigs", user?.id],
      refetchType: 'active'
    });
    
    // Wait a tick for invalidation to process
    await new Promise(resolve => setTimeout(resolve, 0));
    
    // Then navigate
    router.push("/projects");
  };

  const isLoading = isProjectLoading || isGigsLoading;
  const error = projectError instanceof Error ? projectError.message : null;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10" />
          <div className="flex-1">
            <Skeleton className="h-8 w-64 mb-2" />
            <Skeleton className="h-4 w-96" />
          </div>
        </div>
        <Skeleton className="h-[400px] w-full" />
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" onClick={() => router.push("/projects")}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Projects
        </Button>
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <p className="text-destructive mb-4">{error || "Project not found"}</p>
            <Button onClick={() => router.push("/projects")}>
              Go Back
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => router.push("/projects")}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h2 className="text-3xl font-bold tracking-tight">{project.name}</h2>
              {project.description && (
                <p className="text-muted-foreground mt-1">
                  {project.description}
                </p>
              )}
            </div>
          </div>
        </div>
        <Button onClick={() => setIsCreateGigDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          New Gig
        </Button>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="gigs" className="space-y-4">
        <TabsList>
          <TabsTrigger value="gigs">
            <Calendar className="mr-2 h-4 w-4" />
            Gigs
          </TabsTrigger>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="settings">
            <Settings className="mr-2 h-4 w-4" />
            Settings
          </TabsTrigger>
        </TabsList>

        {/* Gigs Tab */}
        <TabsContent value="gigs" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Gigs</CardTitle>
              <CardDescription>
                Manage gigs for this project
              </CardDescription>
            </CardHeader>
            <CardContent>
              {gigs.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Calendar className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No gigs yet</h3>
                  <p className="text-sm text-muted-foreground mb-4 max-w-sm">
                    Create your first gig for {project.name} to get started.
                  </p>
                  <Button onClick={() => setIsCreateGigDialogOpen(true)}>
                    <Plus className="mr-2 h-4 w-4" />
                    Create Gig
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {gigs.map((gig) => (
                    <Card 
                      key={gig.id}
                      className="hover:border-primary transition-colors cursor-pointer"
                      onClick={() => router.push(`/gigs/${gig.id}?returnUrl=/projects/${projectId}`)}
                    >
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                          <div className="space-y-1">
                            <CardTitle className="text-lg">{gig.title}</CardTitle>
                            <div className="flex items-center gap-4 text-sm text-muted-foreground">
                              <div className="flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                {new Date(gig.date).toLocaleDateString('en-US', {
                                  month: 'short',
                                  day: 'numeric',
                                  year: 'numeric'
                                })}
                              </div>
                              {gig.start_time && (
                                <div className="flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  {gig.start_time}
                                </div>
                              )}
                              {gig.location_name && (
                                <div className="flex items-center gap-1">
                                  <MapPin className="h-3 w-3" />
                                  {gig.location_name}
                                </div>
                              )}
                            </div>
                          </div>
                          <GigStatusBadge status={gig.status} />
                        </div>
                      </CardHeader>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">Total Gigs</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{gigs.length}</div>
                <p className="text-xs text-muted-foreground">All time</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">Upcoming</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {gigs.filter(g => new Date(g.date) >= new Date()).length}
                </div>
                <p className="text-xs text-muted-foreground">Future gigs</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">Revenue</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">$0</div>
                <p className="text-xs text-muted-foreground">All time</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Project Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm font-medium mb-1">Name</p>
                <p className="text-sm text-muted-foreground">{project.name}</p>
              </div>
              {project.description && (
                <div>
                  <p className="text-sm font-medium mb-1">Description</p>
                  <p className="text-sm text-muted-foreground">{project.description}</p>
                </div>
              )}
              <div>
                <p className="text-sm font-medium mb-1">Created</p>
                <p className="text-sm text-muted-foreground">
                  {new Date(project.created_at).toLocaleDateString()}
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Settings Tab */}
        <TabsContent value="settings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Project Settings</CardTitle>
              <CardDescription>
                Manage project details and preferences
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Edit Project */}
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="space-y-1">
                  <h3 className="font-medium">Edit Project</h3>
                  <p className="text-sm text-muted-foreground">
                    Update project name and description
                  </p>
                </div>
                <Button
                  variant="outline"
                  onClick={() => setIsEditDialogOpen(true)}
                >
                  <Pencil className="mr-2 h-4 w-4" />
                  Edit
                </Button>
              </div>

              {/* Danger Zone */}
              <div className="border border-destructive/50 rounded-lg p-4 space-y-4">
                <div>
                  <h3 className="font-medium text-destructive mb-1">Danger Zone</h3>
                  <p className="text-sm text-muted-foreground">
                    Irreversible actions that affect this project
                  </p>
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <h4 className="font-medium">Delete Project</h4>
                    <p className="text-sm text-muted-foreground">
                      Permanently delete this project and all associated gigs
                    </p>
                  </div>
                  <Button
                    variant="destructive"
                    onClick={() => setIsDeleteDialogOpen(true)}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <CreateGigDialog
        open={isCreateGigDialogOpen}
        onOpenChange={setIsCreateGigDialogOpen}
        onSuccess={handleGigCreated}
        projectId={projectId}
      />

      {project && (
        <>
          <EditProjectDialog
            open={isEditDialogOpen}
            onOpenChange={setIsEditDialogOpen}
            onSuccess={handleProjectUpdated}
            project={project}
          />

          <DeleteProjectDialog
            open={isDeleteDialogOpen}
            onOpenChange={setIsDeleteDialogOpen}
            onConfirm={handleDeleteProject}
            projectName={project.name}
          />
        </>
      )}
    </div>
  );
}
