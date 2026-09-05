import { redirect } from "next/navigation";

import { BookingScreen } from "@/components/bookings/booking-screen";
import { CollectiveBookingScreen } from "@/components/bookings/collective-booking-screen";
import type { BookingTimeSlot } from "@/lib/bookings/conflict-check";
import { findNextFreeSlot } from "@/lib/bookings/next-free-slot";
import { minutesToTime, todayDateString } from "@/lib/dates";
import { createClient } from "@/lib/supabase/server";

export default async function NewBookingPage({
  searchParams,
}: {
  searchParams: Promise<{ room?: string; rooms?: string; date?: string; start?: string; end?: string }>;
}) {
  const { room, rooms, date, start, end } = await searchParams;

  // There is one booking flow and it starts on the Rooms page (a single room)
  // or a hall detail page's subroom multi-select (comma-separated `rooms`) —
  // reaching this step without either means no room was ever chosen.
  const roomIds = rooms
    ? Array.from(new Set(rooms.split(",").map((id) => id.trim()).filter(Boolean)))
    : room
      ? [room]
      : [];
  if (roomIds.length === 0) {
    redirect("/rooms");
  }

  const supabase = await createClient();
  const [{ data: selectedRooms }, { data: userData }] = await Promise.all([
    supabase
      .from("rooms")
      .select("id, name, amenities, building, floor, parent_room_id")
      .in("id", roomIds),
    supabase.auth.getUser(),
  ]);

  const roomsById = new Map((selectedRooms ?? []).map((r) => [r.id as string, r]));
  if (roomsById.size !== roomIds.length) {
    redirect("/rooms");
  }
  // Preserve the order the caller requested the rooms in.
  const orderedRooms = roomIds.map((id) => roomsById.get(id)!);

  if (roomIds.length > 1) {
    // Collective selection is scoped to one hall per request.
    const parentIds = new Set(orderedRooms.map((r) => r.parent_room_id));
    if (parentIds.size !== 1 || parentIds.has(null)) {
      redirect("/rooms");
    }
  }

  let openPendingCount = 0;
  if (userData.user) {
    const { count } = await supabase
      .from("bookings")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userData.user.id)
      .eq("status", "pending");
    openPendingCount = count ?? 0;
  }

  // Default to the first selected room's next free slot rather than a blind
  // 9-10am that may already be taken — except on today, where scanning from
  // the room's opening hour could suggest an already-passed slot, so default
  // to the current hour rounded down instead.
  const firstRoomId = orderedRooms[0].id as string;
  let defaultStartTime = start;
  let defaultEndTime = end;
  if (!start && !end) {
    const suggestedDate = date ?? todayDateString();
    if (suggestedDate === todayDateString()) {
      const currentHour = new Date().getHours();
      defaultStartTime = minutesToTime(currentHour * 60);
      defaultEndTime = minutesToTime(currentHour * 60 + 60);
    } else {
      const { data: roomBookings } = await supabase
        .from("bookings_schedule")
        .select("id, room_id, date, start_time, end_time, status")
        .eq("room_id", firstRoomId)
        .eq("date", suggestedDate);
      const nextFree = findNextFreeSlot(
        firstRoomId,
        suggestedDate,
        (roomBookings ?? []) as BookingTimeSlot[]
      );
      if (nextFree) {
        defaultStartTime = nextFree.startTime;
        defaultEndTime = nextFree.endTime;
      }
    }
  }

  if (roomIds.length === 1) {
    return (
      <BookingScreen
        room={orderedRooms[0]}
        defaultDate={date}
        defaultStartTime={defaultStartTime}
        defaultEndTime={defaultEndTime}
        openPendingCount={openPendingCount}
      />
    );
  }

  return (
    <CollectiveBookingScreen
      rooms={orderedRooms}
      defaultDate={date}
      defaultStartTime={defaultStartTime}
      defaultEndTime={defaultEndTime}
      openPendingCount={openPendingCount}
    />
  );
}
