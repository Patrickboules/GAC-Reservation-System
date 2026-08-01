"use client";

import { Search } from "lucide-react";
import { useMemo, useState } from "react";

import { DatePicker } from "@/components/kit/date-picker";
import { EmptyState } from "@/components/kit/empty-state";
import { ErrorState } from "@/components/kit/error-state";
import { FilterChip } from "@/components/kit/filter-chip";
import { LoadingState } from "@/components/kit/loading-state";
import { RoomCard, type RoomCardAvailability } from "@/components/kit/room-card";
import { TimeRangePicker } from "@/components/kit/time-range-picker";
import { findConflictingBookings, type BookingStatus } from "@/lib/bookings/conflict-check";
import { normalizeTimeString, todayDateString } from "@/lib/dates";
import { createClient } from "@/lib/supabase/client";

export interface GlobalSearchRoom {
  id: string;
  name: string;
  capacity: number | null;
  amenities: string[];
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

interface SearchResult {
  room: GlobalSearchRoom;
  availability: RoomCardAvailability;
}

function distinctAmenities(rooms: GlobalSearchRoom[]): string[] {
  return Array.from(new Set(rooms.flatMap((room) => room.amenities))).sort((a, b) =>
    a.localeCompare(b)
  );
}

/**
 * The top bar's search entry point (US-023): filters rooms by date, time
 * range, and optional amenities, reusing the shared
 * conflict-check utility (no duplicate overlap logic) to mark each result
 * free or busy. Results open the room's page, so search narrows the room
 * directory rather than acting as a second way to book.
 */
export function GlobalAvailabilitySearch({
  rooms,
  onResultSelect,
}: {
  rooms: GlobalSearchRoom[];
  /** Called when a result is clicked, e.g. so the caller can close the containing panel. */
  onResultSelect?: () => void;
}) {
  const supabase = useMemo(() => createClient(), []);
  const amenityOptions = useMemo(() => distinctAmenities(rooms), [rooms]);

  const [date, setDate] = useState<string | null>(() => todayDateString());
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("10:00");
  const [amenities, setAmenities] = useState<string[]>([]);

  const [searched, setSearched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<SearchResult[]>([]);

  function toggleAmenity(amenity: string, selected: boolean) {
    setAmenities((current) =>
      selected ? [...current, amenity] : current.filter((value) => value !== amenity)
    );
  }

  async function handleSearch() {
    if (!date) {
      setError("Pick a date to search.");
      return;
    }
    const start = normalizeTimeString(startTime);
    const end = normalizeTimeString(endTime);
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

    const nextResults: SearchResult[] = [];
    for (const room of rooms) {
      if (amenities.length > 0 && !amenities.every((amenity) => room.amenities.includes(amenity))) {
        continue;
      }

      const conflicts = findConflictingBookings(
        { room_id: room.id, date, start_time: start, end_time: end },
        bookingsForDate
      );

      if (conflicts.some((conflict) => conflict.status === "approved")) {
        continue;
      }

      nextResults.push({
        room,
        availability: conflicts.some((conflict) => conflict.status === "pending") ? "busy" : "free",
      });
    }

    setResults(nextResults);
    setLoading(false);
  }

  return (
    <div className="flex w-full min-w-0 flex-col gap-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-start">
        <DatePicker mode="popover" label="Date" value={date} onValueChange={setDate} />
        <TimeRangePicker
          startTime={startTime}
          endTime={endTime}
          onStartTimeChange={setStartTime}
          onEndTimeChange={setEndTime}
        />
      </div>

      {amenityOptions.length > 0 && (
        <div className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-ink-700">Amenities</span>
          <div className="flex flex-wrap gap-2">
            {amenityOptions.map((amenity) => (
              <FilterChip
                key={amenity}
                selected={amenities.includes(amenity)}
                onSelectedChange={(selected) => toggleAmenity(amenity, selected)}
              >
                {amenity}
              </FilterChip>
            ))}
          </div>
        </div>
      )}

      {error ? <ErrorState description={error} /> : null}

      <button
        type="button"
        onClick={() => void handleSearch()}
        disabled={loading}
        className="inline-flex h-10 w-full items-center justify-center gap-2 self-start rounded-md bg-sky-600 px-4 text-sm font-medium text-white outline-none transition-colors hover:bg-sky-700 focus-visible:ring-2 focus-visible:ring-sky-300 disabled:pointer-events-none disabled:opacity-50 sm:w-auto"
      >
        <Search aria-hidden="true" className="size-4" />
        {loading ? "Searching…" : "Search"}
      </button>

      {searched && loading ? (
        <LoadingState variant="cards" count={4} />
      ) : searched && !loading && !error ? (
        results.length === 0 ? (
          <EmptyState
            title="No rooms available"
            description="Try a different date, time range, or fewer filters."
          />
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {results.map(({ room, availability }) => (
              <RoomCard
                key={room.id}
                id={room.id}
                name={room.name}
                capacity={room.capacity}
                amenities={room.amenities}
                location={room.location}
                availability={availability}
                href={`/rooms/${room.id}`}
                onClick={onResultSelect}
              />
            ))}
          </div>
        )
      ) : null}
    </div>
  );
}
