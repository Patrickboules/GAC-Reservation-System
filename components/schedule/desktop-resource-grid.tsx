"use client";

import { Combobox } from "@base-ui/react/combobox";
import { Pin, PinOff, Search, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, type MouseEvent as ReactMouseEvent } from "react";

import { Button } from "@/components/kit/button";
import { EmptyState } from "@/components/kit/empty-state";
import { ErrorState } from "@/components/kit/error-state";
import { IconButton } from "@/components/kit/icon-button";
import { LoadingState } from "@/components/kit/loading-state";
import { findConflictingBookings, type BookingStatus } from "@/lib/bookings/conflict-check";
import { formatTimeLabel, minutesToTime, normalizeTimeString, timeToMinutes } from "@/lib/dates";
import { buildingGroupSpans, type ScheduleRoom } from "@/lib/rooms-filters";
import { dayTransitionClassName, useDayTransitionDirection } from "@/lib/schedule/day-transition";
import { handleScheduleGridKeyDown } from "@/lib/schedule/event-block-navigation";
import { layoutOverlappingEvents } from "@/lib/schedule/event-layout";
import {
  formatHourLabel,
  HOUR_ROW_HEIGHT_PX,
  offsetForTime,
  scheduleHours,
  timeForOffset,
} from "@/lib/schedule/hours";
import { BOOKING_TIME_STEP_MINUTES } from "@/lib/bookings/time-granularity";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

import { DragCreateOverlay } from "./drag-create-overlay";
import { EventBlock } from "./event-block";
import { NowLine } from "./now-line";

/** How long a post-drop conflict warning stays visible before fading (US-036). */
const DRAG_CONFLICT_DISPLAY_MS = 3000;

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

interface ActiveDrag {
  roomId: string;
  columnTop: number;
  anchorPx: number;
  currentPx: number;
}

export type { ScheduleRoom };

interface RoomComboItem {
  value: string;
  label: string;
}

/** Searchable room jump for the desktop grid (US-035): scrolls the grid to the selected room's column. */
function RoomQuickJump({ rooms, onJump }: { rooms: ScheduleRoom[]; onJump: (roomId: string) => void }) {
  const items = useMemo<RoomComboItem[]>(() => rooms.map((room) => ({ value: room.id, label: room.name })), [rooms]);

  return (
    <Combobox.Root<RoomComboItem>
      items={items}
      onValueChange={(next) => {
        if (next) onJump(next.value);
      }}
    >
      <Combobox.InputGroup className="flex h-9 w-full items-center gap-1.5 rounded-md border border-line bg-white px-2.5 text-sm text-ink-900 focus-within:border-sky-600 focus-within:ring-2 focus-within:ring-sky-300 sm:w-56">
        <Search aria-hidden="true" className="size-4 shrink-0 text-ink-500" />
        <Combobox.Input
          placeholder="Jump to room…"
          aria-label="Jump to room"
          className="w-full min-w-0 bg-transparent text-sm outline-none placeholder:text-ink-500"
        />
        <Combobox.Clear aria-label="Clear" className="shrink-0 text-ink-500 outline-none hover:text-ink-700">
          <X aria-hidden="true" className="size-4" />
        </Combobox.Clear>
      </Combobox.InputGroup>
      <Combobox.Portal>
        <Combobox.Positioner sideOffset={4} className="z-50 outline-none">
          <Combobox.Popup className="max-h-64 w-56 overflow-y-auto rounded-md border border-line bg-white p-1 shadow-md outline-none">
            <Combobox.Empty className="px-2.5 py-2 text-small text-ink-500">No rooms found.</Combobox.Empty>
            <Combobox.List>
              {(item: RoomComboItem) => (
                <Combobox.Item
                  key={item.value}
                  value={item}
                  className="cursor-pointer rounded-sm px-2.5 py-2 text-sm text-ink-900 outline-none select-none data-[highlighted]:bg-sky-50"
                >
                  {item.label}
                </Combobox.Item>
              )}
            </Combobox.List>
          </Combobox.Popup>
        </Combobox.Positioner>
      </Combobox.Portal>
    </Combobox.Root>
  );
}

