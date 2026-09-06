import { redirect } from "next/navigation";

import { BookingScreen } from "@/components/bookings/booking-screen";
import { isBookingModifiable } from "@/lib/bookings/status";
import { createClient } from "@/lib/supabase/server";

export default async function EditBookingPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: booking } = await supabase
    .from("bookings")
    .select("id, room_id, date, start_time, end_time, service, notes, status, user_id, group_id")
    .eq("id", id)
    .single();

  if (
    !booking ||
    booking.user_id !== user.id ||
    !isBookingModifiable(booking.status, booking.date, booking.end_time)
  ) {
    redirect("/bookings?error=" + encodeURIComponent("This booking can't be edited."));
  }

  const { data: room } = await supabase
    .from("rooms")
    .select("id, name, amenities, building, floor")
    .eq("id", booking.room_id)
    .maybeSingle();

  if (!room) {
    redirect("/bookings?error=" + encodeURIComponent("This booking's room no longer exists."));
  }

  // A collective reservation's rooms all share this group_id and are edited
  // together (date/time/service/notes only — room composition doesn't
  // change here). Only the name shown needs to reflect every room; the rest
  // of the displayed room (building/floor/amenities) comes from this row's
  // own room, which is representative since every subroom in a group shares
  // the same parent hall's building/floor.
  const { data: groupRows } = await supabase
    .from("bookings")
    .select("rooms(name)")
    .eq("group_id", booking.group_id);
  const roomNames = ((groupRows ?? []) as { rooms: { name: string } | { name: string }[] | null }[])
    .map((row) => (Array.isArray(row.rooms) ? row.rooms[0]?.name : row.rooms?.name))
    .filter((name): name is string => Boolean(name));
  const displayRoom = roomNames.length > 1 ? { ...room, name: roomNames.join(", ") } : room;

  return <BookingScreen room={displayRoom} booking={booking} />;
}
