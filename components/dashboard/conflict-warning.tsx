"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Calendar, Clock, MapPin } from "lucide-react";
import type { DashboardGig } from "@/lib/types/shared";
import { format, parseISO } from "date-fns";

interface ConflictWarningDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  conflicts: DashboardGig[];
  gigTitle: string;
  gigDate: string;
  gigTime?: string | null;
  onAcceptAnyway: () => void;
  onCancel: () => void;
  isLoading?: boolean;
}

export function ConflictWarningDialog({
  open,
  onOpenChange,
  conflicts,
  gigTitle,
  gigDate,
  gigTime,
  onAcceptAnyway,
  onCancel,
  isLoading = false,
}: ConflictWarningDialogProps) {
  const formatTime = (time: string | null) => {
    if (!time) return null;
    const [hours, minutes] = time.split(":");
    const hour = parseInt(hours, 10);
    const period = hour >= 12 ? "PM" : "AM";
    const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
    return `${displayHour}:${minutes} ${period}`;
  };

  const formatDate = (date: string) => {
    try {
      return format(parseISO(date), "MMM d, yyyy");
    } catch {
      return date;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="rounded-full bg-amber-100 p-2">
              <AlertTriangle className="h-5 w-5 text-amber-600" />
            </div>
            <DialogTitle>Schedule Conflict Detected</DialogTitle>
          </div>
          <DialogDescription>
            You have {conflicts.length} conflicting gig{conflicts.length > 1 ? "s" : ""} on {formatDate(gigDate)}
            {gigTime && ` at ${formatTime(gigTime)}`}.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-4">
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
            <p className="text-sm font-medium text-amber-900">Trying to accept:</p>
            <p className="text-sm text-amber-800 mt-1">{gigTitle}</p>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium text-gray-900">Conflicts with:</p>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {conflicts.map((conflict) => (
                <div
                  key={conflict.gigId}
                  className="rounded-lg border border-gray-200 bg-gray-50 p-3 space-y-2"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">
                        {conflict.gigTitle}
                      </p>
                    </div>
                    <div className="flex gap-1.5 items-center">
                      {conflict.isManager && (
                        <Briefcase className="h-3.5 w-3.5 text-muted-foreground" />
                      )}
                      {conflict.isPlayer && (
                        <Badge variant="secondary" className="text-xs">
                          <Music className="h-3 w-3 mr-1" />
                          Playing
                        </Badge>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-3 text-xs text-gray-600">
                    <div className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {formatDate(conflict.date)}
                    </div>
                    {conflict.startTime && (
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatTime(conflict.startTime)}
                      </div>
                    )}
                    {conflict.locationName && (
                      <div className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {conflict.locationName}
                      </div>
                    )}
                  </div>

                  {conflict.isPlayer && conflict.playerRoleName && (
                    <p className="text-xs text-gray-600">
                      Your role: {conflict.playerRoleName}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter className="flex gap-2">
          <Button
            variant="outline"
            onClick={onCancel}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            variant="default"
            onClick={onAcceptAnyway}
            disabled={isLoading}
          >
            {isLoading ? "Accepting..." : "Accept Anyway"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Import Music and Briefcase icons
import { Music, Briefcase } from "lucide-react";

