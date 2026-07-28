import { redirect } from "next/navigation";

import { BookingScreen } from "@/components/bookings/booking-screen";
import type { BookingTimeSlot } from "@/lib/bookings/conflict-check";
import { findNextFreeSlot } from "@/lib/bookings/next-free-slot";
import { todayDateString } from "@/lib/dates";
import { createClient } from "@/lib/supabase/server";

export default async function NewBookingPage({
  searchParams,
}: {
  searchParams: Promise<{ room?: string; date?: string; start?: string; end?: string }>;
}) {
  const { room, date, start, end } = await searchParams;

  // There is one booking flow and it starts on the Rooms page — reaching this
  // step without a room means the room was never chosen, so send them there.
  if (!room) {
    redirect("/rooms");
  }

  const supabase = await createClient();
  const [{ data: selectedRoom }, { data: userData }] = await Promise.all([
    supabase
      .from("rooms")
      .select("id, name, capacity, amenities, location")
      .eq("id", room)
      .maybeSingle(),
    supabase.auth.getUser(),
  ]);

  if (!selectedRoom) {
    redirect("/rooms");
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

  // Default to this room's next free slot rather than a blind 9-10am that may
  // already be taken.
  let defaultStartTime = start;
  let defaultEndTime = end;
  if (!start && !end) {
    const suggestedDate = date ?? todayDateString();
    const { data: roomBookings } = await supabase
      .from("bookings_schedule")
      .select("id, room_id, date, start_time, end_time, status")
      .eq("room_id", room)
      .eq("date", suggestedDate);
    const nextFree = findNextFreeSlot(room, suggestedDate, (roomBookings ?? []) as BookingTimeSlot[]);
    if (nextFree) {
      defaultStartTime = nextFree.startTime;
      defaultEndTime = nextFree.endTime;
    }
  }

  return (
    <BookingScreen
      room={selectedRoom}
      defaultDate={date}
      defaultStartTime={defaultStartTime}
      defaultEndTime={defaultEndTime}
      openPendingCount={openPendingCount}
    />
  );
}
