import { DoorOpen } from "lucide-react";

import { EmptyState } from "@/components/kit/empty-state";
import { RoomCard, type RoomCardAvailability } from "@/components/kit/room-card";
import { CONFLICTING_STATUSES } from "@/lib/bookings/conflict-check";
import { todayDateString, timeToMinutes } from "@/lib/dates";
import { formatRoomLocation } from "@/lib/rooms";
import { createClient } from "@/lib/supabase/server";

// The rooms directory is the single entry point to booking: browse rooms,
// halls, and stages here, open one, then reserve it from its detail page.
export default async function RoomsPage() {
  const supabase = await createClient();
  const [{ data: rooms }, { data: todaysBookings }] = await Promise.all([
    supabase
      .from("rooms")
      .select("id, name, amenities, building, floor")
      .order("name"),
    supabase
      .from("bookings_schedule")
      .select("room_id, start_time, end_time")
      .eq("date", todayDateString())
      .in("status", CONFLICTING_STATUSES),
  ]);

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

  return (
    <div className="mx-auto flex min-h-full w-full max-w-6xl flex-col gap-4 p-4">
      <div>
        <h1 className="font-display text-h2 text-ink-900">Rooms</h1>
        <p className="text-small text-ink-500">
          Browse rooms, halls, and stages. Open one to see its availability and reserve it.
        </p>
      </div>

      {(rooms ?? []).length > 0 ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {(rooms ?? []).map((room) => (
            <RoomCard
              key={room.id}
              id={room.id}
              name={room.name}
              amenities={room.amenities}
              location={formatRoomLocation(room.building, room.floor)}
              availability={availabilityFor(room.id)}
            />
          ))}
        </div>
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
