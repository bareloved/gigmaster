import { SetlistData } from "@/lib/setlists/types";
import { antonSC, notoSansHebrew } from "@/lib/fonts";
import { cn } from "@/lib/utils";
import type { CSSProperties } from "react";

type SetlistPreviewProps = Pick<
  SetlistData,
  "title" | "location" | "date" | "lines" | "options"
> & {
  className?: string;
  direction?: "rtl" | "ltr";
  align?: "left" | "right" | "center";
  variant?: "app" | "print";
  locale?: string;
  printUrl?: string;
};

const PAGE_WIDTH_PX = 900;
const PAGE_HEIGHT_PX = Math.round((PAGE_WIDTH_PX * 297) / 210);
const PREVIEW_SCALE = 0.6;

/**
 * High-contrast, stage-friendly preview used for both on-page view and print/PDF.
 */
export function SetlistPreview({
  title,
  location,
  date,
  lines,
  options,
  className,
  direction,
  align,
  locale,
  printUrl,
  variant = "app",
}: SetlistPreviewProps) {
  const numbered = options?.numbered;
  const isPrint = variant === "print";
  const isRTL = locale === "he";
  const resolvedDirection: "rtl" | "ltr" =
    direction ?? (isRTL ? "rtl" : "ltr");
  const textAlign =
    align ?? (resolvedDirection === "rtl" ? "right" : "left");

  if (!isPrint) {
    const scaledWidth = PAGE_WIDTH_PX * PREVIEW_SCALE;
    const scaledHeight = PAGE_HEIGHT_PX * PREVIEW_SCALE;

    return (
      <div
        className={cn(
          "relative mx-auto bg-white rounded-xl shadow-sm border border-neutral-200 overflow-hidden",
          className
        )}
        style={{ width: scaledWidth, height: scaledHeight }}
      >
        {printUrl ? (
          <div className="relative overflow-hidden">
            <div
              className="origin-top-left"
              style={{
                width: PAGE_WIDTH_PX,
                height: PAGE_HEIGHT_PX,
                transform: `scale(${PREVIEW_SCALE})`,
                transformOrigin: "top left",
              }}
            >
              <iframe
                src={printUrl}
                title="Setlist preview"
                className="block"
                style={{
                  width: PAGE_WIDTH_PX,
                  height: PAGE_HEIGHT_PX,
                  border: "0",
                }}
                scrolling="no"
              />
            </div>
          </div>
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-neutral-400">
            Setlist preview will appear here
          </div>
        )}
      </div>
    );
  }

const containerBase =
  variant === "print"
    ? "setlist-print-root"
    : "flex w-full justify-center bg-[hsl(var(--muted))] px-4 py-8 md:px-6 md:py-10";

const cardBase =
  variant === "print"
    ? "w-full max-w-[740px] bg-white text-black"
    : "print-area w-full max-w-[780px] rounded-2xl border border-border bg-white p-8 shadow-xl md:p-12";

const cardPadding = isPrint ? "p-6 md:p-7" : "p-8 md:p-12";
  const headingSize = isPrint
    ? "text-[28px] md:text-[30px]"
    : "text-3xl md:text-4xl";
  const headingWeight = "font-black";
  const metaClasses = isPrint
    ? "text-sm md:text-base font-semibold text-black/80"
    : "text-base font-semibold text-muted-foreground";
  const headingAlign =
    isPrint || textAlign === "center"
      ? "text-center"
      : textAlign === "right"
        ? "text-right"
        : "text-left";

  const listGap = isPrint ? "space-y-1.5" : "space-y-4";
  const lineText = isPrint
    ? "text-[19px] md:text-[21px] font-extrabold leading-[1.15]"
    : "text-2xl md:text-3xl font-bold leading-relaxed";
  const numberText = isPrint
    ? "text-[16px] md:text-[17px]"
    : "text-xl md:text-2xl";

  return (
    <section
      className={cn(containerBase, className)}
    >
      <article
        className={cn(
          cardBase,
          cardPadding,
          notoSansHebrew.className
        )}
      >
        <div
          dir={resolvedDirection}
          className={cn(
            textAlign === "center"
              ? "text-center"
              : textAlign === "right"
                ? "text-right"
                : "text-left"
          )}
          style={{ textAlign: textAlign as React.CSSProperties["textAlign"] }}
        >
          {isPrint && (
            <div className="mb-6 border-b border-black pb-4 text-center" style={{ pageBreakInside: "avoid" }}>
              <h1 className="text-4xl font-extrabold tracking-tight text-black">
                DEBUG TITLE: {title?.trim() || "NO TITLE"}
              </h1>
              {(location || date) && (
                <p className="mt-2 text-base font-semibold text-black">
                  {location && date ? `${location} • ${date}` : location || date}
                </p>
              )}
            </div>
          )}

          {isPrint ? (
            <header
              className={cn("mb-6 space-y-2", headingAlign)}
              style={{ pageBreakInside: "avoid" }}
            >
              <h1
                className={cn(
                  headingSize,
                  headingWeight,
                  "tracking-tight",
                  isPrint ? "text-black" : "text-foreground",
                  antonSC.className
                )}
              >
                {title?.trim() || "Setlist"}
              </h1>

              {(location || date) && (
                <div
                  className={cn(
                    "flex flex-wrap items-center gap-2",
                    isPrint ? "justify-center" : textAlign === "right" ? "justify-end" : "justify-start",
                    metaClasses
                  )}
                >
                  {location && <span>{location}</span>}
                  {location && date && <span aria-hidden="true">•</span>}
                  {date && <span>{date}</span>}
                </div>
              )}
            </header>
          ) : (
            <div className="mb-4 pb-2" style={{ pageBreakInside: "avoid" }}>
              <h1 className="text-3xl font-extrabold tracking-tight text-center">
                {title?.trim() || "Setlist"}
              </h1>
              {(location || date) && (
                <p
                  className={`mt-1 text-base font-semibold ${
                    resolvedDirection === "rtl" ? "text-right" : "text-center"
                  }`}
                >
                  {location && date ? `${location} • ${date}` : location || date}
                </p>
              )}
              <div className="mt-3 flex justify-center">
                <div className="w-4/5 border-t border-black" />
              </div>
            </div>
          )}

          <div
            className={cn(
              listGap,
              isPrint ? "" : textAlign === "right" ? "text-right" : "text-left"
            )}
          >
            {lines.length === 0 ? (
              isPrint ? null : (
                <p className="text-lg font-semibold text-muted-foreground">
                  Paste your setlist on the left to see it here.
                </p>
              )
            ) : (
              lines.map((line, index) => (
                <div
                  key={`${line}-${index}`}
                  className={cn(
                    "flex items-start gap-2",
                    textAlign === "right" ? "justify-end" : "justify-start"
                  )}
                  style={{ pageBreakInside: "avoid" }}
                >
                  {numbered && (
                    <span
                      className={cn(
                        "min-w-[2.25rem] text-muted-foreground font-extrabold tabular-nums",
                        textAlign === "right" ? "text-right" : "text-left",
                        numberText
                      )}
                    >
                      {index + 1}.
                    </span>
                  )}
                  <span className={cn("flex-1 break-words", lineText)}>
                    {line}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </article>
    </section>
  );
}


