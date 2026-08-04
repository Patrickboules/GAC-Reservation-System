import { Card } from "@/components/kit/card";
import { MostActiveMembers } from "@/components/admin/most-active-members";
import { PeakHoursHeatmap } from "@/components/admin/peak-hours-heatmap";
import { ReportsFilterForm } from "@/components/admin/reports-filter-form";
import { RoomUtilizationChart } from "@/components/admin/room-utilization-chart";
import { addDays, enumerateDates, todayDateString } from "@/lib/dates";
import {
  computeMostActiveMembers,
  computePeakHoursHeatmap,
  computeRoomUtilization,
  type UsageReportBooking,
} from "@/lib/reports/usage";
import { SCHEDULE_END_HOUR, SCHEDULE_START_HOUR } from "@/lib/schedule/hours";
import { createClient } from "@/lib/supabase/server";

const DEFAULT_RANGE_DAYS = 30;

export default async function UsageReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const params = await searchParams;
  const to = params.to ?? todayDateString();
  const from = params.from ?? addDays(to, -(DEFAULT_RANGE_DAYS - 1));

  const supabase = await createClient();

  const [{ data: rooms }, { data: bookingRows }] = await Promise.all([
    supabase.from("rooms").select("id, name").order("name"),
    supabase
      .from("bookings")
      .select("room_id, user_id, date, start_time, end_time, status")
      .gte("date", from)
      .lte("date", to),
  ]);

  const bookings = (bookingRows ?? []) as UsageReportBooking[];
  const roomList = rooms ?? [];

  const userIds = [...new Set(bookings.map((booking) => booking.user_id))];
  const { data: profileRows } = userIds.length
    ? await supabase.from("profiles").select("id, display_name").in("id", userIds)
    : { data: [] as { id: string; display_name: string | null }[] };
  const displayNameById = new Map(
    (profileRows ?? []).map((profile) => [profile.id, profile.display_name ?? "Unknown member"])
  );

  const dayCount = enumerateDates(from, to).length;
  const scheduleHours = SCHEDULE_END_HOUR - SCHEDULE_START_HOUR;

  const roomUtilization = computeRoomUtilization(bookings, roomList, dayCount, scheduleHours);
  const mostActiveMembers = computeMostActiveMembers(bookings, displayNameById);
  const peakHours = computePeakHoursHeatmap(bookings, SCHEDULE_START_HOUR, SCHEDULE_END_HOUR);

  return (
    <div className="mx-auto flex min-h-full w-full max-w-3xl flex-col gap-6 p-4">
      <div>
        <h1 className="text-display font-display text-ink-900">Usage reports</h1>
        <p className="text-body text-ink-500">
          Room demand and activity for the selected date range.
        </p>
      </div>

      <ReportsFilterForm from={from} to={to} />

      <section className="flex flex-col gap-3">
        <h2 className="text-h3 font-display text-ink-900">Room utilization</h2>
        <Card>
          <RoomUtilizationChart data={roomUtilization} />
        </Card>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-h3 font-display text-ink-900">Most active members</h2>
        <MostActiveMembers data={mostActiveMembers} />
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-h3 font-display text-ink-900">Peak hours</h2>
        <Card>
          <PeakHoursHeatmap rows={peakHours} />
        </Card>
      </section>
    </div>
  );
}
