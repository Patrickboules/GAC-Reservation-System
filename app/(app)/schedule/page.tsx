import Link from "next/link";

import { Button } from "@/components/kit/button";
import { ScheduleContent } from "@/components/schedule/schedule-content";
import type { DayBooking } from "@/components/schedule/timeline-grid";
import { resolveDateOrToday } from "@/lib/dates";
import type { ScheduleRoom } from "@/lib/rooms-filters";
import { createClient } from "@/lib/supabase/server";
import { getCachedUser } from "@/lib/supabase/session";

export default async function SchedulePage({
  searchParams,
}: {
  searchParams: Promise<{ room?: string; date?: string }>;
}) {
  const { room, date } = await searchParams;
  const initialDate = resolveDateOrToday(date);
  const supabase = await createClient();
  const [{ data: rooms }, user, { data: initialBookingsData }] = await Promise.all([
    supabase
      .from("rooms")
      .select("id, name, amenities, building, floor, room_type, category_color")
      .order("name"),
    getCachedUser(),
    // Seeds TimelineGrid's first render so the public schedule — the
    // highest-traffic, unauthenticated-first-touch page — doesn't pay for an
    // extra client-side round trip to Supabase after hydration just to show
    // the day it's already displaying. Same view/columns/filter TimelineGrid
    // itself uses for every later date change (see its own comment there for
    // why bookings_schedule + status='approved' is filtered here).
    supabase
      .from("bookings_schedule")
      .select("id, room_id, date, start_time, end_time, status, service")
      .eq("date", initialDate)
      .eq("status", "approved")
      .order("start_time", { ascending: true }),
  ]);

  const scheduleRooms: ScheduleRoom[] = rooms ?? [];
  const initialBookings = (initialBookingsData ?? []) as unknown as DayBooking[];

  const authenticated = Boolean(user);

  return (
    <div className="flex min-h-full w-full flex-col gap-4 p-4">
      {/* Signed-out visitors have no app shell, so the public schedule carries
          its own brand line and the single call to action available to them. */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          {!authenticated && (
            <span className="font-display text-h3 font-semibold text-ink-900">GAC</span>
          )}
          <h1 className="text-2xl font-semibold">Schedule</h1>
          <p className="text-sm text-muted-foreground">
            Room, time, and service — approved reservations only.
          </p>
        </div>
        {!authenticated && (
          <Button size="lg" render={<Link href="/login">Sign in to reserve</Link>} />
        )}
      </div>
      <ScheduleContent
        rooms={scheduleRooms}
        initialDate={initialDate}
        initialRoomId={room}
        initialBookings={initialBookings}
      />
    </div>
  );
}
