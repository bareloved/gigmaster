"use client";

import * as React from "react";
import { useState } from "react";
import { useTranslations, useLocale } from "@/lib/gigpack/i18n";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Clock, AlertCircle, CheckCircle, XCircle, Loader2 } from "lucide-react";
import { parseScheduleText, createScheduleItems, ParsedScheduleItem, ParsingError } from "@/lib/gigpack/schedule-parser";
import { GigScheduleItem } from "@/lib/gigpack/types";

interface PasteScheduleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (items: GigScheduleItem[]) => void;
  existingSchedule?: GigScheduleItem[];
}

type DialogStep = "edit" | "preview";

export function PasteScheduleDialog({
  open,
  onOpenChange,
  onConfirm,
  existingSchedule = []
}: PasteScheduleDialogProps) {
  const t = useTranslations("gigpack.schedule");
  const tCommon = useTranslations("common");
  const locale = useLocale();
  const [step, setStep] = useState<DialogStep>("edit");
  const [text, setText] = useState("");
  const [parsedItems, setParsedItems] = useState<ParsedScheduleItem[]>([]);
  const [parsingErrors, setParsingErrors] = useState<ParsingError[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  React.useEffect(() => {
    if (open) {
      setStep("edit");
      setText("");
      setParsedItems([]);
      setParsingErrors([]);
    }
  }, [open]);

  const handleCreateItems = () => {
    if (!text.trim()) return;

    setIsProcessing(true);
    try {
      const result = parseScheduleText(text);
      setParsedItems(result.items);
      setParsingErrors(result.errors);
      setStep("preview");
    } catch (error) {
      console.error("Error parsing schedule text:", error);
      setParsedItems([]);
      setParsingErrors([{ originalText: text, hint: "Failed to parse schedule text" }]);
      setStep("preview");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleConfirm = () => {
    const { items } = createScheduleItems(parsedItems, existingSchedule);
    onConfirm(items);
    onOpenChange(false);
  };

  const handleBackToEdit = () => {
    setStep("edit");
  };

  const renderEditStep = () => (
      <div className="space-y-4">
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">
            {t("pasteScheduleDialogDescription")}
          </p>
          <Textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={t("pasteScheduleTextareaPlaceholder")}
            rows={8}
            className="text-sm"
            dir={locale === "he" ? "rtl" : "ltr"}
          />
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {tCommon("cancel")}
          </Button>
          <Button
            onClick={handleCreateItems}
            disabled={!text.trim() || isProcessing}
          >
            {isProcessing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {t("createItems")}
          </Button>
        </div>
      </div>
    );

  const renderPreviewStep = () => {
    const { items, duplicates } = createScheduleItems(parsedItems, existingSchedule);
    const hasItems = items.length > 0;
    const hasErrors = parsingErrors.length > 0;

    return (
      <div className="space-y-6">
        {hasItems && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <h3 className="font-medium">
                {t("preview")} ({items.length} {items.length === 1 ? "item" : "items"})
              </h3>
            </div>
            <div className="space-y-2">
              {parsedItems.map((item, index) => {
                const isDuplicate = duplicates.some(d => d === item);
                return (
                  <div
                    key={index}
                    className={cn(
                      "flex items-center gap-3 p-3 rounded-md border",
                      isDuplicate
                        ? "border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950"
                        : "border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950"
                    )}
                  >
                    <Clock className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="font-mono text-xs">
                          {item.time}
                          {item.endTime && ` - ${item.endTime}`}
                        </Badge>
                        <span className="text-sm truncate" dir="auto">
                          {item.label}
                        </span>
                      </div>
                    </div>
                    {isDuplicate && (
                      <Badge variant="secondary" className="text-xs">
                        {t("duplicateWarning")}
                      </Badge>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {hasErrors && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <XCircle className="h-4 w-4 text-red-500" />
              <h3 className="font-medium text-red-700 dark:text-red-400">
                {t("unrecognized")} ({parsingErrors.length})
              </h3>
            </div>
            <div className="space-y-2">
              {parsingErrors.map((error, index) => (
                <div
                  key={index}
                  className="flex items-start gap-3 p-3 rounded-md border border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950"
                >
                  <AlertCircle className="h-4 w-4 text-red-500 flex-shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-red-700 dark:text-red-300 mb-1" dir="auto">
                      &ldquo;{error.originalText}&rdquo;
                    </div>
                    <div className="text-xs text-red-600 dark:text-red-400">
                      {error.hint}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex justify-between">
          <Button variant="outline" onClick={handleBackToEdit}>
            {t("backToEdit")}
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!hasItems}
          >
            {t("confirmAndAdd")} ({items.length})
          </Button>
        </div>
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          "max-w-2xl max-h-[80vh] overflow-y-auto",
          locale === "he" && "[&>button]:left-4 [&>button]:right-auto"
        )}
      >
        <DialogHeader>
          <DialogTitle
            dir={locale === "he" ? "rtl" : "ltr"}
            className={locale === "he" ? "text-right" : ""}
          >
            {t("pasteScheduleDialogTitle")}
          </DialogTitle>
          <DialogDescription className="sr-only">
            Paste and preview schedule items
          </DialogDescription>
        </DialogHeader>

        {step === "edit" ? renderEditStep() : renderPreviewStep()}
      </DialogContent>
    </Dialog>
  );
}

