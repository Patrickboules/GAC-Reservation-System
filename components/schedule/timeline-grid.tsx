"use client";

import { Pin, PinOff } from "lucide-react";
import { Fragment, useEffect, useMemo, useRef, useState } from "react";

import { Button } from "@/components/kit/button";
import { EmptyState } from "@/components/kit/empty-state";
import { ErrorState } from "@/components/kit/error-state";
import { IconButton } from "@/components/kit/icon-button";
import { LoadingState } from "@/components/kit/loading-state";
import type { BookingStatus } from "@/lib/bookings/conflict-check";
import { buildingGroupSpans, groupRoomsByBuilding, sortRoomsByFavorite, type ScheduleRoom } from "@/lib/rooms-filters";
import { ROOM_CATEGORY_COLOR_SWATCH_CLASSES, isRoomCategoryColor } from "@/lib/rooms/category-colors";
import { handleScheduleGridKeyDown } from "@/lib/schedule/event-block-navigation";
import { layoutOverlappingEvents } from "@/lib/schedule/event-layout";
import { formatHourLabel, timeAxisGridlines } from "@/lib/schedule/hours";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

import { EventBlock } from "./event-block";
import { NowLine } from "./now-line";

/** Frozen room-column width per breakpoint (US-004), matching the room-cell classes below. */
const ROOM_COLUMN_CLASSES = "w-[124px] md:w-[152px] lg:w-[180px]";

/** Sticky time-header row height. */
const TIME_HEADER_HEIGHT_PX = 36;

/** Sticky building-group header row height (US-011). */
const GROUP_HEADER_HEIGHT_PX = 32;

/** Minimum room-row height; grows to fit stacked concurrent bookings (US-005). */
const ROOM_ROW_MIN_HEIGHT_PX = 64;

/** Height of a single event lane within a room row. */
const EVENT_LANE_HEIGHT_PX = 48;

/** Vertical space above the first lane and below the last lane within a room row. */
const ROW_VERTICAL_PADDING_PX = 8;

/** Per-hour rendered width at/above which a half-hour gridline has room to render without crowding the hour line next to it. */
const HALF_HOUR_GRIDLINE_MIN_HOUR_WIDTH_PX = 56;

const OPERATING_WINDOW_HOURS = timeAxisGridlines().filter((mark) => !mark.isHalfHour).length - 1;

/**
 * Minimum rendered width per hour box. Sized to give each hour label ("10 AM")
 * room to sit legibly centered in its own box; below this the axis stops
 * shrinking with the viewport and the grid scrolls horizontally inside its own
 * container instead, so the page itself never scrolls sideways.
 */
const MIN_HOUR_WIDTH_PX = 72;

/** Minimum rendered width of the time axis itself, derived from the per-hour minimum. */
const AXIS_MIN_WIDTH_PX = OPERATING_WINDOW_HOURS * MIN_HOUR_WIDTH_PX;

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
  service: string | null;
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
 * the now-line (US-006). Pinned rooms float to the top and a "Hide free rooms"
 * toggle drops rows with nothing booked (US-010).
 *
 * The grid is read-only: booking always starts from a room in the Rooms
 * directory, so there is exactly one way to reserve and the room is never
 * chosen twice.
 */
