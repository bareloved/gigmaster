"use client";

import { useMemo, useState, useRef, useCallback, useEffect } from "react";
import type { DashboardGig } from "@/lib/types/shared";
import { cn } from "@/lib/utils";
import { WeekViewEvent } from "./week-view-event";
import {
  getEventPosition,
  computeOverlapLayout,
  timeToMinutes,
  GRID_HEIGHT,
  DAY_START_HOUR,
  HOUR_HEIGHT,
  yPositionToTime,
  yPositionToTime15,
  formatTimeHHMM,
} from "@/lib/utils/calendar-helpers";
import type { CalendarPlaceholder } from "./calendar-view";

/** Minimum drag distance (px) to distinguish drag from click */
const DRAG_THRESHOLD = 10;

/** Minimum ghost block height: 15 minutes */
const MIN_GHOST_HEIGHT = HOUR_HEIGHT / 4;

interface WeekViewColumnProps {
  date: Date;
  gigs: DashboardGig[];
  getGigColor: (bandId: string | null | undefined) => string;
  selectedGigId: string | null;
  onEventClick: (gig: DashboardGig, rect: DOMRect) => void;
  onSlotClick: (date: Date, time: string) => void;
  onSlotDrag?: (
    date: Date,
    startTime: string,
    endTime: string,
    rect: DOMRect
  ) => void;
  isWeekend?: boolean;
  placeholder?: CalendarPlaceholder | null;
  onPlaceholderRect?: (rect: DOMRect) => void;
}

