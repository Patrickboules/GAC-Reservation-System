import Link from "next/link";
import { Inbox, DoorOpen, FileDown } from "lucide-react";

import { Button } from "@/components/kit/button";
import { Card } from "@/components/kit/card";
import { StatusBadge } from "@/components/kit/status-badge";
import { EmptyState } from "@/components/kit/empty-state";
import type { BookingStatus } from "@/lib/bookings/conflict-check";
import { MAX_OPEN_PENDING_BOOKINGS } from "@/lib/bookings/limits";
import { addDays, formatRelativeTime, timeToMinutes, todayDateString } from "@/lib/dates";
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

interface PendingRow {
  id: string;
  user_id: string;
  created_at: string;
  rooms: { name: string } | { name: string }[] | null;
}

function singular<T>(value: T | T[] | null): T | null {
  if (!value) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

const REPORT_RANGE_DAYS = 30;

export default async function AdminDashboardPage() {
  const supabase = await createClient();
  const today = todayDateString();
  const scheduleHours = SCHEDULE_END_HOUR - SCHEDULE_START_HOUR;

  const [todayBookings, pendingRows, recentActivity] = await Promise.all([
    supabase
      .from("bookings")
      .select("id, start_time, end_time, status")
      .eq("date", today),
    supabase
      .from("bookings")
      .select("id, user_id, created_at, rooms(name)")
      .eq("status", "pending")
      .order("created_at", { ascending: true }),
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

  const pending = (pendingRows.data ?? []) as unknown as PendingRow[];
  const oldestPending = pending[0] ?? null;

  const pendingCountByUser = new Map<string, number>();
  for (const row of pending) {
    pendingCountByUser.set(row.user_id, (pendingCountByUser.get(row.user_id) ?? 0) + 1);
  }
  const nearCapUserIds = [...pendingCountByUser.entries()]
    .filter(([, count]) => count >= MAX_OPEN_PENDING_BOOKINGS - 1)
    .map(([userId]) => userId);

  const attentionUserIds = [
    ...new Set([oldestPending?.user_id, ...nearCapUserIds].filter((id): id is string => !!id)),
  ];
  const { data: attentionProfiles } = attentionUserIds.length
    ? await supabase.from("profiles").select("id, display_name").in("id", attentionUserIds)
    : { data: [] as { id: string; display_name: string | null }[] };
  const attentionNameById = new Map(
    (attentionProfiles ?? []).map((profile) => [profile.id, profile.display_name ?? "Unknown member"])
  );

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

  const reportTo = today;
  const reportFrom = addDays(reportTo, -(REPORT_RANGE_DAYS - 1));
  const pendingCount = pending.length;

  return (
    <div className="mx-auto flex min-h-full w-full max-w-3xl flex-col gap-6 p-4">
      <div>
        <h1 className="font-display text-h2 text-ink-900">Dashboard</h1>
        <p className="text-small text-ink-500">Overview of today&rsquo;s schedule and recent activity.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card>
          <p className="text-caption text-ink-500">Today&rsquo;s bookings</p>
          <p className="font-mono text-display tabular-nums text-ink-900">{todayRows.length}</p>
        </Card>
        <Card>
          <p className="text-caption text-ink-500">Pending requests</p>
          <p className="font-mono text-display tabular-nums text-ink-900">{pendingCount}</p>
        </Card>
        <Card>
          <p className="text-caption text-ink-500">Utilization today</p>
          <p className="font-mono text-display tabular-nums text-ink-900">{utilization}%</p>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-[1.3fr_1fr]">
        <Card className="flex flex-col gap-3">
          <h2 className="text-h3 font-display text-ink-900">Needs attention</h2>
          {!oldestPending && nearCapUserIds.length === 0 ? (
            <p className="text-small text-ink-500">Nothing needs your attention right now.</p>
          ) : (
            <ul className="flex flex-col divide-y divide-line">
              {oldestPending && (
                <li className="flex items-center justify-between gap-3 py-2.5">
                  <span className="text-small text-ink-900">
                    {singular(oldestPending.rooms)?.name ?? "Unknown room"} ·{" "}
                    {attentionNameById.get(oldestPending.user_id) ?? "Unknown member"}
                  </span>
                  <StatusBadge
                    status="pending"
                    label={`Oldest · ${formatRelativeTime(oldestPending.created_at)}`}
                    className="shrink-0 whitespace-nowrap"
                  />
                </li>
              )}
              {nearCapUserIds.map((userId) => (
                <li key={userId} className="flex items-center justify-between gap-3 py-2.5">
                  <span className="text-small text-ink-900">
                    {attentionNameById.get(userId) ?? "Unknown member"}
                  </span>
                  <StatusBadge
                    status="pending"
                    label={`${pendingCountByUser.get(userId)}/${MAX_OPEN_PENDING_BOOKINGS} pending`}
                    className="shrink-0 whitespace-nowrap"
                  />
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card className="flex flex-col gap-2">
          <h2 className="text-h3 font-display text-ink-900">Quick actions</h2>
          <Button
            render={
              <Link href="/admin/requests">
                <Inbox aria-hidden="true" className="size-4" />
                Review pending ({pendingCount})
              </Link>
            }
          />
          <Button
            variant="secondary"
            render={
              <Link href="/admin/rooms">
                <DoorOpen aria-hidden="true" className="size-4" />
                Add room
              </Link>
            }
          />
          <Button
            variant="secondary"
            render={
              <Link href={`/admin/reports/export?from=${reportFrom}&to=${reportTo}`}>
                <FileDown aria-hidden="true" className="size-4" />
                Export report
              </Link>
            }
          />
        </Card>
      </div>

      <div className="flex flex-col gap-3">
        <h2 className="text-h3 font-display text-ink-900">Recent activity</h2>
        {activity.length === 0 ? (
          <EmptyState
            title="No activity yet"
            description="Booking requests and status changes will show up here."
          />
        ) : (
          <Card as="ul" className="flex flex-col divide-y divide-line p-0">
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
          </Card>
        )}
      </div>
    </div>
  );
}
