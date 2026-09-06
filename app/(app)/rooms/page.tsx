import { DoorOpen } from "lucide-react";

import { EmptyState } from "@/components/kit/empty-state";
import { RoomsDirectory, type RoomsDirectoryRoom } from "@/components/rooms/rooms-directory";
import type { RoomCardAvailability } from "@/components/kit/room-card";
import { CONFLICTING_STATUSES } from "@/lib/bookings/conflict-check";
import { todayDateString, timeToMinutes } from "@/lib/dates";
import { isRoomCategoryColor } from "@/lib/rooms/category-colors";
import { createClient } from "@/lib/supabase/server";

// The rooms directory is the single entry point to booking: browse rooms,
// halls, and stages here, open one, then reserve it from its detail page.
export default async function RoomsPage() {
  const supabase = await createClient();
  const [
    { data: rooms, error: roomsError },
    { data: todaysBookings, error: bookingsError },
  ] = await Promise.all([
    supabase
      .from("rooms")
      // Ordered by creation order rather than alphabetically: the seeded
      // rooms were added ground -> basement -> 3rd -> ... -> 6th floor, so
      // this order doubles as a physical/wayfinding order. Alphabetical
      // Arabic-name order has no relationship to where a room actually is.
      // Subrooms (parent_room_id set) are excluded here - they're only
      // reachable from their parent hall's detail page (US-005).
      .select("id, name, amenities, building, floor, category_color")
      .is("parent_room_id", null)
      .order("created_at"),
    supabase
      .from("bookings_schedule")
      .select("room_id, start_time, end_time")
      .eq("date", todayDateString())
      .in("status", CONFLICTING_STATUSES),
  ]);

  if (roomsError || bookingsError) {
    throw new Error((roomsError ?? bookingsError)!.message);
  }

  const now = new Date();
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const busyRoomIds = new Set(
    (todaysBookings ?? [])
      .filter(
        (booking) =>
          timeToMinutes(booking.start_time) <= nowMinutes &&
          timeToMinutes(booking.end_time) > nowMinutes
      )
      .map((booking) => booking.room_id)
  );

  const availabilityFor = (roomId: string): RoomCardAvailability =>
    busyRoomIds.has(roomId) ? "busy" : "free";

  const directoryRooms: RoomsDirectoryRoom[] = (rooms ?? []).map((room) => ({
    id: room.id,
    name: room.name,
    amenities: room.amenities ?? [],
    building: room.building,
    floor: room.floor,
    categoryColor:
      room.category_color && isRoomCategoryColor(room.category_color)
        ? room.category_color
        : null,
    availability: availabilityFor(room.id),
  }));

  return (
    <div className="mx-auto flex min-h-full w-full max-w-6xl flex-col gap-4 p-4">
      <div>
        <h1 className="font-display text-h2 text-ink-900">Rooms</h1>
        <p className="text-small text-ink-500">
          Browse rooms, halls, and stages. Open one to see its availability and reserve it.
        </p>
      </div>

      {directoryRooms.length > 0 ? (
        <RoomsDirectory rooms={directoryRooms} />
      ) : (
        <EmptyState
          icon={<DoorOpen className="size-10" />}
          title="No rooms found"
          description="Rooms will appear here once they're added."
        />
      )}
    </div>
  );
}
