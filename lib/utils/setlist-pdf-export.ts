/**
 * One-click PDF export for the setlist.
 * Builds a clean HTML document from the data and converts it via html2pdf.js.
 * html2pdf.js is dynamically imported so it only loads when the user clicks.
 */

interface SetlistPdfData {
  title?: string;
  subtitle?: string; // e.g. "Blue Note Jazz Club • 12.02.26"
  bodyHtml: string; // HTML from the Tiptap editor
  numbered?: boolean;
}

// Cached logo data URI so we only fetch once per session
let cachedLogoDataUri: string | null = null;

async function getLogoDataUri(): Promise<string | null> {
  if (cachedLogoDataUri) return cachedLogoDataUri;
  try {
    const res = await fetch("/logos/textlogo.png");
    if (!res.ok) return null;
    const blob = await res.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        cachedLogoDataUri = reader.result as string;
        resolve(cachedLogoDataUri);
      };
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

/**
 * Build a clean PDF filename from parts like [title, bandName, date].
 * - Detects ISO / yyyy-MM-dd dates and formats as dd.mm.yy
 * - Strips illegal filename characters (?*:"<>|/\)
 * - Collapses leftover whitespace
 */
export function buildPdfFilename(parts: (string | null | undefined)[]): string {
  const formatted = parts
    .filter(Boolean)
    .map((part) => {
      // Format ISO dates (2026-02-19 or 2026-02-19T00:00:00+00:00) → 19.02.26
      const isoMatch = (part as string).match(
        /^(\d{4})-(\d{2})-(\d{2})(?:T[\d:.+\-Z]+)?$/
      );
      if (isoMatch) {
        const [, yyyy, mm, dd] = isoMatch;
        return `${dd}.${mm}.${yyyy.slice(2)}`;
      }
      return part as string;
    });

  const raw = formatted.join(" - ");

  return (
    raw
      // Strip illegal filename characters
      .replace(/[?*:"<>|/\\]/g, "")
      // Collapse multiple spaces / dashes left behind
      .replace(/\s{2,}/g, " ")
      .trim() + ".pdf"
  );
}

export async function exportSetlistPdf(
  data: SetlistPdfData,
  filename: string
) {
  const html2pdf = (await import("html2pdf.js")).default;

  // Fetch logo in parallel with the rest of the setup
  const logoPromise = getLogoDataUri();

  // Build a self-contained HTML fragment sized for real A4 print.
  // The on-screen preview is ~350px wide; A4 is ~794px — roughly 2.3x.
  // All sizes are scaled up so the PDF matches what the user sees on screen.
  const headerHtml =
    data.title || data.subtitle
      ? `<div style="text-align:center;padding:20px 80px 0;">
           ${data.title ? `<div style="font-size:18px;font-weight:700;letter-spacing:0.08em;color:#222;line-height:1.3;">${escapeHtml(data.title)}</div>` : ""}
           ${data.subtitle ? `<div style="font-size:13px;font-weight:600;letter-spacing:0.06em;color:#222;margin-top:2px;">${escapeHtml(data.subtitle)}</div>` : ""}
         </div>`
      : "";

  // Scale rem-based font sizes from the editor to match the PDF base.
  // Editor base = 1.15rem; PDF base = 26px.
  // So Xrem → (X / 1.15) × 26 px to keep proportions consistent.
  const PDF_BASE_PX = 26;
  const EDITOR_BASE_REM = 1.15;
  const scaledBodyHtml = data.bodyHtml.replace(
    /font-size:\s*([\d.]+)rem/g,
    (_, val) => {
      const px = (parseFloat(val) / EDITOR_BASE_REM) * PDF_BASE_PX;
      return `font-size:${px.toFixed(1)}px`;
    }
  );

  const container = document.createElement("div");
  container.innerHTML = `
    <div style="
      width: 210mm;
      background: #ffffff;
      font-family: system-ui, -apple-system, 'Segoe UI', sans-serif;
      box-sizing: border-box;
    ">
      ${headerHtml}
      <div style="
        padding: 8px 80px 50px;
        font-size: ${PDF_BASE_PX}px;
        font-weight: 800;
        letter-spacing: 0.02em;
        line-height: 1.4;
        color: #111;
      ">
        ${scaledBodyHtml}
      </div>
    </div>
  `;

  // Zero out paragraph margins to match the editor
  const bodyDiv = container.querySelector("div > div:last-child") as HTMLElement;
  const paragraphs = container.querySelectorAll("p");

  if (data.numbered && bodyDiv) {
    // Apply numbering via inline styles (CSS counters don't work in html2canvas)
    let counter = 0;
    paragraphs.forEach((p) => {
      p.style.margin = "0";
      p.style.pageBreakInside = "avoid";
      if (p.textContent?.trim()) {
        counter++;
        const num = document.createElement("span");
        num.textContent = `${counter}. `;
        num.style.color = "#111";
        num.style.letterSpacing = "0";
        num.style.marginRight = "0.2em";
        p.insertBefore(num, p.firstChild);
      }
    });
  } else {
    paragraphs.forEach((p) => {
      p.style.margin = "0";
      p.style.pageBreakInside = "avoid";
    });
  }

  // Place off-screen for html2canvas to measure
  container.style.position = "fixed";
  container.style.left = "-9999px";
  container.style.top = "0";
  document.body.appendChild(container);

  try {
    // Wait for the logo fetch in parallel
    const logoDataUri = await logoPromise;

    // html2pdf.js types don't expose .toPdf()/.get() — cast to any for chaining
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const worker = (html2pdf()
      .set({
        filename,
        image: { type: "jpeg", quality: 0.98 },
        html2canvas: {
          scale: 2,
          useCORS: true,
          backgroundColor: "#ffffff",
        },
        jsPDF: {
          unit: "mm",
          format: "a4",
          orientation: "portrait",
        },
        margin: [10, 0, 10, 0], // top/right/bottom/left mm — gives breathing room at page edges
        pagebreak: { mode: ["avoid-all", "css"] },
      })
      .from(container.firstElementChild as HTMLElement) as any)
      .toPdf();

    // Stamp logo at bottom-center of the last page via jsPDF
    if (logoDataUri) {
      await worker.get("pdf").then((pdf: {
        internal: { getNumberOfPages: () => number };
        setPage: (n: number) => void;
        setGState: (gs: unknown) => void;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        GState: new (opts: { opacity: number }) => any;
        addImage: (data: string, format: string, x: number, y: number, w: number, h: number) => void;
      }) => {
        const pageCount = pdf.internal.getNumberOfPages();
        pdf.setPage(pageCount);
        // Logo dimensions: ~22px height on screen → ~6mm in PDF, keep aspect ~4.5:1
        const logoH = 5;
        const logoW = logoH * 4.5;
        const pageW = 210; // A4 width in mm
        const pageH = 297; // A4 height in mm
        const x = (pageW - logoW) / 2;
        const y = pageH - 10 - logoH; // 10mm bottom margin area
        // Draw at reduced opacity
        const gState = new pdf.GState({ opacity: 0.3 });
        pdf.setGState(gState);
        pdf.addImage(logoDataUri, "PNG", x, y, logoW, logoH);
      });
    }

    await worker.save();
  } finally {
    document.body.removeChild(container);
  }
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
