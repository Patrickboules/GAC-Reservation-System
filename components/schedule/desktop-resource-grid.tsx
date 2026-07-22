"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { StatusBadge } from "@/components/kit/status-badge";
import type { BookingStatus } from "@/lib/bookings/conflict-check";
import { formatTimeLabel } from "@/lib/dates";
import { dayTransitionClassName, useDayTransitionDirection } from "@/lib/schedule/day-transition";
import { formatHourLabel, HOUR_ROW_HEIGHT_PX, offsetForTime, scheduleHours } from "@/lib/schedule/hours";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

import { NowLine } from "./now-line";

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

const ROOM_COLUMN_WIDTH_PX = 132;
const TIME_GUTTER_WIDTH_PX = 64;
const OFF_HOURS_BAND_PX = 24;

/**
 * Desktop multi-room resource-day calendar (US-028 baseline): rooms as
 * horizontally scrollable columns under a sticky room-header row, with a
 * sticky time gutter down the left. Shares the mobile view's hour range,
 * row height, and off-hours styling (lib/schedule/hours.ts).
 */
export function DesktopResourceGrid({ rooms, date }: { rooms: ScheduleRoom[]; date: string }) {
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
    const map = new Map<string, DayBooking[]>();
    for (const booking of bookings) {
      const existing = map.get(booking.room_id);
      if (existing) {
        existing.push(booking);
      } else {
        map.set(booking.room_id, [booking]);
      }
    }
    return map;
  }, [bookings]);

  const hours = useMemo(() => scheduleHours(), []);
  const gridHeight = (hours.length - 1) * HOUR_ROW_HEIGHT_PX;
  const transitionDirection = useDayTransitionDirection(date);

  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

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
  }, [rooms.length]);

  if (rooms.length === 0) {
    return (
      <div className="hidden w-full min-w-0 lg:block">
        <p className="text-small text-ink-500">No rooms available.</p>
      </div>
    );
  }

  return (
    <div className="relative hidden w-full min-w-0 lg:block">
      <div ref={scrollRef} className="w-full min-w-0 overflow-auto rounded-lg border border-line bg-surface">
        <div
          key={date}
          className={cn("grid", dayTransitionClassName(transitionDirection))}
          style={{
            gridTemplateColumns: `${TIME_GUTTER_WIDTH_PX}px repeat(${rooms.length}, minmax(${ROOM_COLUMN_WIDTH_PX}px, 1fr))`,
          }}
        >
          <div className="sticky top-0 left-0 z-20 border-r border-b border-line bg-surface" />
          {rooms.map((room) => (
            <div
              key={room.id}
              title={room.name}
              className="sticky top-0 z-10 truncate border-b border-line bg-surface px-3 py-2 font-display text-small text-ink-900"
            >
              {room.name}
            </div>
          ))}

          <div aria-hidden="true" className="sticky left-0 z-10 bg-sand-100" style={{ height: OFF_HOURS_BAND_PX }} />
          {rooms.map((room) => (
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

          {rooms.map((room) => {
            const roomBookings = bookingsByRoom.get(room.id) ?? [];
            return (
              <div key={room.id} className="relative border-r border-line/60 last:border-r-0" style={{ height: gridHeight }}>
                {hours.slice(0, -1).map((hour, index) => (
                  <div
                    key={hour}
                    style={{ top: index * HOUR_ROW_HEIGHT_PX, height: HOUR_ROW_HEIGHT_PX }}
                    className="absolute inset-x-0 border-b border-line/60"
                  />
                ))}

                <NowLine date={date} showDot={false} />

                {roomBookings.map((booking) => {
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
                        {formatTimeLabel(booking.start_time)}–{formatTimeLabel(booking.end_time)}
                      </span>
                      <StatusBadge status={booking.status} />
                    </div>
                  );
                })}
              </div>
            );
          })}

          <div aria-hidden="true" className="sticky left-0 z-10 bg-sand-100" style={{ height: OFF_HOURS_BAND_PX }} />
          {rooms.map((room) => (
            <div key={`${room.id}-off-bottom`} aria-hidden="true" className="bg-sand-100" style={{ height: OFF_HOURS_BAND_PX }} />
          ))}
        </div>
      </div>

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
        <p role="alert" className="mt-2 text-small text-status-rejected-fg">
          {error}
        </p>
      ) : null}
      {loading ? <p className="mt-2 text-small text-ink-500">Loading…</p> : null}
    </div>
  );
}
