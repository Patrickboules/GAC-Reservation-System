import Link from "next/link";

import { Button } from "@/components/kit/button";
import { ScheduleContent } from "@/components/schedule/schedule-content";
import type { ScheduleRoom } from "@/lib/rooms-filters";
import { createClient } from "@/lib/supabase/server";

export default async function SchedulePage({
  searchParams,
}: {
  searchParams: Promise<{ room?: string; date?: string }>;
}) {
  const { room, date } = await searchParams;
  const supabase = await createClient();
  const [{ data: rooms }, { data: userData }] = await Promise.all([
    supabase
      .from("rooms")
      .select("id, name, amenities, building, floor, room_type, category_color")
      .order("name"),
    supabase.auth.getUser(),
  ]);

  // `capacity` was dropped from rooms in migration 20260801000000; ScheduleRoom
  // still carries the field for the filter bar's capacity buckets, so supply null.
  const scheduleRooms: ScheduleRoom[] = (rooms ?? []).map((room) => ({
    ...room,
    capacity: null,
  }));

  const authenticated = Boolean(userData.user);

  const { data: favorites } = userData.user
    ? await supabase.from("favorite_rooms").select("room_id").eq("user_id", userData.user.id)
    : { data: null };
  const favoriteRoomIds = (favorites ?? []).map((favorite) => favorite.room_id);

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
            Room, time, and status only — pending and approved requests.
          </p>
        </div>
        {!authenticated && (
          <Button size="lg" render={<Link href="/login">Sign in to reserve</Link>} />
        )}
      </div>
      <ScheduleContent
        rooms={scheduleRooms}
        initialFavoriteRoomIds={favoriteRoomIds}
        initialDate={date}
        initialRoomId={room}
        authenticated={authenticated}
      />
    </div>
  );
}
