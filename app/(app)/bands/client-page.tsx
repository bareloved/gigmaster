"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { useTranslations } from "@/hooks/use-translations";
import { Band } from "@/lib/types/gigpack";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Plus, Edit, Trash2, ImageIcon } from "lucide-react";
import { BandEditorPanel } from "@/components/bands/band-editor-panel";
import { HandDrawnSquiggle, HandDrawnStar } from "@/components/gigpack/hand-drawn/accents";
import { createClient } from "@/lib/supabase/client";
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

interface BandsClientPageProps {
  initialBands: Band[];
}

const BandCardSkeleton = () => (
  <Card className="overflow-hidden">
    <Skeleton className="aspect-video w-full" />
    <div className="p-4 space-y-3">
      <Skeleton className="h-6 w-3/4" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-2/3" />
      <div className="flex gap-2 pt-4">
        <Skeleton className="h-9 flex-1" />
        <Skeleton className="h-9 w-9" />
      </div>
    </div>
  </Card>
);

export default function BandsClientPage({ initialBands }: BandsClientPageProps) {
  const t = useTranslations("bands");
  const { toast } = useToast();
  const [bands, setBands] = useState<Band[]>(initialBands);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingBand, setEditingBand] = useState<Band | undefined>(undefined);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [bandToDelete, setBandToDelete] = useState<Band | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(true);

  // Show brief loading state on initial mount for user feedback
  useEffect(() => {
    const timer = setTimeout(() => setIsInitialLoading(false), 150);
    return () => clearTimeout(timer);
  }, []);

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

  const handleDeleteConfirm = async () => {
    if (!bandToDelete) return;

    setIsDeleting(true);
    const supabase = createClient();

    const { error } = await supabase
      .from("bands")
      .delete()
      .eq("id", bandToDelete.id);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to delete band. Please try again.",
        variant: "destructive",
      });
    } else {
      setBands(bands.filter((b) => b.id !== bandToDelete.id));
      toast({
        title: "Success",
        description: "Band deleted successfully.",
      });
    }

    setIsDeleting(false);
    setDeleteDialogOpen(false);
    setBandToDelete(null);
  };

  const handleSaved = (savedBand: Band) => {
    // Update or add the band in the list
    const exists = bands.find((b) => b.id === savedBand.id);
    if (exists) {
      setBands(bands.map((b) => (b.id === savedBand.id ? savedBand : b)));
    } else {
      setBands([savedBand, ...bands]);
    }
    setEditorOpen(false);
  };

  return (
    <div className="space-y-8 p-8">
      {/* Dashboard Header */}
      <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-3">
          <div className="inline-flex items-center gap-3 mb-2 relative">
            <HandDrawnSquiggle className="text-primary" />
            <span className="text-xs uppercase tracking-widest font-bold text-muted-foreground">
              YOUR BANDS
            </span>
            <HandDrawnStar className="text-primary/40 absolute -top-2 -right-6 w-4 h-4 hand-drawn-float" style={{ animationDelay: '0s' }} />
            <HandDrawnStar className="text-primary/30 absolute -bottom-1 -right-10 w-3 h-3 hand-drawn-float" style={{ animationDelay: '2s' }} />
          </div>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
            {t("pageTitle")}
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl">
            {t("pageDescription")}
          </p>
        </div>
        <Button
          onClick={handleCreateNew}
          size="lg"
          className="sm:w-auto shadow-lg hover:shadow-xl transition-shadow"
        >
          <Plus className="mr-2 h-5 w-5" />
          {t("createButton")}
        </Button>
      </div>

      {/* Bands Grid */}
      {isInitialLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <BandCardSkeleton key={i} />
          ))}
        </div>
      ) : bands.length === 0 ? (
        <Card className="border-2 border-dashed bg-card/50">
          <div className="flex flex-col items-center justify-center py-16 space-y-4">
            <div className="rounded-full bg-muted p-4">
              <ImageIcon className="h-10 w-10 text-muted-foreground" />
            </div>
            <div className="text-center space-y-2">
              <p className="text-lg font-medium text-muted-foreground">
                You haven&apos;t created any bands yet.
              </p>
              <Button onClick={handleCreateNew} variant="outline" className="mt-2">
                <Plus className="mr-2 h-4 w-4" />
                {t("createButton")}
              </Button>
            </div>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {bands.map((band) => (
            <Card key={band.id} className="overflow-hidden hover:shadow-lg transition-shadow">
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
                    <ImageIcon className="h-16 w-16 text-muted-foreground opacity-30" />
                  </div>
                )}
              </div>

              {/* Band Info */}
              <div className="p-4">
                <h3 className="font-semibold text-lg mb-1">{band.name}</h3>
                {band.description && (
                  <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                    {band.description}
                  </p>
                )}

                {/* Actions */}
                <div className="flex gap-2 mt-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEdit(band)}
                    className="flex-1"
                  >
                    <Edit className="mr-2 h-4 w-4" />
                    {t("editButton")}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDeleteClick(band)}
                  >
                    <Trash2 className="h-4 w-4" />
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
              disabled={isDeleting}
            >
              {t("cancelButton")}
            </Button>
            <Button
              onClick={handleDeleteConfirm}
              disabled={isDeleting}
              variant="destructive"
            >
              {isDeleting ? "Deleting..." : t("deleteButton")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

