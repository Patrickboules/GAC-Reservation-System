import { DoorOpen } from "lucide-react";

import { EmptyState } from "@/components/kit/empty-state";
import { RoomCard } from "@/components/kit/room-card";
import { formatTimeLabel, timeToMinutes, todayDateString } from "@/lib/dates";
import { toBuildingSections } from "@/lib/rooms";
import { isRoomCategoryColor, ROOM_CATEGORY_COLOR_SWATCH_CLASSES } from "@/lib/rooms/category-colors";
import { createClient } from "@/lib/supabase/server";

interface TodayBooking {
  room_id: string;
  start_time: string;
  end_time: string;
  service: string | null;
}

interface RoomLiveStatus {
  statusText: string;
  nowText: string | null;
  nextText: string | null;
}

/** Derives "what's happening right now" and "what's next today" for a room
 * from its approved bookings for today, sorted soonest-first. A pending
 * request never occupies the room for real, so only approved bookings count
 * here (see app/(app)/rooms/page.tsx's query — mirrors the fix already made
 * for the busy/free signal). */
function liveStatusFor(bookings: TodayBooking[]): RoomLiveStatus {
  const now = new Date();
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const sorted = [...bookings].sort(
    (a, b) => timeToMinutes(a.start_time) - timeToMinutes(b.start_time)
  );

  const current = sorted.find(
    (b) => timeToMinutes(b.start_time) <= nowMinutes && timeToMinutes(b.end_time) > nowMinutes
  );
  const next = sorted.find((b) => timeToMinutes(b.start_time) > nowMinutes);

  if (current) {
    return {
      statusText: `Busy until ${formatTimeLabel(current.end_time)}`,
      nowText: current.service,
      nextText: next ? `${next.service}, ${formatTimeLabel(next.start_time)}–${formatTimeLabel(next.end_time)}` : null,
    };
  }

  return {
    statusText: next ? `Free until ${formatTimeLabel(next.start_time)}` : "Free rest of today",
    nowText: null,
    nextText: next ? `${next.service}, ${formatTimeLabel(next.start_time)}–${formatTimeLabel(next.end_time)}` : null,
  };
}

// The rooms directory is the single entry point to booking: browse rooms,
// halls, and stages here, open one, then reserve it from its detail page.
export default async function RoomsPage() {
  const supabase = await createClient();
  const [{ data: rooms }, { data: todaysBookings }] = await Promise.all([
    supabase
      .from("rooms")
      .select("id, name, amenities, building, floor, category_color")
      .order("name"),
    // Only a confirmed (approved) booking makes a room actually occupied
    // right now — a merely pending request hasn't been decided yet and
    // shouldn't read as "Busy" here, even though it does block a conflicting
    // new request elsewhere (see CONFLICTING_STATUSES in
    // lib/bookings/conflict-check.ts).
    supabase
      .from("bookings_schedule")
      .select("room_id, start_time, end_time, service")
      .eq("date", todayDateString())
      .eq("status", "approved"),
  ]);

  const bookingsByRoom = new Map<string, TodayBooking[]>();
  for (const booking of (todaysBookings ?? []) as TodayBooking[]) {
    const list = bookingsByRoom.get(booking.room_id);
    if (list) list.push(booking);
    else bookingsByRoom.set(booking.room_id, [booking]);
  }

  const buildingSections = toBuildingSections(rooms ?? []);
  const singleBuilding = buildingSections.length <= 1;

  const roomGrid = (roomList: typeof buildingSections[number]["rooms"]) => (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {roomList.map((room) => {
        const status = liveStatusFor(bookingsByRoom.get(room.id) ?? []);
        return (
          <RoomCard
            key={room.id}
            id={room.id}
            name={room.name}
            amenities={room.amenities}
            location={room.floor}
            statusText={status.statusText}
            nowText={status.nowText}
            nextText={status.nextText}
            headerColorClassName={
              room.category_color && isRoomCategoryColor(room.category_color)
                ? ROOM_CATEGORY_COLOR_SWATCH_CLASSES[room.category_color]
                : undefined
            }
            reserveHref={`/bookings/new?room=${room.id}`}
          />
        );
      })}
    </div>
  );

  return (
    <div className="mx-auto flex min-h-full w-full max-w-6xl flex-col gap-4 p-4">
      <div>
        <h1 className="font-display text-h2 text-ink-900">Rooms</h1>
        <p className="text-small text-ink-500">
          Browse rooms, halls, and stages. Open one to see its availability and reserve it.
        </p>
      </div>

      {buildingSections.length > 0 ? (
        singleBuilding ? (
          roomGrid(buildingSections[0].rooms)
        ) : (
          <div className="flex flex-col gap-8">
            {buildingSections.map(({ building, rooms }) => (
              <section key={building} aria-label={building} className="flex flex-col gap-4">
                <h2 className="font-display text-h3 text-ink-900">{building}</h2>
                {roomGrid(rooms)}
              </section>
            ))}
          </div>
        )
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
