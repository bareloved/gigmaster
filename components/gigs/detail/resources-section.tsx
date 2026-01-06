'use client';

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { FileText, Plus, ExternalLink, Pencil, Trash2 } from 'lucide-react';
import { listFilesForGig, deleteGigFile } from '@/lib/api/gig-files';
import type { GigFile } from '@/lib/types/shared';
import { AddGigFileDialog } from '@/components/gigs/files/add-file-dialog';
import { EditGigFileDialog } from '@/components/gigs/files/edit-file-dialog';
import { FileTypeIcon } from '@/components/shared/file-type-icon';
import { HostingServiceIcon } from '@/components/shared/hosting-service-icon';

interface GigResourcesSectionProps {
  gigId: string;
}

export function GigResourcesSection({ gigId }: GigResourcesSectionProps) {
  const queryClient = useQueryClient();
  const [isAddFileDialogOpen, setIsAddFileDialogOpen] = useState(false);
  const [editingFile, setEditingFile] = useState<GigFile | null>(null);

  // Fetch files
  const {
    data: gigFiles = [],
    isLoading: isFilesLoading,
  } = useQuery({
    queryKey: ['gig-files', gigId],
    queryFn: () => listFilesForGig(gigId),
  });

  const handleDeleteFile = async (fileId: string) => {
    if (!confirm('Are you sure you want to delete this file?')) return;
    
    try {
      await deleteGigFile(fileId);
      queryClient.invalidateQueries({ 
        queryKey: ['gig-files', gigId],
        refetchType: 'active'
      });
      queryClient.invalidateQueries({ 
        queryKey: ['gig', gigId],
        refetchType: 'active'
      });
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete file');
    }
  };

  return (
    <>
      {/* TODO: Add role-based view for invitees - see docs/future-enhancements/resources-invitee-view.md */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Resources
            </CardTitle>
            <Button 
              onClick={() => setIsAddFileDialogOpen(true)}
              size="sm"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add URL
            </Button>
          </div>
          <CardDescription>Charts, tracks, and materials</CardDescription>
        </CardHeader>
        <CardContent>
          {isFilesLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
            </div>
          ) : gigFiles.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <FileText className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No resources yet</h3>
              <p className="text-sm text-muted-foreground mb-4 max-w-sm">
                Add links to charts, backing tracks, or other materials stored in Google Drive, Dropbox, etc.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {gigFiles.map((file) => (
                <div
                  key={file.id}
                  className="relative flex items-center gap-3 p-2.5 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  {/* Hosting service logo in top right corner */}
                  <div className="absolute top-2 right-2">
                    <HostingServiceIcon url={file.url} className="h-5 w-5" />
                  </div>
                  
                  <FileTypeIcon type={file.kind} className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                  <div className="flex-1 min-w-0 pr-8">
                    <h4 className="font-medium line-clamp-2">{file.label}</h4>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0 mr-8">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => window.open(file.url, '_blank')}
                      className="h-8 w-8"
                      title="Open in new tab"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setEditingFile(file)}
                      className="h-8 w-8"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDeleteFile(file.id)}
                      className="h-8 w-8"
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <AddGigFileDialog
        gigId={gigId}
        open={isAddFileDialogOpen}
        onOpenChange={setIsAddFileDialogOpen}
        onSuccess={() => {
          queryClient.invalidateQueries({ 
            queryKey: ['gig-files', gigId],
            refetchType: 'active'
          });
          queryClient.invalidateQueries({ 
            queryKey: ['gig', gigId],
            refetchType: 'active'
          });
        }}
      />

      {editingFile && (
        <EditGigFileDialog
          file={editingFile}
          open={Boolean(editingFile)}
          onOpenChange={(open) => !open && setEditingFile(null)}
          onSuccess={() => {
            queryClient.invalidateQueries({ 
              queryKey: ['gig-files', gigId],
              refetchType: 'active'
            });
            queryClient.invalidateQueries({ 
              queryKey: ['gig', gigId],
              refetchType: 'active'
            });
          }}
        />
      )}
    </>
  );
}

