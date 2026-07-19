import Link from "next/link";

import { BookingStatusBadge } from "@/components/schedule/booking-status-badge";
import { CancelBookingButton } from "@/components/bookings/cancel-booking-button";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDateLabel, formatTimeLabel, isBookingPast } from "@/lib/dates";
import type { BookingStatus } from "@/lib/bookings/conflict-check";
import { createClient } from "@/lib/supabase/server";

interface MyBooking {
  id: string;
  date: string;
  start_time: string;
  end_time: string;
  service: string;
  status: BookingStatus;
  rooms: { name: string } | { name: string }[] | null;
}

function roomName(rooms: MyBooking["rooms"]): string {
  if (!rooms) return "Unknown room";
  return Array.isArray(rooms) ? (rooms[0]?.name ?? "Unknown room") : rooms.name;
}

function isCancellable(booking: MyBooking): boolean {
  if (booking.status !== "pending" && booking.status !== "approved") {
    return false;
  }
  return !isBookingPast(booking.date, booking.end_time);
}

export default async function MyBookingsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: bookings } = await supabase
    .from("bookings")
    .select("id, date, start_time, end_time, service, status, rooms(name)")
    .eq("user_id", user?.id ?? "")
    .order("date", { ascending: false })
    .order("start_time", { ascending: false });

  const myBookings = (bookings ?? []) as MyBooking[];

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-2xl flex-col gap-4 p-4">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-semibold">My bookings</h1>
          <p className="text-sm text-muted-foreground">Requests you&apos;ve submitted.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" render={<Link href="/bookings/new">New request</Link>} />
          <Button variant="outline" render={<Link href="/">Home</Link>} />
        </div>
      </div>

      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}

      {myBookings.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          You haven&apos;t requested any rooms yet.
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {myBookings.map((booking) => (
            <li key={booking.id}>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between gap-2">
                  <CardTitle>{roomName(booking.rooms)}</CardTitle>
                  <BookingStatusBadge status={booking.status} />
                </CardHeader>
                <CardContent className="flex flex-col gap-3 text-sm text-muted-foreground">
                  <div>
                    {formatDateLabel(booking.date)} · {formatTimeLabel(booking.start_time)}–
                    {formatTimeLabel(booking.end_time)} · {booking.service}
                  </div>
                  {isCancellable(booking) ? (
                    <div>
                      <CancelBookingButton bookingId={booking.id} />
                    </div>
                  ) : null}
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
