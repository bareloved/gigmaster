'use client';

import { useQuery } from '@tanstack/react-query';
import { useParams, useSearchParams } from 'next/navigation';
import { format } from 'date-fns';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { GigStatusBadge } from '@/components/gig-status-badge';
import { 
  MapPin, Clock, Users, Music, FolderOpen, DollarSign, 
  ArrowLeft, AlertCircle, ClipboardList, FileText, Crown, Mail 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { getGigPack } from '@/lib/api/gig-pack';
import { useUser } from '@/lib/providers/user-provider';
import { formatCurrency } from '@/lib/utils/currency';
import { FileTypeIcon } from '@/components/file-type-icon';
import { PlayerStatusActions } from '@/components/player-status-actions';
import { HostNotesSection } from '@/components/host-notes-section';

export default function GigPackPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const gigId = params.id as string;
  const returnUrl = searchParams.get('returnUrl') || '/dashboard';
  const { user } = useUser();

  const { data: pack, isLoading, error } = useQuery({
    queryKey: ['gig-pack', gigId, user?.id],
    queryFn: () => getGigPack(gigId, user!.id),
    enabled: !!user?.id && !!gigId,
    staleTime: 1 * 60 * 1000, // 1 minute
  });

  if (!user) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <p className="text-muted-foreground">Please sign in to view this gig.</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="mx-auto max-w-2xl space-y-4 p-4">
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (error || !pack) {
    return (
      <div className="mx-auto max-w-2xl p-4">
        <Card className="border-destructive">
          <CardContent className="flex items-center gap-2 pt-6">
            <AlertCircle className="h-5 w-5 text-destructive" />
            <p className="text-sm text-destructive">
              Failed to load gig pack. Please try again.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Check if user is the owner (via project)
  const isOwner = pack.project?.ownerId === user?.id;

  return (
    <div className="mx-auto max-w-2xl space-y-4 p-4 pb-20">
      {/* Header */}
      <div className="space-y-2">
        {isOwner ? (
          <Link href={`/gigs/${gigId}?returnUrl=${encodeURIComponent(returnUrl)}`}>
            <Button variant="ghost" size="sm" className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back to Gig Detail
            </Button>
          </Link>
        ) : (
          <Link href={returnUrl}>
            <Button variant="ghost" size="sm" className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
          </Link>
        )}
        
        <div>
          <div className="flex items-center gap-4 flex-wrap">
            <h1 className="text-2xl font-bold">{pack.title}</h1>
            {/* Host Badge */}
            {user && pack.project?.ownerId === user.id ? (
              <Badge variant="outline" className="gap-1 text-xs bg-orange-50 border-orange-200 text-orange-700 dark:bg-orange-950 dark:border-orange-800 dark:text-orange-300">
                <Crown className="h-3 w-3" />
                Hosted by You
              </Badge>
            ) : pack.project ? (
              <Badge variant="outline" className="gap-1 text-xs bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-950 dark:border-blue-800 dark:text-blue-300">
                <Mail className="h-3 w-3" />
                Hosted by {pack.project.ownerName}
              </Badge>
            ) : null}
            <GigStatusBadge status={pack.status} />
          </div>
          {pack.project && !pack.project.name.includes("Personal Gigs") && (
            <p className="text-sm text-muted-foreground">
              {pack.project.name}
            </p>
          )}
        </div>
      </div>

      {/* Logistics */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Logistics
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <p className="text-sm font-medium">Date</p>
            <p className="text-lg">{format(new Date(pack.date), 'EEEE, MMMM d, yyyy')}</p>
          </div>

          {(pack.startTime || pack.endTime) && (
            <div>
              <p className="text-sm font-medium">Time</p>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <p className="text-sm">
                  {pack.startTime && format(new Date(`2000-01-01T${pack.startTime}`), 'h:mm a')}
                  {pack.startTime && pack.endTime && ' - '}
                  {pack.endTime && format(new Date(`2000-01-01T${pack.endTime}`), 'h:mm a')}
                </p>
              </div>
            </div>
          )}

          {pack.locationName && (
            <div>
              <p className="text-sm font-medium">Location</p>
              <p>{pack.locationName}</p>
              {pack.locationAddress && (
                <p className="text-sm text-muted-foreground">{pack.locationAddress}</p>
              )}
            </div>
          )}

          {/* Schedule - if imported from calendar */}
          {pack.schedule && (
            <div>
              <p className="text-sm font-medium flex items-center gap-2">
                <ClipboardList className="h-4 w-4" />
                Schedule
              </p>
              <div className="p-3 bg-gray-50 rounded-lg border mt-1">
                <pre className="text-sm whitespace-pre-wrap font-sans">
                  {pack.schedule}
                </pre>
              </div>
            </div>
          )}

          {/* Notes - if imported from calendar or added by user */}
          {pack.notes && (
            <div>
              <p className="text-sm font-medium flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Notes
              </p>
              <div className="p-3 bg-gray-50 rounded-lg border mt-1">
                <p className="text-sm whitespace-pre-wrap">
                  {pack.notes}
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Player Status Actions (for players) */}
      {pack.userRole && user && (
        <PlayerStatusActions
          roleId={pack.userRole.roleId}
          currentStatus={pack.userRole.invitationStatus}
          playerNotes={pack.userRole.playerNotes}
          userId={user.id}
          gigId={gigId}
          gigDate={pack.date}
          startTime={pack.startTime || undefined}
          endTime={pack.endTime || undefined}
        />
      )}

      {/* Host Notes (for all hosts, even if they're also playing) */}
      {isOwner && user && (
        <HostNotesSection
          gigId={gigId}
          initialNotes={null}
          userId={user.id}
        />
      )}

      {/* Payment Info */}
      {pack.userRole && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Payment Info
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Your Role</p>
                <p className="text-lg">{pack.userRole.roleName}</p>
              </div>
              {pack.userRole.agreedFee !== null && (
                <div className="text-right">
                  <p className="text-sm font-medium">Fee</p>
                  <p className="text-lg font-semibold">
                    {formatCurrency(pack.userRole.agreedFee, pack.userRole.currency)}
                  </p>
                </div>
              )}
            </div>

            <div>
              <p className="text-sm font-medium">Payment Status</p>
              <Badge variant={pack.userRole.isPaid ? 'default' : 'secondary'} className={pack.userRole.isPaid ? 'bg-green-600' : ''}>
                {pack.userRole.isPaid ? 'Paid' : 'Unpaid'}
              </Badge>
              {pack.userRole.isPaid && pack.userRole.paidAt && (
                <p className="text-xs text-muted-foreground mt-1">
                  Paid on {format(new Date(pack.userRole.paidAt), 'MMM d, yyyy')}
                </p>
              )}
            </div>

            {pack.userRole.notes && (
              <div>
                <p className="text-sm font-medium">Notes from Manager</p>
                <p className="text-sm text-muted-foreground">{pack.userRole.notes}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Setlist */}
      {pack.setlist.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Music className="h-5 w-5" />
              Setlist
            </CardTitle>
            <CardDescription>{pack.setlist.length} songs</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {pack.setlist.map((song, index) => (
                <div
                  key={song.id}
                  className="flex items-start justify-between rounded-lg border p-3"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-muted-foreground">
                        {index + 1}.
                      </span>
                      <span className="font-medium">{song.title}</span>
                    </div>
                    <div className="mt-1 flex items-center gap-3 text-sm text-muted-foreground">
                      {song.key && (
                        <span className="font-mono">{song.key}</span>
                      )}
                      {song.bpm && <span>{song.bpm} BPM</span>}
                    </div>
                    {song.notes && (
                      <p className="mt-1 text-sm text-muted-foreground">{song.notes}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Resources */}
      {pack.resources.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FolderOpen className="h-5 w-5" />
              Resources
            </CardTitle>
            <CardDescription>{pack.resources.length} files</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {pack.resources.map((resource) => (
                <a
                  key={resource.id}
                  href={resource.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 rounded-lg border p-3 transition-colors hover:bg-muted"
                >
                  <FileTypeIcon type={resource.type} className="h-5 w-5 flex-shrink-0" />
                  <span className="flex-1 truncate font-medium">{resource.label}</span>
                </a>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* People (Lineup) */}
      {pack.people.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Lineup
            </CardTitle>
            <CardDescription>{pack.people.length} roles</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {pack.people.map((person) => (
                <div
                  key={person.id}
                  className="flex items-center justify-between rounded-lg border p-3"
                >
                  <div>
                    <p className="font-medium">{person.roleName}</p>
                    {person.musicianName && (
                      <p className="text-sm text-muted-foreground">{person.musicianName}</p>
                    )}
                  </div>
                  <Badge
                    variant={
                      person.invitationStatus === 'accepted'
                        ? 'default'
                        : person.invitationStatus === 'declined'
                        ? 'destructive'
                        : 'secondary'
                    }
                  >
                    {person.invitationStatus}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

