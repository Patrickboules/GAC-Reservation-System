"use client";

import { Pin, PinOff } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

import { EmptyState } from "@/components/kit/empty-state";
import { ErrorState } from "@/components/kit/error-state";
import { IconButton } from "@/components/kit/icon-button";
import { LoadingState } from "@/components/kit/loading-state";
import { Select } from "@/components/kit/select";
import { findConflictingBookings, type BookingStatus } from "@/lib/bookings/conflict-check";
import { BOOKING_TIME_STEP_MINUTES } from "@/lib/bookings/time-granularity";
import { addDays, formatTimeLabel, minutesToTime, normalizeTimeString, timeToMinutes } from "@/lib/dates";
import type { ScheduleRoom } from "@/lib/rooms-filters";
import { dayTransitionClassName, useDayTransitionDirection } from "@/lib/schedule/day-transition";
import { layoutOverlappingEvents } from "@/lib/schedule/event-layout";
import {
  formatHourLabel,
  HOUR_ROW_HEIGHT_PX,
  offsetForTime,
  scheduleHours,
  timeForOffset,
} from "@/lib/schedule/hours";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

import { DragCreateOverlay } from "./drag-create-overlay";
import { EventBlock } from "./event-block";
import { NowLine } from "./now-line";

export type { ScheduleRoom };

interface DayBooking {
  id: string;
  room_id: string;
  date: string;
  start_time: string;
  end_time: string;
  status: BookingStatus;
}

/** Minimum horizontal drag (px) before a touch gesture counts as a day-changing swipe. */
const SWIPE_THRESHOLD_PX = 50;

/** Minimum movement (px) before a pending touch commits to a swipe or a drag-to-create gesture (US-036). */
const GESTURE_COMMIT_THRESHOLD_PX = 10;

/** How long a post-drop conflict warning stays visible before fading (US-036). */
const DRAG_CONFLICT_DISPLAY_MS = 3000;

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

interface TouchGestureState {
  startX: number;
  startY: number;
  columnTop: number;
  gesture: "pending" | "swipe" | "drag";
}

interface MobileDayCalendarProps {
  rooms: ScheduleRoom[];
  date: string;
  onDateChange: (date: string) => void;
  favoriteRoomIds: ReadonlySet<string>;
  onToggleFavorite: (roomId: string) => void;
  /** Pre-selects this room on first render, e.g. from the global availability search (US-039). */
  initialRoomId?: string;
}

/**
 * Mobile single-room resource-day calendar (US-027 baseline): a room selector,
 * an hour axis down the side, and that room's bookings as full-width blocks
 * for the selected day. Swipe or the day strip (US-029) change the day.
 * `rooms` is expected pre-ordered by the caller (sortRoomsByFavorite, US-034)
 * so pinned rooms sort first in the selector.
 */
