'use client';

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { ClipboardList, Edit2, X, Check } from 'lucide-react';
import { getGig, updateGig } from '@/lib/api/gigs';
import { useUser } from '@/lib/providers/user-provider';

interface GigScheduleSectionProps {
  gigId: string;
}

export function GigScheduleSection({ gigId }: GigScheduleSectionProps) {
  const queryClient = useQueryClient();
  const { user } = useUser();
  const [isEditing, setIsEditing] = useState(false);
  const [scheduleText, setScheduleText] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Fetch gig to get current schedule
  const {
    data: gig,
    isLoading,
  } = useQuery({
    queryKey: ['gig', gigId],
    queryFn: () => getGig(gigId),
  });

  const handleEdit = () => {
    setScheduleText(gig?.schedule || '');
    setIsEditing(true);
  };

  const handleCancel = () => {
    setIsEditing(false);
    setScheduleText('');
  };

  const handleSave = async () => {
    if (!gig) return;
    
    setIsSaving(true);
    try {
      await updateGig(gig.id, {
        schedule: scheduleText.trim() || null,
      });
      queryClient.invalidateQueries({ 
        queryKey: ['gig', gigId],
        refetchType: 'active'
      });
      queryClient.invalidateQueries({ 
        queryKey: ['gig-pack', gigId],
        refetchType: 'active'
      });
      queryClient.invalidateQueries({ 
        queryKey: ['dashboard-gigs', user?.id],
        refetchType: 'active'
      });
      setIsEditing(false);
    } catch (err) {
      console.error('Failed to update schedule:', err);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-32" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-24 w-full" />
        </CardContent>
      </Card>
    );
  }

  const hasSchedule = gig?.schedule && gig.schedule.trim().length > 0;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="space-y-1.5">
            <CardTitle className="flex items-center gap-2">
              <ClipboardList className="h-5 w-5" />
              Schedule
            </CardTitle>
            <CardDescription>
              Timeline and important times for this gig
            </CardDescription>
          </div>
          {!isEditing && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleEdit}
            >
              {hasSchedule ? (
                <>
                  <Edit2 className="h-4 w-4 mr-2" />
                  Edit
                </>
              ) : (
                'Add Schedule'
              )}
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {isEditing ? (
          <div className="space-y-3">
            <Textarea
              value={scheduleText}
              onChange={(e) => setScheduleText(e.target.value)}
              placeholder="e.g., Load-in: 6:00 PM
Soundcheck: 7:00 PM
Doors: 8:00 PM
Showtime: 9:00 PM"
              rows={6}
              className="font-mono text-sm"
              disabled={isSaving}
            />
            <p className="text-xs text-muted-foreground">
              Enter schedule items with times (one per line). Any line with a time will be recognized.
            </p>
            <div className="flex items-center gap-2">
              <Button
                onClick={handleSave}
                disabled={isSaving}
                size="sm"
              >
                <Check className="h-4 w-4 mr-2" />
                {isSaving ? 'Saving...' : 'Save'}
              </Button>
              <Button
                variant="outline"
                onClick={handleCancel}
                disabled={isSaving}
                size="sm"
              >
                <X className="h-4 w-4 mr-2" />
                Cancel
              </Button>
            </div>
          </div>
        ) : hasSchedule ? (
          <div className="p-3 bg-muted/50 rounded-lg border">
            <pre className="text-sm whitespace-pre-wrap font-sans">
              {gig.schedule}
            </pre>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-8">
            No schedule added yet. Click "Add Schedule" to add timeline information.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

