import { SetlistData } from "@/lib/gigpack/types";
import { chromium } from "playwright";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const buildSetlistFilename = (title?: string, date?: string): string => {
  const baseTitle = (title && title.trim()) || "Setlist";
  const baseDate = date && date.trim();

  // Use ASCII hyphen to join title and date
  const combined = baseDate ? `${baseTitle} - ${baseDate}` : baseTitle;

  // Normalize and drop all non-ASCII chars
  const asciiOnly = combined
    .normalize("NFKD")
    .replace(/[^\p{ASCII}]/gu, "");

  // Remove illegal filename characters and collapse spaces
  const safe = asciiOnly
    .replace(/["<>|:*?\\/]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  const finalBase = safe || "Setlist";
  return `${finalBase}.pdf`;
};

const ensureSetlistPayload = (body: unknown): SetlistData | null => {
  if (!body || typeof body !== "object") return null;
  const candidate = body as SetlistData;

  if (!Array.isArray(candidate.lines) || candidate.lines.length === 0) {
    return null;
  }

  return {
    title: candidate.title?.trim() || undefined,
    location: candidate.location?.trim() || undefined,
    date: candidate.date?.trim() || undefined,
    lines: candidate.lines
      .map((line) => (typeof line === "string" ? line.trim() : ""))
      .filter(Boolean),
    options: candidate.options,
    locale:
      typeof candidate.locale === "string" && candidate.locale.length > 0
        ? candidate.locale
        : undefined,
  };
};

export async function POST(request: Request) {
  try {
    const rawBody = await request.json().catch(() => null);
    const payload = ensureSetlistPayload(rawBody);

    if (!payload || payload.lines.length === 0) {
      return new Response(
        JSON.stringify({ error: "Setlist lines are required." }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const origin =
      request.headers.get("origin") ||
      process.env.APP_ORIGIN ||
      "http://localhost:3000";

    const url = new URL("/setlists/print", origin);
    // Let URLSearchParams handle encoding; avoid double-encoding.
    const json = JSON.stringify(payload);
    url.searchParams.set("data", json);

    const filename = buildSetlistFilename(payload.title, payload.date);

    const browser = await chromium.launch({
      headless: true,
    });

    try {
      const page = await browser.newPage();
      await page.goto(url.toString(), { waitUntil: "networkidle" });
      await page.waitForLoadState("networkidle");

      const pdfBuffer = await page.pdf({
        format: "A4",
        printBackground: true,
        scale: 0.9,
        margin: {
          top: "0.5cm",
          bottom: "0.5cm",
          left: "0.5cm",
          right: "0.5cm",
        },
        pageRanges: "1",
      });

      const pdfBlob = new Blob([new Uint8Array(pdfBuffer)], { type: "application/pdf" });

      return new Response(pdfBlob, {
        status: 200,
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="${filename}"`,
        },
      });
    } finally {
      await browser.close();
    }
  } catch (error) {
    console.error("Failed to generate setlist PDF", error);
    return new Response(
      JSON.stringify({
        error: "Failed to generate setlist PDF. Please try again.",
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}


