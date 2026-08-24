import Link from "next/link";

import { RoomsTable, type AdminRoomRow } from "@/components/admin/rooms-table";
import { Button } from "@/components/kit/button";
import { createClient } from "@/lib/supabase/server";

interface RoomRow {
  id: string;
  name: string;
  amenities: string[] | null;
  building: string | null;
  floor: string | null;
  category_color: string | null;
}

export default async function AdminRoomsPage() {
  const supabase = await createClient();

  const { data: rooms, error: roomsError } = await supabase
    .from("rooms")
    .select("id, name, amenities, building, floor, category_color")
    .order("name");

  if (roomsError) {
    throw new Error(roomsError.message);
  }

  const roomRows: AdminRoomRow[] = ((rooms ?? []) as RoomRow[]).map((room) => ({
    id: room.id,
    name: room.name,
    building: room.building,
    floor: room.floor,
    amenities: room.amenities ?? [],
    categoryColor: room.category_color,
  }));

  return (
    <div className="mx-auto flex min-h-full w-full max-w-5xl flex-col gap-4 p-4">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h1 className="font-display text-h2 text-ink-900">Manage rooms</h1>
          <p className="text-small text-ink-500">Add, edit, and remove rooms members can request.</p>
        </div>
        <Button variant="secondary" render={<Link href="/admin">Dashboard</Link>} />
      </div>

      <RoomsTable rooms={roomRows} />
    </div>
  );
}
