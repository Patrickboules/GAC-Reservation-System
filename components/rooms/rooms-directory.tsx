"use client";

import { useMemo, useState } from "react";
import { DoorOpen, Search } from "lucide-react";

import { EmptyState } from "@/components/kit/empty-state";
import { FilterChip } from "@/components/kit/filter-chip";
import { Input } from "@/components/kit/input";
import { RoomCard, type RoomCardAvailability } from "@/components/kit/room-card";
import { formatRoomLocation } from "@/lib/rooms";
import type { RoomCategoryColor } from "@/lib/rooms/category-colors";

export interface RoomsDirectoryRoom {
  id: string;
  name: string;
  amenities: string[];
  building: string | null;
  floor: string | null;
  categoryColor: RoomCategoryColor | null;
  availability: RoomCardAvailability;
}

function distinctAmenities(rooms: RoomsDirectoryRoom[]): string[] {
  return Array.from(new Set(rooms.flatMap((room) => room.amenities))).sort((a, b) =>
    a.localeCompare(b)
  );
}

/**
 * Client-side search + amenity filtering over the server-fetched room list —
 * mirrors the same distinct-amenities + FilterChip pattern already used by
 * components/shell/global-availability-search.tsx, so there's one consistent
 * way amenity filtering works across the app rather than a second one-off.
 */
export function RoomsDirectory({ rooms }: { rooms: RoomsDirectoryRoom[] }) {
  const [search, setSearch] = useState("");
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>([]);
  const amenityOptions = useMemo(() => distinctAmenities(rooms), [rooms]);

  function toggleAmenity(amenity: string, selected: boolean) {
    setSelectedAmenities((current) =>
      selected ? [...current, amenity] : current.filter((value) => value !== amenity)
    );
  }

  const filteredRooms = useMemo(() => {
    const query = search.trim().toLowerCase();
    return rooms.filter((room) => {
      if (query && !room.name.toLowerCase().includes(query)) return false;
      if (
        selectedAmenities.length > 0 &&
        !selectedAmenities.every((amenity) => room.amenities.includes(amenity))
      ) {
        return false;
      }
      return true;
    });
  }, [rooms, search, selectedAmenities]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search
            aria-hidden="true"
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-300"
          />
          <Input
            type="text"
            placeholder="Search rooms…"
            aria-label="Search rooms"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="pl-9"
          />
        </div>
        {amenityOptions.length > 0 && (
          <div className="flex gap-2 overflow-x-auto">
            {amenityOptions.map((amenity) => (
              <FilterChip
                key={amenity}
                selected={selectedAmenities.includes(amenity)}
                onSelectedChange={(selected) => toggleAmenity(amenity, selected)}
              >
                <span lang="ar" dir="rtl">
                  {amenity}
                </span>
              </FilterChip>
            ))}
          </div>
        )}
      </div>

      {filteredRooms.length > 0 ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredRooms.map((room) => (
            <RoomCard
              key={room.id}
              id={room.id}
              name={room.name}
              amenities={room.amenities}
              location={formatRoomLocation(room.building, room.floor)}
              availability={room.availability}
              categoryColor={room.categoryColor}
            />
          ))}
        </div>
      ) : (
        <EmptyState
          icon={<DoorOpen className="size-10" />}
          title="No rooms match"
          description="Try a different search, or clear the amenity filters."
        />
      )}
    </div>
  );
}