export function TimelineGrid({
  rooms,
  date,
  favoriteRoomIds,
  onToggleFavorite,
  authenticated,
}: {
  rooms: ScheduleRoom[];
  date: string;
  favoriteRoomIds: ReadonlySet<string>;
  onToggleFavorite: (roomId: string) => void;
  /** When false (signed-out visitor), the service/purpose of each booking is
   * withheld — the public schedule shows only that a room is taken, never what for. */
  authenticated: boolean;
}) {
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
  const [hideFreeRooms, setHideFreeRooms] = useState(false);

  useEffect(() => {
    if (rooms.length === 0) {
      setBookings([]);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    // Signed-out visitors never receive `service` — the public schedule shows
    // that a room is taken, not what it is taken for, so the detail isn't just
    // hidden in the UI, it is never sent to the browser.
    const columns = authenticated
      ? "id, room_id, date, start_time, end_time, status, service"
      : "id, room_id, date, start_time, end_time, status";

    supabase
      .from("bookings_schedule")
      .select(columns)
      .eq("date", date)
      .order("start_time", { ascending: true })
      .then(({ data, error: queryError }) => {
        if (cancelled) return;
        if (queryError) {
          setError(queryError.message);
          setBookings([]);
        } else {
          setBookings((data ?? []) as unknown as DayBooking[]);
        }
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [supabase, rooms.length, date, authenticated]);

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

  // Group rooms into contiguous same-building runs, then float pinned rooms to
  // the top (US-010). sortRoomsByFavorite is stable, so within the favorites and
  // within the rest each building run stays together for US-011's group headers.
  // "Hide free rooms" then drops any room with no bookings for the selected date.
  const busyRoomIds = useMemo(() => new Set(bookings.map((booking) => booking.room_id)), [bookings]);
  const sortedRooms = useMemo(
    () => sortRoomsByFavorite(groupRoomsByBuilding(rooms), favoriteRoomIds),
    [rooms, favoriteRoomIds]
  );
  const visibleRooms = useMemo(
    () => (hideFreeRooms ? sortedRooms.filter((room) => busyRoomIds.has(room.id)) : sortedRooms),
    [sortedRooms, hideFreeRooms, busyRoomIds]
  );

  // Consecutive same-building rooms share one row-spanning group header (US-011);
  // startIndex keeps each room's global row index stable for keyboard nav.
  const roomGroups = useMemo(() => {
    const groups: { building: string | null; rooms: ScheduleRoom[]; startIndex: number }[] = [];
    let startIndex = 0;
    for (const span of buildingGroupSpans(visibleRooms)) {
      groups.push({ building: span.building, rooms: visibleRooms.slice(startIndex, startIndex + span.count), startIndex });
      startIndex += span.count;
    }
    return groups;
  }, [visibleRooms]);

  const gridlines = useMemo(() => timeAxisGridlines(), []);
  const hourWidthPx = axisWidth > 0 ? axisWidth / OPERATING_WINDOW_HOURS : 0;
  const showHalfHourGridlines = hourWidthPx >= HALF_HOUR_GRIDLINE_MIN_HOUR_WIDTH_PX;

  const visibleGridlines = useMemo(
    () => gridlines.filter((mark) => !mark.isHalfHour || showHalfHourGridlines),
    [gridlines, showHalfHourGridlines]
  );
  // Label every hour, centered inside its own hour box rather than on the
  // boundary gridline: each half-hour mark sits at the midpoint of the box
  // opened by its hour, so we reuse it as that hour's label anchor.
  const labeledHourMarks = useMemo(
    () => gridlines.filter((mark) => mark.isHalfHour),
    [gridlines]
  );

  if (rooms.length === 0) {
    return <EmptyState title="No rooms available" description="Rooms will appear here once they're added." />;
  }

  return (
    <div className="flex w-full min-w-0 flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          variant={hideFreeRooms ? "primary" : "secondary"}
          size="sm"
          aria-pressed={hideFreeRooms}
          onClick={() => setHideFreeRooms((current) => !current)}
        >
          Hide free rooms
        </Button>
      </div>

      {hideFreeRooms && visibleRooms.length === 0 ? (
        <EmptyState
          title="No rooms have bookings"
          description="Turn off “Hide free rooms” to see the full grid."
        />
      ) : (
      <div
        data-schedule-grid
        onKeyDown={handleScheduleGridKeyDown}
        className="max-h-[75vh] w-full min-w-0 overflow-auto rounded-lg border border-line bg-surface"
      >
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
              {labeledHourMarks.map((mark) => (
                <span
                  key={mark.hour}
                  className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2 whitespace-nowrap px-1 font-mono text-small text-ink-600"
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

            {roomGroups.map((group, groupIndex) => (
              <Fragment key={`group-${groupIndex}`}>
                {group.building !== null ? (
                  <div className="flex" style={{ height: GROUP_HEADER_HEIGHT_PX }}>
                    <div
                      title={group.building}
                      className={cn(
                        "sticky left-0 z-10 flex shrink-0 items-center truncate border-r border-b border-line bg-sand-50 px-2 font-medium text-caption text-ink-500",
                        ROOM_COLUMN_CLASSES
                      )}
                    >
                      {group.building}
                    </div>
                    <div
                      aria-hidden="true"
                      className="min-w-0 flex-1 border-b border-line bg-sand-50"
                      style={{ minWidth: AXIS_MIN_WIDTH_PX }}
                    />
                  </div>
                ) : null}
                {group.rooms.map((room, roomInGroupIndex) => {
                  const roomIndex = group.startIndex + roomInGroupIndex;
                  const roomBookings = laidOutBookingsByRoom.get(room.id) ?? [];
            const laneCount = roomBookings.reduce((max, { columnCount }) => Math.max(max, columnCount), 0);
            const isFavorite = favoriteRoomIds.has(room.id);
            return (
              <div key={room.id} className="flex" style={{ height: roomRowHeight(laneCount) }}>
                <div
                  title={room.name}
                  className={cn(
                    "sticky left-0 z-10 flex shrink-0 items-stretch gap-1 overflow-hidden border-r border-b border-line bg-surface pr-0.5",
                    ROOM_COLUMN_CLASSES
                  )}
                >
                  <span aria-hidden="true" className={cn("w-1 shrink-0", categoryColorBarClassName(room.category_color))} />
                  <div className="flex min-w-0 flex-1 flex-col justify-center overflow-hidden py-1 pl-1">
                    <span className="truncate font-display text-small text-ink-900">{room.name}</span>
                    {room.capacity !== null && (
                      <span className="truncate font-mono text-caption text-ink-500">cap. {room.capacity}</span>
                    )}
                  </div>
                  {authenticated && (
                    <IconButton
                      label={isFavorite ? `Unpin ${room.name}` : `Pin ${room.name}`}
                      tooltip={isFavorite ? "Unpin room" : "Pin room"}
                      variant="ghost"
                      size="sm"
                      className={cn("size-6 shrink-0 self-center", isFavorite && "text-sky-600")}
                      onClick={() => onToggleFavorite(room.id)}
                    >
                      {isFavorite ? <Pin className="fill-current" /> : <PinOff />}
                    </IconButton>
                  )}
                </div>
                <div
                  className="relative min-w-0 flex-1 border-b border-line/60"
                  style={{ minWidth: AXIS_MIN_WIDTH_PX }}
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
                      service={authenticated ? booking.service : null}
                      roomIndex={roomIndex}
                      top={ROW_VERTICAL_PADDING_PX + columnIndex * EVENT_LANE_HEIGHT_PX}
                      height={EVENT_LANE_HEIGHT_PX}
                    />
                  ))}
                </div>
              </div>
            );
                })}
              </Fragment>
            ))}
          </div>
        </div>
      </div>
      )}

      {error ? (
        <ErrorState description={error} />
      ) : loading ? (
        <LoadingState variant="rows" count={3} />
      ) : null}
    </div>
  );
}
