import Link from "next/link";

import { approveBooking, rejectBooking } from "@/app/(app)/admin/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { formatDateLabel, formatTimeLabel } from "@/lib/dates";
import { createClient } from "@/lib/supabase/server";

interface PendingBookingRow {
  id: string;
  room_id: string;
  user_id: string;
  date: string;
  start_time: string;
  end_time: string;
  service: string;
  notes: string | null;
  rooms: { name: string } | { name: string }[] | null;
}

function roomName(rooms: PendingBookingRow["rooms"]): string {
  if (!rooms) return "Unknown room";
  return Array.isArray(rooms) ? (rooms[0]?.name ?? "Unknown room") : rooms.name;
}

export default async function AdminRequestsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const supabase = await createClient();

  const { data: bookings } = await supabase
    .from("bookings")
    .select(
      "id, room_id, user_id, date, start_time, end_time, service, notes, rooms(name)"
    )
    .eq("status", "pending")
    .order("date", { ascending: true })
    .order("start_time", { ascending: true });

  const pending = (bookings ?? []) as PendingBookingRow[];

  const userIds = [...new Set(pending.map((booking) => booking.user_id))];
  const { data: profiles } = userIds.length
    ? await supabase.from("profiles").select("id, display_name").in("id", userIds)
    : { data: [] as { id: string; display_name: string | null }[] };

  const requesterNameById = new Map(
    (profiles ?? []).map((profile) => [profile.id, profile.display_name ?? "Unknown member"])
  );

  return (
    <div className="mx-auto flex min-h-full w-full max-w-2xl flex-col gap-4 p-4">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-semibold">Approval queue</h1>
          <p className="text-sm text-muted-foreground">Pending room/hall requests.</p>
        </div>
        <Button variant="outline" render={<Link href="/admin">Dashboard</Link>} />
      </div>

      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}

      {pending.length === 0 ? (
        <p className="text-sm text-muted-foreground">No pending requests.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {pending.map((booking) => (
            <li key={booking.id}>
              <Card>
                <CardHeader>
                  <CardTitle>{roomName(booking.rooms)}</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col gap-3 text-sm">
                  <div className="text-muted-foreground">
                    {requesterNameById.get(booking.user_id) ?? "Unknown member"} ·{" "}
                    {formatDateLabel(booking.date)} · {formatTimeLabel(booking.start_time)}–
                    {formatTimeLabel(booking.end_time)} · {booking.service}
                  </div>
                  {booking.notes ? (
                    <div className="text-muted-foreground">Notes: {booking.notes}</div>
                  ) : null}

                  <div className="flex flex-wrap items-end gap-2">
                    <form action={approveBooking}>
                      <input type="hidden" name="booking_id" value={booking.id} />
                      <Button type="submit">Approve</Button>
                    </form>

                    <form
                      action={rejectBooking}
                      className="flex flex-1 flex-wrap items-end gap-2"
                    >
                      <input type="hidden" name="booking_id" value={booking.id} />
                      <div className="flex min-w-40 flex-1 flex-col gap-1">
                        <Label htmlFor={`reject_reason_${booking.id}`} className="sr-only">
                          Rejection reason (optional)
                        </Label>
                        <Textarea
                          id={`reject_reason_${booking.id}`}
                          name="reject_reason"
                          placeholder="Reason (optional)"
                          className="min-h-9"
                        />
                      </div>
                      <Button type="submit" variant="destructive">
                        Reject
                      </Button>
                    </form>
                  </div>
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
