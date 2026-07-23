import { ScheduleContent } from "@/components/schedule/schedule-content";
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
      .select("id, name, capacity, amenities, building, floor, room_type, category_color")
      .order("name"),
    supabase.auth.getUser(),
  ]);

  const { data: favorites } = userData.user
    ? await supabase.from("favorite_rooms").select("room_id").eq("user_id", userData.user.id)
    : { data: null };
  const favoriteRoomIds = (favorites ?? []).map((favorite) => favorite.room_id);

  return (
    <div className="mx-auto flex min-h-full w-full max-w-2xl flex-col gap-4 p-4">
      <div>
        <h1 className="text-2xl font-semibold">Schedule</h1>
        <p className="text-sm text-muted-foreground">
          Room, time, and status only — pending and approved requests.
        </p>
      </div>
      <ScheduleContent
        rooms={rooms ?? []}
        initialFavoriteRoomIds={favoriteRoomIds}
        initialDate={date}
        initialRoomId={room}
      />
    </div>
  );
}
