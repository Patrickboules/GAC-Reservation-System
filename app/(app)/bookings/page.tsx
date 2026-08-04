import Link from "next/link";

import { Button } from "@/components/kit/button";
import { MyBookingsTabs, type MyBookingCardData } from "@/components/bookings/my-bookings-tabs";
import type { BookingStatus } from "@/lib/bookings/conflict-check";
import { bucketForBooking, type BookingBucket } from "@/lib/bookings/status";
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

const BUCKETS: BookingBucket[] = ["upcoming", "pending", "past", "cancelled"];

function sortBookings(bookings: MyBooking[], bucket: BookingBucket): MyBooking[] {
  const sorted = [...bookings].sort((a, b) =>
    a.date === b.date
      ? a.start_time.localeCompare(b.start_time)
      : a.date.localeCompare(b.date)
  );
  // Upcoming/pending: soonest first. Past/cancelled: most recent first.
  return bucket === "upcoming" || bucket === "pending" ? sorted : sorted.reverse();
}

export default async function MyBookingsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; submitted?: string; tab?: string }>;
}) {
  const { error, submitted, tab } = await searchParams;
  const initialTab = BUCKETS.includes(tab as BookingBucket) ? (tab as BookingBucket) : undefined;
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

  const grouped: Record<BookingBucket, MyBooking[]> = {
    upcoming: [],
    pending: [],
    past: [],
    cancelled: [],
  };
  for (const booking of myBookings) {
    grouped[bucketForBooking(booking.status, booking.date, booking.end_time)].push(booking);
  }

  const buckets: Record<BookingBucket, MyBookingCardData[]> = {
    upcoming: [],
    pending: [],
    past: [],
    cancelled: [],
  };
  for (const bucket of BUCKETS) {
    buckets[bucket] = sortBookings(grouped[bucket], bucket).map((booking) => ({
      id: booking.id,
      roomName: roomName(booking.rooms),
      date: booking.date,
      startTime: booking.start_time,
      endTime: booking.end_time,
      service: booking.service,
      status: booking.status,
    }));
  }

  return (
    <div className="mx-auto flex min-h-full w-full max-w-2xl flex-col gap-4 p-4">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h1 className="font-display text-h2 text-ink-900">My bookings</h1>
          <p className="text-small text-ink-500">Requests you&apos;ve submitted.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" render={<Link href="/rooms">New request</Link>} />
          <Button variant="secondary" render={<Link href="/">Home</Link>} />
        </div>
      </div>

      {submitted === "1" ? (
        <p role="status" className="text-small font-medium text-status-approved-fg">
          Request submitted — pending approval.
        </p>
      ) : null}

      {error ? (
        <p role="alert" className="text-small font-medium text-status-rejected-fg">
          {error}
        </p>
      ) : null}

      <MyBookingsTabs buckets={buckets} initialTab={initialTab} />
    </div>
  );
}
