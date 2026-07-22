"use client";

import { useMemo, useState } from "react";

import { toggleFavoriteRoom } from "@/app/(app)/schedule/actions";
import { useToast } from "@/components/kit/toast";
import { DayStrip } from "@/components/schedule/day-strip";
import { DesktopResourceGrid } from "@/components/schedule/desktop-resource-grid";
import { MobileDayCalendar } from "@/components/schedule/mobile-day-calendar";
import { RoomFilterBar } from "@/components/schedule/room-filter-bar";
import { todayDateString } from "@/lib/dates";
import {
  EMPTY_ROOM_FILTERS,
  groupRoomsByBuilding,
  roomMatchesFilters,
  sortRoomsByFavorite,
  type RoomFilterState,
  type ScheduleRoom,
} from "@/lib/rooms-filters";

interface ScheduleContentProps {
  rooms: ScheduleRoom[];
  initialFavoriteRoomIds: string[];
}

/** Owns the selected day, room filters, and pinned rooms (US-034) so the day strip and both calendar views stay in sync. */
export function ScheduleContent({ rooms, initialFavoriteRoomIds }: ScheduleContentProps) {
  const toast = useToast();
  const [date, setDate] = useState(() => todayDateString());
  const [filters, setFilters] = useState<RoomFilterState>(EMPTY_ROOM_FILTERS);
  const [favoriteRoomIds, setFavoriteRoomIds] = useState(() => new Set(initialFavoriteRoomIds));

  const filteredRooms = useMemo(
    () => rooms.filter((room) => roomMatchesFilters(room, filters)),
    [rooms, filters]
  );
  const mobileRooms = useMemo(
    () => sortRoomsByFavorite(filteredRooms, favoriteRoomIds),
    [filteredRooms, favoriteRoomIds]
  );
  const groupedRooms = useMemo(() => {
    const favorites = filteredRooms.filter((room) => favoriteRoomIds.has(room.id));
    const rest = groupRoomsByBuilding(filteredRooms.filter((room) => !favoriteRoomIds.has(room.id)));
    return [...favorites, ...rest];
  }, [filteredRooms, favoriteRoomIds]);

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
      <MobileDayCalendar
        rooms={mobileRooms}
        date={date}
        onDateChange={setDate}
        favoriteRoomIds={favoriteRoomIds}
        onToggleFavorite={handleToggleFavorite}
      />
      <DesktopResourceGrid
        rooms={groupedRooms}
        date={date}
        favoriteRoomIds={favoriteRoomIds}
        onToggleFavorite={handleToggleFavorite}
      />
    </div>
  );
}