interface DayBooking {
  id: string;
  room_id: string;
  date: string;
  start_time: string;
  end_time: string;
  status: BookingStatus;
}

const ROOM_COLUMN_WIDTH_PX = 132;
const TIME_GUTTER_WIDTH_PX = 64;
const OFF_HOURS_BAND_PX = 24;
const GROUP_HEADER_HEIGHT_PX = 28;

/**
 * Desktop multi-room resource-day calendar (US-028 baseline): rooms as
 * horizontally scrollable columns under a sticky room-header row, with a
 * sticky time gutter down the left. Shares the mobile view's hour range,
 * row height, and off-hours styling (lib/schedule/hours.ts).
 *
 * `rooms` is expected pre-ordered by the caller (e.g. via groupRoomsByBuilding,
 * US-032, with pinned rooms floated first, US-034) so same-building rooms are
 * contiguous and can share one sticky group header spanning their columns.
 */
export function DesktopResourceGrid({
  rooms,
  date,
  favoriteRoomIds,
  onToggleFavorite,
  initialRoomId,
}: {
  rooms: ScheduleRoom[];
  date: string;
  favoriteRoomIds: ReadonlySet<string>;
  onToggleFavorite: (roomId: string) => void;
  /** Scrolls this room's column into view once on mount, e.g. from the global availability search (US-039). */
  initialRoomId?: string;
}) {
  const supabase = useMemo(() => createClient(), []);
  const [bookings, setBookings] = useState<DayBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hideFreeRooms, setHideFreeRooms] = useState(false);

  const busyRoomIds = useMemo(() => new Set(bookings.map((booking) => booking.room_id)), [bookings]);
  const visibleRooms = useMemo(
    () => (hideFreeRooms ? rooms.filter((room) => busyRoomIds.has(room.id)) : rooms),
    [rooms, hideFreeRooms, busyRoomIds]
  );

  const buildingGroups = useMemo(() => buildingGroupSpans(visibleRooms), [visibleRooms]);
  const hasBuildingGroups = visibleRooms.some((room) => room.building);
  const headerTopOffset = hasBuildingGroups ? GROUP_HEADER_HEIGHT_PX : 0;

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

  const hours = useMemo(() => scheduleHours(), []);
  const gridHeight = (hours.length - 1) * HOUR_ROW_HEIGHT_PX;
  const transitionDirection = useDayTransitionDirection(date);

  const scrollRef = useRef<HTMLDivElement>(null);
  const roomColumnRefs = useRef(new Map<string, HTMLDivElement>());
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  function scrollToRoom(roomId: string) {
    const container = scrollRef.current;
    const column = roomColumnRefs.current.get(roomId);
    if (!container || !column) return;
    container.scrollTo({ left: column.offsetLeft - TIME_GUTTER_WIDTH_PX, behavior: "smooth" });
  }

  const hasScrolledToInitialRoom = useRef(false);
  useEffect(() => {
    if (hasScrolledToInitialRoom.current || !initialRoomId) return;
    const container = scrollRef.current;
    const column = roomColumnRefs.current.get(initialRoomId);
    if (!container || !column) return;
    container.scrollTo({ left: column.offsetLeft - TIME_GUTTER_WIDTH_PX });
    hasScrolledToInitialRoom.current = true;
  }, [initialRoomId, visibleRooms]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    function updateEdges() {
      if (!el) return;
      setCanScrollLeft(el.scrollLeft > 0);
      setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 1);
    }

    updateEdges();
    el.addEventListener("scroll", updateEdges);
    window.addEventListener("resize", updateEdges);
    return () => {
      el.removeEventListener("scroll", updateEdges);
      window.removeEventListener("resize", updateEdges);
    };
  }, [visibleRooms.length]);

  const router = useRouter();

  const dragRef = useRef<ActiveDrag | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [renderDrag, setRenderDrag] = useState<ActiveDrag | null>(null);
  const [dragConflict, setDragConflict] = useState<{ roomId: string; top: number; height: number } | null>(null);
  const dragConflictTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function dragRangeFor(anchorPx: number, currentPx: number) {
    const top = Math.min(anchorPx, currentPx);
    const bottom = Math.max(anchorPx, currentPx);
    const startTime = timeForOffset(top);
    let endTime = timeForOffset(bottom);
    if (endTime === startTime) {
      endTime = minutesToTime(timeToMinutes(startTime) + BOOKING_TIME_STEP_MINUTES);
    }
    return { startTime, endTime };
  }

  function handleRoomMouseDown(event: ReactMouseEvent<HTMLDivElement>, roomId: string) {
    if (event.button !== 0) return;
    if ((event.target as HTMLElement).closest("button")) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const offsetPx = clamp(event.clientY - rect.top, 0, gridHeight);
    const next: ActiveDrag = { roomId, columnTop: rect.top, anchorPx: offsetPx, currentPx: offsetPx };
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
      const offsetPx = clamp(event.clientY - current.columnTop, 0, gridHeight);
      const next = { ...current, currentPx: offsetPx };
      dragRef.current = next;
      setRenderDrag(next);
    }

    function handleMouseUp() {
      setIsDragging(false);
      const finished = dragRef.current;
      dragRef.current = null;
      setRenderDrag(null);
      if (!finished) return;

      const { startTime, endTime } = dragRangeFor(finished.anchorPx, finished.currentPx);
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
        setDragConflict({
          roomId: finished.roomId,
          top: offsetForTime(startTime),
          height: Math.max(offsetForTime(endTime) - offsetForTime(startTime), 22),
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
  }, [isDragging, gridHeight, bookingsByRoom, date, router]);

  useEffect(() => {
    return () => {
      if (dragConflictTimeoutRef.current) clearTimeout(dragConflictTimeoutRef.current);
    };
  }, []);

  if (rooms.length === 0) {
    return (
      <div className="hidden w-full min-w-0 lg:block">
        <EmptyState
          title="No rooms available"
          description="Rooms will appear here once they're added."
        />
      </div>
    );
  }

  return (
    <div className="relative hidden w-full min-w-0 lg:block">
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <RoomQuickJump rooms={visibleRooms} onJump={scrollToRoom} />
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
        ref={scrollRef}
        data-schedule-grid
        onKeyDown={handleScheduleGridKeyDown}
        className="w-full min-w-0 overflow-auto rounded-lg border border-line bg-surface"
      >
        <div
          key={date}
          className={cn("grid", dayTransitionClassName(transitionDirection))}
          style={{
            gridTemplateColumns: `${TIME_GUTTER_WIDTH_PX}px repeat(${visibleRooms.length}, minmax(${ROOM_COLUMN_WIDTH_PX}px, 1fr))`,
          }}
        >
          {hasBuildingGroups && (
            <>
              <div
                style={{ height: GROUP_HEADER_HEIGHT_PX }}
                className="sticky top-0 left-0 z-30 border-r border-b border-line bg-surface"
              />
              {buildingGroups.map((group, index) => (
                <div
                  key={index}
                  title={group.building ?? "Other"}
                  style={{ gridColumn: `span ${group.count}`, height: GROUP_HEADER_HEIGHT_PX }}
                  className="sticky top-0 z-20 truncate border-b border-line bg-sand-50 px-3 py-1 text-caption font-medium text-ink-500"
                >
                  {group.building ?? "Other"}
                </div>
              ))}
            </>
          )}

          <div
            style={{ top: headerTopOffset }}
            className="sticky left-0 z-20 border-r border-b border-line bg-surface"
          />
          {visibleRooms.map((room) => {
            const isFavorite = favoriteRoomIds.has(room.id);
            return (
              <div
                key={room.id}
                ref={(el) => {
                  if (el) roomColumnRefs.current.set(room.id, el);
                  else roomColumnRefs.current.delete(room.id);
                }}
                title={room.name}
                style={{ top: headerTopOffset }}
                className="sticky z-10 flex items-center justify-between gap-1 truncate border-b border-line bg-surface px-2 py-1 font-display text-small text-ink-900"
              >
                <span className="truncate">{room.name}</span>
                <IconButton
                  label={isFavorite ? `Unpin ${room.name}` : `Pin ${room.name}`}
                  tooltip={isFavorite ? "Unpin room" : "Pin room"}
                  variant="ghost"
                  size="sm"
                  className={cn("size-6", isFavorite && "text-sky-600")}
                  onClick={() => onToggleFavorite(room.id)}
                >
                  {isFavorite ? <Pin className="fill-current" /> : <PinOff />}
                </IconButton>
              </div>
            );
          })}

          <div aria-hidden="true" className="sticky left-0 z-10 bg-sand-100" style={{ height: OFF_HOURS_BAND_PX }} />
          {visibleRooms.map((room) => (
            <div key={`${room.id}-off-top`} aria-hidden="true" className="bg-sand-100" style={{ height: OFF_HOURS_BAND_PX }} />
          ))}

          <div className="sticky left-0 z-10 bg-surface relative">
            {hours.map((hour, index) => (
              <div
                key={hour}
                style={{ height: HOUR_ROW_HEIGHT_PX }}
                className={cn(
                  "flex items-start justify-end whitespace-nowrap border-r border-line px-2 pt-1 font-mono text-caption text-ink-500",
                  index < hours.length - 1 && "border-b border-line/60"
                )}
              >
                {formatHourLabel(hour)}
              </div>
            ))}
            <NowLine date={date} />
          </div>

          {visibleRooms.map((room, roomIndex) => {
            const roomBookings = laidOutBookingsByRoom.get(room.id) ?? [];
            const drag = isDragging && renderDrag?.roomId === room.id ? renderDrag : null;
            const conflict = dragConflict?.roomId === room.id ? dragConflict : null;
            return (
              <div
                key={room.id}
                className="relative cursor-crosshair border-r border-line/60 last:border-r-0"
                style={{ height: gridHeight }}
                onMouseDown={(event) => handleRoomMouseDown(event, room.id)}
              >
                {hours.slice(0, -1).map((hour, index) => (
                  <div
                    key={hour}
                    style={{ top: index * HOUR_ROW_HEIGHT_PX, height: HOUR_ROW_HEIGHT_PX }}
                    className="absolute inset-x-0 border-b border-line/60"
                  />
                ))}

                <NowLine date={date} showDot={false} />

                {roomBookings.map(({ event: booking, columnIndex, columnCount }) => {
                  const top = offsetForTime(booking.start_time);
                  const bottom = offsetForTime(booking.end_time);
                  const height = Math.max(bottom - top, 22);
                  return (
                    <EventBlock
                      key={booking.id}
                      id={booking.id}
                      roomName={room.name}
                      startTime={booking.start_time}
                      endTime={booking.end_time}
                      status={booking.status}
                      roomIndex={roomIndex}
                      top={top}
                      height={height}
                      columnIndex={columnIndex}
                      columnCount={columnCount}
                    />
                  );
                })}

                {drag ? (
                  (() => {
                    const { startTime, endTime } = dragRangeFor(drag.anchorPx, drag.currentPx);
                    const top = Math.min(drag.anchorPx, drag.currentPx);
                    const height = Math.max(Math.abs(drag.currentPx - drag.anchorPx), 4);
                    return (
                      <DragCreateOverlay
                        top={top}
                        height={height}
                        label={`${formatTimeLabel(startTime)} – ${formatTimeLabel(endTime)}`}
                      />
                    );
                  })()
                ) : null}

                {conflict ? (
                  <DragCreateOverlay top={conflict.top} height={conflict.height} label="Overlaps an existing booking" conflict />
                ) : null}
              </div>
            );
          })}

          <div aria-hidden="true" className="sticky left-0 z-10 bg-sand-100" style={{ height: OFF_HOURS_BAND_PX }} />
          {visibleRooms.map((room) => (
            <div key={`${room.id}-off-bottom`} aria-hidden="true" className="bg-sand-100" style={{ height: OFF_HOURS_BAND_PX }} />
          ))}
        </div>
      </div>
      )}

      {canScrollLeft ? (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 left-0 w-8 bg-gradient-to-r from-surface to-transparent"
        />
      ) : null}
      {canScrollRight ? (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-surface to-transparent"
        />
      ) : null}

      {error ? (
        <ErrorState className="mt-2" description={error} />
      ) : loading ? (
        <div className="mt-2">
          <LoadingState variant="rows" count={3} />
        </div>
      ) : null}
    </div>
  );
}
