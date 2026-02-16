import { useRef, useCallback, type RefObject } from "react";

interface UseSwipeOptions {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  threshold?: number; // minimum horizontal distance in px
}

/**
 * Detects horizontal swipe gestures on a touch device.
 * Only fires if horizontal distance > threshold AND > vertical distance
 * (so it doesn't interfere with vertical scrolling).
 */
export function useSwipe<T extends HTMLElement = HTMLDivElement>({
  onSwipeLeft,
  onSwipeRight,
  threshold = 50,
}: UseSwipeOptions): {
  ref: RefObject<T | null>;
  onTouchStart: (e: React.TouchEvent) => void;
  onTouchEnd: (e: React.TouchEvent) => void;
} {
  const ref = useRef<T | null>(null);
  const startX = useRef(0);
  const startY = useRef(0);

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    startX.current = e.touches[0].clientX;
    startY.current = e.touches[0].clientY;
  }, []);

  const onTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      const endX = e.changedTouches[0].clientX;
      const endY = e.changedTouches[0].clientY;
      const dx = endX - startX.current;
      const dy = endY - startY.current;

      // Only trigger if horizontal movement exceeds threshold
      // and is greater than vertical movement (avoid hijacking scroll)
      if (Math.abs(dx) > threshold && Math.abs(dx) > Math.abs(dy)) {
        if (dx < 0) {
          onSwipeLeft?.();
        } else {
          onSwipeRight?.();
        }
      }
    },
    [onSwipeLeft, onSwipeRight, threshold]
  );

  return { ref, onTouchStart, onTouchEnd };
}
