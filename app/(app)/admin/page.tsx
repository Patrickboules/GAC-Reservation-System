import Link from "next/link";

import { StatusBadge } from "@/components/kit/status-badge";
import { EmptyState } from "@/components/kit/empty-state";
import type { BookingStatus } from "@/lib/bookings/conflict-check";
import { formatRelativeTime, timeToMinutes, todayDateString } from "@/lib/dates";
import { SCHEDULE_END_HOUR, SCHEDULE_START_HOUR } from "@/lib/schedule/hours";
import { createClient } from "@/lib/supabase/server";

interface RecentBookingRow {
  id: string;
  user_id: string;
  status: BookingStatus;
  updated_at: string;
  date: string;
  start_time: string;
  end_time: string;
  rooms: { name: string } | { name: string }[] | null;
}

function singular<T>(value: T | T[] | null): T | null {
  if (!value) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

export default async function AdminDashboardPage() {
  const supabase = await createClient();
  const today = todayDateString();
  const scheduleHours = SCHEDULE_END_HOUR - SCHEDULE_START_HOUR;

  const [todayBookings, pendingCount, recentActivity] = await Promise.all([
    supabase
      .from("bookings")
      .select("id, start_time, end_time, status")
      .eq("date", today),
    supabase
      .from("bookings")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending"),
    supabase
      .from("bookings")
      .select("id, user_id, status, updated_at, date, start_time, end_time, rooms(name)")
      .order("updated_at", { ascending: false })
      .limit(10),
  ]);

  const todayRows = todayBookings.data ?? [];
  const approvedTodayHours = todayRows
    .filter((row) => row.status === "approved")
    .reduce((sum, row) => sum + (timeToMinutes(row.end_time) - timeToMinutes(row.start_time)) / 60, 0);

  const { count: roomCount } = await supabase
    .from("rooms")
    .select("id", { count: "exact", head: true });

  const totalRoomHours = (roomCount ?? 0) * scheduleHours;
  const utilization = totalRoomHours > 0 ? Math.round((approvedTodayHours / totalRoomHours) * 100) : 0;

  const activity = (recentActivity.data ?? []) as unknown as RecentBookingRow[];

  // bookings.user_id has no direct FK to profiles (both reference auth.users),
  // so PostgREST can't embed profiles(display_name) — fetch names separately.
  const activityUserIds = [...new Set(activity.map((row) => row.user_id))];
  const { data: activityProfiles } = activityUserIds.length
    ? await supabase.from("profiles").select("id, display_name").in("id", activityUserIds)
    : { data: [] as { id: string; display_name: string | null }[] };
  const requesterNameById = new Map(
    (activityProfiles ?? []).map((profile) => [profile.id, profile.display_name ?? "Unknown member"])
  );

  return (
    <div className="mx-auto flex min-h-full w-full max-w-3xl flex-col gap-6 p-4">
      <div>
        <h1 className="text-display font-display text-ink-900">Dashboard</h1>
        <p className="text-body text-ink-500">Overview of today&rsquo;s schedule and recent activity.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-lg border border-line bg-surface p-4 shadow-sm">
          <p className="text-caption text-ink-500">Today&rsquo;s bookings</p>
          <p className="font-mono text-display tabular-nums text-ink-900">{todayRows.length}</p>
        </div>
        <div className="rounded-lg border border-line bg-surface p-4 shadow-sm">
          <p className="text-caption text-ink-500">Pending requests</p>
          <p className="font-mono text-display tabular-nums text-ink-900">{pendingCount.count ?? 0}</p>
        </div>
        <div className="rounded-lg border border-line bg-surface p-4 shadow-sm">
          <p className="text-caption text-ink-500">Utilization today</p>
          <p className="font-mono text-display tabular-nums text-ink-900">{utilization}%</p>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <h2 className="text-h3 font-display text-ink-900">Recent activity</h2>
        {activity.length === 0 ? (
          <EmptyState
            title="No activity yet"
            description="Booking requests and status changes will show up here."
          />
        ) : (
          <ul className="flex flex-col divide-y divide-line rounded-lg border border-line bg-surface">
            {activity.map((row) => {
              const room = singular(row.rooms);
              return (
                <li key={row.id} className="flex items-center justify-between gap-3 p-3">
                  <div className="flex flex-col gap-0.5">
                    <p className="text-small text-ink-900">
                      {room?.name ?? "Unknown room"} ·{" "}
                      {requesterNameById.get(row.user_id) ?? "Unknown member"}
                    </p>
                    <p className="text-caption text-ink-500">{formatRelativeTime(row.updated_at)}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <StatusBadge status={row.status} />
                    <Link
                      href={`/bookings/${row.id}`}
                      className="text-small text-sky-600 hover:underline"
                    >
                      View
                    </Link>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
