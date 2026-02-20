"use client";

import { useState, memo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { GigStatusBadge } from "@/components/gigs/shared/status-badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { MapPin, Clock, Package, MoreVertical, Check, X, Crown, Mail, Share2, Trash2, CalendarSync, Copy, CircleCheck, CircleX, CircleDashed, Pencil } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { useUser } from "@/lib/providers/user-provider";
import type { DashboardGig } from "@/lib/types/shared";
import { GigPaymentText } from "@/components/shared/gig-payment-text";
import { StackedAvatars } from "@/components/shared/stacked-avatars";
// PERFORMANCE: Use optimistic update hooks for instant UI feedback
import {
  useAcceptInvitation,
  useDeclineInvitation,
  useUpdateGigStatus,
  useDeleteGig,
} from "@/hooks/use-gig-mutations";
import { checkGigConflicts } from "@/lib/api/calendar";
import { createClient } from "@/lib/supabase/client";

// PERFORMANCE: Lazy load dialogs - only loaded when user opens them
const ConflictWarningDialog = dynamic(
  () => import("@/components/dashboard/conflict-warning").then(m => m.ConflictWarningDialog),
  { ssr: false }
);
const GigPackShareDialog = dynamic(
  () => import("@/components/gigpack/gigpack-share-dialog").then(m => m.GigPackShareDialog),
  { ssr: false }
);
const DeleteGigDialog = dynamic(
  () => import("@/components/gigs/dialogs/delete-gig-dialog").then(m => m.DeleteGigDialog),
  { ssr: false }
);

// PERFORMANCE: Memoize inner content to prevent re-renders when parent state changes
const GigInnerContent = memo(function GigInnerContent({ gig }: { gig: DashboardGig }) {
  return (
    <>
      {/* ===== MOBILE layout ===== */}
      <div className="sm:hidden space-y-1.5">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-base leading-tight line-clamp-2">{gig.gigTitle}</h3>
            {gig.bandName && (
              <p className="text-xs text-muted-foreground truncate mt-0.5">{gig.bandName}</p>
            )}
          </div>
          <div className="flex items-center gap-1.5 flex-shrink-0 pt-0.5">
            {gig.status === 'cancelled' && (
              <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
            )}
            {gig.isManager ? (
              <Crown className="h-3.5 w-3.5 text-orange-500/70" />
            ) : gig.hostName && !gig.isExternal ? (
              <Mail className="h-3.5 w-3.5 text-blue-500/70" />
            ) : null}
          </div>
        </div>
        {gig.locationName && (
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <MapPin className="h-3.5 w-3.5 flex-shrink-0" />
            <span className="text-sm truncate">{gig.locationName}</span>
          </div>
        )}
        {gig.startTime && (
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Clock className="h-3.5 w-3.5 flex-shrink-0" />
            <span className="text-sm">{gig.startTime.slice(0, 5)}</span>
          </div>
        )}
        {gig.isPlayer && gig.isManager && gig.playerRoleName && (
          <span className="capitalize text-sm font-medium text-foreground/70">{gig.playerRoleName}</span>
        )}
        {gig.isPlayer && (
          <GigPaymentText
            agreedFee={gig.playerAgreedFee}
            currency={gig.playerCurrency}
            isPaid={gig.playerIsPaid}
            paidAt={gig.playerPaidAt}
            expectedPaymentDate={gig.playerExpectedPaymentDate}
            personalEarningsAmount={gig.playerPersonalEarningsAmount}
            personalEarningsCurrency={gig.playerPersonalEarningsCurrency}
            className="text-[11px]"
          />
        )}
      </div>

      {/* ===== DESKTOP layout ===== */}
      <div className="hidden sm:block space-y-1">
        <h3 className="font-semibold text-xl leading-tight line-clamp-2">{gig.gigTitle}</h3>
        {gig.bandName && (
          <p className="text-base text-muted-foreground truncate mt-0.5">{gig.bandName}</p>
        )}

        {/* Location and Time on separate lines */}
        <TooltipProvider delayDuration={300}>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="space-y-0.5">
                {gig.locationName && (
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <MapPin className="h-4 w-4 flex-shrink-0" />
                    <span className="text-sm truncate">{gig.locationName}</span>
                  </div>
                )}
                {gig.startTime && (
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <Clock className="h-4 w-4 flex-shrink-0" />
                    <span className="text-sm">
                      {gig.startTime.slice(0, 5)}{gig.endTime ? ` – ${gig.endTime.slice(0, 5)}` : ''}
                    </span>
                  </div>
                )}
              </div>
            </TooltipTrigger>
            {gig.isPlayer && gig.playerRoleName && (
              <TooltipContent>
                <span className="capitalize">Your role: {gig.playerRoleName}</span>
              </TooltipContent>
            )}
          </Tooltip>
        </TooltipProvider>

        {/* Participation Status (Musician-only) */}
        {gig.isPlayer && !gig.isManager && gig.invitationStatus && gig.invitationStatus !== 'accepted' && (
          <div className="text-sm text-muted-foreground">
            Your status: {
              gig.invitationStatus === 'pending' ? 'Awaiting your response' :
                gig.invitationStatus === 'invited' ? 'Please respond' :
                  gig.invitationStatus === 'declined' ? 'You declined' :
                    gig.invitationStatus === 'tentative' ? 'Tentative' :
                      gig.invitationStatus
            }
          </div>
        )}

        {/* Player role name */}
        {gig.isPlayer && gig.isManager && gig.playerRoleName && (
          <span className="capitalize text-sm font-medium text-foreground/70">{gig.playerRoleName}</span>
        )}
      </div>
    </>
  );
});

interface DashboardGigItemProps {
  gig: DashboardGig;
  isPastGig?: boolean;
  returnUrl?: string;
  onEdit?: (gig: DashboardGig) => void;
}

export function DashboardGigItem({
  gig,
  isPastGig = false,
  returnUrl = "/gigs",
  onEdit
}: DashboardGigItemProps) {
  const { user } = useUser();
  const gigDate = new Date(gig.date);


  // Conflict detection state
  const [showConflictDialog, setShowConflictDialog] = useState(false);
  const [conflicts, setConflicts] = useState<DashboardGig[]>([]);

  // Share dialog state
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [shareSlug, setShareSlug] = useState<string | null>(null);
  const [isLoadingShare, setIsLoadingShare] = useState(false);

  // Delete dialog state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const router = useRouter();

  // PERFORMANCE: Use optimistic update hooks for instant UI feedback
  const acceptInvitationMutation = useAcceptInvitation();
  const declineInvitationMutation = useDeclineInvitation();
  const updateStatusMutation = useUpdateGigStatus();
  const deleteGigMutation = useDeleteGig();

  // Handle accept invitation with conflict check
  const handleAcceptInvitation = async () => {
    if (!user) return;

    try {
      // Check for conflicts
      const conflictingGigs = await checkGigConflicts(
        user.id,
        gig.date,
        gig.startTime,
        gig.endTime,
        gig.gigId
      );

      if (conflictingGigs.length > 0) {
        // Show conflict dialog
        setConflicts(conflictingGigs);
        setShowConflictDialog(true);
      } else {
        // No conflicts, accept directly with optimistic update
        acceptInvitationMutation.mutate(gig.playerGigRoleId!);
      }
    } catch (error) {
      console.error("Error checking conflicts:", error);
      toast.error("Failed to check for conflicts");
    }
  };

  // Handle accept anyway (user confirms despite conflicts)
  const handleAcceptAnyway = () => {
    setShowConflictDialog(false);
    acceptInvitationMutation.mutate(gig.playerGigRoleId!);
  };

  // Handle share button click - fetch public_slug if needed
  const handleShare = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (shareSlug) {
      setShareDialogOpen(true);
      return;
    }

    setIsLoadingShare(true);
    try {
      const supabase = createClient();
      const { data: shareData } = await supabase
        .from("gig_shares")
        .select("token")
        .eq("gig_id", gig.gigId)
        .single();

      if (shareData?.token) {
        setShareSlug(shareData.token);
      } else {
        setShareSlug(gig.gigId);
      }
      setShareDialogOpen(true);
    } catch (error) {
      console.error("Error fetching share token:", error);
      setShareSlug(gig.gigId);
      setShareDialogOpen(true);
    } finally {
      setIsLoadingShare(false);
    }
  };

  // Determine which actions to show
  const showPlayerActions = gig.isPlayer && gig.playerGigRoleId;
  const showInvitationActions = showPlayerActions && gig.invitationStatus === "invited" && !isPastGig;
  const showWithdrawAction = showPlayerActions && gig.invitationStatus === "accepted" && !isPastGig;
  const showManagerActions = gig.isManager && !isPastGig;
  const needsResponse = gig.isPlayer && !gig.isManager && (gig.invitationStatus === 'invited' || gig.invitationStatus === 'pending');

  return (
    <>
      <Card className={`p-3 sm:p-4 hover:bg-muted/50 transition-colors group relative ${isPastGig ? 'opacity-70 saturate-75' : needsResponse ? 'opacity-75' : ''}`}>
        <div className="flex items-start gap-3 sm:gap-4">
          {/* Date Badge - Ticket stub style on all sizes */}
          <div className={`flex flex-col items-center justify-center self-stretch pl-2 pr-6 sm:pl-3 sm:pr-7 border-r border-border/50 min-w-[48px] sm:min-w-[56px] ${
            gig.status === 'tentative' ? 'border-r-amber-500/70 dark:border-r-amber-400/60' : ''
          }`}>
            <span className="text-xs sm:text-xs text-muted-foreground uppercase font-medium tracking-wide">
              {format(gigDate, "MMM")}
            </span>
            <span className="text-2xl sm:text-3xl font-bold leading-none">{format(gigDate, "d")}</span>
          </div>

          {/* Gig Details + Right column */}
          <div className="flex-1 min-w-0 sm:flex sm:gap-4 space-y-2 sm:space-y-0 relative self-stretch sm:self-auto">
            {/* Non-clickable content */}
            <div className="block space-y-2 sm:space-y-0 sm:flex-1 sm:min-w-0">
              <GigInnerContent gig={gig} />
            </div>

            {/* Desktop right column: badges / buttons stacked */}
            <div className="hidden sm:flex sm:flex-col sm:items-end sm:justify-between sm:flex-shrink-0 sm:self-stretch">
              {/* Row 1: Badges */}
              <div className="flex items-center gap-2">
                {gig.status && gig.status !== 'confirmed' && gig.status !== 'tentative' && (
                  <GigStatusBadge status={gig.status} />
                )}
                {gig.isExternal && (
                  <Badge variant="outline" className="gap-1 text-xs bg-violet-50 border-violet-200 text-violet-700 dark:bg-violet-950 dark:border-violet-800 dark:text-violet-300">
                    <CalendarSync className="h-3 w-3" />
                    External
                  </Badge>
                )}
                {gig.isManager ? (
                  <Badge variant="outline" className="gap-1 text-xs bg-orange-50 border-orange-200 text-orange-700 dark:bg-orange-950 dark:border-orange-800 dark:text-orange-300">
                    <Crown className="h-3 w-3" />
                    You
                  </Badge>
                ) : gig.hostName && !gig.isExternal ? (
                  <Badge variant="outline" className="gap-1 text-xs bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-950 dark:border-blue-800 dark:text-blue-300">
                    <Mail className="h-3 w-3" />
                    {gig.hostName}
                  </Badge>
                ) : null}
              </div>

              {/* Payment info (private to this player) */}
              {gig.isPlayer && (
                <GigPaymentText
                  agreedFee={gig.playerAgreedFee}
                  currency={gig.playerCurrency}
                  isPaid={gig.playerIsPaid}
                  paidAt={gig.playerPaidAt}
                  expectedPaymentDate={gig.playerExpectedPaymentDate}
                  personalEarningsAmount={gig.playerPersonalEarningsAmount}
                  personalEarningsCurrency={gig.playerPersonalEarningsCurrency}
                />
              )}

              {/* Row 2: Buttons — shown for all users */}
              <div className="flex items-center gap-2">
                {/* Edit button — managers of non-external gigs only */}
                {gig.isManager && !gig.isExternal && onEdit && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 px-2.5 gap-1.5 text-xs"
                    onClick={() => onEdit(gig)}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                    Edit
                  </Button>
                )}

                {/* GigPack button — always visible */}
                <Link href={`/gigs/${gig.gigId}/pack?returnUrl=${returnUrl}`}>
                  <Button variant="outline" size="sm" className="h-8 px-2.5 gap-1.5 text-xs">
                    <Package className="h-3.5 w-3.5" />
                    Gig Pack
                  </Button>
                </Link>

                {/* Share button — managers only */}
                {gig.isManager && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5 h-8 px-2.5 text-xs"
                    onClick={handleShare}
                    disabled={isLoadingShare}
                  >
                    <Share2 className={`h-3.5 w-3.5 ${isLoadingShare ? 'animate-pulse' : ''}`} />
                    Share
                  </Button>
                )}

                {/* Quick Actions Dropdown — anyone with actions */}
                {(showPlayerActions || showManagerActions) && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-8 w-8 px-0">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {/* Group 1: Invitation Actions */}
                      {showInvitationActions && (
                        <>
                          <DropdownMenuItem onClick={handleAcceptInvitation}>
                            <Check className="h-4 w-4 mr-2 text-green-600" />
                            Accept Invitation
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => declineInvitationMutation.mutate(gig.playerGigRoleId!)}>
                            <X className="h-4 w-4 mr-2 text-red-600" />
                            Decline Invitation
                          </DropdownMenuItem>
                        </>
                      )}

                      {showWithdrawAction && (
                        <DropdownMenuItem onClick={() => declineInvitationMutation.mutate(gig.playerGigRoleId!)}>
                          <X className="h-4 w-4 mr-2 text-red-600" />
                          Decline Gig
                        </DropdownMenuItem>
                      )}

                      {/* Separator between player and manager actions */}
                      {(showInvitationActions || showWithdrawAction) && showManagerActions && <DropdownMenuSeparator />}

                      {/* Group 2: Status Actions */}
                      {showManagerActions && (
                        <>
                          {gig.status !== "confirmed" && (
                            <DropdownMenuItem onClick={() => updateStatusMutation.mutate({ gigId: gig.gigId, status: "confirmed" })}>
                              <CircleCheck className="h-4 w-4 mr-2" />
                              Confirm Gig
                            </DropdownMenuItem>
                          )}
                          {gig.status !== "tentative" && (
                            <DropdownMenuItem onClick={() => updateStatusMutation.mutate({ gigId: gig.gigId, status: "tentative" })}>
                              <CircleDashed className="h-4 w-4 mr-2" />
                              Mark as Tentative
                            </DropdownMenuItem>
                          )}
                          {gig.status !== "cancelled" && (
                            <DropdownMenuItem onClick={() => updateStatusMutation.mutate({ gigId: gig.gigId, status: "cancelled" })}>
                              <CircleX className="h-4 w-4 mr-2" />
                              Cancel Gig
                            </DropdownMenuItem>
                          )}
                          {/* Group 3: Duplicate */}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => router.push(`/gigs/new?duplicate=${gig.gigId}`)}>
                            <Copy className="h-4 w-4 mr-2" />
                            Duplicate Gig
                          </DropdownMenuItem>
                          {/* Group 4: Destructive */}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => setDeleteDialogOpen(true)}
                            className="text-destructive focus:text-destructive"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete Gig
                          </DropdownMenuItem>
                        </>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
            </div>

            {/* Mobile-only action buttons */}
            <div className="sm:hidden absolute right-0 -bottom-2 flex items-center justify-end gap-1.5">
              {/* Edit button — managers of non-external gigs only */}
              {gig.isManager && !gig.isExternal && onEdit && (
                <Button
                  variant="outline"
                  size="sm"
                  className="h-6 px-2 gap-1 rounded-sm text-muted-foreground text-[11px]"
                  onClick={() => onEdit(gig)}
                >
                  <Pencil className="h-3 w-3" />
                  Edit
                </Button>
              )}

              {/* GigPack button — always visible */}
              <Link href={`/gigs/${gig.gigId}/pack?returnUrl=${returnUrl}`}>
                <Button variant="outline" size="sm" className="h-6 px-2 gap-1 rounded-sm text-muted-foreground text-[11px]">
                  <Package className="h-3 w-3" />
                  Gig Pack
                </Button>
              </Link>

              {/* Dropdown — anyone with actions */}
              {(showPlayerActions || showManagerActions) && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-8 w-8 px-2">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {showInvitationActions && (
                      <>
                        <DropdownMenuItem onClick={handleAcceptInvitation}>
                          <Check className="h-4 w-4 mr-2 text-green-600" />
                          Accept Invitation
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => declineInvitationMutation.mutate(gig.playerGigRoleId!)}>
                          <X className="h-4 w-4 mr-2 text-red-600" />
                          Decline Invitation
                        </DropdownMenuItem>
                      </>
                    )}
                    {showWithdrawAction && (
                      <DropdownMenuItem onClick={() => declineInvitationMutation.mutate(gig.playerGigRoleId!)}>
                        <X className="h-4 w-4 mr-2 text-red-600" />
                        Decline Gig
                      </DropdownMenuItem>
                    )}
                    {showManagerActions && (
                      <>
                        <DropdownMenuSeparator />
                        {gig.status !== "confirmed" && (
                          <DropdownMenuItem onClick={() => updateStatusMutation.mutate({ gigId: gig.gigId, status: "confirmed" })}>
                            <CircleCheck className="h-4 w-4 mr-2" />
                            Confirm Gig
                          </DropdownMenuItem>
                        )}
                        {gig.status !== "tentative" && (
                          <DropdownMenuItem onClick={() => updateStatusMutation.mutate({ gigId: gig.gigId, status: "tentative" })}>
                            <CircleDashed className="h-4 w-4 mr-2" />
                            Mark as Tentative
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => setDeleteDialogOpen(true)}
                          className="text-destructive focus:text-destructive"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete Gig
                        </DropdownMenuItem>
                      </>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>

          </div>
        </div>

        {/* Invited badge - centered on the whole card */}
        {needsResponse && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
            <Badge className="bg-white hover:bg-white text-black border-0 text-sm px-3 py-1 shadow-lg pointer-events-auto">
              <Mail className="h-3.5 w-3.5 mr-1.5" />
              Invited
            </Badge>
          </div>
        )}
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

      {/* Share Dialog */}
      {gig.isManager && (
        <GigPackShareDialog
          open={shareDialogOpen}
          onOpenChange={setShareDialogOpen}
          gigPack={{
            id: gig.gigId,
            title: gig.gigTitle,
            band_name: null,
            date: gig.date,
            venue_name: gig.locationName || null,
            public_slug: shareSlug || gig.gigId,
          }}
          locale="en"
        />
      )}

      {/* Delete Dialog */}
      {gig.isManager && (
        <DeleteGigDialog
          open={deleteDialogOpen}
          onOpenChange={setDeleteDialogOpen}
          gigTitle={gig.gigTitle}
          isLoading={deleteGigMutation.isPending}
          onConfirm={() => {
            setDeleteDialogOpen(false);
            deleteGigMutation.mutate(gig.gigId);
          }}
        />
      )}

    </>
  );
}
