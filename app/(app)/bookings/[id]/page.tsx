import Link from "next/link";
import { redirect } from "next/navigation";

import { CancelBookingButton } from "@/components/bookings/cancel-booking-button";
import { Button } from "@/components/kit/button";
import { StatusBadge } from "@/components/kit/status-badge";
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
    <div className="mx-auto flex min-h-full w-full max-w-xl flex-col gap-4 p-4">
      <div className="flex items-center justify-between gap-2">
        <h1 className="font-display text-h2 text-ink-900">Booking details</h1>
        <Button variant="secondary" render={<Link href="/bookings">My bookings</Link>} />
      </div>

      <div className="overflow-hidden rounded-lg border border-line bg-surface shadow-sm">
        <div className="flex flex-row items-center justify-between gap-2 p-4 pb-0">
          <span lang="ar" dir="rtl" className="font-display text-h3 text-ink-900">
            {room?.name ?? "Unknown room"}
          </span>
          <StatusBadge status={booking.status} />
        </div>
        <div className="flex flex-col gap-3 p-4 text-small">
          <div className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-ink-500">
            <span className="font-medium text-ink-900">Date</span>
            <span>{formatDateLabel(booking.date)}</span>
            <span className="font-medium text-ink-900">Time</span>
            <span className="font-mono tabular-nums">
              {formatTimeLabel(booking.start_time)}–{formatTimeLabel(booking.end_time)}
            </span>
            <span className="font-medium text-ink-900">Service</span>
            <span>{booking.service}</span>
            <span className="font-medium text-ink-900">Notes</span>
            <span>{booking.notes || "Not specified"}</span>
            {booking.status === "rejected" ? (
              <>
                <span className="font-medium text-ink-900">Reason</span>
                <span>{booking.reject_reason || "Not specified"}</span>
              </>
            ) : null}
          </div>

          {modifiable ? (
            <div className="flex gap-2 pt-2">
              <Button
                variant="secondary"
                size="sm"
                render={<Link href={`/bookings/${booking.id}/edit`}>Edit</Link>}
              />
              <CancelBookingButton bookingId={booking.id} />
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
