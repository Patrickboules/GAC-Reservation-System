import Link from "next/link";

import { BookingStatusBadge } from "@/components/schedule/booking-status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatDateLabel, formatTimeLabel } from "@/lib/dates";
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

const BUCKETS: { value: BookingBucket; label: string }[] = [
  { value: "upcoming", label: "Upcoming" },
  { value: "pending", label: "Pending" },
  { value: "past", label: "Past" },
  { value: "cancelled", label: "Cancelled" },
];

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

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-2xl flex-col gap-4 p-4">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-semibold">My bookings</h1>
          <p className="text-sm text-muted-foreground">Requests you&apos;ve submitted.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" render={<Link href="/bookings/new">New request</Link>} />
          <Button variant="outline" render={<Link href="/">Home</Link>} />
        </div>
      </div>

      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}

      {myBookings.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          You haven&apos;t requested any rooms yet.
        </p>
      ) : (
        <Tabs defaultValue="upcoming">
          <TabsList className="w-full">
            {BUCKETS.map(({ value, label }) => (
              <TabsTrigger key={value} value={value}>
                {label} ({grouped[value].length})
              </TabsTrigger>
            ))}
          </TabsList>

          {BUCKETS.map(({ value }) => {
            const bucketBookings = sortBookings(grouped[value], value);
            return (
              <TabsContent key={value} value={value} className="mt-3">
                {bucketBookings.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Nothing here.</p>
                ) : (
                  <ul className="flex flex-col gap-3">
                    {bucketBookings.map((booking) => (
                      <li key={booking.id}>
                        <Link href={`/bookings/${booking.id}`} className="block">
                          <Card className="transition-colors hover:bg-accent/50">
                            <CardHeader className="flex flex-row items-center justify-between gap-2">
                              <CardTitle>{roomName(booking.rooms)}</CardTitle>
                              <BookingStatusBadge status={booking.status} />
                            </CardHeader>
                            <CardContent className="text-sm text-muted-foreground">
                              {formatDateLabel(booking.date)} ·{" "}
                              {formatTimeLabel(booking.start_time)}–
                              {formatTimeLabel(booking.end_time)} · {booking.service}
                            </CardContent>
                          </Card>
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </TabsContent>
            );
          })}
        </Tabs>
      )}
    </div>
  );
}
