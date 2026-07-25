"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, type MouseEvent as ReactMouseEvent } from "react";

import { EmptyState } from "@/components/kit/empty-state";
import { ErrorState } from "@/components/kit/error-state";
import { LoadingState } from "@/components/kit/loading-state";
import { findConflictingBookings, type BookingStatus } from "@/lib/bookings/conflict-check";
import { BOOKING_TIME_STEP_MINUTES } from "@/lib/bookings/time-granularity";
import { formatTimeLabel, minutesToTime, normalizeTimeString, timeToMinutes } from "@/lib/dates";
import type { ScheduleRoom } from "@/lib/rooms-filters";
import { ROOM_CATEGORY_COLOR_SWATCH_CLASSES, isRoomCategoryColor } from "@/lib/rooms/category-colors";
import { layoutOverlappingEvents } from "@/lib/schedule/event-layout";
import { formatHourLabel, percentForTime, SCHEDULE_START_HOUR, timeAxisGridlines, timeForPercent } from "@/lib/schedule/hours";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

import { DragCreateOverlay } from "./drag-create-overlay";
import { EventBlock } from "./event-block";
import { NowLine } from "./now-line";

/** Frozen room-column width per breakpoint (US-004), matching the room-cell classes below. */
const ROOM_COLUMN_CLASSES = "w-[88px] md:w-[100px] lg:w-[140px]";

/** Sticky time-header row height. */
const TIME_HEADER_HEIGHT_PX = 32;

/** Minimum room-row height; grows to fit stacked concurrent bookings (US-005). */
const ROOM_ROW_MIN_HEIGHT_PX = 56;

/** Height of a single event lane within a room row. */
const EVENT_LANE_HEIGHT_PX = 44;

/** Vertical space above the first lane and below the last lane within a room row. */
const ROW_VERTICAL_PADDING_PX = 6;

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

/** How long a post-drop conflict warning stays visible before fading (US-007). */
const DRAG_CONFLICT_DISPLAY_MS = 3000;

/** Minimum rendered width (percent of the operating window) for a drag overlay, so brief drags stay visible. */
const MIN_DRAG_OVERLAY_WIDTH_PERCENT = 2;

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/** In-flight horizontal drag across a room row's time axis. */
interface ActiveDrag {
  roomId: string;
  /** Viewport-left of the axis element, so mousemove can convert clientX -> percent. */
  axisLeft: number;
  /** Rendered width of the axis element (px). */
  axisWidth: number;
  anchorPercent: number;
  currentPercent: number;
}

function categoryColorBarClassName(categoryColor: string | null): string {
  if (categoryColor && isRoomCategoryColor(categoryColor)) {
    return ROOM_CATEGORY_COLOR_SWATCH_CLASSES[categoryColor];
  }
  return "bg-line";
}

interface DayBooking {
  id: string;
  room_id: string;
  date: string;
  start_time: string;
  end_time: string;
  status: BookingStatus;
}

/** A room row's height needs to fit its tallest concurrent-overlap lane stack. */
function roomRowHeight(laneCount: number): number {
  if (laneCount === 0) return ROOM_ROW_MIN_HEIGHT_PX;
  return Math.max(ROOM_ROW_MIN_HEIGHT_PX, laneCount * EVENT_LANE_HEIGHT_PX + 2 * ROW_VERTICAL_PADDING_PX);
}

/**
 * Responsive rooms-as-rows / time-as-horizontal-axis schedule grid: a sticky
 * room column on the left, a sticky hour header on top, scaling to many
 * rooms via vertical scroll. Fetches and renders the selected date's
 * bookings (US-005), stacking same-room overlaps into vertical lanes, with
 * the now-line (US-006) and mouse drag-to-create (US-007). Touch drag-create
 * is US-008.
 */
