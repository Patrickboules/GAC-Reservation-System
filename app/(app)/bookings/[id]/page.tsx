import Link from "next/link";
import { redirect } from "next/navigation";

import { CancelBookingButton } from "@/components/bookings/cancel-booking-button";
import { Button } from "@/components/kit/button";
import { Card } from "@/components/kit/card";
import { StatusBadge } from "@/components/kit/status-badge";
import { formatDateLabel, formatTimeLabel } from "@/lib/dates";
import { isBookingModifiable } from "@/lib/bookings/status";
import { createClient } from "@/lib/supabase/server";

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <>
      <span className="text-caption font-medium tracking-wide text-ink-500 uppercase">{label}</span>
      <span className="text-body text-ink-900">{value}</span>
    </>
  );
}

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

      <Card className="flex flex-col gap-4 p-5">
        <div className="flex items-center justify-between gap-2">
          <span className="text-body font-semibold text-ink-900">{room?.name ?? "Unknown room"}</span>
          <StatusBadge status={booking.status} />
        </div>

        <div className="grid grid-cols-[auto_1fr] items-baseline gap-x-3 gap-y-2">
          <Field label="Date" value={formatDateLabel(booking.date)} />
          <Field
            label="Time"
            value={`${formatTimeLabel(booking.start_time)}–${formatTimeLabel(booking.end_time)}`}
          />
          <Field label="Service" value={booking.service} />
          <Field label="Notes" value={booking.notes || "Not specified"} />
          {booking.status === "rejected" && (
            <Field label="Reason" value={booking.reject_reason || "Not specified"} />
          )}
        </div>

        {modifiable && (
          <div className="flex gap-2 border-t border-line pt-3">
            <Button
              variant="secondary"
              size="sm"
              render={<Link href={`/bookings/${booking.id}/edit`}>Edit</Link>}
            />
            <CancelBookingButton bookingId={booking.id} />
          </div>
        )}
      </Card>
    </div>
  );
}
