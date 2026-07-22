import Link from "next/link";

import { AdminRequestsTable, type AdminRequestRow } from "@/components/admin/admin-requests-table";
import { Button } from "@/components/kit/button";
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

export default async function AdminRequestsPage() {
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

  const requests: AdminRequestRow[] = pending.map((booking) => ({
    id: booking.id,
    roomId: booking.room_id,
    roomName: roomName(booking.rooms),
    requesterName: requesterNameById.get(booking.user_id) ?? "Unknown member",
    date: booking.date,
    startTime: booking.start_time,
    endTime: booking.end_time,
    service: booking.service,
    notes: booking.notes,
  }));

  return (
    <div className="mx-auto flex min-h-full w-full max-w-5xl flex-col gap-4 p-4">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h1 className="font-display text-h2 text-ink-900">Approval queue</h1>
          <p className="text-small text-ink-500">Pending room/hall requests.</p>
        </div>
        <Button variant="secondary" render={<Link href="/admin">Dashboard</Link>} />
      </div>

      <AdminRequestsTable requests={requests} />
    </div>
  );
}
