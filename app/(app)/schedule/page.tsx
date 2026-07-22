import Link from "next/link";

import { ScheduleContent } from "@/components/schedule/schedule-content";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";

export default async function SchedulePage() {
  const supabase = await createClient();
  const { data: rooms } = await supabase
    .from("rooms")
    .select("id, name, capacity, amenities, building, floor, room_type")
    .order("name");

  return (
    <div className="mx-auto flex min-h-full w-full max-w-2xl flex-col gap-4 p-4">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-semibold">Schedule</h1>
          <p className="text-sm text-muted-foreground">
            Room, time, and status only — pending and approved requests.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" render={<Link href="/availability">Availability</Link>} />
          <Button variant="outline" render={<Link href="/rooms">Rooms</Link>} />
          <Button variant="outline" render={<Link href="/bookings/new">Request</Link>} />
          <Button variant="outline" render={<Link href="/">Home</Link>} />
        </div>
      </div>
      <ScheduleContent rooms={rooms ?? []} />
    </div>
  );
}
