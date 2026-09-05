import { notFound } from "next/navigation";

import { RoomDetailView } from "@/components/rooms/room-detail-view";
import type { RoomCardAvailability } from "@/components/kit/room-card";
import { CONFLICTING_STATUSES, type BookingStatus } from "@/lib/bookings/conflict-check";
import { addDays, timeToMinutes, todayDateString } from "@/lib/dates";
import { formatRoomLocation } from "@/lib/rooms";
import { isRoomCategoryColor } from "@/lib/rooms/category-colors";
import { createClient } from "@/lib/supabase/server";

const STRIP_DAYS = 7;

interface TodayBookingRow {
  start_time: string;
  end_time: string;
  status: BookingStatus;
  service: string | null;
}

interface SubroomRow {
  id: string;
  name: string;
}

export default async function RoomDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const startDate = todayDateString();
  const endDate = addDays(startDate, STRIP_DAYS - 1);

  const [
    { data: room, error: roomError },
    { data: upcomingBookings, error: upcomingError },
    { data: todayBookings, error: todayError },
    { data: subroomRows, error: subroomsError },
  ] = await Promise.all([
    supabase
      .from("rooms")
      .select("id, name, amenities, building, floor, category_color")
      .eq("id", id)
      .maybeSingle(),
    supabase
      .from("bookings_schedule")
      .select("date")
      .eq("room_id", id)
      .in("status", CONFLICTING_STATUSES)
      .gte("date", startDate)
      .lte("date", endDate),
    supabase
      .from("bookings_schedule")
      .select("start_time, end_time, status, service")
      .eq("room_id", id)
      .eq("date", startDate)
      .in("status", CONFLICTING_STATUSES)
      .order("start_time", { ascending: true }),
    // Subrooms of this room, if it's one of the three subdivided halls -
    // most rooms have none, so this comes back empty for them.
    supabase.from("rooms").select("id, name").eq("parent_room_id", id).order("name"),
  ]);

  if (roomError || upcomingError || todayError || subroomsError) {
    throw new Error((roomError ?? upcomingError ?? todayError ?? subroomsError)!.message);
  }

  if (!room) {
    notFound();
  }

  const busyDates = new Set((upcomingBookings ?? []).map((booking) => booking.date));
  const days = Array.from({ length: STRIP_DAYS }, (_, i) => addDays(startDate, i)).map((date) => ({
    date,
    busy: busyDates.has(date),
  }));

  const todayRows = (todayBookings ?? []) as TodayBookingRow[];

  // Same "is it busy right this minute" check the rooms directory uses
  // (app/(app)/rooms/page.tsx) — reuses the already-fetched today rows
  // instead of a second query.
  const now = new Date();
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const availability: RoomCardAvailability = todayRows.some(
    (booking) =>
      timeToMinutes(booking.start_time) <= nowMinutes && timeToMinutes(booking.end_time) > nowMinutes
  )
    ? "busy"
    : "free";

  const subroomRowsTyped = (subroomRows ?? []) as SubroomRow[];
  let subroomBusyIds = new Set<string>();
  if (subroomRowsTyped.length > 0) {
    const { data: subroomBookings, error: subroomBookingsError } = await supabase
      .from("bookings_schedule")
      .select("room_id, start_time, end_time")
      .in(
        "room_id",
        subroomRowsTyped.map((subroom) => subroom.id)
      )
      .eq("date", startDate)
      .in("status", CONFLICTING_STATUSES);

    if (subroomBookingsError) {
      throw new Error(subroomBookingsError.message);
    }

    subroomBusyIds = new Set(
      (subroomBookings ?? [])
        .filter(
          (booking) =>
            timeToMinutes(booking.start_time) <= nowMinutes && timeToMinutes(booking.end_time) > nowMinutes
        )
        .map((booking) => booking.room_id)
    );
  }

  const subrooms = subroomRowsTyped.map((subroom) => ({
    id: subroom.id,
    name: subroom.name,
    availability: (subroomBusyIds.has(subroom.id) ? "busy" : "free") as RoomCardAvailability,
  }));

  const amenities: string[] = room.amenities ?? [];
  const location = formatRoomLocation(room.building, room.floor);
  const categoryColor =
    room.category_color && isRoomCategoryColor(room.category_color) ? room.category_color : null;

  return (
    <RoomDetailView
      roomId={room.id}
      name={room.name}
      location={location}
      amenities={amenities}
      categoryColor={categoryColor}
      availability={availability}
      todayDate={startDate}
      todayBookings={todayRows.map((b) => ({
        startTime: b.start_time,
        endTime: b.end_time,
        status: b.status,
        service: b.service,
      }))}
      subrooms={subrooms}
      days={days}
    />
  );
}
