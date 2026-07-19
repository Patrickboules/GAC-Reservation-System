"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { findConflictingBookings } from "@/lib/bookings/conflict-check";
import type { BookingStatus } from "@/lib/bookings/conflict-check";
import { formatRoomField } from "@/lib/rooms";
import { createClient } from "@/lib/supabase/client";
import { todayDateString } from "@/lib/dates";

export interface AvailabilityRoom {
  id: string;
  name: string;
  capacity: number | null;
  location: string | null;
}

interface ScheduleBooking {
  id: string;
  room_id: string;
  date: string;
  start_time: string;
  end_time: string;
  status: BookingStatus;
}

interface AvailabilityResult {
  room: AvailabilityRoom;
  pending: boolean;
}

/** <input type="time"> yields "HH:MM"; normalize to "HH:MM:SS" so string
 * comparisons against Postgres `time` values in conflict-check are exact. */
function normalizeTime(time: string): string {
  return time.length === 5 ? `${time}:00` : time;
}

export function AvailabilitySearch({ rooms }: { rooms: AvailabilityRoom[] }) {
  const supabase = useMemo(() => createClient(), []);

  const [date, setDate] = useState(() => todayDateString());
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [capacity, setCapacity] = useState("");

  const [searched, setSearched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<AvailabilityResult[]>([]);

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();

    if (!date || !startTime || !endTime) {
      setError("Date, start time, and end time are required.");
      return;
    }
    const start = normalizeTime(startTime);
    const end = normalizeTime(endTime);
    if (start >= end) {
      setError("End time must be after start time.");
      return;
    }

    setError(null);
    setLoading(true);
    setSearched(true);

    const { data, error: queryError } = await supabase
      .from("bookings_schedule")
      .select("id, room_id, date, start_time, end_time, status")
      .eq("date", date);

    if (queryError) {
      setError(queryError.message);
      setResults([]);
      setLoading(false);
      return;
    }

    const bookingsForDate = (data ?? []) as ScheduleBooking[];
    const minCapacity = capacity ? Number(capacity) : null;

    const nextResults: AvailabilityResult[] = [];
    for (const room of rooms) {
      if (minCapacity !== null && (room.capacity === null || room.capacity < minCapacity)) {
        continue;
      }

      const conflicts = findConflictingBookings(
        { room_id: room.id, date, start_time: start, end_time: end },
        bookingsForDate,
      );

      if (conflicts.some((c) => c.status === "approved")) {
        continue;
      }

      nextResults.push({ room, pending: conflicts.some((c) => c.status === "pending") });
    }

    setResults(nextResults);
    setLoading(false);
  }

  return (
    <div className="flex w-full min-w-0 flex-col gap-4">
      <form onSubmit={handleSearch} className="flex flex-col gap-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="availability-date">Date</Label>
          <Input
            id="availability-date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="availability-start">Start time</Label>
            <Input
              id="availability-start"
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              required
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="availability-end">End time</Label>
            <Input
              id="availability-end"
              type="time"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              required
            />
          </div>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="availability-capacity">Minimum capacity (optional)</Label>
          <Input
            id="availability-capacity"
            type="number"
            min={1}
            inputMode="numeric"
            value={capacity}
            onChange={(e) => setCapacity(e.target.value)}
            placeholder="Any"
          />
        </div>
        <Button type="submit" disabled={loading}>
          {loading ? "Searching…" : "Search"}
        </Button>
      </form>

      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}

      {searched && !loading && !error ? (
        results.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No rooms available for this time slot.
          </p>
        ) : (
          <ul className="flex flex-col gap-3">
            {results.map(({ room, pending }) => (
              <li key={room.id}>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between gap-2">
                    <CardTitle>
                      <Link
                        href={`/rooms/${room.id}`}
                        className="underline-offset-2 hover:underline"
                      >
                        {room.name}
                      </Link>
                    </CardTitle>
                    {pending ? (
                      <Badge
                        variant="outline"
                        className="border-amber-200 bg-amber-100 text-amber-800 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-300"
                      >
                        Requested — pending approval
                      </Badge>
                    ) : (
                      <Badge
                        variant="outline"
                        className="border-green-200 bg-green-100 text-green-800 dark:border-green-900 dark:bg-green-950 dark:text-green-300"
                      >
                        Available
                      </Badge>
                    )}
                  </CardHeader>
                  <CardContent className="text-sm text-muted-foreground">
                    Capacity: {formatRoomField(room.capacity)} · Location:{" "}
                    {formatRoomField(room.location)}
                  </CardContent>
                </Card>
              </li>
            ))}
          </ul>
        )
      ) : null}
    </div>
  );
}
