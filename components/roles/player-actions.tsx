'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { updateMyInvitationStatus, updateMyPlayerNotes, checkGigConflicts } from '@/lib/api/gig-roles';
import { Check, X, UserX, Loader2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from '@/components/ui/alert';

interface PlayerStatusActionsProps {
  roleId: string;
  currentStatus: string;
  playerNotes?: string | null;
  userId: string;
  gigId: string;
  gigDate?: string;
  startTime?: string;
  endTime?: string;
}

export function PlayerStatusActions({
  roleId,
  currentStatus,
  playerNotes,
  userId,
  gigId,
  gigDate,
  startTime,
  endTime,
}: PlayerStatusActionsProps) {
  const [notes, setNotes] = useState(playerNotes || '');
  const [loading, setLoading] = useState(false);
  const [conflicts, setConflicts] = useState<any[]>([]);
  const queryClient = useQueryClient();
  
  const handleStatusChange = async (status: 'accepted' | 'declined' | 'needs_sub') => {
    setLoading(true);
    setConflicts([]);
    
    try {
      // Check for conflicts if accepting
      if (status === 'accepted' && gigDate && startTime && endTime) {
        const foundConflicts = await checkGigConflicts(userId, gigId, gigDate, startTime, endTime);
        
        if (foundConflicts.length > 0) {
          setConflicts(foundConflicts);
          const confirm = window.confirm(
            `⚠️ You have ${foundConflicts.length} conflicting gig(s) on this date:\n\n` +
            foundConflicts.map(g => `• ${g.title} at ${g.start_time}`).join('\n') +
            '\n\nAccept this gig anyway?'
          );
          
          if (!confirm) {
            setLoading(false);
            return;
          }
        }
      }
      
      await updateMyInvitationStatus(roleId, status);
      
      const statusLabels = {
        accepted: 'confirmed',
        declined: 'declined/needs sub',
        needs_sub: 'maybe',
      };
      
      toast.success(`Status updated to ${statusLabels[status]}`);
      
      // Invalidate relevant queries
      queryClient.invalidateQueries({ 
        queryKey: ['gig-pack', gigId],
        refetchType: 'active'
      });
      queryClient.invalidateQueries({ 
        queryKey: ['dashboard-gigs', userId],
        refetchType: 'active'
      });
      queryClient.invalidateQueries({ 
        queryKey: ['gig', gigId],
        refetchType: 'active'
      });
      queryClient.invalidateQueries({ 
        queryKey: ['gig-roles', gigId],
        refetchType: 'active'
      });
    } catch (error: any) {
      console.error('Error updating status:', error);
      toast.error(error.message || 'Failed to update status');
    } finally {
      setLoading(false);
    }
  };
  
  const handleNotesUpdate = async () => {
    if (notes === (playerNotes || '')) return; // No changes
    
    try {
      await updateMyPlayerNotes(roleId, notes);
      toast.success('Notes saved');
      
      // Invalidate queries to refetch updated data
      queryClient.invalidateQueries({ 
        queryKey: ['gig-pack', gigId],
        refetchType: 'active'
      });
      queryClient.invalidateQueries({ 
        queryKey: ['gig', gigId],
        refetchType: 'active'
      });
    } catch (error: any) {
      console.error('Error saving notes:', error);
      toast.error('Failed to save notes');
    }
  };
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>My Status & Notes</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Status badges */}
        <div className="flex items-center gap-2 mb-2">
          <span className="text-sm text-muted-foreground">Current status:</span>
          <span className="text-sm font-medium capitalize">
            {currentStatus === 'needs_sub' ? 'Maybe' : currentStatus}
          </span>
        </div>
        
        {/* Conflict warning */}
        {conflicts.length > 0 && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Schedule Conflict</AlertTitle>
            <AlertDescription>
              You have {conflicts.length} overlapping gig(s) on this date.
            </AlertDescription>
          </Alert>
        )}
        
        {/* Action buttons */}
        <div className="flex gap-2">
          <Button
            onClick={() => handleStatusChange('accepted')}
            disabled={loading || currentStatus === 'accepted'}
            variant="outline"
            className="flex-1 border-green-200 bg-green-50 text-green-700 hover:bg-green-100 hover:border-green-300 dark:border-green-800 dark:bg-green-950 dark:text-green-300 dark:hover:bg-green-900"
            size="sm"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Check className="w-4 h-4 mr-2" />
            )}
            Confirm
          </Button>
          
          <Button
            onClick={() => handleStatusChange('needs_sub')}
            disabled={loading || currentStatus === 'needs_sub'}
            variant="outline"
            className="flex-1 border-orange-200 bg-orange-50 text-orange-700 hover:bg-orange-100 hover:border-orange-300 dark:border-orange-800 dark:bg-orange-950 dark:text-orange-300 dark:hover:bg-orange-900"
            size="sm"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <UserX className="w-4 h-4 mr-2" />
            )}
            Maybe
          </Button>
          
          <Button
            onClick={() => handleStatusChange('declined')}
            disabled={loading}
            variant="outline"
            className="flex-1 border-red-200 bg-red-50 text-red-700 hover:bg-red-100 hover:border-red-300 dark:border-red-800 dark:bg-red-950 dark:text-red-300 dark:hover:bg-red-900"
            size="sm"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <X className="w-4 h-4 mr-2" />
            )}
            Decline/Need Sub
          </Button>
        </div>
        
        {/* Personal notes */}
        <div>
          <Label htmlFor="player-notes" className="text-sm font-medium mb-2 block">
            My Personal Notes
          </Label>
          <Textarea
            id="player-notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            onBlur={handleNotesUpdate}
            placeholder="Add personal notes for this gig (only visible to you)..."
            rows={3}
            className="resize-none"
          />
          <p className="text-xs text-muted-foreground mt-1">
            These notes are private and only visible to you
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

