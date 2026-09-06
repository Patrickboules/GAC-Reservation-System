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
  created_at: string;
  group_id: string;
  rooms: { name: string } | { name: string }[] | null;
}

function roomName(rooms: PendingBookingRow["rooms"]): string {
  if (!rooms) return "Unknown room";
  return Array.isArray(rooms) ? (rooms[0]?.name ?? "Unknown room") : rooms.name;
}

export default async function AdminRequestsPage() {
  const supabase = await createClient();

  const { data: bookings, error: bookingsError } = await supabase
    .from("bookings")
    .select(
      "id, room_id, user_id, date, start_time, end_time, service, notes, created_at, group_id, rooms(name)"
    )
    .eq("status", "pending")
    .order("date", { ascending: true })
    .order("start_time", { ascending: true });

  if (bookingsError) {
    throw new Error(bookingsError.message);
  }

  const pending = (bookings ?? []) as PendingBookingRow[];

  const userIds = [...new Set(pending.map((booking) => booking.user_id))];
  const { data: profiles, error: profilesError } = userIds.length
    ? await supabase.from("profiles").select("id, display_name").in("id", userIds)
    : { data: [] as { id: string; display_name: string | null }[], error: null };

  if (profilesError) {
    throw new Error(profilesError.message);
  }

  const requesterNameById = new Map(
    (profiles ?? []).map((profile) => [profile.id, profile.display_name ?? "Unknown member"])
  );

  // A collective submission's N rooms share one group_id and are one
  // reservation for approval purposes — collapse them into a single queue
  // entry, keyed by a representative row's id (any row's id resolves the
  // whole group in the approve/reject actions).
  const groupedByGroupId = new Map<string, PendingBookingRow[]>();
  for (const booking of pending) {
    const existing = groupedByGroupId.get(booking.group_id);
    if (existing) existing.push(booking);
    else groupedByGroupId.set(booking.group_id, [booking]);
  }

  const requests: AdminRequestRow[] = Array.from(groupedByGroupId.values()).map((rows) => {
    const first = rows[0];
    return {
      id: first.id,
      roomId: first.room_id,
      roomName: rows.map((row) => roomName(row.rooms)).join(", "),
      requesterName: requesterNameById.get(first.user_id) ?? "Unknown member",
      date: first.date,
      startTime: first.start_time,
      endTime: first.end_time,
      service: first.service,
      notes: first.notes,
      createdAt: first.created_at,
    };
  });
  requests.sort((a, b) => `${a.date}${a.startTime}`.localeCompare(`${b.date}${b.startTime}`));

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
