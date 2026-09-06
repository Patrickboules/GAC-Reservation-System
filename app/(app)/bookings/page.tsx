import Link from "next/link";
import { Suspense } from "react";

import { Button } from "@/components/kit/button";
import { BookingToastFeedback } from "@/components/bookings/booking-toast-feedback";
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
  reject_reason: string | null;
  group_id: string;
  rooms: { name: string } | { name: string }[] | null;
}

/** Joins every room name in the list — a plain single-room join from Supabase
 * arrives as a 1-element array (or a bare object) and joins to just that
 * name; a grouped multi-room reservation (see groupByReservation) arrives as
 * several and joins to "401, 402, 403". */
function roomName(rooms: MyBooking["rooms"]): string {
  if (!rooms) return "Unknown room";
  if (!Array.isArray(rooms)) return rooms.name;
  return rooms.map((room) => room.name).join(", ") || "Unknown room";
}

/** A collective reservation's N rooms share one group_id and always move
 * through status/date/time together — collapse them into one card, keyed by
 * a representative row's id (resolves the whole group in edit/cancel actions). */
function groupByReservation(bookings: MyBooking[]): MyBooking[] {
  const groups = new Map<string, MyBooking[]>();
  for (const booking of bookings) {
    const existing = groups.get(booking.group_id);
    if (existing) existing.push(booking);
    else groups.set(booking.group_id, [booking]);
  }
  return Array.from(groups.values()).map((rows) => ({
    ...rows[0],
    rooms: rows.map((row) => ({ name: roomName(row.rooms) })),
  }));
}

const BUCKETS: BookingBucket[] = ["upcoming", "pending", "past", "rejected", "cancelled"];

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
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: bookings, error: bookingsError } = await supabase
    .from("bookings")
    .select("id, date, start_time, end_time, service, status, reject_reason, group_id, rooms(name)")
    .eq("user_id", user?.id ?? "")
    .order("date", { ascending: false })
    .order("start_time", { ascending: false });

  if (bookingsError) {
    throw new Error(bookingsError.message);
  }

  const myBookings = groupByReservation((bookings ?? []) as MyBooking[]);

  const grouped: Record<BookingBucket, MyBooking[]> = {
    upcoming: [],
    pending: [],
    past: [],
    rejected: [],
    cancelled: [],
  };
  for (const booking of myBookings) {
    grouped[bucketForBooking(booking.status, booking.date, booking.end_time)].push(booking);
  }

  const buckets: Record<BookingBucket, MyBookingCardData[]> = {
    upcoming: [],
    pending: [],
    past: [],
    rejected: [],
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
      rejectReason: booking.reject_reason,
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

      <Suspense fallback={null}>
        <BookingToastFeedback />
      </Suspense>

      {error ? (
        <p role="alert" className="text-small text-status-rejected-fg">
          {error}
        </p>
      ) : null}

      <MyBookingsTabs buckets={buckets} />
    </div>
  );
}
