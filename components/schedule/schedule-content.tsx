"use client";

import { useMemo, useState } from "react";

import { DayStrip } from "@/components/schedule/day-strip";
import { RoomFilterBar } from "@/components/schedule/room-filter-bar";
import { TimelineGrid, type DayBooking } from "@/components/schedule/timeline-grid";
import { resolveDateOrToday } from "@/lib/dates";
import {
  EMPTY_ROOM_FILTERS,
  roomMatchesFilters,
  type RoomFilterState,
  type ScheduleRoom,
} from "@/lib/rooms-filters";

interface ScheduleContentProps {
  rooms: ScheduleRoom[];
  /** Pre-fills the selected day, e.g. from the global availability search (US-039). */
  initialDate?: string;
  /** Accepted for URL compatibility with the availability search (US-039); the unified grid shows every room, so there's nothing to scroll to. */
  initialRoomId?: string;
  /** Server-fetched bookings for the resolved `initialDate`, seeded into
   * TimelineGrid so the first paint doesn't need its own client fetch
   * (see app/(app)/schedule/page.tsx). */
  initialBookings: DayBooking[];
}

/** Owns the selected day and room filters so the day strip and the timeline grid stay in sync. */
export function ScheduleContent({
  rooms,
  initialDate,
  initialBookings,
}: ScheduleContentProps) {
  const [initialBookingsDate] = useState(() => resolveDateOrToday(initialDate));
  const [date, setDate] = useState(initialBookingsDate);
  const [filters, setFilters] = useState<RoomFilterState>(EMPTY_ROOM_FILTERS);

  const filteredRooms = useMemo(
    () => rooms.filter((room) => roomMatchesFilters(room, filters)),
    [rooms, filters]
  );

  return (
    <div className="flex w-full min-w-0 flex-col gap-4">
      <RoomFilterBar rooms={rooms} filters={filters} onFiltersChange={setFilters} />
      <DayStrip date={date} onDateChange={setDate} />
      <TimelineGrid
        rooms={filteredRooms}
        date={date}
        initialBookings={initialBookings}
        initialBookingsDate={initialBookingsDate}
      />
    </div>
  );
}
