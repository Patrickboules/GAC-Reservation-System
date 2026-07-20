import Link from "next/link";
import { redirect } from "next/navigation";

import { EditBookingForm } from "@/components/bookings/edit-booking-form";
import { Button } from "@/components/ui/button";
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

  const { data: rooms } = await supabase.from("rooms").select("id, name").order("name");

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-xl flex-col gap-4 p-4">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-semibold">Edit request</h1>
          <p className="text-sm text-muted-foreground">
            {booking.status === "approved"
              ? "Changing the room, date, or time reverts this to pending and requires re-approval."
              : "Update your request details below."}
          </p>
        </div>
        <Button variant="outline" render={<Link href="/bookings">My bookings</Link>} />
      </div>
      <EditBookingForm booking={booking} rooms={rooms ?? []} />
    </div>
  );
}
