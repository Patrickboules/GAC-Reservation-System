import Link from "next/link";

import { AvailabilitySearch } from "@/components/availability/availability-search";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";

export default async function AvailabilityPage() {
  const supabase = await createClient();
  const { data: rooms } = await supabase
    .from("rooms")
    .select("id, name, capacity, location")
    .order("name");

  return (
    <div className="mx-auto flex min-h-full w-full max-w-2xl flex-col gap-4 p-4">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-semibold">Check availability</h1>
          <p className="text-sm text-muted-foreground">
            Search a date and time range to see which rooms are free.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" render={<Link href="/schedule">Schedule</Link>} />
          <Button variant="outline" render={<Link href="/rooms">Rooms</Link>} />
        </div>
      </div>
      <AvailabilitySearch rooms={rooms ?? []} />
    </div>
  );
}
