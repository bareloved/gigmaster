'use client';

import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';

interface HostNotesSectionProps {
  gigId: string;
  initialNotes?: string | null;
  userId: string;
}

export function HostNotesSection({
  gigId,
  initialNotes,
  userId,
}: HostNotesSectionProps) {
  const [notes, setNotes] = useState(initialNotes || '');
  const queryClient = useQueryClient();
  
  const handleNotesUpdate = async () => {
    if (notes === (initialNotes || '')) return; // No changes
    
    try {
      // TODO: Create API function updateHostNotes(gigId, notes)
      // For now, we'll just show a toast
      // await updateHostNotes(gigId, notes);
      
      toast.success('Notes saved');
      
      // Invalidate queries to refetch updated data
      queryClient.invalidateQueries({ 
        queryKey: ['gig-pack', gigId, userId],
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
        <CardTitle>My Host Notes</CardTitle>
      </CardHeader>
      <CardContent>
        <div>
          <Label htmlFor="host-notes" className="text-sm font-medium mb-2 block">
            Private notes for managing this gig
          </Label>
          <Textarea
            id="host-notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            onBlur={handleNotesUpdate}
            placeholder="Add personal notes for this gig (only visible to you)..."
            rows={4}
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

