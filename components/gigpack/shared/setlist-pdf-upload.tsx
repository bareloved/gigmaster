"use client";

import { useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { FileUp, Trash2, ExternalLink, Loader2 } from "lucide-react";
import { validateSetlistPDF, uploadSetlistPDF, deleteSetlistPDF } from "@/lib/api/setlist-pdf";
import { useToast } from "@/hooks/use-toast";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

interface SetlistPDFUploadProps {
  pdfUrl: string | null;
  onPdfUrlChange: (url: string | null) => void;
  disabled?: boolean;
}

export function SetlistPDFUpload({
  pdfUrl,
  onPdfUrlChange,
  disabled = false,
}: SetlistPDFUploadProps) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);

  const uploadFile = useCallback(async (file: File) => {
    const validationError = validateSetlistPDF(file);
    if (validationError) {
      toast({ title: "Invalid file", description: validationError, variant: "destructive" });
      return;
    }

    setIsUploading(true);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({ title: "Error", description: "Not authenticated", variant: "destructive" });
        return;
      }

      if (pdfUrl) {
        await deleteSetlistPDF(pdfUrl);
      }

      const result = await uploadSetlistPDF(user.id, file);
      if ("error" in result) {
        toast({ title: "Upload failed", description: result.error, variant: "destructive" });
        return;
      }

      onPdfUrlChange(result.url);
      toast({ title: "PDF uploaded", description: file.name, duration: 2000 });
    } catch (err) {
      console.error("PDF upload error:", err);
      toast({ title: "Upload failed", description: "Something went wrong", variant: "destructive" });
    } finally {
      setIsUploading(false);
    }
  }, [pdfUrl, onPdfUrlChange, toast]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    uploadFile(file);
  };

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled && !isUploading) {
      setIsDragOver(true);
    }
  }, [disabled, isUploading]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    if (disabled || isUploading) return;

    const file = e.dataTransfer.files?.[0];
    if (file) {
      uploadFile(file);
    }
  }, [disabled, isUploading, uploadFile]);

  const handleRemove = async () => {
    if (!pdfUrl) return;

    setIsDeleting(true);
    try {
      await deleteSetlistPDF(pdfUrl);
      onPdfUrlChange(null);
      toast({ title: "PDF removed", duration: 2000 });
    } catch (err) {
      console.error("PDF delete error:", err);
      toast({ title: "Failed to remove PDF", variant: "destructive" });
    } finally {
      setIsDeleting(false);
    }
  };

  if (pdfUrl) {
    return (
      <div className="flex flex-col gap-3 rounded-lg border bg-muted/30 p-3">
        <iframe
          src={`${pdfUrl}#toolbar=0&navpanes=0`}
          title="Setlist PDF preview"
          className="w-full h-[400px] rounded-md border bg-white"
        />
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => window.open(pdfUrl, "_blank", "noopener,noreferrer")}
            className="flex-1"
          >
            <ExternalLink className="mr-2 h-4 w-4" />
            Open full PDF
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleRemove}
            disabled={disabled || isDeleting}
            className="text-destructive hover:text-destructive"
          >
            {isDeleting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Trash2 className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={() => !disabled && !isUploading && fileInputRef.current?.click()}
      className={cn(
        "flex flex-col items-center gap-3 rounded-lg border-2 border-dashed p-6 transition-colors cursor-pointer",
        isDragOver
          ? "border-primary bg-primary/5"
          : "border-muted-foreground/25 bg-muted/20 hover:border-muted-foreground/40 hover:bg-muted/30",
        (disabled || isUploading) && "pointer-events-none opacity-60"
      )}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept="application/pdf,.pdf"
        onChange={handleFileSelect}
        className="hidden"
        disabled={disabled || isUploading}
      />
      {isUploading ? (
        <>
          <Loader2 className="h-8 w-8 text-muted-foreground animate-spin" />
          <p className="text-sm text-muted-foreground">Uploading...</p>
        </>
      ) : (
        <>
          <FileUp className={cn("h-8 w-8", isDragOver ? "text-primary" : "text-muted-foreground")} />
          <p className="text-sm text-muted-foreground text-center">
            {isDragOver ? "Drop PDF here" : "Drag & drop a PDF, or click to browse"}
          </p>
          <p className="text-xs text-muted-foreground/60">Max 10MB</p>
        </>
      )}
    </div>
  );
}
