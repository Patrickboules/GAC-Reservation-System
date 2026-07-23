"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { EmptyState } from "@/components/kit/empty-state";
import type { ScheduleRoom } from "@/lib/rooms-filters";
import { ROOM_CATEGORY_COLOR_SWATCH_CLASSES, isRoomCategoryColor } from "@/lib/rooms/category-colors";
import { formatHourLabel, SCHEDULE_START_HOUR, timeAxisGridlines } from "@/lib/schedule/hours";
import { cn } from "@/lib/utils";

/** Frozen room-column width per breakpoint (US-004), matching the room-cell classes below. */
const ROOM_COLUMN_CLASSES = "w-[88px] md:w-[100px] lg:w-[140px]";

/** Sticky time-header row height. */
const TIME_HEADER_HEIGHT_PX = 32;

/** Default room-row height for this structural shell; US-005 grows it to fit stacked bookings. */
const ROOM_ROW_HEIGHT_PX = 56;

/** Time-axis (post-frozen-column) rendered width at/above which hour labels show every hour; below it, every 2 hours to avoid crowding. */
const DENSE_HOUR_LABELS_MIN_WIDTH_PX = 1100;

/** Per-hour rendered width at/above which a half-hour gridline has room to render without crowding the hour line next to it. */
const HALF_HOUR_GRIDLINE_MIN_HOUR_WIDTH_PX = 48;

/**
 * Minimum rendered width of the time axis itself: below this, even the
 * 2-hour label step starts colliding, so the axis stops shrinking with the
 * viewport and the grid scrolls horizontally instead (native scroll, same
 * mechanism US-008 later hooks touch-drag into).
 */
const AXIS_MIN_WIDTH_PX = 560;

const OPERATING_WINDOW_HOURS = timeAxisGridlines().filter((mark) => !mark.isHalfHour).length - 1;

function categoryColorBarClassName(categoryColor: string | null): string {
  if (categoryColor && isRoomCategoryColor(categoryColor)) {
    return ROOM_CATEGORY_COLOR_SWATCH_CLASSES[categoryColor];
  }
  return "bg-line";
}

/**
 * Responsive rooms-as-rows / time-as-horizontal-axis schedule grid (US-004
 * skeleton): a sticky room column on the left, a sticky hour header on top,
 * scaling to many rooms via vertical scroll. Not yet wired to real bookings
 * (US-005), the now-line (US-006), or drag-to-create (US-007/US-008) — this
 * story only establishes the frozen layout and time axis.
 */
export function TimelineGrid({ rooms }: { rooms: ScheduleRoom[] }) {
  const axisRef = useRef<HTMLDivElement>(null);
  const [axisWidth, setAxisWidth] = useState(0);

  useEffect(() => {
    const el = axisRef.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) setAxisWidth(entry.contentRect.width);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const gridlines = useMemo(() => timeAxisGridlines(), []);
  const hourWidthPx = axisWidth > 0 ? axisWidth / OPERATING_WINDOW_HOURS : 0;
  const showHalfHourGridlines = hourWidthPx >= HALF_HOUR_GRIDLINE_MIN_HOUR_WIDTH_PX;
  const hourStep = axisWidth >= DENSE_HOUR_LABELS_MIN_WIDTH_PX ? 1 : 2;

  const visibleGridlines = useMemo(
    () => gridlines.filter((mark) => !mark.isHalfHour || showHalfHourGridlines),
    [gridlines, showHalfHourGridlines]
  );
  const labeledHourMarks = useMemo(
    () => gridlines.filter((mark) => !mark.isHalfHour && (mark.hour - SCHEDULE_START_HOUR) % hourStep === 0),
    [gridlines, hourStep]
  );

  if (rooms.length === 0) {
    return <EmptyState title="No rooms available" description="Rooms will appear here once they're added." />;
  }

  return (
    <div className="max-h-[70vh] w-full min-w-0 overflow-auto rounded-lg border border-line bg-surface">
      <div className="flex min-w-0 flex-col">
        <div className="sticky top-0 z-20 flex">
          <div
            aria-hidden="true"
            className={cn("sticky left-0 z-10 shrink-0 border-r border-b border-line bg-surface", ROOM_COLUMN_CLASSES)}
            style={{ height: TIME_HEADER_HEIGHT_PX }}
          />
          <div
            ref={axisRef}
            className="relative min-w-0 flex-1 border-b border-line bg-surface"
            style={{ height: TIME_HEADER_HEIGHT_PX, minWidth: AXIS_MIN_WIDTH_PX }}
          >
            {visibleGridlines.map((mark) => (
              <div
                key={`${mark.hour}-${mark.isHalfHour}`}
                aria-hidden="true"
                className={cn("absolute inset-y-0 w-px", mark.isHalfHour ? "bg-line/40" : "bg-line")}
                style={{ left: `${mark.percent}%` }}
              />
            ))}
            {labeledHourMarks.map((mark, index) => (
              <span
                key={mark.hour}
                className={cn(
                  "absolute top-1/2 -translate-y-1/2 whitespace-nowrap px-1 font-mono text-caption text-ink-500",
                  index === 0 ? "" : index === labeledHourMarks.length - 1 ? "-translate-x-full" : "-translate-x-1/2"
                )}
                style={{ left: `${mark.percent}%` }}
              >
                {formatHourLabel(mark.hour)}
              </span>
            ))}
          </div>
        </div>

        {rooms.map((room) => (
          <div key={room.id} className="flex" style={{ height: ROOM_ROW_HEIGHT_PX }}>
            <div
              title={room.name}
              className={cn(
                "sticky left-0 z-10 flex shrink-0 items-stretch gap-1.5 overflow-hidden border-r border-b border-line bg-surface pr-1",
                ROOM_COLUMN_CLASSES
              )}
            >
              <span aria-hidden="true" className={cn("w-1 shrink-0", categoryColorBarClassName(room.category_color))} />
              <div className="flex min-w-0 flex-1 flex-col justify-center overflow-hidden py-1">
                <span className="truncate font-display text-small text-ink-900">{room.name}</span>
                {room.capacity !== null && (
                  <span className="truncate font-mono text-caption text-ink-500">cap. {room.capacity}</span>
                )}
              </div>
            </div>
            <div className="relative min-w-0 flex-1 border-b border-line/60" style={{ minWidth: AXIS_MIN_WIDTH_PX }}>
              {visibleGridlines.map((mark) => (
                <div
                  key={`${room.id}-${mark.hour}-${mark.isHalfHour}`}
                  aria-hidden="true"
                  className={cn("absolute inset-y-0 w-px", mark.isHalfHour ? "bg-line/40" : "bg-line/60")}
                  style={{ left: `${mark.percent}%` }}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
