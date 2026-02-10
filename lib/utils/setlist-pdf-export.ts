/**
 * One-click PDF export for the setlist paper element.
 * html2pdf.js is dynamically imported so it only loads when the user clicks.
 */
export async function exportSetlistPdf(
  paperElement: HTMLElement,
  filename: string
) {
  // Dynamic import — only loads on demand
  const html2pdf = (await import("html2pdf.js")).default;

  // Clone the paper element so we can strip interactive bits
  const clone = paperElement.cloneNode(true) as HTMLElement;

  // Remove toolbar from clone
  const toolbar = clone.querySelector(".setlist-toolbar");
  toolbar?.remove();

  // Strip contenteditable
  clone.querySelectorAll("[contenteditable]").forEach((el) => {
    el.removeAttribute("contenteditable");
  });

  // Remove any Tiptap-specific classes that might cause issues
  clone.querySelectorAll(".ProseMirror").forEach((el) => {
    el.classList.remove("ProseMirror");
  });

  // Temporarily attach the clone off-screen so html2pdf can measure it
  clone.style.position = "fixed";
  clone.style.left = "-9999px";
  clone.style.top = "0";
  document.body.appendChild(clone);

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
      .from(clone)
      .save();
  } finally {
    document.body.removeChild(clone);
  }
}
