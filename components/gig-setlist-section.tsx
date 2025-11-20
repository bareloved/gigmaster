'use client';

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { DndContext, closestCenter, DragEndEvent, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Music, Plus, List } from 'lucide-react';
import { listSetlistItemsForGig, deleteSetlistItem, updateSetlistItem } from '@/lib/api/setlist-items';
import type { SetlistItem } from '@/lib/types/shared';
import { AddSetlistItemDialog } from '@/components/add-setlist-item-dialog';
import { BulkAddSetlistDialog } from '@/components/bulk-add-setlist-dialog';
import { EditSetlistItemDialog } from '@/components/edit-setlist-item-dialog';
import { DraggableSetlistItem } from '@/components/draggable-setlist-item';

interface GigSetlistSectionProps {
  gigId: string;
}

export function GigSetlistSection({ gigId }: GigSetlistSectionProps) {
  const queryClient = useQueryClient();
  const [isAddSetlistItemDialogOpen, setIsAddSetlistItemDialogOpen] = useState(false);
  const [isBulkAddDialogOpen, setIsBulkAddDialogOpen] = useState(false);
  const [editingSetlistItem, setEditingSetlistItem] = useState<SetlistItem | null>(null);

  // Drag and drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  // Fetch setlist items
  const {
    data: setlistItems = [],
    isLoading: isSetlistLoading,
  } = useQuery({
    queryKey: ['setlist', gigId],
    queryFn: () => listSetlistItemsForGig(gigId),
  });

  const handleDeleteSetlistItem = async (itemId: string) => {
    try {
      await deleteSetlistItem(itemId);
      queryClient.invalidateQueries({ 
        queryKey: ['setlist', gigId],
        refetchType: 'active'
      });
      queryClient.invalidateQueries({ 
        queryKey: ['gig', gigId],
        refetchType: 'active'
      });
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete setlist item');
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over || active.id === over.id) {
      return;
    }

    const oldIndex = setlistItems.findIndex((item) => item.id === active.id);
    const newIndex = setlistItems.findIndex((item) => item.id === over.id);

    if (oldIndex === -1 || newIndex === -1) return;

    // Create a new ordered array
    const reordered = [...setlistItems];
    const [movedItem] = reordered.splice(oldIndex, 1);
    reordered.splice(newIndex, 0, movedItem);

    // Update the position for each item
    const updates = reordered.map((item, index) => ({
      id: item.id,
      position: index + 1,
    }));

    // Optimistic update
    queryClient.setQueryData(['setlist', gigId], reordered.map((item, index) => ({
      ...item,
      position: index + 1,
    })));

    try {
      // Batch update positions in database
      await Promise.all(
        updates.map((update) =>
          updateSetlistItem(update.id, { position: update.position })
        )
      );
    } catch (err) {
      console.error('Failed to reorder setlist items:', err);
      // Revert on error
      queryClient.invalidateQueries({ 
        queryKey: ['setlist', gigId],
        refetchType: 'active'
      });
      queryClient.invalidateQueries({ 
        queryKey: ['gig', gigId],
        refetchType: 'active'
      });
      alert(err instanceof Error ? err.message : 'Failed to reorder items');
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Music className="h-5 w-5" />
              Setlist
            </CardTitle>
            <div className="flex gap-2">
              <Button 
                onClick={() => setIsBulkAddDialogOpen(true)}
                size="sm"
                variant="outline"
              >
                <List className="h-4 w-4 mr-2" />
                Bulk Add
              </Button>
              <Button 
                onClick={() => setIsAddSetlistItemDialogOpen(true)}
                size="sm"
                variant="outline"
                title="Add single song"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <CardDescription>Songs and order</CardDescription>
        </CardHeader>
        <CardContent>
          {isSetlistLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
            </div>
          ) : setlistItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Music className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No songs yet</h3>
              <p className="text-sm text-muted-foreground mb-4 max-w-sm">
                Add songs to create your setlist
              </p>
            </div>
          ) : (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={setlistItems.map((item) => item.id)}
                strategy={verticalListSortingStrategy}
              >
                <div className="max-h-[336px] overflow-y-auto space-y-2">
                  {setlistItems.map((item) => (
                    <DraggableSetlistItem
                      key={item.id}
                      item={item}
                      onEdit={setEditingSetlistItem}
                      onDelete={handleDeleteSetlistItem}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          )}
        </CardContent>
      </Card>

      <AddSetlistItemDialog
        gigId={gigId}
        open={isAddSetlistItemDialogOpen}
        onOpenChange={setIsAddSetlistItemDialogOpen}
        onSuccess={() => {
          // Setlist items will be refetched automatically via TanStack Query
        }}
      />

      <BulkAddSetlistDialog
        gigId={gigId}
        open={isBulkAddDialogOpen}
        onOpenChange={setIsBulkAddDialogOpen}
        onSuccess={() => {
          // Setlist items will be refetched automatically via TanStack Query
        }}
      />

      {editingSetlistItem && (
        <EditSetlistItemDialog
          item={editingSetlistItem}
          open={Boolean(editingSetlistItem)}
          onOpenChange={(open) => !open && setEditingSetlistItem(null)}
          onSuccess={() => {
            // Setlist items will be refetched automatically via TanStack Query
          }}
        />
      )}
    </>
  );
}

