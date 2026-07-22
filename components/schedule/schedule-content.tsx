"use client";

import { useMemo, useState } from "react";

import { DayStrip } from "@/components/schedule/day-strip";
import { DesktopResourceGrid } from "@/components/schedule/desktop-resource-grid";
import { MobileDayCalendar } from "@/components/schedule/mobile-day-calendar";
import { RoomFilterBar } from "@/components/schedule/room-filter-bar";
import { todayDateString } from "@/lib/dates";
import {
  EMPTY_ROOM_FILTERS,
  groupRoomsByBuilding,
  roomMatchesFilters,
  type RoomFilterState,
  type ScheduleRoom,
} from "@/lib/rooms-filters";

/** Owns the selected day and room filters so the day strip and both calendar views stay in sync. */
export function ScheduleContent({ rooms }: { rooms: ScheduleRoom[] }) {
  const [date, setDate] = useState(() => todayDateString());
  const [filters, setFilters] = useState<RoomFilterState>(EMPTY_ROOM_FILTERS);

  const filteredRooms = useMemo(
    () => rooms.filter((room) => roomMatchesFilters(room, filters)),
    [rooms, filters]
  );
  const groupedRooms = useMemo(() => groupRoomsByBuilding(filteredRooms), [filteredRooms]);

  return (
    <div className="flex w-full min-w-0 flex-col gap-4">
      <RoomFilterBar rooms={rooms} filters={filters} onFiltersChange={setFilters} />
      <DayStrip date={date} onDateChange={setDate} />
      <MobileDayCalendar rooms={filteredRooms} date={date} onDateChange={setDate} />
      <DesktopResourceGrid rooms={groupedRooms} date={date} />
    </div>
  );
}
