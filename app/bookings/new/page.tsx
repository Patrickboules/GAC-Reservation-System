import { BookingSheet } from "@/components/bookings/booking-sheet";
import { createClient } from "@/lib/supabase/server";

export default async function NewBookingPage({
  searchParams,
}: {
  searchParams: Promise<{ room?: string; date?: string; start?: string; end?: string }>;
}) {
  const { room, date, start, end } = await searchParams;
  const supabase = await createClient();
  const { data: rooms } = await supabase.from("rooms").select("id, name").order("name");

  return (
    <BookingSheet
      rooms={rooms ?? []}
      defaultRoomId={room}
      defaultDate={date}
      defaultStartTime={start}
      defaultEndTime={end}
    />
  );
}
