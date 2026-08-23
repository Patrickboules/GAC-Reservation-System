import Link from "next/link";
import { notFound } from "next/navigation";
import { MapPin } from "lucide-react";

import { Button } from "@/components/kit/button";
import { amenityIcon } from "@/components/kit/room-card";
import { CONFLICTING_STATUSES, type BookingStatus } from "@/lib/bookings/conflict-check";
import { addDays, formatDateLabel, formatTimeLabel, todayDateString } from "@/lib/dates";
import { formatRoomField, formatRoomLocation } from "@/lib/rooms";
import { formatHourLabel, percentForTime, SCHEDULE_END_HOUR, SCHEDULE_START_HOUR } from "@/lib/schedule/hours";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/server";

const STRIP_DAYS = 7;
/** Hour marks drawn on the read-only today-availability bar; every hour would overlap at this page's width. */
const GRIDLINE_HOURS = [8, 11, 14, 17, 20, 23];

interface TodayBooking {
  start_time: string;
  end_time: string;
  status: BookingStatus;
}

/** Read-only hour-by-hour view of this room's bookings for today. */
function TodayAvailabilityBar({ bookings }: { bookings: TodayBooking[] }) {
  return (
    <div>
      <p className="mb-2 text-small font-semibold text-ink-700">Today&apos;s availability</p>
      <div className="relative h-9 w-full overflow-hidden rounded-md border border-line bg-canvas">
        {GRIDLINE_HOURS.map((hour) => (
          <div
            key={hour}
            aria-hidden="true"
            className="absolute inset-y-0 w-px bg-line/60"
            style={{ left: `${percentForTime(`${String(hour).padStart(2, "0")}:00:00`)}%` }}
          />
        ))}
        {bookings.map((booking, i) => {
          const left = percentForTime(booking.start_time);
          const width = Math.max(percentForTime(booking.end_time) - left, 1.5);
          return (
            <div
              key={i}
              title={`${formatTimeLabel(booking.start_time)}–${formatTimeLabel(booking.end_time)}`}
              className={cn(
                "absolute inset-y-1 rounded-sm",
                booking.status === "approved" ? "bg-status-approved-fg/70" : "bg-status-pending-fg/70"
              )}
              style={{ left: `${left}%`, width: `${width}%` }}
            />
          );
        })}
      </div>
      <div className="mt-1 flex justify-between text-caption text-ink-500">
        <span>{formatHourLabel(SCHEDULE_START_HOUR)}</span>
        <span>{formatHourLabel(SCHEDULE_END_HOUR)}</span>
      </div>
      {bookings.length > 0 && (
        <ul className="sr-only">
          {bookings.map((booking, i) => (
            <li key={i}>
              {formatTimeLabel(booking.start_time)}–{formatTimeLabel(booking.end_time)},{" "}
              {booking.status}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default async function RoomDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const startDate = todayDateString();
  const endDate = addDays(startDate, STRIP_DAYS - 1);

  const [{ data: room }, { data: upcomingBookings }, { data: todayBookings }] = await Promise.all([
    supabase
      .from("rooms")
      .select("id, name, amenities, building, floor")
      .eq("id", id)
      .maybeSingle(),
    supabase
      .from("bookings_schedule")
      .select("date")
      .eq("room_id", id)
      .in("status", CONFLICTING_STATUSES)
      .gte("date", startDate)
      .lte("date", endDate),
    supabase
      .from("bookings_schedule")
      .select("start_time, end_time, status")
      .eq("room_id", id)
      .eq("date", startDate)
      .in("status", CONFLICTING_STATUSES)
      .order("start_time", { ascending: true }),
  ]);

  if (!room) {
    notFound();
  }

  const busyDates = new Set((upcomingBookings ?? []).map((booking) => booking.date));
  const strip = Array.from({ length: STRIP_DAYS }, (_, i) => addDays(startDate, i)).map(
    (date) => ({ date, busy: busyDates.has(date) })
  );

  const amenities: string[] = room.amenities ?? [];
  // location/rules were dropped in migration 20260801000000 when
  // supabase/rooms.json became the source of truth. Location is rebuilt from the
  // building/floor facets; rules are no longer tracked, so that section renders
  // the standard "Not specified" placeholder.
  const ruleLines: string[] = [];
  const location = formatRoomLocation(room.building, room.floor);

  return (
    <div className="mx-auto flex min-h-full w-full max-w-2xl flex-col gap-4 p-4">
      <div className="overflow-hidden rounded-lg border border-line bg-surface shadow-sm">
        <div className="h-24 w-full bg-sky-100" aria-hidden="true" />
        <div className="flex flex-col gap-4 p-4">
          <div className="flex items-start justify-between gap-2">
            <h1 className="font-display text-h2 text-ink-900">{room.name}</h1>
            <Button variant="secondary" size="sm" render={<Link href="/rooms">Back to rooms</Link>} />
          </div>

          <div className="flex flex-wrap items-center gap-4 text-small text-ink-500">
            <span className="flex items-center gap-1.5">
              <MapPin className="size-4 shrink-0" aria-hidden="true" />
              {formatRoomField(location)}
            </span>
          </div>

          <div>
            <p className="mb-2 text-small font-semibold text-ink-700">Amenities</p>
            {amenities.length > 0 ? (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {amenities.map((amenity: string) => {
                  const Icon = amenityIcon(amenity);
                  return (
                    <div key={amenity} className="flex items-center gap-2 text-small text-ink-700">
                      <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-sky-50">
                        <Icon className="size-4" aria-hidden="true" />
                      </span>
                      <span className="truncate">{amenity}</span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-small text-ink-500">Not specified</p>
            )}
          </div>

          <div>
            <p className="mb-2 text-small font-semibold text-ink-700">Usage rules</p>
            {ruleLines.length > 0 ? (
              <ul className="list-disc space-y-1 pl-5 text-small text-ink-500">
                {ruleLines.map((line: string, i: number) => (
                  <li key={i}>{line}</li>
                ))}
              </ul>
            ) : (
              <p className="text-small text-ink-500">Not specified</p>
            )}
          </div>

          <TodayAvailabilityBar bookings={(todayBookings ?? []) as TodayBooking[]} />

          <div>
            <p className="mb-2 text-small font-semibold text-ink-700">Next 7 days</p>
            <div className="grid grid-cols-7 gap-1.5">
              {strip.map(({ date, busy }) => (
                <div
                  key={date}
                  className="flex flex-col items-center gap-1 rounded-md border border-line bg-canvas py-2"
                >
                  <span className="font-mono text-caption text-ink-500">
                    {formatDateLabel(date).split(" ")[0]}
                  </span>
                  <span
                    aria-hidden="true"
                    className={cn(
                      "size-2 rounded-full",
                      busy ? "bg-status-pending-fg" : "bg-status-approved-fg"
                    )}
                  />
                  <span className="text-caption text-ink-500">{busy ? "Busy" : "Free"}</span>
                </div>
              ))}
            </div>
          </div>

          <Button
            size="lg"
            render={<Link href={`/bookings/new?room=${room.id}`}>Reserve this room</Link>}
          />
        </div>
      </div>
    </div>
  );
}
