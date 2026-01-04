"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { createUserTemplate, extractFormValuesToTemplateDefaults } from "@/lib/userTemplates";
import { GigPackTemplateDefaultValues, PackingChecklistItem, SetlistSection } from "@/lib/gigpack/types";
import { Loader2, Save } from "lucide-react";

// Common emoji icons for templates
const TEMPLATE_ICONS = [
  "📋", "🎵", "🎸", "🎹", "🥁", "🎤", "🎺", "🎻",
  "🎭", "💍", "🎪", "✨", "🔥", "🍺", "🎙️", "🏢",
  "🌟", "🎉", "🎊", "💫", "🎯", "🚀", "⚡", "🌙",
];

interface SaveAsTemplateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  formValues: {
    title: string;
    bandName: string;
    theme: string;
    accentColor: string;
    posterSkin: string;
    dressCode: string;
    backlineNotes: string;
    parkingNotes: string;
    paymentNotes: string;
    setlistStructured?: SetlistSection[];
    packingChecklist: PackingChecklistItem[];
  };
  onSuccess?: () => void;
}

export function SaveAsTemplateDialog({
  open,
  onOpenChange,
  formValues,
  onSuccess,
}: SaveAsTemplateDialogProps) {
  const t = useTranslations("templates");
  const tCommon = useTranslations("common");
  const { toast } = useToast();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [icon, setIcon] = useState("📋");
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    if (!name.trim()) {
      toast({
        title: tCommon("error"),
        description: t("templateNameRequired"),
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);
    try {
      const defaultValues = extractFormValuesToTemplateDefaults(formValues);
      const { data, error } = await createUserTemplate(
        name.trim(),
        defaultValues,
        description.trim() || undefined,
        icon
      );

      if (error) {
        throw error;
      }

      toast({
        title: t("templateSaved"),
        description: t("templateSavedDescription", { name: data?.name ?? "" }),
        duration: 3000,
      });

      // Reset form
      setName("");
      setDescription("");
      setIcon("📋");
      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      console.error("Error saving template:", error);
      toast({
        title: tCommon("error"),
        description: t("templateSaveError"),
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleClose = () => {
    if (!isSaving) {
      setName("");
      setDescription("");
      setIcon("📋");
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Save className="h-5 w-5" />
            {t("saveAsTemplate")}
          </DialogTitle>
          <DialogDescription>
            {t("saveAsTemplateDescription")}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Template Name */}
          <div className="space-y-2">
            <Label htmlFor="templateName">{t("templateName")} *</Label>
            <Input
              id="templateName"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t("templateNamePlaceholder")}
              disabled={isSaving}
              autoFocus
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="templateDescription">{t("templateDescription")}</Label>
            <Textarea
              id="templateDescription"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t("templateDescriptionPlaceholder")}
              rows={2}
              disabled={isSaving}
            />
          </div>

          {/* Icon Picker */}
          <div className="space-y-2">
            <Label>{t("templateIcon")}</Label>
            <div className="flex flex-wrap gap-2 p-3 border rounded-lg bg-muted/30">
              {TEMPLATE_ICONS.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => setIcon(emoji)}
                  disabled={isSaving}
                  className={`
                    w-10 h-10 flex items-center justify-center text-xl rounded-lg 
                    transition-all hover:scale-110
                    ${icon === emoji 
                      ? "bg-primary text-primary-foreground ring-2 ring-primary ring-offset-2" 
                      : "bg-background hover:bg-accent"
                    }
                  `}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>

          {/* Preview of what will be saved */}
          <div className="p-3 rounded-lg border bg-muted/20 space-y-1 text-sm">
            <p className="font-medium text-muted-foreground">{t("willSave")}:</p>
            <ul className="list-disc list-inside text-muted-foreground space-y-0.5 text-xs">
              {formValues.title && <li>{t("previewTitle")}: {formValues.title}</li>}
              {formValues.dressCode && <li>{t("previewDressCode")}</li>}
              {formValues.theme && <li>{t("previewTheme")}: {formValues.theme}</li>}
              {formValues.packingChecklist?.length > 0 && (
                <li>{t("previewChecklist", { count: formValues.packingChecklist.length })}</li>
              )}
            </ul>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isSaving}>
            {tCommon("cancel")}
          </Button>
          <Button onClick={handleSave} disabled={isSaving || !name.trim()}>
            {isSaving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {tCommon("saving")}
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                {t("saveTemplate")}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

