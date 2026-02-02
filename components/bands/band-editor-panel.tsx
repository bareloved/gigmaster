"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import { useTranslations } from "@/hooks/use-translations";
import { Band, LineupMember } from "@/lib/types/gigpack";
import { Sheet, SheetContent, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { createClient } from "@/lib/supabase/client";
import type { Json, Tables } from "@/lib/types/database";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import {
  X,
  Check,
  Upload,
  Music,
  ImageIcon,
  Users,
  Pencil,
  Trash2,
} from "lucide-react";
import { uploadImage, deleteImage, getPathFromUrl } from "@/lib/utils/image-upload";
import { ImageCropDialog } from "@/components/bands/image-crop-dialog";
import { LineupMemberSearch } from "@/components/gigpack/ui/lineup-member-search";
import { LineupMemberPill } from "@/components/gigpack/ui/lineup-member-pill";
import type { SelectedMember } from "@/components/gigpack/ui/lineup-member-search";

interface BandEditorPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  band?: Band;
  onSaved: (band: Band) => void;
}

export function BandEditorPanel({
  open,
  onOpenChange,
  band,
  onSaved,
}: BandEditorPanelProps) {
  const t = useTranslations("bands");
  const tCommon = useTranslations("common");
  const { toast } = useToast();

  // Form state
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [bandLogoUrl, setBandLogoUrl] = useState("");
  const [heroImageUrl, setHeroImageUrl] = useState("");
  const [defaultLineup, setDefaultLineup] = useState<LineupMember[]>([]);

  // UI state
  const [isLoading, setIsLoading] = useState(false);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [isUploadingHero, setIsUploadingHero] = useState(false);
  const [justSaved, setJustSaved] = useState(false);

  // Crop dialog state
  const [cropDialogOpen, setCropDialogOpen] = useState(false);
  const [selectedImageSrc, setSelectedImageSrc] = useState("");

  const isEditing = !!band;

  // Initialize form from band prop
  useEffect(() => {
    if (band) {
      setName(band.name);
      setDescription(band.description || "");
      setBandLogoUrl(band.band_logo_url || "");
      setHeroImageUrl(band.hero_image_url || "");
      setDefaultLineup(band.default_lineup || []);
    } else {
      // Reset for new band
      setName("");
      setDescription("");
      setBandLogoUrl("");
      setHeroImageUrl("");
      setDefaultLineup([]);
    }
  }, [band, open]);

  // Image upload handlers
  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingLogo(true);
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        toast({
          title: tCommon("error"),
          description: "Must be logged in",
          variant: "destructive",
        });
        return;
      }

      const oldPath = bandLogoUrl ? getPathFromUrl(bandLogoUrl) : undefined;
      const result = await uploadImage(file, user.id, oldPath || undefined);

      if ("error" in result) {
        toast({
          title: tCommon("error"),
          description: result.error,
          variant: "destructive",
        });
      } else {
        setBandLogoUrl(result.url);
        toast({
          title: "Success",
          description: "Logo uploaded successfully",
          duration: 2000,
        });
      }
    } catch (error) {
      console.error("Error uploading logo:", error);
      toast({
        title: tCommon("error"),
        description: "Failed to upload logo",
        variant: "destructive",
      });
    } finally {
      setIsUploadingLogo(false);
      // Reset file input
      e.target.value = "";
    }
  };

  const handleHeroUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Create object URL and open crop dialog instead of uploading directly
    const objectUrl = URL.createObjectURL(file);
    setSelectedImageSrc(objectUrl);
    setCropDialogOpen(true);

    // Reset file input so the same file can be re-selected
    e.target.value = "";
  };

  const handleCropComplete = async (blob: Blob) => {
    // Close dialog and clean up object URL
    setCropDialogOpen(false);
    if (selectedImageSrc) {
      URL.revokeObjectURL(selectedImageSrc);
      setSelectedImageSrc("");
    }

    setIsUploadingHero(true);
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        toast({
          title: tCommon("error"),
          description: "Must be logged in",
          variant: "destructive",
        });
        return;
      }

      // Wrap the cropped blob as a File for the existing upload function
      const croppedFile = new File([blob], "cover.jpg", { type: "image/jpeg" });
      const oldPath = heroImageUrl ? getPathFromUrl(heroImageUrl) : undefined;
      const result = await uploadImage(croppedFile, user.id, oldPath || undefined);

      if ("error" in result) {
        toast({
          title: tCommon("error"),
          description: result.error,
          variant: "destructive",
        });
      } else {
        setHeroImageUrl(result.url);
        toast({
          title: "Success",
          description: "Cover image uploaded successfully",
          duration: 2000,
        });
      }
    } catch (error) {
      console.error("Error uploading hero:", error);
      toast({
        title: tCommon("error"),
        description: "Failed to upload cover image",
        variant: "destructive",
      });
    } finally {
      setIsUploadingHero(false);
    }
  };

  const handleCropDialogClose = (open: boolean) => {
    if (!open && selectedImageSrc) {
      URL.revokeObjectURL(selectedImageSrc);
      setSelectedImageSrc("");
    }
    setCropDialogOpen(open);
  };

  const handleRemoveLogo = async () => {
    if (!bandLogoUrl) return;

    try {
      const path = getPathFromUrl(bandLogoUrl);
      if (path) {
        await deleteImage(path);
      }
      setBandLogoUrl("");
    } catch (error) {
      console.error("Error removing logo:", error);
    }
  };

  const handleRemoveHero = async () => {
    if (!heroImageUrl) return;

    try {
      const path = getPathFromUrl(heroImageUrl);
      if (path) {
        await deleteImage(path);
      }
      setHeroImageUrl("");
    } catch (error) {
      console.error("Error removing hero:", error);
    }
  };

  // Lineup handlers
  const handleAddLineupMemberFromSearch = (member: SelectedMember) => {
    const newMember: LineupMember = {
      role: member.role,
      name: member.name,
      notes: "",
    };
    setDefaultLineup([...defaultLineup, newMember]);
  };

  const handleRemoveLineupMember = (index: number) => {
    setDefaultLineup(defaultLineup.filter((_, i) => i !== index));
  };

  const handleUpdateLineupMember = (
    index: number,
    field: keyof LineupMember,
    value: string
  ) => {
    const newLineup = [...defaultLineup];
    newLineup[index] = { ...newLineup[index], [field]: value };
    setDefaultLineup(newLineup);
  };

  // Form submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      toast({
        title: tCommon("error"),
        description: "Band name is required",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        toast({
          title: tCommon("error"),
          description: "Must be logged in",
          variant: "destructive",
        });
        return;
      }

      const bandData = {
        owner_id: user.id,
        name: name.trim(),
        description: description.trim() || null,
        band_logo_url: bandLogoUrl || null,
        hero_image_url: heroImageUrl || null,
        default_lineup: defaultLineup as unknown as Json,
      };

      let rawData: Tables<'bands'> & { cover_image_url?: string | null };

      if (isEditing) {
        // Update existing band
        const { data, error } = await supabase
          .from("bands")
          .update(bandData)
          .eq("id", band.id)
          .select()
          .single();

        if (error) throw error;
        rawData = data;
      } else {
        // Create new band
        const { data, error } = await supabase
          .from("bands")
          .insert(bandData)
          .select()
          .single();

        if (error) throw error;
        rawData = data;
      }

      const savedBand = {
        ...rawData,
        hero_image_url: rawData.hero_image_url || rawData.cover_image_url || null,
        accent_color: rawData.accent_color || null,
        poster_skin: rawData.poster_skin || "clean",
        default_lineup: rawData.default_lineup || [],
      };

      setJustSaved(true);
      setTimeout(() => setJustSaved(false), 2000);

      toast({
        title: tCommon("success"),
        description: isEditing ? "Band updated successfully" : "Band created successfully",
      });

      onSaved(savedBand as unknown as Band);
    } catch (error) {
      console.error("Error saving band:", error);
      toast({
        title: tCommon("error"),
        description: "Failed to save band",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className={cn(
          "w-full sm:max-w-2xl p-0 gap-0 overflow-hidden",
          "bg-background border-l border-border",
          "shadow-2xl",
          "[&>button]:hidden"
        )}
      >
        <form onSubmit={handleSubmit} className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-border">
            <SheetTitle className="text-lg font-semibold">
              {isEditing ? t("editButton") : t("createButton")}
            </SheetTitle>
            <SheetDescription className="sr-only">
              {isEditing ? "Edit band details and settings" : "Create a new band"}
            </SheetDescription>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto px-6 py-6 space-y-4">
            {/* Basics Card */}
            <div className="rounded-xl border border-border bg-muted/30 p-4 space-y-4">
              <div className="flex items-center gap-2">
                <div className="rounded-md bg-primary/10 p-1.5">
                  <Music className="h-3.5 w-3.5 text-primary" />
                </div>
                <span className="text-sm font-semibold">{t("nameLabel")}</span>
              </div>

              <div className="space-y-1.5">
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={t("namePlaceholder")}
                  disabled={isLoading}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs text-muted-foreground">{t("descriptionLabel")}</label>
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder={t("descriptionPlaceholder")}
                  disabled={isLoading}
                  rows={3}
                />
              </div>
            </div>

            {/* Visuals Card */}
            <div className="rounded-xl border border-border bg-muted/30 p-4 space-y-4">
              <div className="flex items-center gap-2">
                <div className="rounded-md bg-primary/10 p-1.5">
                  <ImageIcon className="h-3.5 w-3.5 text-primary" />
                </div>
                <span className="text-sm font-semibold">Visuals</span>
              </div>

              {/* Cover Image */}
              <div className="space-y-1.5">
                <label className="text-xs text-muted-foreground">{t("heroImageLabel")}</label>
                {heroImageUrl ? (
                  <div className="relative w-full aspect-video rounded-lg overflow-hidden bg-muted border border-border">
                    <Image
                      src={heroImageUrl}
                      alt="Cover image"
                      fill
                      className="object-cover"
                      sizes="(max-width: 672px) 100vw, 672px"
                    />
                    <div className="absolute bottom-2 right-2 flex gap-1">
                      <Button
                        type="button"
                        variant="secondary"
                        size="icon"
                        className="h-7 w-7 rounded-full bg-black/50 hover:bg-black/70 text-white border-0"
                        onClick={() => document.getElementById("band-hero-upload")?.click()}
                        disabled={isLoading || isUploadingHero}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        type="button"
                        variant="secondary"
                        size="icon"
                        className="h-7 w-7 rounded-full bg-black/50 hover:bg-destructive text-white border-0"
                        onClick={handleRemoveHero}
                        disabled={isLoading || isUploadingHero}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                    {isUploadingHero && (
                      <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                        <span className="text-white text-sm animate-pulse">Uploading...</span>
                      </div>
                    )}
                  </div>
                ) : (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="ml-2"
                    onClick={() => document.getElementById("band-hero-upload")?.click()}
                    disabled={isLoading || isUploadingHero}
                  >
                    <Upload className="mr-2 h-4 w-4" />
                    {isUploadingHero ? "Uploading..." : "Upload cover image"}
                  </Button>
                )}
                <input
                  id="band-hero-upload"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleHeroUpload}
                  disabled={isLoading || isUploadingHero}
                />
              </div>
            </div>

            {/* Lineup Card */}
            <div className="rounded-xl border border-border bg-muted/30 p-4 space-y-3">
              <div>
                <div className="flex items-center gap-2">
                  <div className="rounded-md bg-primary/10 p-1.5">
                    <Users className="h-3.5 w-3.5 text-primary" />
                  </div>
                  <span className="text-sm font-semibold">{t("defaultLineupLabel")}</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1.5 ml-8">
                  {t("defaultLineupDescription")}
                </p>
              </div>

              {defaultLineup.map((member, index) => (
                <LineupMemberPill
                  key={index}
                  name={member.name || ""}
                  role={member.role || ""}
                  notes={member.notes || ""}
                  onNameChange={(name) => handleUpdateLineupMember(index, "name", name)}
                  onRoleChange={(role) => handleUpdateLineupMember(index, "role", role)}
                  onNotesChange={(notes) => handleUpdateLineupMember(index, "notes", notes)}
                  onRemove={() => handleRemoveLineupMember(index)}
                  disabled={isLoading}
                  showRemove={true}
                />
              ))}

              <div className="w-full">
                <LineupMemberSearch
                  onSelectMember={handleAddLineupMemberFromSearch}
                  placeholder="Search musicians..."
                  disabled={isLoading}
                  className="w-full"
                />
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="border-t border-border px-6 py-4 bg-background">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Button
                  type="submit"
                  disabled={isLoading}
                  className={cn(
                    "h-10 px-5 rounded-xl font-medium",
                    "bg-primary hover:bg-primary/90 text-primary-foreground"
                  )}
                >
                  {justSaved ? (
                    <>
                      <Check className="mr-2 h-4 w-4" />
                      {tCommon("saved")}
                    </>
                  ) : isLoading ? (
                    <span className="animate-pulse">
                      {isEditing ? tCommon("saving") : tCommon("creating")}
                    </span>
                  ) : (
                    t(isEditing ? "saveButton" : "createButton")
                  )}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => onOpenChange(false)}
                  disabled={isLoading}
                  className="text-muted-foreground hover:text-foreground"
                >
                  {t("cancelButton")}
                </Button>
              </div>
            </div>
          </div>
        </form>

        {selectedImageSrc && (
          <ImageCropDialog
            imageSrc={selectedImageSrc}
            open={cropDialogOpen}
            onOpenChange={handleCropDialogClose}
            onCropComplete={handleCropComplete}
          />
        )}
      </SheetContent>
    </Sheet>
  );
}

