import { redirect } from "next/navigation";

import { BookingScreen } from "@/components/bookings/booking-screen";
import { isBookingModifiable } from "@/lib/bookings/status";
import { createClient } from "@/lib/supabase/server";
import { getCachedUser } from "@/lib/supabase/session";

export default async function EditBookingPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const user = await getCachedUser();

  if (!user) {
    redirect("/login");
  }

  const { data: booking } = await supabase
    .from("bookings")
    .select("id, room_id, date, start_time, end_time, service, notes, status, user_id")
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

  return <BookingScreen room={room} booking={booking} />;
}
