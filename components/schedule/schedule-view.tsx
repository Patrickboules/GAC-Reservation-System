"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { BookingStatusBadge } from "@/components/schedule/booking-status-badge";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import {
  addDays,
  enumerateDates,
  formatDateLabel,
  formatTimeLabel,
  todayDateString,
} from "@/lib/dates";
import type { BookingStatus } from "@/lib/bookings/conflict-check";
import { createClient } from "@/lib/supabase/client";

export interface ScheduleRoom {
  id: string;
  name: string;
}

interface ScheduleBooking {
  id: string;
  room_id: string;
  date: string;
  start_time: string;
  end_time: string;
  status: BookingStatus;
}

const ALL_ROOMS = "all";

export function ScheduleView({ rooms }: { rooms: ScheduleRoom[] }) {
  const supabase = useMemo(() => createClient(), []);
  const roomsById = useMemo(() => new Map(rooms.map((r) => [r.id, r.name])), [rooms]);

  const [roomId, setRoomId] = useState<string>(ALL_ROOMS);
  const [startDate, setStartDate] = useState(() => todayDateString());
  const [endDate, setEndDate] = useState(() => addDays(todayDateString(), 6));
  const [bookings, setBookings] = useState<ScheduleBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!startDate || !endDate || startDate > endDate) {
      setBookings([]);
      setError(startDate && endDate ? "Start date must be before end date." : null);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    let query = supabase
      .from("bookings_schedule")
      .select("id, room_id, date, start_time, end_time, status")
      .gte("date", startDate)
      .lte("date", endDate)
      .order("date", { ascending: true })
      .order("start_time", { ascending: true });

    if (roomId !== ALL_ROOMS) {
      query = query.eq("room_id", roomId);
    }

    query.then(({ data, error: queryError }) => {
      if (cancelled) return;
      if (queryError) {
        setError(queryError.message);
        setBookings([]);
      } else {
        setBookings((data ?? []) as ScheduleBooking[]);
      }
      setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [supabase, roomId, startDate, endDate]);

  const dates = useMemo(
    () => (startDate && endDate && startDate <= endDate ? enumerateDates(startDate, endDate) : []),
    [startDate, endDate],
  );

  const bookingsByDate = useMemo(() => {
    const map = new Map<string, ScheduleBooking[]>();
    for (const booking of bookings) {
      const existing = map.get(booking.date);
      if (existing) {
        existing.push(booking);
      } else {
        map.set(booking.date, [booking]);
      }
    }
    return map;
  }, [bookings]);

  return (
    <div className="flex w-full min-w-0 flex-col gap-4">
      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="schedule-room">Room</Label>
          <Select value={roomId} onValueChange={(value) => setRoomId(value as string)}>
            <SelectTrigger id="schedule-room" className="w-full">
              <SelectValue>
                {(value: string) => (value === ALL_ROOMS ? "All rooms" : (roomsById.get(value) ?? "All rooms"))}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_ROOMS}>All rooms</SelectItem>
              {rooms.map((room) => (
                <SelectItem key={room.id} value={room.id}>
                  {room.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="schedule-start">From</Label>
            <Input
              id="schedule-start"
              type="date"
              value={startDate}
              max={endDate || undefined}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="schedule-end">To</Label>
            <Input
              id="schedule-end"
              type="date"
              value={endDate}
              min={startDate || undefined}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
        </div>
      </div>

      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}

      <Tabs defaultValue="calendar">
        <TabsList className="w-full">
          <TabsTrigger value="calendar">Calendar</TabsTrigger>
          <TabsTrigger value="list">List</TabsTrigger>
        </TabsList>

        <TabsContent value="calendar" className="mt-3">
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading schedule…</p>
          ) : (
            <div className="flex flex-col gap-3">
              {dates.map((date) => {
                const dayBookings = bookingsByDate.get(date) ?? [];
                return (
                  <div key={date} className="rounded-lg border p-3">
                    <p className="mb-2 text-sm font-medium">{formatDateLabel(date)}</p>
                    {dayBookings.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No bookings</p>
                    ) : (
                      <ul className="flex flex-col gap-2">
                        {dayBookings.map((booking) => (
                          <li
                            key={booking.id}
                            className="flex flex-wrap items-center justify-between gap-2 rounded-md bg-muted/50 px-2.5 py-2 text-sm"
                          >
                            <div className="flex min-w-0 flex-col">
                              <Link
                                href={`/rooms/${booking.room_id}`}
                                className="truncate font-medium underline-offset-2 hover:underline"
                              >
                                {roomsById.get(booking.room_id) ?? "Unknown room"}
                              </Link>
                              <span className="text-muted-foreground">
                                {formatTimeLabel(booking.start_time)} – {formatTimeLabel(booking.end_time)}
                              </span>
                            </div>
                            <BookingStatusBadge status={booking.status} />
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                );
              })}
              {dates.length === 0 ? (
                <p className="text-sm text-muted-foreground">Select a valid date range.</p>
              ) : null}
            </div>
          )}
        </TabsContent>

        <TabsContent value="list" className="mt-3">
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading schedule…</p>
          ) : bookings.length === 0 ? (
            <p className="text-sm text-muted-foreground">No bookings in this range.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {bookings.map((booking) => (
                <li
                  key={booking.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg border p-3 text-sm"
                >
                  <div className="flex min-w-0 flex-col">
                    <Link
                      href={`/rooms/${booking.room_id}`}
                      className="truncate font-medium underline-offset-2 hover:underline"
                    >
                      {roomsById.get(booking.room_id) ?? "Unknown room"}
                    </Link>
                    <span className="text-muted-foreground">
                      {formatDateLabel(booking.date)} · {formatTimeLabel(booking.start_time)} –{" "}
                      {formatTimeLabel(booking.end_time)}
                    </span>
                  </div>
                  <BookingStatusBadge status={booking.status} />
                </li>
              ))}
            </ul>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
