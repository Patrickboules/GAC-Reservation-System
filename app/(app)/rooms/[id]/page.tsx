import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";

import { AmenityChip } from "@/components/kit/amenity-chip";
import { Button } from "@/components/kit/button";
import { todayDateString } from "@/lib/dates";
import { createClient } from "@/lib/supabase/server";

import { PendingRequests, type PendingBooking } from "./pending-requests";

export default async function RoomDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const startDate = todayDateString();

  const [{ data: room }, { data: pendingBookings }] = await Promise.all([
    supabase.from("rooms").select("id, name, amenities").eq("id", id).maybeSingle(),
    supabase
      .from("bookings_schedule")
      .select("start_time, end_time, status")
      .eq("room_id", id)
      .eq("date", startDate)
      .eq("status", "pending")
      .order("start_time", { ascending: true }),
  ]);

  if (!room) {
    notFound();
  }

  const amenities: string[] = room.amenities ?? [];

  return (
    <div className="mx-auto flex min-h-full w-full max-w-2xl flex-col gap-3 p-4">
      <Button
        variant="ghost"
        size="sm"
        className="-ml-2 self-start"
        render={
          <Link href="/rooms">
            <ChevronLeft className="size-4" aria-hidden="true" />
            Back to rooms
          </Link>
        }
      />

      <div className="overflow-hidden rounded-3xl border border-line bg-surface shadow-md">
        <div className="h-24 w-full bg-sky-100 sm:h-28" aria-hidden="true" />
        <div className="flex flex-col gap-8 p-5 sm:p-7">
          <div className="py-4 text-center sm:py-6">
            <h1 className="font-display text-display font-bold text-ink-900">{room.name}</h1>
          </div>

          {amenities.length > 0 && (
            <div>
              <p className="mb-2.5 text-small font-semibold text-ink-700">Amenities</p>
              <div className="flex flex-wrap gap-2">
                {amenities.map((amenity) => (
                  <AmenityChip key={amenity} amenity={amenity} />
                ))}
              </div>
            </div>
          )}

          <PendingRequests bookings={(pendingBookings ?? []) as PendingBooking[]} />

          <Button
            size="lg"
            className="w-full"
            render={<Link href={`/bookings/new?room=${room.id}`}>Reserve this Room</Link>}
          />
        </div>
      </div>
    </div>
  );
}