export function TimelineGrid({ rooms, date }: { rooms: ScheduleRoom[]; date: string }) {
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

  const supabase = useMemo(() => createClient(), []);
  const [bookings, setBookings] = useState<DayBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (rooms.length === 0) {
      setBookings([]);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    supabase
      .from("bookings_schedule")
      .select("id, room_id, date, start_time, end_time, status")
      .eq("date", date)
      .order("start_time", { ascending: true })
      .then(({ data, error: queryError }) => {
        if (cancelled) return;
        if (queryError) {
          setError(queryError.message);
          setBookings([]);
        } else {
          setBookings((data ?? []) as DayBooking[]);
        }
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [supabase, rooms.length, date]);

  const bookingsByRoom = useMemo(() => {
    const grouped = new Map<string, DayBooking[]>();
    for (const booking of bookings) {
      const existing = grouped.get(booking.room_id);
      if (existing) {
        existing.push(booking);
      } else {
        grouped.set(booking.room_id, [booking]);
      }
    }
    return grouped;
  }, [bookings]);

  const laidOutBookingsByRoom = useMemo(() => {
    const laidOut = new Map<string, ReturnType<typeof layoutOverlappingEvents<DayBooking>>>();
    for (const [roomId, roomBookings] of bookingsByRoom) {
      laidOut.set(roomId, layoutOverlappingEvents(roomBookings));
    }
    return laidOut;
  }, [bookingsByRoom]);

  const router = useRouter();

  const dragRef = useRef<ActiveDrag | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [renderDrag, setRenderDrag] = useState<ActiveDrag | null>(null);
  const [dragConflict, setDragConflict] = useState<{ roomId: string; left: number; width: number } | null>(null);
  const dragConflictTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function dragRangeFor(anchorPercent: number, currentPercent: number) {
    const startTime = timeForPercent(Math.min(anchorPercent, currentPercent));
    let endTime = timeForPercent(Math.max(anchorPercent, currentPercent));
    if (endTime === startTime) {
      endTime = minutesToTime(timeToMinutes(startTime) + BOOKING_TIME_STEP_MINUTES);
    }
    return { startTime, endTime };
  }

  function percentFromClientX(clientX: number, axisLeft: number, axisWidth: number): number {
    if (axisWidth <= 0) return 0;
    return clamp(((clientX - axisLeft) / axisWidth) * 100, 0, 100);
  }

  function handleAxisMouseDown(event: ReactMouseEvent<HTMLDivElement>, roomId: string) {
    if (event.button !== 0) return;
    // A mousedown on an existing booking (a <button>) shouldn't start a drag.
    if ((event.target as HTMLElement).closest("button")) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const percent = percentFromClientX(event.clientX, rect.left, rect.width);
    const next: ActiveDrag = {
      roomId,
      axisLeft: rect.left,
      axisWidth: rect.width,
      anchorPercent: percent,
      currentPercent: percent,
    };
    dragRef.current = next;
    setRenderDrag(next);
    setDragConflict(null);
    setIsDragging(true);
  }

  useEffect(() => {
    if (!isDragging) return;

    function handleMouseMove(event: globalThis.MouseEvent) {
      const current = dragRef.current;
      if (!current) return;
      const percent = percentFromClientX(event.clientX, current.axisLeft, current.axisWidth);
      const next = { ...current, currentPercent: percent };
      dragRef.current = next;
      setRenderDrag(next);
    }

    function handleMouseUp() {
      setIsDragging(false);
      const finished = dragRef.current;
      dragRef.current = null;
      setRenderDrag(null);
      if (!finished) return;

      const { startTime, endTime } = dragRangeFor(finished.anchorPercent, finished.currentPercent);
      const roomBookings = bookingsByRoom.get(finished.roomId) ?? [];
      const conflicts = findConflictingBookings(
        {
          room_id: finished.roomId,
          date,
          start_time: normalizeTimeString(startTime),
          end_time: normalizeTimeString(endTime),
        },
        roomBookings
      );

      if (conflicts.length > 0) {
        if (dragConflictTimeoutRef.current) clearTimeout(dragConflictTimeoutRef.current);
        const left = percentForTime(startTime);
        setDragConflict({
          roomId: finished.roomId,
          left,
          width: Math.max(percentForTime(endTime) - left, MIN_DRAG_OVERLAY_WIDTH_PERCENT),
        });
        dragConflictTimeoutRef.current = setTimeout(() => setDragConflict(null), DRAG_CONFLICT_DISPLAY_MS);
        return;
      }

      router.push(`/bookings/new?room=${finished.roomId}&date=${date}&start=${startTime}&end=${endTime}`);
    }

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging, bookingsByRoom, date, router]);

  useEffect(() => {
    return () => {
      if (dragConflictTimeoutRef.current) clearTimeout(dragConflictTimeoutRef.current);
    };
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
    <div className="flex w-full min-w-0 flex-col gap-2">
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

          <div className="relative flex min-w-0 flex-col">
            {/*
              Now-line overlay: spans the full height of all room rows (US-006),
              offset past the frozen room column and confined to the time-axis
              region by mirroring the same frozen-column + flex-1 axis layout as
              each row, so its left:X% stays aligned at every breakpoint. NowLine
              itself renders nothing unless `date` is today.
            */}
            <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-30 flex">
              <div className={cn("shrink-0", ROOM_COLUMN_CLASSES)} />
              <div className="relative min-w-0 flex-1" style={{ minWidth: AXIS_MIN_WIDTH_PX }}>
                <NowLine date={date} />
              </div>
            </div>

            {rooms.map((room, roomIndex) => {
            const roomBookings = laidOutBookingsByRoom.get(room.id) ?? [];
            const laneCount = roomBookings.reduce((max, { columnCount }) => Math.max(max, columnCount), 0);
            const drag = isDragging && renderDrag?.roomId === room.id ? renderDrag : null;
            const conflict = dragConflict?.roomId === room.id ? dragConflict : null;
            return (
              <div key={room.id} className="flex" style={{ height: roomRowHeight(laneCount) }}>
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
                <div
                  className="relative min-w-0 flex-1 cursor-crosshair border-b border-line/60"
                  style={{ minWidth: AXIS_MIN_WIDTH_PX }}
                  onMouseDown={(event) => handleAxisMouseDown(event, room.id)}
                >
                  {visibleGridlines.map((mark) => (
                    <div
                      key={`${room.id}-${mark.hour}-${mark.isHalfHour}`}
                      aria-hidden="true"
                      className={cn("absolute inset-y-0 w-px", mark.isHalfHour ? "bg-line/40" : "bg-line/60")}
                      style={{ left: `${mark.percent}%` }}
                    />
                  ))}
                  {roomBookings.map(({ event: booking, columnIndex }) => (
                    <EventBlock
                      key={booking.id}
                      id={booking.id}
                      roomName={room.name}
                      startTime={booking.start_time}
                      endTime={booking.end_time}
                      status={booking.status}
                      roomIndex={roomIndex}
                      top={ROW_VERTICAL_PADDING_PX + columnIndex * EVENT_LANE_HEIGHT_PX}
                      height={EVENT_LANE_HEIGHT_PX}
                    />
                  ))}

                  {drag
                    ? (() => {
                        const { startTime, endTime } = dragRangeFor(drag.anchorPercent, drag.currentPercent);
                        const left = percentForTime(startTime);
                        const width = Math.max(percentForTime(endTime) - left, MIN_DRAG_OVERLAY_WIDTH_PERCENT);
                        return (
                          <DragCreateOverlay
                            left={left}
                            width={width}
                            label={`${formatTimeLabel(startTime)} – ${formatTimeLabel(endTime)}`}
                          />
                        );
                      })()
                    : null}

                  {conflict ? (
                    <DragCreateOverlay left={conflict.left} width={conflict.width} label="Overlaps an existing booking" conflict />
                  ) : null}
                </div>
              </div>
            );
          })}
          </div>
        </div>
      </div>

      {error ? (
        <ErrorState description={error} />
      ) : loading ? (
        <LoadingState variant="rows" count={3} />
      ) : null}
    </div>
  );
}
