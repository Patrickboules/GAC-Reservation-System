"use client";

import { useEffect, useMemo, useRef, useState, type TouchEvent } from "react";

import { Select } from "@/components/kit/select";
import type { BookingStatus } from "@/lib/bookings/conflict-check";
import { addDays } from "@/lib/dates";
import type { ScheduleRoom } from "@/lib/rooms-filters";
import { dayTransitionClassName, useDayTransitionDirection } from "@/lib/schedule/day-transition";
import { layoutOverlappingEvents } from "@/lib/schedule/event-layout";
import { formatHourLabel, HOUR_ROW_HEIGHT_PX, offsetForTime, scheduleHours } from "@/lib/schedule/hours";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

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

interface MobileDayCalendarProps {
  rooms: ScheduleRoom[];
  date: string;
  onDateChange: (date: string) => void;
}

/**
 * Mobile single-room resource-day calendar (US-027 baseline): a room selector,
 * an hour axis down the side, and that room's bookings as full-width blocks
 * for the selected day. Swipe or the day strip (US-029) change the day.
 */
export function MobileDayCalendar({ rooms, date, onDateChange }: MobileDayCalendarProps) {
  const supabase = useMemo(() => createClient(), []);
  const [roomId, setRoomId] = useState<string | null>(rooms[0]?.id ?? null);
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

  const touchStartX = useRef<number | null>(null);

  function handleTouchStart(event: TouchEvent<HTMLDivElement>) {
    touchStartX.current = event.touches[0]?.clientX ?? null;
  }

  function handleTouchEnd(event: TouchEvent<HTMLDivElement>) {
    const startX = touchStartX.current;
    touchStartX.current = null;
    if (startX === null) return;

    const endX = event.changedTouches[0]?.clientX ?? startX;
    const deltaX = endX - startX;
    if (deltaX > SWIPE_THRESHOLD_PX) {
      onDateChange(addDays(date, -1));
    } else if (deltaX < -SWIPE_THRESHOLD_PX) {
      onDateChange(addDays(date, 1));
    }
  }

  const transitionDirection = useDayTransitionDirection(date);

  const roomOptions = useMemo(() => rooms.map((room) => ({ value: room.id, label: room.name })), [rooms]);
  const selectedRoomName = rooms.find((room) => room.id === roomId)?.name ?? "Room";
  const laidOutBookings = useMemo(() => layoutOverlappingEvents(bookings), [bookings]);

  return (
    <div className="flex w-full min-w-0 flex-col gap-3 lg:hidden">
      <Select
        label="Room"
        placeholder="Select a room"
        options={roomOptions}
        value={roomId}
        onValueChange={(value) => setRoomId(value)}
        disabled={rooms.length === 0}
      />

      {error ? (
        <p role="alert" className="text-small text-status-rejected-fg">
          {error}
        </p>
      ) : null}

      {!roomId ? (
        <p className="text-small text-ink-500">No rooms available.</p>
      ) : (
        <div
          key={date}
          className={cn(
            "w-full min-w-0 touch-pan-y rounded-lg border border-line bg-surface",
            dayTransitionClassName(transitionDirection)
          )}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
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

            <div className="relative min-w-0 flex-1" style={{ height: gridHeight }}>
              {hours.slice(0, -1).map((hour, index) => (
                <div
                  key={hour}
                  style={{ top: index * HOUR_ROW_HEIGHT_PX, height: HOUR_ROW_HEIGHT_PX }}
                  className="absolute inset-x-0 border-b border-line/60"
                />
              ))}

              <NowLine date={date} />

              {loading ? (
                <p className="p-3 text-small text-ink-500">Loading…</p>
              ) : bookings.length === 0 ? (
                <p className="p-3 text-small text-ink-500">No bookings for this day.</p>
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
