import Link from "next/link";
import { redirect } from "next/navigation";

import { BookingStatusBadge } from "@/components/schedule/booking-status-badge";
import { CancelBookingButton } from "@/components/bookings/cancel-booking-button";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDateLabel, formatTimeLabel } from "@/lib/dates";
import { isBookingModifiable } from "@/lib/bookings/status";
import { createClient } from "@/lib/supabase/server";

export default async function BookingDetailPage({
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
    .select(
      "id, date, start_time, end_time, service, notes, status, reject_reason, user_id, rooms(name)"
    )
    .eq("id", id)
    .single();

  if (!booking || booking.user_id !== user.id) {
    redirect("/bookings?error=" + encodeURIComponent("Booking not found."));
  }

  const room = Array.isArray(booking.rooms) ? booking.rooms[0] : booking.rooms;
  const modifiable = isBookingModifiable(booking.status, booking.date, booking.end_time);

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-xl flex-col gap-4 p-4">
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-2xl font-semibold">Booking details</h1>
        <Button variant="outline" render={<Link href="/bookings">My bookings</Link>} />
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2">
          <CardTitle>{room?.name ?? "Unknown room"}</CardTitle>
          <BookingStatusBadge status={booking.status} />
        </CardHeader>
        <CardContent className="flex flex-col gap-3 text-sm">
          <div className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-muted-foreground">
            <span className="font-medium text-foreground">Date</span>
            <span>{formatDateLabel(booking.date)}</span>
            <span className="font-medium text-foreground">Time</span>
            <span>
              {formatTimeLabel(booking.start_time)}–{formatTimeLabel(booking.end_time)}
            </span>
            <span className="font-medium text-foreground">Service</span>
            <span>{booking.service}</span>
            <span className="font-medium text-foreground">Notes</span>
            <span>{booking.notes || "Not specified"}</span>
            {booking.status === "rejected" ? (
              <>
                <span className="font-medium text-foreground">Reason</span>
                <span>{booking.reject_reason || "Not specified"}</span>
              </>
            ) : null}
          </div>

          {modifiable ? (
            <div className="flex gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                render={<Link href={`/bookings/${booking.id}/edit`}>Edit</Link>}
              />
              <CancelBookingButton bookingId={booking.id} />
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
