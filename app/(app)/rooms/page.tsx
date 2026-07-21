import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatRoomField } from "@/lib/rooms";
import { createClient } from "@/lib/supabase/server";

export default async function RoomsPage() {
  const supabase = await createClient();
  const { data: rooms } = await supabase
    .from("rooms")
    .select("id, name, capacity, location")
    .order("name");

  return (
    <div className="mx-auto flex min-h-full w-full max-w-2xl flex-col gap-4 p-4">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-semibold">Rooms</h1>
          <p className="text-sm text-muted-foreground">Browse rooms and halls.</p>
        </div>
        <Button variant="outline" render={<Link href="/">Home</Link>} />
      </div>

      <div className="flex flex-col gap-3">
        {(rooms ?? []).map((room) => (
          <Link key={room.id} href={`/rooms/${room.id}`}>
            <Card>
              <CardHeader>
                <CardTitle>{room.name}</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                Capacity: {formatRoomField(room.capacity)} · Location: {formatRoomField(room.location)}
              </CardContent>
            </Card>
          </Link>
        ))}
        {(rooms ?? []).length === 0 ? (
          <p className="text-sm text-muted-foreground">No rooms found.</p>
        ) : null}
      </div>
    </div>
  );
}
