"use client";

import { useEffect, useMemo, useRef, useState, type TouchEvent } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { IconButton } from "@/components/kit/icon-button";
import { Select } from "@/components/kit/select";
import { StatusBadge } from "@/components/kit/status-badge";
import type { BookingStatus } from "@/lib/bookings/conflict-check";
import { addDays, formatDateLabel, formatTimeLabel, timeToMinutes, todayDateString } from "@/lib/dates";
import { SCHEDULE_END_HOUR, SCHEDULE_START_HOUR } from "@/lib/schedule/hours";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

export interface ScheduleRoom {
  id: string;
  name: string;
}

interface DayBooking {
  id: string;
  room_id: string;
  date: string;
  start_time: string;
  end_time: string;
  status: BookingStatus;
}

/** Row height for one hour, per UI-Redesign-Spec section 3 ("~56px tall"). */
const HOUR_ROW_HEIGHT_PX = 56;
/** Minimum horizontal drag (px) before a touch gesture counts as a day-changing swipe. */
const SWIPE_THRESHOLD_PX = 50;

const RANGE_START_MINUTES = SCHEDULE_START_HOUR * 60;
const RANGE_END_MINUTES = SCHEDULE_END_HOUR * 60;

function formatHourLabel(hour: number): string {
  const period = hour >= 12 ? "PM" : "AM";
  const displayHour = hour % 12 === 0 ? 12 : hour % 12;
  return `${displayHour} ${period}`;
}

/** Vertical offset (px) of a "HH:MM:SS" time within the grid, clamped to the visible range. */
function offsetForTime(time: string): number {
  const minutes = Math.min(Math.max(timeToMinutes(time), RANGE_START_MINUTES), RANGE_END_MINUTES);
  return ((minutes - RANGE_START_MINUTES) / 60) * HOUR_ROW_HEIGHT_PX;
}

/**
 * Mobile single-room resource-day calendar (US-027 baseline): a room selector,
 * an hour axis down the side, and that room's bookings as full-width blocks
 * for the selected day. Swipe or the arrow buttons change the day.
 */
export function MobileDayCalendar({ rooms }: { rooms: ScheduleRoom[] }) {
  const supabase = useMemo(() => createClient(), []);
  const [roomId, setRoomId] = useState<string | null>(rooms[0]?.id ?? null);
  const [date, setDate] = useState(() => todayDateString());
  const [bookings, setBookings] = useState<DayBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  const hours = useMemo(
    () => Array.from({ length: SCHEDULE_END_HOUR - SCHEDULE_START_HOUR + 1 }, (_, i) => SCHEDULE_START_HOUR + i),
    []
  );
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
      setDate((current) => addDays(current, -1));
    } else if (deltaX < -SWIPE_THRESHOLD_PX) {
      setDate((current) => addDays(current, 1));
    }
  }

  const roomOptions = useMemo(() => rooms.map((room) => ({ value: room.id, label: room.name })), [rooms]);

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

      <div className="flex items-center justify-between gap-2">
        <IconButton label="Previous day" onClick={() => setDate((current) => addDays(current, -1))}>
          <ChevronLeft aria-hidden="true" />
        </IconButton>
        <p className="font-display text-h3 text-ink-900">{formatDateLabel(date)}</p>
        <IconButton label="Next day" onClick={() => setDate((current) => addDays(current, 1))}>
          <ChevronRight aria-hidden="true" />
        </IconButton>
      </div>

      {error ? (
        <p role="alert" className="text-small text-status-rejected-fg">
          {error}
        </p>
      ) : null}

      {!roomId ? (
        <p className="text-small text-ink-500">No rooms available.</p>
      ) : (
        <div
          className="w-full min-w-0 touch-pan-y rounded-lg border border-line bg-surface"
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

              {loading ? (
                <p className="p-3 text-small text-ink-500">Loading…</p>
              ) : bookings.length === 0 ? (
                <p className="p-3 text-small text-ink-500">No bookings for this day.</p>
              ) : (
                bookings.map((booking) => {
                  const top = offsetForTime(booking.start_time);
                  const bottom = offsetForTime(booking.end_time);
                  const height = Math.max(bottom - top, 22);
                  return (
                    <div
                      key={booking.id}
                      style={{ top, height }}
                      className="absolute inset-x-1 flex flex-col justify-center gap-1 overflow-hidden rounded-md border-l-4 border-sky-600 bg-sky-50 px-2 py-1"
                    >
                      <span className="truncate font-mono text-caption text-ink-900">
                        {formatTimeLabel(booking.start_time)} – {formatTimeLabel(booking.end_time)}
                      </span>
                      <StatusBadge status={booking.status} />
                    </div>
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
