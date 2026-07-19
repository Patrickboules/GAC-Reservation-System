import Link from "next/link";

import { RequestForm } from "@/components/bookings/request-form";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";

export default async function NewBookingPage() {
  const supabase = await createClient();
  const { data: rooms } = await supabase.from("rooms").select("id, name").order("name");

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-xl flex-col gap-4 p-4">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-semibold">Request a room</h1>
          <p className="text-sm text-muted-foreground">
            Submit a request for review — an admin will approve or reject it.
          </p>
        </div>
        <Button variant="outline" render={<Link href="/bookings">My bookings</Link>} />
      </div>
      <RequestForm rooms={rooms ?? []} />
    </div>
  );
}
