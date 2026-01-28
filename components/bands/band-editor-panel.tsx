"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import { useTranslations } from "@/hooks/use-translations";
import { Band, LineupMember, PosterSkin } from "@/lib/types/gigpack";
import { Sheet, SheetContent, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { createClient } from "@/lib/supabase/client";
import type { Json } from "@/lib/types/database";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import {
  X,
  Check,
  Upload,
  Plus,
  Trash2,
} from "lucide-react";
import { uploadImage, deleteImage, getPathFromUrl } from "@/lib/utils/image-upload";

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
  const [accentColor, setAccentColor] = useState("#F97316");
  const [posterSkin, setPosterSkin] = useState<PosterSkin>("paper");
  const [defaultLineup, setDefaultLineup] = useState<LineupMember[]>([]);

  // UI state
  const [isLoading, setIsLoading] = useState(false);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [isUploadingHero, setIsUploadingHero] = useState(false);
  const [justSaved, setJustSaved] = useState(false);

  const isEditing = !!band;

  // Initialize form from band prop
  useEffect(() => {
    if (band) {
      setName(band.name);
      setDescription(band.description || "");
      setBandLogoUrl(band.band_logo_url || "");
      setHeroImageUrl(band.hero_image_url || "");
      setAccentColor(band.accent_color || "#F97316");
      setPosterSkin(band.poster_skin || "paper");
      setDefaultLineup(band.default_lineup || []);
    } else {
      // Reset for new band
      setName("");
      setDescription("");
      setBandLogoUrl("");
      setHeroImageUrl("");
      setAccentColor("#F97316");
      setPosterSkin("paper");
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

  const handleHeroUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

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

      const oldPath = heroImageUrl ? getPathFromUrl(heroImageUrl) : undefined;
      const result = await uploadImage(file, user.id, oldPath || undefined);

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
          description: "Hero image uploaded successfully",
          duration: 2000,
        });
      }
    } catch (error) {
      console.error("Error uploading hero:", error);
      toast({
        title: tCommon("error"),
        description: "Failed to upload hero image",
        variant: "destructive",
      });
    } finally {
      setIsUploadingHero(false);
      // Reset file input
      e.target.value = "";
    }
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
  const handleAddLineupMember = () => {
    setDefaultLineup([...defaultLineup, { role: "", name: "", notes: "" }]);
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
        accent_color: accentColor || null,
        poster_skin: posterSkin,
        default_lineup: defaultLineup as unknown as Json,
      };

      let rawData: typeof bandData & { cover_image_url?: string | null };

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

      onSaved(savedBand);
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
          <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
            {/* Band Name */}
            <div className="space-y-2">
              <label className="text-sm font-medium">{t("nameLabel")}</label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t("namePlaceholder")}
                disabled={isLoading}
                required
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <label className="text-sm font-medium">{t("descriptionLabel")}</label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={t("descriptionPlaceholder")}
                disabled={isLoading}
                rows={3}
              />
            </div>

            {/* Band Logo */}
            <div className="space-y-2">
              <label className="text-sm font-medium">{t("logoLabel")}</label>
              {bandLogoUrl ? (
                <div className="flex items-center gap-4">
                  <div className="relative w-20 h-20 border border-border rounded-lg overflow-hidden bg-muted">
                    <Image
                      src={bandLogoUrl}
                      alt="Band logo"
                      fill
                      className="object-contain"
                      sizes="80px"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => document.getElementById("band-logo-upload")?.click()}
                      disabled={isLoading || isUploadingLogo}
                      className="text-muted-foreground hover:text-foreground"
                    >
                      {isUploadingLogo ? "Uploading..." : "Change"}
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={handleRemoveLogo}
                      disabled={isLoading || isUploadingLogo}
                      className="text-destructive hover:text-destructive/90"
                    >
                      Remove
                    </Button>
                  </div>
                </div>
              ) : (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => document.getElementById("band-logo-upload")?.click()}
                  disabled={isLoading || isUploadingLogo}
                >
                  <Upload className="mr-2 h-4 w-4" />
                  {isUploadingLogo ? "Uploading..." : "Upload logo"}
                </Button>
              )}
              <input
                id="band-logo-upload"
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleLogoUpload}
                disabled={isLoading || isUploadingLogo}
              />
            </div>

            {/* Hero Image */}
            <div className="space-y-2">
              <label className="text-sm font-medium">{t("heroImageLabel")}</label>
              {heroImageUrl ? (
                <div className="flex items-start gap-4">
                  <div className="relative w-40 h-24 border border-border rounded-lg overflow-hidden bg-muted">
                    <Image
                      src={heroImageUrl}
                      alt="Hero image"
                      fill
                      className="object-cover"
                      sizes="160px"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => document.getElementById("band-hero-upload")?.click()}
                      disabled={isLoading || isUploadingHero}
                      className="text-muted-foreground hover:text-foreground"
                    >
                      {isUploadingHero ? "Uploading..." : "Change"}
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={handleRemoveHero}
                      disabled={isLoading || isUploadingHero}
                      className="text-destructive hover:text-destructive/90"
                    >
                      Remove
                    </Button>
                  </div>
                </div>
              ) : (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => document.getElementById("band-hero-upload")?.click()}
                  disabled={isLoading || isUploadingHero}
                >
                  <Upload className="mr-2 h-4 w-4" />
                  {isUploadingHero ? "Uploading..." : "Upload hero image"}
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

            {/* Accent Color */}
            <div className="space-y-2">
              <label className="text-sm font-medium">{t("accentColorLabel")}</label>
              <div className="flex gap-3 items-center flex-wrap">
                <div className="flex gap-2">
                  {["#FDBA74", "#FB923C", "#F97316", "#FBBF24", "#60A5FA", "#8B5CF6"].map(
                    (color) => (
                      <button
                        key={color}
                        type="button"
                        onClick={() => setAccentColor(color)}
                        className="w-7 h-7 rounded-full border-2 transition-all hover:scale-110"
                        style={{
                          backgroundColor: color,
                          borderColor:
                            accentColor === color ? "hsl(var(--foreground))" : "transparent",
                        }}
                        title={color}
                      />
                    )
                  )}
                </div>
                <Input
                  value={accentColor}
                  onChange={(e) => setAccentColor(e.target.value)}
                  placeholder="#F97316"
                  className="max-w-[100px] text-sm font-mono"
                  disabled={isLoading}
                />
              </div>
            </div>

            {/* Poster Skin */}
            <div className="space-y-2">
              <label className="text-sm font-medium">{t("posterSkinLabel")}</label>
              <div className="flex gap-2">
                {(["clean", "paper", "grain"] as PosterSkin[]).map((skin) => (
                  <Button
                    key={skin}
                    type="button"
                    variant={posterSkin === skin ? "default" : "outline"}
                    size="sm"
                    onClick={() => setPosterSkin(skin)}
                    disabled={isLoading}
                  >
                    {skin.charAt(0).toUpperCase() + skin.slice(1)}
                  </Button>
                ))}
              </div>
            </div>

            {/* Default Lineup */}
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium">{t("defaultLineupLabel")}</label>
                <p className="text-xs text-muted-foreground mt-1">
                  {t("defaultLineupDescription")}
                </p>
              </div>

              {defaultLineup.map((member, index) => (
                <div
                  key={index}
                  className="flex gap-2 items-start p-3 rounded-md border bg-muted/50"
                >
                  <div className="flex-1 space-y-2">
                    <Input
                      value={member.role}
                      onChange={(e) => handleUpdateLineupMember(index, "role", e.target.value)}
                      placeholder="Role (e.g. Guitar, Vocals)"
                      disabled={isLoading}
                    />
                    <Input
                      value={member.name || ""}
                      onChange={(e) => handleUpdateLineupMember(index, "name", e.target.value)}
                      placeholder="Name"
                      disabled={isLoading}
                    />
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => handleRemoveLineupMember(index)}
                    disabled={isLoading}
                    className="text-destructive hover:text-destructive/90"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddLineupMember}
                disabled={isLoading}
              >
                <Plus className="mr-2 h-4 w-4" />
                Add member
              </Button>
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
      </SheetContent>
    </Sheet>
  );
}

