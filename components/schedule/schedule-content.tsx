"use client";

import { useMemo, useState } from "react";

import { toggleFavoriteRoom } from "@/app/(app)/schedule/actions";
import { useToast } from "@/components/kit/toast";
import { DayStrip } from "@/components/schedule/day-strip";
import { RoomFilterBar } from "@/components/schedule/room-filter-bar";
import { TimelineGrid } from "@/components/schedule/timeline-grid";
import { todayDateString } from "@/lib/dates";
import {
  EMPTY_ROOM_FILTERS,
  roomMatchesFilters,
  type RoomFilterState,
  type ScheduleRoom,
} from "@/lib/rooms-filters";

const DATE_STRING_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

interface ScheduleContentProps {
  rooms: ScheduleRoom[];
  initialFavoriteRoomIds: string[];
  /** Pre-fills the selected day, e.g. from the global availability search (US-039). */
  initialDate?: string;
  /** Accepted for URL compatibility with the availability search (US-039); the unified grid shows every room, so there's nothing to scroll to. */
  initialRoomId?: string;
  /** When false (signed-out visitor, US-007), drag-to-create routes through /login first. */
  authenticated: boolean;
}

/** Owns the selected day, room filters, and pinned rooms (US-034) so the day strip and the timeline grid stay in sync. */
export function ScheduleContent({
  rooms,
  initialFavoriteRoomIds,
  initialDate,
  authenticated,
}: ScheduleContentProps) {
  const toast = useToast();
  const [date, setDate] = useState(() =>
    initialDate && DATE_STRING_PATTERN.test(initialDate) ? initialDate : todayDateString()
  );
  const [filters, setFilters] = useState<RoomFilterState>(EMPTY_ROOM_FILTERS);
  const [favoriteRoomIds, setFavoriteRoomIds] = useState(() => new Set(initialFavoriteRoomIds));

  const filteredRooms = useMemo(
    () => rooms.filter((room) => roomMatchesFilters(room, filters)),
    [rooms, filters]
  );

  async function handleToggleFavorite(roomId: string) {
    const wasFavorite = favoriteRoomIds.has(roomId);
    setFavoriteRoomIds((current) => {
      const next = new Set(current);
      if (wasFavorite) {
        next.delete(roomId);
      } else {
        next.add(roomId);
      }
      return next;
    });

    try {
      await toggleFavoriteRoom(roomId, !wasFavorite);
    } catch {
      setFavoriteRoomIds((current) => {
        const next = new Set(current);
        if (wasFavorite) {
          next.add(roomId);
        } else {
          next.delete(roomId);
        }
        return next;
      });
      toast.error({ title: "Couldn't update pinned room", description: "Please try again." });
    }
  }

  return (
    <div className="flex w-full min-w-0 flex-col gap-4">
      <RoomFilterBar rooms={rooms} filters={filters} onFiltersChange={setFilters} />
      <DayStrip date={date} onDateChange={setDate} />
      <TimelineGrid
        rooms={filteredRooms}
        date={date}
        favoriteRoomIds={favoriteRoomIds}
        onToggleFavorite={handleToggleFavorite}
        authenticated={authenticated}
      />
    </div>
  );
}
