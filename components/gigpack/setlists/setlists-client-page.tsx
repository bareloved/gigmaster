"use client";

import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { SetlistPreview } from "./setlist-preview";
import { SetlistData } from "@/lib/setlists/types";
import { useLocale } from "next-intl";
import { useTranslations } from "next-intl";

const parseLines = (raw: string) =>
  raw.split(/\r?\n/).map((line) => line.replace(/\s+$/g, ""));

export function SetlistsClientPage() {
  const { toast } = useToast();
  const locale = useLocale();
  const t = useTranslations("Setlists");

  const [title, setTitle] = useState("");
  const [location, setLocation] = useState("");
  const [date, setDate] = useState("");
  const [rawLines, setRawLines] = useState("");
  const [numbered, setNumbered] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const isRTL = locale === "he";
  const textDirection = isRTL ? "rtl" : "ltr";
  const textAlign = isRTL ? "right" : "left";

  const lines = useMemo(() => parseLines(rawLines), [rawLines]);
  const songCount = useMemo(
    () => lines.filter((line) => line.trim() !== "").length,
    [lines]
  );

  const previewData = useMemo<SetlistData>(
    () => ({
      title: title.trim() || undefined,
      location: location.trim() || undefined,
      date: date.trim() || undefined,
      lines,
      options: { numbered },
      locale,
    }),
    [title, location, date, lines, numbered, locale]
  );

  const previewPrintUrl = useMemo(() => {
    try {
      const json = JSON.stringify(previewData);
      const encoded = encodeURIComponent(json);
      return `/${locale}/setlists/print?data=${encoded}`;
    } catch {
      return "";
    }
  }, [previewData, locale]);

  const buildSetlistFilenameClient = (title?: string, date?: string): string => {
    const baseTitle = (title ?? "").trim() || "Setlist";
    const baseDate = (date ?? "").trim();
    const combined = baseDate ? `${baseTitle} - ${baseDate}` : baseTitle;

    const asciiOnly = combined
      .normalize("NFKD")
      .replace(/[^\p{ASCII}]/gu, "");

    const safe = asciiOnly
      .replace(/["<>|:*?\\/]+/g, " ")
      .replace(/\s+/g, " ")
      .trim();

    const finalBase = safe || "Setlist";
    return `${finalBase}.pdf`;
  };

  const handleDownload = async () => {
    if (songCount === 0) {
      toast({
        variant: "destructive",
        title: t("toast_no_songs_title"),
        description: t("toast_no_songs_description"),
      });
      return;
    }

    const payload: SetlistData = {
      title: title.trim() || undefined,
      location: location.trim() || undefined,
      date: date.trim() || undefined,
      lines,
      options: { numbered },
      locale,
    };

    try {
      setIsLoading(true);
      const response = await fetch("/api/setlists/pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(
          (await response.text()) || "Failed to generate the PDF setlist."
        );
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);

      const disposition = response.headers.get("Content-Disposition");
      let filename = buildSetlistFilenameClient(payload.title, payload.date);
      if (disposition) {
        const match = disposition.match(/filename="(.+?)"/i);
        if (match?.[1]) {
          filename = match[1];
        }
      }

      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = filename;
      anchor.style.display = "none";
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
    } catch (error) {
      toast({
        variant: "destructive",
        title: t("toast_download_error_title"),
        description:
          error instanceof Error
            ? error.message
            : t("toast_download_error_description_generic"),
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-8 px-4 py-8 lg:py-12">
      <div className="space-y-2">
        <p className="text-sm uppercase tracking-wide text-muted-foreground">
          {t("header_kicker")}
        </p>
        <h1 className="text-3xl font-black tracking-tight md:text-4xl">
          {t("header_title")}
        </h1>
        <p className="text-muted-foreground">
          {t("header_subtitle")}
        </p>
      </div>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
        <div className="rounded-2xl border border-border bg-muted/30 shadow-inner order-first lg:order-none">
          <SetlistPreview
            title={title || undefined}
            location={location || undefined}
            date={date || undefined}
            lines={lines}
            options={{ numbered }}
            locale={locale}
            direction={textDirection as "rtl" | "ltr"}
            align={textAlign as "left" | "right"}
            printUrl={previewPrintUrl}
            variant="app"
          />
        </div>

        <div className="space-y-6 rounded-2xl border border-border bg-card p-6 shadow-sm order-last lg:order-none">
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-foreground">
                {t("field_title_label")}
              </label>
              <Input
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder={t("field_title_placeholder")}
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-foreground">
                  {t("field_location_label")}
                </label>
                <Input
                  value={location}
                  onChange={(event) => setLocation(event.target.value)}
                  placeholder={t("field_location_placeholder")}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-foreground">
                  {t("field_date_label")}
                </label>
                <Input
                  value={date}
                  onChange={(event) => setDate(event.target.value)}
                  placeholder={t("field_date_placeholder")}
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-foreground">
                {t("field_lines_label")}
              </label>
              <p className="text-xs text-muted-foreground">
                {t.rich("tip_dash_break", {
                  code: (chunk) => <code>{chunk}</code>,
                })}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {t.rich("tip_pipe_note", {
                  pipe: (chunk) => <code>{chunk}</code>,
                })}
              </p>
              <Textarea
                value={rawLines}
                onChange={(event) => setRawLines(event.target.value)}
                rows={12}
                placeholder={t("field_lines_placeholder")}
                className="font-medium"
              />
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3">
              <label className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <input
                  type="checkbox"
                  className="h-4 w-4 accent-[hsl(var(--primary))]"
                  checked={numbered}
                  onChange={(event) => setNumbered(event.target.checked)}
                />
                {t("checkbox_numbering")}
              </label>

              <Button onClick={handleDownload} disabled={isLoading}>
                {isLoading ? t("button_generating") : t("button_download")}
              </Button>
            </div>

            <div className="mt-4 text-xs text-muted-foreground border border-dashed rounded-md px-3 py-2 bg-muted/40 max-w-md">
              <p className="font-semibold">{t("library_title")}</p>
              <p className="mt-1">
                {t("library_description")}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


