/**
 * Scroll-to-end-and-back for overflowing text.
 * Mark scrollable elements with `data-scroll`, then call
 * `startMarquee(container)` / `stopMarquee(container)` on
 * the hover target (parent button, card, etc.).
 */

export function startMarquee(container: HTMLElement) {
  const els = container.querySelectorAll<HTMLElement>("[data-scroll]");
  els.forEach((el) => {
    const parent = el.parentElement;
    if (!parent) return;
    const overflow = el.scrollWidth - parent.clientWidth;
    if (overflow > 0) {
      el.style.setProperty("--overflow", `-${overflow}px`);
      el.style.animation = "marquee 3s ease-in-out infinite";
    }
  });
}

export function stopMarquee(container: HTMLElement) {
  const els = container.querySelectorAll<HTMLElement>("[data-scroll]");
  els.forEach((el) => {
    el.style.animation = "";
  });
}
