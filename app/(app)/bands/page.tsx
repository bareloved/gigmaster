"use client";

import { useState } from "react";
import { useDocumentTitle } from "@/hooks/use-document-title";
import Image from "next/image";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useUser } from "@/lib/providers/user-provider";
import { useTranslations } from "@/hooks/use-translations";
import { Band } from "@/lib/types/gigpack";
import { listUserBands, deleteBand } from "@/lib/api/bands";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Edit, Trash2, ImageIcon, Music } from "lucide-react";
import { BandEditorPanel } from "@/components/bands/band-editor-panel";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const BandCardSkeleton = () => (
  <Card className="overflow-hidden">
    <Skeleton className="aspect-video w-full" />
    <div className="p-3 sm:p-4 space-y-2">
      <Skeleton className="h-5 w-3/4" />
      <Skeleton className="h-3.5 w-full" />
      <div className="flex gap-2 pt-2">
        <Skeleton className="h-8 flex-1" />
        <Skeleton className="h-8 w-8" />
      </div>
    </div>
  </Card>
);

export default function BandsPage() {
  useDocumentTitle("Bands");
  const { user } = useUser();
  const t = useTranslations("bands");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [editorOpen, setEditorOpen] = useState(false);
  const [editingBand, setEditingBand] = useState<Band | undefined>(undefined);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [bandToDelete, setBandToDelete] = useState<Band | null>(null);

  // Fetch bands with TanStack Query - includes user.id in cache key
  const { data: bands = [], isLoading, error } = useQuery({
    queryKey: ["bands", user?.id],
    queryFn: listUserBands,
    enabled: !!user,
    staleTime: 5 * 60 * 1000, // 5 minutes - bands don't change often
  });

  // Delete mutation with cache invalidation
  const deleteMutation = useMutation({
    mutationFn: deleteBand,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bands", user?.id] });
      toast({
        title: "Success",
        description: "Band deleted successfully.",
      });
      setDeleteDialogOpen(false);
      setBandToDelete(null);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete band. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleCreateNew = () => {
    setEditingBand(undefined);
    setEditorOpen(true);
  };

  const handleEdit = (band: Band) => {
    setEditingBand(band);
    setEditorOpen(true);
  };

  const handleDeleteClick = (band: Band) => {
    setBandToDelete(band);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = () => {
    if (!bandToDelete) return;
    deleteMutation.mutate(bandToDelete.id);
  };

  const handleSaved = (_savedBand: Band) => {
    // Invalidate cache to refetch with new/updated band
    queryClient.invalidateQueries({ queryKey: ["bands", user?.id] });
    setEditorOpen(false);
  };

  // Error state
  if (error) {
    return (
      <div className="py-12 px-8 flex flex-col items-center justify-center text-center space-y-4">
        <div className="text-destructive font-semibold">Failed to load bands</div>
        <p className="text-muted-foreground max-w-md">
          We couldn&apos;t reach the database. This might be a temporary connection issue.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-5 lg:space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3 sm:gap-4">
        <div className="flex-1">
          <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight">
            {t("pageTitle")}
          </h2>
          <p className="text-xs sm:text-sm text-muted-foreground">
            {t("pageDescription")}
          </p>
        </div>
        <Button onClick={handleCreateNew} className="gap-2 h-9 sm:h-10 text-sm">
          <Plus className="h-4 w-4" />
          <span className="hidden xs:inline">{t("createButton")}</span>
          <span className="xs:hidden">New</span>
        </Button>
      </div>

      {/* Bands Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <BandCardSkeleton key={i} />
          ))}
        </div>
      ) : bands.length === 0 ? (
        <Card className="p-3 sm:p-4 lg:p-6">
          <CardContent className="py-8 sm:py-12 px-0">
            <div className="flex flex-col items-center text-center">
              <Music className="h-10 w-10 sm:h-12 sm:w-12 text-muted-foreground mb-3 sm:mb-4" />
              <h3 className="text-base sm:text-lg font-semibold mb-1">No bands yet</h3>
              <p className="text-xs sm:text-sm text-muted-foreground mb-3 sm:mb-4">
                Create your first band to get started.
              </p>
              <Button onClick={handleCreateNew} size="sm" className="gap-2 h-9">
                <Plus className="h-4 w-4" />
                {t("createButton")}
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          {bands.map((band) => (
            <Card key={band.id} className="overflow-hidden hover:shadow-md transition-shadow">
              {/* Band Logo/Hero */}
              <div className="relative aspect-video bg-muted">
                {band.hero_image_url ? (
                  <Image
                    src={band.hero_image_url}
                    alt={band.name}
                    fill
                    className="object-cover"
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                  />
                ) : band.band_logo_url ? (
                  <div className="flex items-center justify-center h-full relative">
                    <Image
                      src={band.band_logo_url}
                      alt={band.name}
                      width={200}
                      height={100}
                      className="max-h-24 max-w-[80%] object-contain"
                    />
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <ImageIcon className="h-12 w-12 text-muted-foreground opacity-30" />
                  </div>
                )}
              </div>

              {/* Band Info */}
              <div className="p-3 sm:p-4">
                <h3 className="font-semibold text-sm sm:text-base mb-0.5">{band.name}</h3>
                {band.description && (
                  <p className="text-xs sm:text-sm text-muted-foreground mb-3 line-clamp-2">
                    {band.description}
                  </p>
                )}

                {/* Actions */}
                <div className="flex gap-2 mt-3">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEdit(band)}
                    className="flex-1 h-8 text-xs sm:text-sm"
                  >
                    <Edit className="mr-1.5 h-3.5 w-3.5" />
                    {t("editButton")}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDeleteClick(band)}
                    className="h-8 w-8 p-0"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Band Editor Panel */}
      <BandEditorPanel
        open={editorOpen}
        onOpenChange={setEditorOpen}
        band={editingBand}
        onSaved={handleSaved}
      />

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("deleteButton")}</DialogTitle>
            <DialogDescription>
              {t("deleteConfirm")}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
              disabled={deleteMutation.isPending}
            >
              {t("cancelButton")}
            </Button>
            <Button
              onClick={handleDeleteConfirm}
              disabled={deleteMutation.isPending}
              variant="destructive"
            >
              {deleteMutation.isPending ? "Deleting..." : t("deleteButton")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