export function WeekViewColumn({
  date,
  gigs,
  getGigColor,
  selectedGigId,
  onEventClick,
  onSlotClick,
  onSlotDrag,
  isWeekend,
  placeholder,
  onPlaceholderRect,
}: WeekViewColumnProps) {
  const columnRef = useRef<HTMLDivElement>(null);

  // Drag state
  const [dragState, setDragState] = useState<{
    startY: number;
    currentY: number;
  } | null>(null);
  const dragRef = useRef<{
    startY: number;
    currentY: number;
    isDragging: boolean;
  } | null>(null);

  // Split gigs into timed and all-day
  const timedGigs = useMemo(
    () => gigs.filter((g) => g.startTime),
    [gigs]
  );

  // Calculate positions and overlap layout
  const layout = useMemo(() => {
    const positions = timedGigs.map((gig) =>
      getEventPosition(gig.startTime, gig.endTime)
    );

    const overlapInput = timedGigs.map((gig) => {
      const startM = gig.startTime
        ? timeToMinutes(gig.startTime)
        : DAY_START_HOUR * 60;
      const endM = gig.endTime ? timeToMinutes(gig.endTime) : startM + 120;
      return { startMinutes: startM, endMinutes: endM };
    });

    const slots = computeOverlapLayout(overlapInput);

    return timedGigs.map((gig, i) => ({
      gig,
      position: positions[i],
      slot: slots[i],
    }));
  }, [timedGigs]);

  // Convert a clientY to a Y relative to the column top
  const clientYToColumnY = useCallback(
    (clientY: number): number => {
      if (!columnRef.current) return 0;
      const rect = columnRef.current.getBoundingClientRect();
      return Math.max(0, Math.min(clientY - rect.top, GRID_HEIGHT));
    },
    []
  );

  // Snap a column-relative Y to 15-min grid and return the snapped Y + time
  const snapY = useCallback((y: number) => {
    const { hours, minutes } = yPositionToTime15(y);
    const snappedY =
      ((hours * 60 + minutes - DAY_START_HOUR * 60) / 60) * HOUR_HEIGHT;
    const time = formatTimeHHMM(hours, minutes);
    return { snappedY, time };
  }, []);

  // Get a DOMRect for the ghost block (in viewport coordinates)
  const getGhostRect = useCallback(
    (topY: number, bottomY: number): DOMRect => {
      if (!columnRef.current) {
        return new DOMRect(
          window.innerWidth / 2 - 130,
          window.innerHeight / 3,
          0,
          0
        );
      }
      const colRect = columnRef.current.getBoundingClientRect();
      return new DOMRect(
        colRect.left,
        colRect.top + topY,
        colRect.width,
        bottomY - topY
      );
    },
    []
  );

  // ---- Mouse handlers ----

  const handleMouseDown = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      // Only fire on column background clicks (not event blocks)
      if (e.target !== e.currentTarget) return;
      // Only left button
      if (e.button !== 0) return;

      const y = clientYToColumnY(e.clientY);
      dragRef.current = { startY: y, currentY: y, isDragging: false };
      setDragState({ startY: y, currentY: y });

      const handleMouseMove = (ev: MouseEvent) => {
        if (!dragRef.current) return;
        const newY = clientYToColumnY(ev.clientY);
        dragRef.current.currentY = newY;

        if (
          !dragRef.current.isDragging &&
          Math.abs(newY - dragRef.current.startY) > DRAG_THRESHOLD
        ) {
          dragRef.current.isDragging = true;
        }

        setDragState({
          startY: dragRef.current.startY,
          currentY: newY,
        });
      };

      const handleMouseUp = (ev: MouseEvent) => {
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);

        const drag = dragRef.current;
        if (!drag) return;

        if (!drag.isDragging) {
          // Treat as a click — use 30-min snap
          const colY = clientYToColumnY(ev.clientY);
          const { hours, minutes } = yPositionToTime(colY);
          const time = formatTimeHHMM(hours, minutes);
          onSlotClick(date, time);
        } else if (onSlotDrag) {
          // Drag complete — use 15-min snap
          const topY = Math.min(drag.startY, drag.currentY);
          const bottomY = Math.max(drag.startY, drag.currentY);
          const start = snapY(topY);
          const end = snapY(bottomY);

          // Ensure minimum 15-min duration
          if (start.time === end.time) {
            const { hours, minutes } = yPositionToTime15(
              bottomY + MIN_GHOST_HEIGHT
            );
            const endTime = formatTimeHHMM(hours, minutes);
            const ghostRect = getGhostRect(start.snappedY, bottomY + MIN_GHOST_HEIGHT);
            onSlotDrag(date, start.time, endTime, ghostRect);
          } else {
            const ghostRect = getGhostRect(start.snappedY, end.snappedY);
            onSlotDrag(date, start.time, end.time, ghostRect);
          }
        }

        dragRef.current = null;
        setDragState(null);
      };

      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
    },
    [clientYToColumnY, date, getGhostRect, onSlotClick, onSlotDrag, snapY]
  );

  // ---- Touch handlers ----

  const handleTouchStart = useCallback(
    (e: React.TouchEvent<HTMLDivElement>) => {
      if (e.target !== e.currentTarget) return;
      if (e.touches.length !== 1) return;

      const y = clientYToColumnY(e.touches[0].clientY);
      dragRef.current = { startY: y, currentY: y, isDragging: false };
      setDragState({ startY: y, currentY: y });
    },
    [clientYToColumnY]
  );

  const handleTouchMove = useCallback(
    (e: React.TouchEvent<HTMLDivElement>) => {
      if (!dragRef.current) return;
      if (e.touches.length !== 1) return;

      const newY = clientYToColumnY(e.touches[0].clientY);
      dragRef.current.currentY = newY;

      if (
        !dragRef.current.isDragging &&
        Math.abs(newY - dragRef.current.startY) > DRAG_THRESHOLD
      ) {
        dragRef.current.isDragging = true;
      }

      if (dragRef.current.isDragging) {
        // Prevent scroll while dragging
        e.preventDefault();
      }

      setDragState({
        startY: dragRef.current.startY,
        currentY: newY,
      });
    },
    [clientYToColumnY]
  );

  const handleTouchEnd = useCallback(
    (_e: React.TouchEvent<HTMLDivElement>) => {
      const drag = dragRef.current;
      if (!drag) return;

      if (!drag.isDragging) {
        // Treat as a tap
        const { hours, minutes } = yPositionToTime(drag.startY);
        const time = formatTimeHHMM(hours, minutes);
        onSlotClick(date, time);
      } else if (onSlotDrag) {
        const topY = Math.min(drag.startY, drag.currentY);
        const bottomY = Math.max(drag.startY, drag.currentY);
        const start = snapY(topY);
        const end = snapY(bottomY);

        if (start.time === end.time) {
          const { hours, minutes } = yPositionToTime15(
            bottomY + MIN_GHOST_HEIGHT
          );
          const endTime = formatTimeHHMM(hours, minutes);
          const ghostRect = getGhostRect(start.snappedY, bottomY + MIN_GHOST_HEIGHT);
          onSlotDrag(date, start.time, endTime, ghostRect);
        } else {
          const ghostRect = getGhostRect(start.snappedY, end.snappedY);
          onSlotDrag(date, start.time, end.time, ghostRect);
        }
      }

      dragRef.current = null;
      setDragState(null);
    },
    [date, getGhostRect, onSlotClick, onSlotDrag, snapY]
  );

  // Cleanup document listeners on unmount
  useEffect(() => {
    return () => {
      dragRef.current = null;
    };
  }, []);

  // Placeholder block (shown during click-to-create, before gig is saved)
  const placeholderBlock = useMemo(() => {
    if (!placeholder) return null;
    const startMinutes = timeToMinutes(placeholder.startTime);
    const endMinutes = timeToMinutes(placeholder.endTime);
    const top = ((startMinutes - DAY_START_HOUR * 60) / 60) * HOUR_HEIGHT;
    const height = Math.max(((endMinutes - startMinutes) / 60) * HOUR_HEIGHT, HOUR_HEIGHT / 4);
    return { top, height, startTime: placeholder.startTime, endTime: placeholder.endTime };
  }, [placeholder]);

  // Report placeholder DOMRect to parent for popover positioning
  const placeholderRef = useCallback(
    (node: HTMLDivElement | null) => {
      if (node && onPlaceholderRect) {
        // Use requestAnimationFrame so the DOM has settled
        requestAnimationFrame(() => {
          onPlaceholderRect(node.getBoundingClientRect());
        });
      }
    },
    [onPlaceholderRect]
  );

  // Ghost block rendering
  const ghostBlock = useMemo(() => {
    if (!dragState) return null;

    const topY = Math.min(dragState.startY, dragState.currentY);
    const bottomY = Math.max(dragState.startY, dragState.currentY);

    // Only show ghost if drag exceeds threshold
    if (bottomY - topY < DRAG_THRESHOLD) return null;

    const start = snapY(topY);
    const end = snapY(bottomY);

    // Ensure minimum height
    const ghostTop = start.snappedY;
    let ghostBottom = end.snappedY;
    if (ghostBottom - ghostTop < MIN_GHOST_HEIGHT) {
      ghostBottom = ghostTop + MIN_GHOST_HEIGHT;
    }

    return {
      top: ghostTop,
      height: ghostBottom - ghostTop,
      startTime: start.time,
      endTime:
        ghostBottom === ghostTop + MIN_GHOST_HEIGHT
          ? (() => {
              const { hours, minutes } = yPositionToTime15(ghostBottom);
              return formatTimeHHMM(hours, minutes);
            })()
          : end.time,
    };
  }, [dragState, snapY]);

  return (
    <div
      ref={columnRef}
      className={cn(
        "relative cursor-pointer select-none",
        isWeekend && "bg-black/[0.02] dark:bg-white/[0.03]"
      )}
      style={{ height: GRID_HEIGHT }}
      onMouseDown={handleMouseDown}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Half-hour grid lines */}
      {Array.from({ length: (GRID_HEIGHT / HOUR_HEIGHT) * 2 }).map((_, i) => (
        <div
          key={i}
          className={`absolute left-0 right-0 border-t ${
            i % 2 === 0 ? "border-border" : "border-border/40"
          }`}
          style={{ top: i * (HOUR_HEIGHT / 2) }}
        />
      ))}

      {/* Timed events */}
      {layout.map(({ gig, position, slot }) => (
        <WeekViewEvent
          key={gig.gigId}
          gig={gig}
          color={getGigColor(gig.bandId)}
          top={position.top}
          height={position.height}
          column={slot.column}
          totalColumns={slot.totalColumns}
          isSelected={gig.gigId === selectedGigId}
          onClick={onEventClick}
        />
      ))}

      {/* Drag ghost block */}
      {ghostBlock && (
        <div
          className="absolute left-1 right-1 rounded-md pointer-events-none z-10"
          style={{
            top: ghostBlock.top,
            height: ghostBlock.height,
            backgroundColor: "hsl(25 60% 45% / 0.2)",
            border: "1px dashed hsl(25 60% 45% / 0.6)",
          }}
        >
          <span className="absolute top-0.5 left-1.5 text-[10px] font-medium text-foreground/70">
            {ghostBlock.startTime}
          </span>
          {ghostBlock.height > 30 && (
            <span className="absolute bottom-0.5 left-1.5 text-[10px] font-medium text-foreground/70">
              {ghostBlock.endTime}
            </span>
          )}
        </div>
      )}

      {/* Placeholder block (click-to-create confirmation pending) */}
      {placeholderBlock && !ghostBlock && (
        <div
          ref={placeholderRef}
          className="absolute left-1 right-1 rounded-md pointer-events-none z-10"
          style={{
            top: placeholderBlock.top,
            height: placeholderBlock.height,
            backgroundColor: "hsl(25 60% 45% / 0.2)",
            border: "1px dashed hsl(25 60% 45% / 0.6)",
          }}
        >
          <span className="absolute top-0.5 left-1.5 text-[10px] font-medium text-foreground/70">
            {placeholderBlock.startTime}
          </span>
          {placeholderBlock.height > 30 && (
            <span className="absolute bottom-0.5 left-1.5 text-[10px] font-medium text-foreground/70">
              {placeholderBlock.endTime}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
