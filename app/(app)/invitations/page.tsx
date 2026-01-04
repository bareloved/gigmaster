'use client';

import { useUser } from "@/lib/providers/user-provider";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getMyPendingInvitations, getMyDeclinedInvitations, updateMyInvitationStatus, checkIfRoleReplaced } from "@/lib/api/gig-roles";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Calendar, MapPin, Clock, Music, AlertCircle } from "lucide-react";
import { format, parseISO } from "date-fns";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useState } from "react";
import { PlayerStatusActions } from "@/components/roles/player-actions";

function formatTime(time: string | null): string {
  if (!time) return "";
  return time.substring(0, 5);
}

function getWeekdayAndDate(dateStr: string): { weekday: string; shortDate: string } {
  const date = parseISO(dateStr);
  return {
    weekday: format(date, "EEE").toUpperCase(),
    shortDate: format(date, "d MMM"),
  };
}

export default function InvitationsPage() {
  const { user } = useUser();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("pending");
  
  // Fetch pending invitations
  const {
    data: pendingInvitations,
    isLoading: isLoadingPending,
    error: pendingError,
  } = useQuery({
    queryKey: ["pending-invitations", user?.id],
    queryFn: () => getMyPendingInvitations(user!.id),
    enabled: !!user,
    staleTime: 1000 * 60 * 2,
  });
  
  // Fetch declined invitations
  const {
    data: declinedInvitations,
    isLoading: isLoadingDeclined,
    error: declinedError,
  } = useQuery({
    queryKey: ["declined-invitations", user?.id],
    queryFn: () => getMyDeclinedInvitations(user!.id),
    enabled: !!user,
    staleTime: 1000 * 60 * 2,
  });
  
  // Re-accept mutation
  const reacceptMutation = useMutation({
    mutationFn: async (roleId: string) => {
      // Check if role was replaced
      const isReplaced = await checkIfRoleReplaced(roleId);
      if (isReplaced) {
        throw new Error("This spot has already been filled. Ask the host if they want to re-invite you.");
      }
      
      // Accept the role
      await updateMyInvitationStatus(roleId, 'accepted');
    },
    onSuccess: () => {
      toast.success("You're now playing this gig.");
      queryClient.invalidateQueries({ queryKey: ["declined-invitations"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-gigs"] });
      queryClient.invalidateQueries({ queryKey: ["player-gigs"] });
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to accept invitation");
    },
  });
  
  // Decline mutation for pending invitations
  const declineMutation = useMutation({
    mutationFn: async (roleId: string) => {
      await updateMyInvitationStatus(roleId, 'declined');
    },
    onSuccess: () => {
      toast.info("You declined this gig. You can still find it under 'Invites → Declined' if you change your mind.");
      queryClient.invalidateQueries({ queryKey: ["pending-invitations"] });
      queryClient.invalidateQueries({ queryKey: ["declined-invitations"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-gigs"] });
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to decline invitation");
    },
  });
  
  // Accept mutation for pending invitations
  const acceptMutation = useMutation({
    mutationFn: async (roleId: string) => {
      await updateMyInvitationStatus(roleId, 'accepted');
    },
    onSuccess: () => {
      toast.success("Invitation accepted!");
      queryClient.invalidateQueries({ queryKey: ["pending-invitations"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-gigs"] });
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to accept invitation");
    },
  });
  
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Invitations</h1>
        <p className="text-muted-foreground mt-1">Manage your gig invitations.</p>
      </div>
      
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="pending" className="relative">
            Pending
            {pendingInvitations && pendingInvitations.length > 0 && (
              <Badge variant="secondary" className="ml-2 h-5 w-5 rounded-full p-0 flex items-center justify-center">
                {pendingInvitations.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="declined">
            Declined
            {declinedInvitations && declinedInvitations.length > 0 && (
              <Badge variant="outline" className="ml-2 h-5 w-5 rounded-full p-0 flex items-center justify-center">
                {declinedInvitations.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>
        
        {/* Pending Tab */}
        <TabsContent value="pending" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Pending Invitations</CardTitle>
              <CardDescription>
                Gigs you've been invited to that are waiting for your response.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingPending ? (
                <div className="space-y-3">
                  <Skeleton className="h-32 w-full" />
                  <Skeleton className="h-32 w-full" />
                </div>
              ) : pendingError ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <AlertCircle className="h-12 w-12 text-destructive mb-4" />
                  <p className="text-sm text-muted-foreground">Failed to load pending invitations</p>
                </div>
              ) : !pendingInvitations || pendingInvitations.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <Calendar className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No pending invitations</h3>
                  <p className="text-sm text-muted-foreground max-w-sm">
                    You're all caught up! When you receive new gig invitations, they'll appear here.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {pendingInvitations.map((role: any) => {
                    const gig = role.gigs;
                    const { weekday, shortDate } = getWeekdayAndDate(gig.date);
                    
                    return (
                      <Card key={role.id} className="overflow-hidden hover:shadow-md transition-shadow">
                        <CardContent className="p-4">
                          <div className="flex items-start gap-4">
                            {/* Date Badge */}
                            <div className="flex-shrink-0 flex flex-col items-center justify-center bg-primary/10 rounded-lg px-3 py-2 min-w-[60px]">
                              <div className="text-xs font-medium text-muted-foreground">
                                {weekday}
                              </div>
                              <div className="text-xl font-bold">
                                {shortDate.split(" ")[0]}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {shortDate.split(" ")[1]}
                              </div>
                            </div>
                            
                            {/* Gig Info */}
                            <div className="flex-1 min-w-0">
                              <Link href={`/gigs/${gig.id}`} className="hover:underline">
                                <h3 className="text-lg font-semibold mb-1">{gig.title}</h3>
                              </Link>
                              
                              <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground mb-3">
                                {gig.location_name && (
                                  <div className="flex items-center gap-1.5">
                                    <MapPin className="h-4 w-4" />
                                    <span>{gig.location_name}</span>
                                  </div>
                                )}
                                {gig.start_time && (
                                  <div className="flex items-center gap-1.5">
                                    <Clock className="h-4 w-4" />
                                    <span>{formatTime(gig.start_time)}</span>
                                  </div>
                                )}
                                <div className="flex items-center gap-1.5">
                                  <Music className="h-4 w-4" />
                                  <Badge variant="secondary">{role.role_name}</Badge>
                                </div>
                              </div>
                              
                              {/* Action Buttons */}
                              <div className="flex flex-wrap gap-2">
                                <Button
                                  size="sm"
                                  onClick={() => acceptMutation.mutate(role.id)}
                                  disabled={acceptMutation.isPending}
                                >
                                  Accept
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => declineMutation.mutate(role.id)}
                                  disabled={declineMutation.isPending}
                                >
                                  Decline
                                </Button>
                                <Link href={`/gigs/${gig.id}/pack`}>
                                  <Button variant="ghost" size="sm">
                                    View Details
                                  </Button>
                                </Link>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Declined Tab */}
        <TabsContent value="declined" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Declined Invitations</CardTitle>
              <CardDescription>
                Gigs you previously declined. You can still change your mind if the spot hasn't been filled.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingDeclined ? (
                <div className="space-y-3">
                  <Skeleton className="h-32 w-full" />
                  <Skeleton className="h-32 w-full" />
                </div>
              ) : declinedError ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <AlertCircle className="h-12 w-12 text-destructive mb-4" />
                  <p className="text-sm text-muted-foreground">Failed to load declined invitations</p>
                </div>
              ) : !declinedInvitations || declinedInvitations.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <Calendar className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No declined invitations</h3>
                  <p className="text-sm text-muted-foreground max-w-sm">
                    Invitations you decline will appear here, so you can reconsider if needed.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {declinedInvitations.map((role: any) => {
                    const gig = role.gigs;
                    const { weekday, shortDate } = getWeekdayAndDate(gig.date);
                    
                    return (
                      <Card key={role.id} className="overflow-hidden opacity-70 hover:opacity-100 hover:shadow-md transition-all">
                        <CardContent className="p-4">
                          <div className="flex items-start gap-4">
                            {/* Date Badge */}
                            <div className="flex-shrink-0 flex flex-col items-center justify-center bg-muted rounded-lg px-3 py-2 min-w-[60px]">
                              <div className="text-xs font-medium text-muted-foreground">
                                {weekday}
                              </div>
                              <div className="text-xl font-bold">
                                {shortDate.split(" ")[0]}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {shortDate.split(" ")[1]}
                              </div>
                            </div>
                            
                            {/* Gig Info */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <Link href={`/gigs/${gig.id}`} className="hover:underline">
                                  <h3 className="text-lg font-semibold">{gig.title}</h3>
                                </Link>
                                <Badge variant="destructive" className="ml-2">Declined</Badge>
                              </div>
                              
                              <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground mb-3">
                                {gig.location_name && (
                                  <div className="flex items-center gap-1.5">
                                    <MapPin className="h-4 w-4" />
                                    <span>{gig.location_name}</span>
                                  </div>
                                )}
                                {gig.start_time && (
                                  <div className="flex items-center gap-1.5">
                                    <Clock className="h-4 w-4" />
                                    <span>{formatTime(gig.start_time)}</span>
                                  </div>
                                )}
                                <div className="flex items-center gap-1.5">
                                  <Music className="h-4 w-4" />
                                  <Badge variant="outline">{role.role_name}</Badge>
                                </div>
                              </div>
                              
                              {/* Action Buttons */}
                              <div className="flex flex-wrap gap-2">
                                <Button
                                  size="sm"
                                  onClick={() => reacceptMutation.mutate(role.id)}
                                  disabled={reacceptMutation.isPending}
                                >
                                  Accept instead
                                </Button>
                                <Link href={`/gigs/${gig.id}/pack`}>
                                  <Button variant="outline" size="sm">
                                    View Details
                                  </Button>
                                </Link>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

