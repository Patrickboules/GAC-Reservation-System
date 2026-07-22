import Link from "next/link";
import { notFound } from "next/navigation";
import { MapPin, Users } from "lucide-react";

import { Button } from "@/components/kit/button";
import { amenityIcon } from "@/components/kit/room-card";
import { addDays, formatDateLabel, todayDateString } from "@/lib/dates";
import { formatRoomField } from "@/lib/rooms";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/server";

const STRIP_DAYS = 7;

export default async function RoomDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const startDate = todayDateString();
  const endDate = addDays(startDate, STRIP_DAYS - 1);

  const [{ data: room }, { data: upcomingBookings }] = await Promise.all([
    supabase
      .from("rooms")
      .select("id, name, capacity, amenities, location, rules")
      .eq("id", id)
      .maybeSingle(),
    supabase
      .from("bookings_schedule")
      .select("date")
      .eq("room_id", id)
      .eq("status", "approved")
      .gte("date", startDate)
      .lte("date", endDate),
  ]);

  if (!room) {
    notFound();
  }

  const busyDates = new Set((upcomingBookings ?? []).map((booking) => booking.date));
  const strip = Array.from({ length: STRIP_DAYS }, (_, i) => addDays(startDate, i)).map(
    (date) => ({ date, busy: busyDates.has(date) })
  );

  const amenities: string[] = room.amenities ?? [];
  const ruleLines: string[] = ((room.rules as string | null) ?? "")
    .split("\n")
    .map((line: string) => line.trim())
    .filter(Boolean);

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
              <Users className="size-4 shrink-0" aria-hidden="true" />
              {formatRoomField(room.capacity)}
            </span>
            <span className="flex items-center gap-1.5">
              <MapPin className="size-4 shrink-0" aria-hidden="true" />
              {formatRoomField(room.location)}
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

          <Button size="lg" render={<Link href={`/bookings/new?room=${room.id}`}>Book this room</Link>} />
        </div>
      </div>
    </div>
  );
}
