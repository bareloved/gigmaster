"use client";

import { useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { GigStatusBadge } from "@/components/gig-status-badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Calendar, MapPin, Package, Users, Briefcase, Music, MoreVertical, DollarSign, Check, X, User, Crown, Mail } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useUser } from "@/lib/providers/user-provider";
import type { DashboardGig } from "@/lib/types/shared";
import {
  markAsPaid,
  markAsUnpaid,
  acceptInvitation,
  declineInvitation,
  updateGigStatus,
} from "@/lib/api/gig-actions";
import { checkGigConflicts } from "@/lib/api/calendar";
import { ConflictWarningDialog } from "@/components/conflict-warning-dialog";

interface DashboardGigItemProps {
  gig: DashboardGig;
  isPastGig?: boolean;
  returnUrl?: string;
}

export function DashboardGigItem({ gig, isPastGig = false, returnUrl = "/dashboard" }: DashboardGigItemProps) {
  const { user } = useUser();
  const queryClient = useQueryClient();
  const gigDate = new Date(gig.date);
  const formattedDate = format(gigDate, "EEE, MMM d, yyyy");
  
  // Conflict detection state
  const [showConflictDialog, setShowConflictDialog] = useState(false);
  const [conflicts, setConflicts] = useState<DashboardGig[]>([]);

  // Mutations for quick actions
  const markPaidMutation = useMutation({
    mutationFn: () => markAsPaid(gig.playerGigRoleId!),
    onSuccess: () => {
      queryClient.invalidateQueries({ 
        queryKey: ["dashboard-gigs", user?.id],
        refetchType: 'active'
      });
      queryClient.invalidateQueries({ 
        queryKey: ["recent-past-gigs", user?.id],
        refetchType: 'active'
      });
      queryClient.invalidateQueries({ 
        queryKey: ["all-past-gigs", user?.id],
        refetchType: 'active'
      });
      queryClient.invalidateQueries({ 
        queryKey: ["gig"],
        refetchType: 'active'
      });
      toast.success("Marked as paid");
    },
    onError: (error: Error) => {
      toast.error(`Failed to mark as paid: ${error.message}`);
    },
  });

  const markUnpaidMutation = useMutation({
    mutationFn: () => markAsUnpaid(gig.playerGigRoleId!),
    onSuccess: () => {
      queryClient.invalidateQueries({ 
        queryKey: ["dashboard-gigs", user?.id],
        refetchType: 'active'
      });
      queryClient.invalidateQueries({ 
        queryKey: ["recent-past-gigs", user?.id],
        refetchType: 'active'
      });
      queryClient.invalidateQueries({ 
        queryKey: ["all-past-gigs", user?.id],
        refetchType: 'active'
      });
      queryClient.invalidateQueries({ 
        queryKey: ["gig"],
        refetchType: 'active'
      });
      toast.success("Marked as unpaid");
    },
    onError: (error: Error) => {
      toast.error(`Failed to mark as unpaid: ${error.message}`);
    },
  });

  const acceptInvitationMutation = useMutation({
    mutationFn: () => acceptInvitation(gig.playerGigRoleId!),
    onSuccess: () => {
      queryClient.invalidateQueries({ 
        queryKey: ["dashboard-gigs", user?.id],
        refetchType: 'active'
      });
      queryClient.invalidateQueries({ 
        queryKey: ["recent-past-gigs", user?.id],
        refetchType: 'active'
      });
      queryClient.invalidateQueries({ 
        queryKey: ["all-past-gigs", user?.id],
        refetchType: 'active'
      });
      queryClient.invalidateQueries({ 
        queryKey: ["gig"],
        refetchType: 'active'
      });
      setShowConflictDialog(false);
      toast.success("Invitation accepted");
    },
    onError: (error: Error) => {
      toast.error(`Failed to accept invitation: ${error.message}`);
    },
  });

  // Handle accept invitation with conflict check
  const handleAcceptInvitation = async () => {
    if (!user) return;

    try {
      // Check for conflicts
      const conflictingGigs = await checkGigConflicts(
        user.id,
        gig.date,
        gig.startTime,
        gig.endTime
      );

      if (conflictingGigs.length > 0) {
        // Show conflict dialog
        setConflicts(conflictingGigs);
        setShowConflictDialog(true);
      } else {
        // No conflicts, accept directly
        acceptInvitationMutation.mutate();
      }
    } catch (error) {
      console.error("Error checking conflicts:", error);
      toast.error("Failed to check for conflicts");
    }
  };

  // Handle accept anyway (user confirms despite conflicts)
  const handleAcceptAnyway = () => {
    acceptInvitationMutation.mutate();
  };

  const declineInvitationMutation = useMutation({
    mutationFn: () => declineInvitation(gig.playerGigRoleId!),
    onSuccess: () => {
      queryClient.invalidateQueries({ 
        queryKey: ["dashboard-gigs", user?.id],
        refetchType: 'active'
      });
      queryClient.invalidateQueries({ 
        queryKey: ["recent-past-gigs", user?.id],
        refetchType: 'active'
      });
      queryClient.invalidateQueries({ 
        queryKey: ["all-past-gigs", user?.id],
        refetchType: 'active'
      });
      queryClient.invalidateQueries({ 
        queryKey: ["gig"],
        refetchType: 'active'
      });
      toast.success("Invitation declined");
    },
    onError: (error: Error) => {
      toast.error(`Failed to decline invitation: ${error.message}`);
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: (status: "draft" | "confirmed" | "cancelled" | "completed") => updateGigStatus(gig.gigId, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ 
        queryKey: ["dashboard-gigs", user?.id],
        refetchType: 'active'
      });
      queryClient.invalidateQueries({ 
        queryKey: ["recent-past-gigs", user?.id],
        refetchType: 'active'
      });
      queryClient.invalidateQueries({ 
        queryKey: ["all-past-gigs", user?.id],
        refetchType: 'active'
      });
      queryClient.invalidateQueries({ 
        queryKey: ["gig"],
        refetchType: 'active'
      });
      toast.success("Gig status updated");
    },
    onError: (error: Error) => {
      toast.error(`Failed to update status: ${error.message}`);
    },
  });

  // Determine which actions to show
  const showPlayerActions = gig.isPlayer && gig.playerGigRoleId;
  const showPaymentActions = showPlayerActions && gig.paymentStatus;
  const showInvitationActions = showPlayerActions && gig.invitationStatus === "invited" && !isPastGig;
  const showManagerActions = gig.isManager && !isPastGig;

  // Determine gig URL based on ownership - managers see full detail, players see pack
  const gigUrl = gig.isManager ? `/gigs/${gig.gigId}?returnUrl=${returnUrl}` : `/gigs/${gig.gigId}/pack?returnUrl=${returnUrl}`;

  return (
    <>
    <Card className={`p-4 hover:bg-muted/50 transition-colors group ${isPastGig ? 'opacity-70 saturate-75' : ''}`}>
      <div className="flex items-start gap-4">
        {/* Date Badge */}
        <div className="flex flex-col items-center bg-primary/10 rounded-lg p-2 min-w-[60px]">
          <span className="text-xs text-muted-foreground uppercase">
            {format(gigDate, "MMM")}
          </span>
          <span className="text-2xl font-bold">{format(gigDate, "d")}</span>
        </div>

        {/* Gig Details */}
        <div className="flex-1 min-w-0 space-y-2">
          <Link href={gigUrl} className="block space-y-2">
            <div className="flex items-start justify-between gap-2">
              <div className="space-y-1 flex-1 min-w-0">
                <h3 className="font-semibold truncate">{gig.gigTitle}</h3>
                {gig.projectName && !gig.projectName.includes("Personal Gigs") && (
                  <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                    <Music className="h-3.5 w-3.5" />
                    <span>{gig.projectName}</span>
                  </div>
                )}
              </div>
              <div className="flex flex-col gap-2 items-end flex-shrink-0">
                {/* Host Badge */}
                {gig.isManager ? (
                  <Badge variant="outline" className="gap-1 text-xs bg-orange-50 border-orange-200 text-orange-700 dark:bg-orange-950 dark:border-orange-800 dark:text-orange-300">
                    <Crown className="h-3 w-3" />
                    Hosted by You
                  </Badge>
                ) : gig.hostName ? (
                  <Badge variant="outline" className="gap-1 text-xs bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-950 dark:border-blue-800 dark:text-blue-300">
                    <Mail className="h-3 w-3" />
                    Hosted by {gig.hostName}
                  </Badge>
                ) : null}
                {/* Gig Status */}
                {gig.status && (
                  <GigStatusBadge status={gig.status} />
                )}
              </div>
            </div>

            {/* Invitation Summary (Host-only meta) */}
            {gig.isManager && gig.roleStats && gig.roleStats.total > 0 && (
              <div className="text-xs text-muted-foreground">
                {gig.roleStats.total} role{gig.roleStats.total !== 1 ? 's' : ''} · 
                {gig.roleStats.accepted > 0 && ` ${gig.roleStats.accepted} accepted`}
                {gig.roleStats.invited > 0 && ` ${gig.roleStats.invited} invited`}
                {gig.roleStats.pending > 0 && ` ${gig.roleStats.pending} pending`}
                {gig.roleStats.declined > 0 && ` ${gig.roleStats.declined} declined`}
              </div>
            )}

            {/* Participation Status (Musician-only) */}
            {gig.isPlayer && gig.invitationStatus && (
              <div className="text-xs text-muted-foreground">
                Your status: {
                  gig.invitationStatus === 'pending' ? 'Awaiting your response' :
                  gig.invitationStatus === 'invited' ? 'Please respond' :
                  gig.invitationStatus === 'accepted' ? "You're in" :
                  gig.invitationStatus === 'declined' ? 'You declined' :
                  gig.invitationStatus === 'tentative' ? 'Tentative' :
                  gig.invitationStatus
                }
              </div>
            )}

            {/* Role Chips & Metadata */}
            <div className="flex flex-wrap items-center gap-2 text-sm">
              {/* Date */}
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <Calendar className="h-3.5 w-3.5" />
                <span>{formattedDate}</span>
              </div>
              
              {/* Location */}
              {gig.locationName && (
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <MapPin className="h-3.5 w-3.5" />
                  <span className="truncate">{gig.locationName}</span>
                </div>
              )}

              {/* Role Perspective Chips */}
              {gig.isManager && gig.isPlayer && (
                <Badge variant="outline" className="gap-1.5">
                  <Briefcase className="h-3 w-3" />
                  Managing • {gig.playerRoleName}
                </Badge>
              )}
              {gig.isManager && !gig.isPlayer && (
                <Badge variant="outline" className="gap-1.5">
                  <Briefcase className="h-3 w-3" />
                  Managing
                </Badge>
              )}
              {!gig.isManager && gig.isPlayer && gig.playerRoleName && (
                <Badge variant="outline" className="capitalize">
                  {gig.playerRoleName}
                </Badge>
              )}

              {/* Invitation Status (if player and not accepted) */}
              {gig.isPlayer && gig.invitationStatus && gig.invitationStatus !== "accepted" && (
                <Badge 
                  variant={
                    gig.invitationStatus === "declined" || gig.invitationStatus === "needs_sub"
                      ? "destructive" 
                      : "secondary"
                  }
                  className="capitalize"
                >
                  {gig.invitationStatus === "needs_sub" ? "Need Sub" : gig.invitationStatus}
                </Badge>
              )}

              {/* Payment Status */}
              {gig.isPlayer && gig.paymentStatus && (
                <Badge 
                  variant={gig.paymentStatus === "paid" ? "default" : "outline"}
                  className={gig.paymentStatus === "unpaid" ? "border-yellow-500 text-yellow-700 dark:text-yellow-400" : ""}
                >
                  {gig.paymentStatus === "paid" ? "Paid" : "Unpaid"}
                </Badge>
              )}
            </div>
          </Link>

          {/* Action Buttons */}
          <div className="flex justify-end gap-2">
            {/* Gig Pack Button (only for hosts - players click card to go to pack) */}
            {gig.isManager && (
              <Link href={`/gigs/${gig.gigId}/pack?returnUrl=${returnUrl}`} onClick={(e) => e.stopPropagation()}>
                <Button variant="outline" size="sm" className="gap-2">
                  <Package className="h-4 w-4" />
                  Gig Pack
                </Button>
              </Link>
            )}

            {/* Quick Actions Dropdown */}
            {(showPlayerActions || showManagerActions) && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" onClick={(e) => e.stopPropagation()}>
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                  <DropdownMenuLabel>Quick Actions</DropdownMenuLabel>
                  <DropdownMenuSeparator />

                  {/* Player Actions */}
                  {showPaymentActions && (
                    <>
                      {gig.paymentStatus === "unpaid" && (
                        <DropdownMenuItem onClick={() => markPaidMutation.mutate()}>
                          <Check className="h-4 w-4 mr-2" />
                          Mark as Paid
                        </DropdownMenuItem>
                      )}
                      {gig.paymentStatus === "paid" && (
                        <DropdownMenuItem onClick={() => markUnpaidMutation.mutate()}>
                          <X className="h-4 w-4 mr-2" />
                          Mark as Unpaid
                        </DropdownMenuItem>
                      )}
                    </>
                  )}

                  {showInvitationActions && (
                    <>
                      <DropdownMenuItem onClick={handleAcceptInvitation}>
                        <Check className="h-4 w-4 mr-2 text-green-600" />
                        Accept Invitation
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => declineInvitationMutation.mutate()}>
                        <X className="h-4 w-4 mr-2 text-red-600" />
                        Decline Invitation
                      </DropdownMenuItem>
                    </>
                  )}

                  {/* Separator between player and manager actions */}
                  {showPlayerActions && showManagerActions && <DropdownMenuSeparator />}

                  {/* Manager Actions */}
                  {showManagerActions && (
                    <>
                      {gig.status !== "confirmed" && (
                        <DropdownMenuItem onClick={() => updateStatusMutation.mutate("confirmed")}>
                          Confirm Gig
                        </DropdownMenuItem>
                      )}
                      {gig.status !== "cancelled" && (
                        <DropdownMenuItem onClick={() => updateStatusMutation.mutate("cancelled")}>
                          Cancel Gig
                        </DropdownMenuItem>
                      )}
                      {gig.status !== "completed" && (
                        <DropdownMenuItem onClick={() => updateStatusMutation.mutate("completed")}>
                          Mark as Completed
                        </DropdownMenuItem>
                      )}
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>
      </div>
    </Card>

    {/* Conflict Warning Dialog */}
    <ConflictWarningDialog
      open={showConflictDialog}
      onOpenChange={setShowConflictDialog}
      conflicts={conflicts}
      gigTitle={gig.gigTitle}
      gigDate={gig.date}
      gigTime={gig.startTime}
      onAcceptAnyway={handleAcceptAnyway}
      onCancel={() => setShowConflictDialog(false)}
      isLoading={acceptInvitationMutation.isPending}
    />
    </>
  );
}
