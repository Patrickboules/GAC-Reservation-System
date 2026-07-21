import Link from "next/link";
import { notFound } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatAmenities, formatRoomField } from "@/lib/rooms";
import { createClient } from "@/lib/supabase/server";

export default async function RoomDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: room } = await supabase
    .from("rooms")
    .select("id, name, capacity, amenities, location, rules")
    .eq("id", id)
    .maybeSingle();

  if (!room) {
    notFound();
  }

  return (
    <div className="mx-auto flex min-h-full w-full max-w-2xl flex-col gap-4 p-4">
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-2xl font-semibold">{room.name}</h1>
        <Button variant="outline" render={<Link href="/rooms">Back to rooms</Link>} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Details</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 text-sm">
          <div>
            <p className="font-medium">Capacity</p>
            <p className="text-muted-foreground">{formatRoomField(room.capacity)}</p>
          </div>
          <div>
            <p className="font-medium">Amenities</p>
            <p className="text-muted-foreground">{formatAmenities(room.amenities)}</p>
          </div>
          <div>
            <p className="font-medium">Location</p>
            <p className="text-muted-foreground">{formatRoomField(room.location)}</p>
          </div>
          <div>
            <p className="font-medium">Usage rules</p>
            <p className="whitespace-pre-wrap text-muted-foreground">{formatRoomField(room.rules)}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
