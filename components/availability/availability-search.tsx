"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { Button } from "@/components/kit/button";
import { Card } from "@/components/kit/card";
import { DatePicker } from "@/components/kit/date-picker";
import { EmptyState } from "@/components/kit/empty-state";
import { ErrorState } from "@/components/kit/error-state";
import { Input } from "@/components/kit/input";
import { LoadingState } from "@/components/kit/loading-state";
import { StatusBadge } from "@/components/kit/status-badge";
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

  const [date, setDate] = useState<string | null>(() => todayDateString());
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
        <DatePicker label="Date" mode="popover" value={date} onValueChange={setDate} />
        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Start time"
            type="time"
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
            required
          />
          <Input
            label="End time"
            type="time"
            value={endTime}
            onChange={(e) => setEndTime(e.target.value)}
            required
          />
        </div>
        <Input
          label="Minimum capacity (optional)"
          type="number"
          min={1}
          inputMode="numeric"
          value={capacity}
          onChange={(e) => setCapacity(e.target.value)}
          placeholder="Any"
        />
        <Button type="submit" loading={loading}>
          Search
        </Button>
      </form>

      {error ? <ErrorState description={error} /> : null}

      {searched && loading ? (
        <LoadingState variant="cards" count={3} />
      ) : searched && !loading && !error ? (
        results.length === 0 ? (
          <EmptyState
            title="No rooms available"
            description="No rooms available for this time slot."
          />
        ) : (
          <ul className="flex flex-col gap-3">
            {results.map(({ room, pending }) => (
              <li key={room.id}>
                <Card interactive>
                  <div className="flex items-center justify-between gap-2">
                    <Link
                      href={`/rooms/${room.id}`}
                      className="text-body font-semibold text-ink-900 underline-offset-2 hover:underline"
                    >
                      {room.name}
                    </Link>
                    <StatusBadge
                      status={pending ? "pending" : "approved"}
                      label={pending ? "Requested — pending approval" : "Available"}
                      className="whitespace-nowrap"
                    />
                  </div>
                  <p className="mt-2 text-small text-ink-500">
                    Capacity: {formatRoomField(room.capacity)} · Location:{" "}
                    {formatRoomField(room.location)}
                  </p>
                </Card>
              </li>
            ))}
          </ul>
        )
      ) : null}
    </div>
  );
}
