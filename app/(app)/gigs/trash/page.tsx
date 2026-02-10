"use client";

import { useState } from "react";
import { useDocumentTitle } from "@/hooks/use-document-title";
import { useQuery } from "@tanstack/react-query";
import { useUser } from "@/lib/providers/user-provider";
import { listTrashedGigs } from "@/lib/api/gigs";
import { useRestoreGig, usePermanentDeleteGig } from "@/hooks/use-gig-mutations";
import { PermanentDeleteDialog } from "@/components/gigs/dialogs/permanent-delete-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Trash2, Undo2, Clock, MapPin, Calendar } from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";
import type { TrashedGig } from "@/lib/types/shared";

export default function TrashPage() {
  useDocumentTitle("Trash");
  const { user } = useUser();

  const [confirmGig, setConfirmGig] = useState<TrashedGig | null>(null);

  const { data: trashedGigs, isLoading } = useQuery({
    queryKey: ["trashed-gigs", user?.id],
    queryFn: listTrashedGigs,
    enabled: !!user,
  });

  const restoreMutation = useRestoreGig();
  const permanentDeleteMutation = usePermanentDeleteGig();

  return (
    <div className="space-y-4 sm:space-y-5 lg:space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3 sm:gap-4">
        <div className="flex-1">
          <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight">Trash</h2>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Deleted gigs are permanently removed after 30 days
          </p>
        </div>
        <div className="flex-1 flex justify-end">
          <Link href="/gigs">
            <Button variant="outline" className="gap-2 h-9 sm:h-10 text-sm">
              All Gigs
            </Button>
          </Link>
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="space-y-2 sm:space-y-3">
          <Skeleton className="h-32 sm:h-40 w-full" />
          <Skeleton className="h-32 sm:h-40 w-full" />
          <Skeleton className="h-32 sm:h-40 w-full" />
        </div>
      ) : !trashedGigs || trashedGigs.length === 0 ? (
        <Card className="p-3 sm:p-4 lg:p-6">
          <CardContent className="py-8 sm:py-12 px-0">
            <div className="flex flex-col items-center text-center">
              <Trash2 className="h-10 w-10 sm:h-12 sm:w-12 text-muted-foreground mb-3 sm:mb-4" />
              <h3 className="text-base sm:text-lg font-semibold mb-1">
                Trash is empty
              </h3>
              <p className="text-xs sm:text-sm text-muted-foreground">
                Deleted gigs will appear here for 30 days before being permanently removed.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2 sm:space-y-3">
          {trashedGigs.map((gig) => {
            const gigDate = new Date(gig.date);

            return (
              <Card key={gig.id} className="p-3 sm:p-4 opacity-70">
                <div className="flex items-start gap-2 sm:gap-4">
                  {/* Date Badge */}
                  <div className="flex flex-col items-center bg-primary/10 rounded-md sm:rounded-lg p-1.5 sm:p-2 min-w-[45px] sm:min-w-[60px]">
                    <span className="text-[10px] sm:text-xs text-muted-foreground uppercase">
                      {format(gigDate, "MMM")}
                    </span>
                    <span className="text-lg sm:text-2xl font-bold">
                      {format(gigDate, "d")}
                    </span>
                  </div>

                  {/* Gig Details */}
                  <div className="flex-1 min-w-0 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-semibold text-sm sm:text-base truncate">
                        {gig.title}
                      </h3>
                    </div>

                    {/* Metadata row */}
                    <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 text-xs sm:text-sm">
                      <div className="flex items-center gap-1 sm:gap-1.5 text-muted-foreground">
                        <Calendar className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                        <span className="text-[10px] sm:text-sm">
                          {format(gigDate, "EEE, MMM d, yyyy")}
                        </span>
                      </div>

                      {gig.locationName && (
                        <div className="flex items-center gap-1 sm:gap-1.5 text-muted-foreground">
                          <MapPin className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                          <span className="truncate max-w-[120px] sm:max-w-none text-[10px] sm:text-sm">
                            {gig.locationName}
                          </span>
                        </div>
                      )}

                      {gig.bandName && (
                        <span className="text-[10px] sm:text-sm text-muted-foreground truncate">
                          {gig.bandName}
                        </span>
                      )}
                    </div>

                    {/* Days remaining */}
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      <span>
                        {gig.daysRemaining === 0
                          ? "Expires today"
                          : gig.daysRemaining === 1
                            ? "1 day remaining"
                            : `${gig.daysRemaining} days remaining`}
                      </span>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex justify-end gap-1.5 sm:gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-1.5 sm:gap-2 h-8 sm:h-9 text-xs sm:text-sm"
                        onClick={() => restoreMutation.mutate(gig.id)}
                        disabled={restoreMutation.isPending}
                      >
                        <Undo2 className="h-4 w-4" />
                        <span className="hidden sm:inline">Restore</span>
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="gap-1.5 sm:gap-2 h-8 sm:h-9 text-xs sm:text-sm text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={() => setConfirmGig(gig)}
                        disabled={permanentDeleteMutation.isPending}
                      >
                        <Trash2 className="h-4 w-4" />
                        <span className="hidden sm:inline">Delete Forever</span>
                      </Button>
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Permanent Delete Confirmation */}
      <PermanentDeleteDialog
        open={!!confirmGig}
        onOpenChange={(open) => {
          if (!open) setConfirmGig(null);
        }}
        gigTitle={confirmGig?.title || ""}
        onConfirm={() => {
          if (confirmGig) {
            permanentDeleteMutation.mutate(confirmGig.id);
            setConfirmGig(null);
          }
        }}
      />
    </div>
  );
}
