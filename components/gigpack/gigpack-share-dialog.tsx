"use client";

import { useState } from "react";
import { useTranslations } from "@/lib/gigpack/i18n";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Copy, Check, MessageCircle, Share, Mail, ExternalLink } from "lucide-react";
import { GigPackQr } from "@/components/gigpack/gigpack-qr";
import { formatDate } from "@/lib/gigpack/utils";
import { useToast } from "@/hooks/use-toast";

interface GigPackShareDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  gigPack: {
    id: string;
    title: string;
    band_name: string | null;
    date: string | null;
    venue_name: string | null;
    public_slug: string;
  };
  locale?: string;
}

/**
 * Get the shareable URL for a GigPack
 * For Ensemble, we use the /p/[token] public route
 */
function getShareableUrl(slug: string): string {
  // Fallback to window.location.origin on client side
  if (typeof window !== "undefined") {
    return `${window.location.origin}/p/${slug}`;
  }
  
  // Development fallback
  return `http://localhost:3000/p/${slug}`;
}

export function GigPackShareDialog({
  open,
  onOpenChange,
  gigPack,
  locale = "en",
}: GigPackShareDialogProps) {
  const { toast } = useToast();
  const t = useTranslations("share");
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedMessage1, setCopiedMessage1] = useState(false);
  const [copiedMessage2, setCopiedMessage2] = useState(false);

  const isRtl = locale === "he";

  const publicUrl = getShareableUrl(gigPack.public_slug);

  const copyToClipboard = async (
    text: string,
    setCopied: (value: boolean) => void,
    successMessage: string
  ) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast({
        title: t("copied"),
        description: successMessage,
        duration: 2000,
      });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({
        title: t("copyError"),
        description: t("copyErrorDescription"),
        variant: "destructive",
        duration: 3000,
      });
    }
  };

  // Generate prewritten messages
  const dateStr = gigPack.date ? formatDate(gigPack.date, locale) : t("upcoming");
  const venueStr = gigPack.venue_name || t("theVenue");

  const message1 = t("message1", {
    title: gigPack.title,
    url: publicUrl,
  });

  const message2 = t("message2", {
    title: gigPack.title,
    date: dateStr || t("upcoming"),
    venue: venueStr,
    url: publicUrl,
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={cn(
        "max-w-2xl max-h-[90vh] overflow-y-auto",
        isRtl && "[&>button]:right-auto [&>button]:left-4"
      )}>
        <DialogHeader className={cn(
          "flex flex-col space-y-1.5",
          isRtl ? "text-right" : "text-center sm:text-left"
        )}>
          <DialogTitle className="text-2xl">{t("title")}</DialogTitle>
          <DialogDescription className="text-base">
            {t("description")}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          {/* Quick Actions Section */}
          <div className="space-y-3">
            <Label className="text-base font-semibold">
              {t("quickActions")}
            </Label>
            <div className="grid grid-cols-2 gap-2">
              {/* WhatsApp */}
              <Button
                variant="outline"
                className="flex items-center justify-start gap-2 h-auto p-3"
                onClick={() => {
                  const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message1)}`;
                  window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
                }}
              >
                <MessageCircle className="h-4 w-4 flex-shrink-0" />
                <span className="text-sm">{t("whatsapp")}</span>
              </Button>

              {/* Native Share (Web Share API) */}
              <Button
                variant="outline"
                className="flex items-center justify-start gap-2 h-auto p-3"
                onClick={async () => {
                  if (navigator.share) {
                    try {
                      await navigator.share({
                        title: gigPack.title,
                        text: t("shareText", { title: gigPack.title }),
                        url: publicUrl,
                      });
                    } catch (error) {
                      // User cancelled or error occurred
                      console.log('Share cancelled or failed:', error);
                    }
                  } else {
                    // Fallback: copy link
                    copyToClipboard(publicUrl, setCopiedLink, t("linkCopied"));
                  }
                }}
              >
                <Share className="h-4 w-4 flex-shrink-0" />
                <span className="text-sm">{t("shareNative")}</span>
              </Button>

              {/* Email */}
              <Button
                variant="outline"
                className="flex items-center justify-start gap-2 h-auto p-3"
                onClick={() => {
                  const subject = t("emailSubject", { title: gigPack.title });
                  const body = encodeURIComponent(message2);
                  const mailtoUrl = `mailto:?subject=${encodeURIComponent(subject)}&body=${body}`;
                  window.open(mailtoUrl, '_blank', 'noopener,noreferrer');
                }}
              >
                <Mail className="h-4 w-4 flex-shrink-0" />
                <span className="text-sm">{t("email")}</span>
              </Button>

              {/* Open Link */}
              <Button
                variant="outline"
                className="flex items-center justify-start gap-2 h-auto p-3"
                onClick={() => {
                  window.open(publicUrl, '_blank', 'noopener,noreferrer');
                }}
              >
                <ExternalLink className="h-4 w-4 flex-shrink-0" />
                <span className="text-sm">{t("openLink")}</span>
              </Button>
            </div>
          </div>

          {/* Public Link Section */}
          <div className="space-y-3">
            <Label htmlFor="public-link" className="text-base font-semibold">
              {t("publicLink")}
            </Label>
            <div className="flex gap-2">
              <Input
                id="public-link"
                value={publicUrl}
                readOnly
                className="font-mono text-sm"
              />
              <Button
                onClick={() =>
                  copyToClipboard(publicUrl, setCopiedLink, t("linkCopied"))
                }
                variant="outline"
                className="flex-shrink-0"
              >
                {copiedLink ? (
                  <Check className={cn("h-4 w-4", isRtl ? "ml-2" : "mr-2")} />
                ) : (
                  <Copy className={cn("h-4 w-4", isRtl ? "ml-2" : "mr-2")} />
                )}
                {copiedLink ? t("copiedButton") : t("copyButton")}
              </Button>
            </div>
          </div>

          {/* QR Code Section */}
          <div className="space-y-3">
            <Label className="text-base font-semibold">{t("qrCode")}</Label>
            <p className="text-sm text-muted-foreground">{t("qrCodeHint")}</p>
            <div className="flex justify-center">
              <GigPackQr url={publicUrl} size={200} />
            </div>
          </div>

          {/* Prewritten Messages Section */}
          <div className="space-y-4">
            <div>
              <Label className="text-base font-semibold">
                {t("prewrittenMessages")}
              </Label>
              <p className="text-sm text-muted-foreground mt-1">
                {t("prewrittenMessagesHint")}
              </p>
            </div>

            {/* Message 1 - Band Chat Style */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">
                  {t("message1Label")}
                </Label>
                <Button
                  onClick={() =>
                    copyToClipboard(
                      message1,
                      setCopiedMessage1,
                      t("messageCopied")
                    )
                  }
                  variant="ghost"
                  size="sm"
                >
                  {copiedMessage1 ? (
                    <Check className={cn("h-3.5 w-3.5", isRtl ? "ml-1.5" : "mr-1.5")} />
                  ) : (
                    <Copy className={cn("h-3.5 w-3.5", isRtl ? "ml-1.5" : "mr-1.5")} />
                  )}
                  {copiedMessage1 ? t("copiedButton") : t("copyMessage")}
                </Button>
              </div>
              <div className="bg-muted p-4 rounded-lg border text-sm whitespace-pre-wrap select-all">
                {message1}
              </div>
            </div>

            {/* Message 2 - Email Style */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">
                  {t("message2Label")}
                </Label>
                <Button
                  onClick={() =>
                    copyToClipboard(
                      message2,
                      setCopiedMessage2,
                      t("messageCopied")
                    )
                  }
                  variant="ghost"
                  size="sm"
                >
                  {copiedMessage2 ? (
                    <Check className={cn("h-3.5 w-3.5", isRtl ? "ml-1.5" : "mr-1.5")} />
                  ) : (
                    <Copy className={cn("h-3.5 w-3.5", isRtl ? "ml-1.5" : "mr-1.5")} />
                  )}
                  {copiedMessage2 ? t("copiedButton") : t("copyMessage")}
                </Button>
              </div>
              <div className="bg-muted p-4 rounded-lg border text-sm whitespace-pre-wrap select-all">
                {message2}
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