export function MobileDayCalendar({
  rooms,
  date,
  onDateChange,
  favoriteRoomIds,
  onToggleFavorite,
  initialRoomId,
}: MobileDayCalendarProps) {
  const supabase = useMemo(() => createClient(), []);
  const [roomId, setRoomId] = useState<string | null>(
    () => rooms.find((room) => room.id === initialRoomId)?.id ?? rooms[0]?.id ?? null
  );
  const [bookings, setBookings] = useState<DayBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (roomId && !rooms.some((room) => room.id === roomId)) {
      setRoomId(rooms[0]?.id ?? null);
    }
  }, [rooms, roomId]);

  useEffect(() => {
    if (!roomId) {
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
      .eq("room_id", roomId)
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
  }, [supabase, roomId, date]);

  const hours = useMemo(() => scheduleHours(), []);
  const gridHeight = (hours.length - 1) * HOUR_ROW_HEIGHT_PX;

  const router = useRouter();
  const gridContentRef = useRef<HTMLDivElement>(null);
  const touchStateRef = useRef<TouchGestureState | null>(null);
  const [dragBox, setDragBox] = useState<{ top: number; height: number } | null>(null);
  const [dragConflict, setDragConflict] = useState<{ top: number; height: number } | null>(null);
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

  useEffect(() => {
    const el = gridContentRef.current;
    if (!el || !roomId) return;
    const activeRoomId = roomId;

    function handleTouchStart(event: globalThis.TouchEvent) {
      if ((event.target as HTMLElement).closest("button")) return;
      const touch = event.touches[0];
      if (!touch || !el) return;
      const rect = el.getBoundingClientRect();
      touchStateRef.current = { startX: touch.clientX, startY: touch.clientY, columnTop: rect.top, gesture: "pending" };
    }

    function handleTouchMove(event: globalThis.TouchEvent) {
      const state = touchStateRef.current;
      if (!state) return;
      const touch = event.touches[0];
      if (!touch) return;
      const deltaX = touch.clientX - state.startX;
      const deltaY = touch.clientY - state.startY;

      if (state.gesture === "pending") {
        if (Math.abs(deltaX) < GESTURE_COMMIT_THRESHOLD_PX && Math.abs(deltaY) < GESTURE_COMMIT_THRESHOLD_PX) return;
        state.gesture = Math.abs(deltaY) > Math.abs(deltaX) ? "drag" : "swipe";
        if (state.gesture === "drag") setDragConflict(null);
      }

      if (state.gesture === "drag") {
        event.preventDefault();
        const anchorPx = clamp(state.startY - state.columnTop, 0, gridHeight);
        const currentPx = clamp(touch.clientY - state.columnTop, 0, gridHeight);
        setDragBox({ top: Math.min(anchorPx, currentPx), height: Math.max(Math.abs(currentPx - anchorPx), 4) });
      }
    }

    function handleTouchEnd(event: globalThis.TouchEvent) {
      const state = touchStateRef.current;
      touchStateRef.current = null;
      setDragBox(null);
      if (!state) return;

      if (state.gesture === "swipe") {
        const touch = event.changedTouches[0];
        const deltaX = touch ? touch.clientX - state.startX : 0;
        if (deltaX > SWIPE_THRESHOLD_PX) {
          onDateChange(addDays(date, -1));
        } else if (deltaX < -SWIPE_THRESHOLD_PX) {
          onDateChange(addDays(date, 1));
        }
        return;
      }

      if (state.gesture !== "drag") return;

      const touch = event.changedTouches[0];
      const anchorPx = clamp(state.startY - state.columnTop, 0, gridHeight);
      const currentPx = touch ? clamp(touch.clientY - state.columnTop, 0, gridHeight) : anchorPx;
      const { startTime, endTime } = dragRangeFor(anchorPx, currentPx);
      const conflicts = findConflictingBookings(
        { room_id: activeRoomId, date, start_time: normalizeTimeString(startTime), end_time: normalizeTimeString(endTime) },
        bookings
      );

      if (conflicts.length > 0) {
        if (dragConflictTimeoutRef.current) clearTimeout(dragConflictTimeoutRef.current);
        setDragConflict({
          top: offsetForTime(startTime),
          height: Math.max(offsetForTime(endTime) - offsetForTime(startTime), 22),
        });
        dragConflictTimeoutRef.current = setTimeout(() => setDragConflict(null), DRAG_CONFLICT_DISPLAY_MS);
        return;
      }

      router.push(`/bookings/new?room=${activeRoomId}&date=${date}&start=${startTime}&end=${endTime}`);
    }

    el.addEventListener("touchstart", handleTouchStart, { passive: true });
    el.addEventListener("touchmove", handleTouchMove, { passive: false });
    el.addEventListener("touchend", handleTouchEnd, { passive: true });
    return () => {
      el.removeEventListener("touchstart", handleTouchStart);
      el.removeEventListener("touchmove", handleTouchMove);
      el.removeEventListener("touchend", handleTouchEnd);
    };
  }, [date, gridHeight, roomId, bookings, onDateChange, router]);

  useEffect(() => {
    return () => {
      if (dragConflictTimeoutRef.current) clearTimeout(dragConflictTimeoutRef.current);
    };
  }, []);

  const transitionDirection = useDayTransitionDirection(date);

  const roomOptions = useMemo(
    () =>
      rooms.map((room) => ({
        value: room.id,
        label: favoriteRoomIds.has(room.id) ? (
          <span className="flex items-center gap-1.5">
            <Pin aria-hidden="true" className="size-3.5 shrink-0 fill-sky-600 text-sky-600" />
            {room.name}
          </span>
        ) : (
          room.name
        ),
      })),
    [rooms, favoriteRoomIds]
  );
  const selectedRoomName = rooms.find((room) => room.id === roomId)?.name ?? "Room";
  const laidOutBookings = useMemo(() => layoutOverlappingEvents(bookings), [bookings]);
  const selectedRoomIsFavorite = roomId ? favoriteRoomIds.has(roomId) : false;

  return (
    <div className="flex w-full min-w-0 flex-col gap-3 lg:hidden">
      <div className="flex items-end gap-2">
        <Select
          label="Room"
          placeholder="Select a room"
          options={roomOptions}
          value={roomId}
          onValueChange={(value) => setRoomId(value)}
          disabled={rooms.length === 0}
          wrapperClassName="flex-1"
        />
        <IconButton
          label={selectedRoomIsFavorite ? `Unpin ${selectedRoomName}` : `Pin ${selectedRoomName}`}
          tooltip={selectedRoomIsFavorite ? "Unpin room" : "Pin room"}
          variant={selectedRoomIsFavorite ? "primary" : "secondary"}
          disabled={!roomId}
          onClick={() => roomId && onToggleFavorite(roomId)}
        >
          {selectedRoomIsFavorite ? <Pin className="fill-current" /> : <PinOff />}
        </IconButton>
      </div>

      {!roomId ? (
        <EmptyState
          title="No rooms available"
          description="Rooms will appear here once they're added."
        />
      ) : (
        <div
          key={date}
          className={cn(
            "w-full min-w-0 rounded-lg border border-line bg-surface",
            dayTransitionClassName(transitionDirection)
          )}
        >
          <div aria-hidden="true" className="h-6 w-full rounded-t-lg bg-sand-100" />

          <div className="flex w-full min-w-0">
            <div className="w-14 shrink-0 border-r border-line">
              {hours.map((hour, index) => (
                <div
                  key={hour}
                  style={{ height: HOUR_ROW_HEIGHT_PX }}
                  className={cn(
                    "flex items-start justify-end px-2 pt-1 font-mono text-caption text-ink-500",
                    index < hours.length - 1 && "border-b border-line/60"
                  )}
                >
                  {formatHourLabel(hour)}
                </div>
              ))}
            </div>

            <div
              ref={gridContentRef}
              className="relative min-w-0 flex-1 touch-pan-y"
              style={{ height: gridHeight }}
            >
              {hours.slice(0, -1).map((hour, index) => (
                <div
                  key={hour}
                  style={{ top: index * HOUR_ROW_HEIGHT_PX, height: HOUR_ROW_HEIGHT_PX }}
                  className="absolute inset-x-0 border-b border-line/60"
                />
              ))}

              <NowLine date={date} />

              {dragBox ? (
                (() => {
                  const { startTime, endTime } = dragRangeFor(dragBox.top, dragBox.top + dragBox.height);
                  return (
                    <DragCreateOverlay
                      top={dragBox.top}
                      height={dragBox.height}
                      label={`${formatTimeLabel(startTime)} – ${formatTimeLabel(endTime)}`}
                    />
                  );
                })()
              ) : null}

              {dragConflict ? (
                <DragCreateOverlay top={dragConflict.top} height={dragConflict.height} label="Overlaps an existing booking" conflict />
              ) : null}

              {error ? (
                <div className="p-3">
                  <ErrorState description={error} />
                </div>
              ) : loading ? (
                <div className="p-3">
                  <LoadingState variant="list" count={3} />
                </div>
              ) : bookings.length === 0 ? (
                <div className="p-3">
                  <EmptyState title="No bookings" description="No bookings for this day." />
                </div>
              ) : (
                laidOutBookings.map(({ event: booking, columnIndex, columnCount }) => {
                  const top = offsetForTime(booking.start_time);
                  const bottom = offsetForTime(booking.end_time);
                  const height = Math.max(bottom - top, 22);
                  return (
                    <EventBlock
                      key={booking.id}
                      id={booking.id}
                      roomName={selectedRoomName}
                      startTime={booking.start_time}
                      endTime={booking.end_time}
                      status={booking.status}
                      top={top}
                      height={height}
                      columnIndex={columnIndex}
                      columnCount={columnCount}
                    />
                  );
                })
              )}
            </div>
          </div>

          <div aria-hidden="true" className="h-6 w-full rounded-b-lg bg-sand-100" />
        </div>
      )}
    </div>
  );
}
