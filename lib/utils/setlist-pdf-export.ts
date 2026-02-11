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

export async function exportSetlistPdf(
  data: SetlistPdfData,
  filename: string
) {
  const html2pdf = (await import("html2pdf.js")).default;

  // Build a self-contained HTML fragment sized for real A4 print.
  // The on-screen preview is ~350px wide; A4 is ~794px — roughly 2.3x.
  // All sizes are scaled up so the PDF matches what the user sees on screen.
  const headerHtml =
    data.title || data.subtitle
      ? `<div style="text-align:center;padding:60px 80px 0;">
           ${data.title ? `<div style="font-size:18px;font-weight:700;letter-spacing:0.08em;color:#222;line-height:1.3;">${escapeHtml(data.title)}</div>` : ""}
           ${data.subtitle ? `<div style="font-size:13px;font-weight:600;letter-spacing:0.06em;color:#222;margin-top:2px;">${escapeHtml(data.subtitle)}</div>` : ""}
         </div>`
      : "";

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
        font-size: 26px;
        font-weight: 800;
        letter-spacing: 0.02em;
        line-height: 1.4;
        color: #111;
      ">
        ${data.bodyHtml}
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
    });
  }

  // Place off-screen for html2canvas to measure
  container.style.position = "fixed";
  container.style.left = "-9999px";
  container.style.top = "0";
  document.body.appendChild(container);

  try {
    await html2pdf()
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
        margin: 0,
      })
      .from(container.firstElementChild)
      .save();
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
