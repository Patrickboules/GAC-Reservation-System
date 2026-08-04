import type { SupabaseClient } from "@supabase/supabase-js";

import { isBookingPast } from "@/lib/dates";

/** Server-enforced cap on a member's simultaneously open pending requests. */
export const MAX_OPEN_PENDING_BOOKINGS = 5;

/**
 * Counts a member's still-open pending requests: status is `pending` AND the
 * slot hasn't already elapsed. Mirrors the "past" check bucketForBooking
 * already uses for My Bookings, so the cap (here), the "Pending (n/5)" tab
 * count, and the in-form "n of 5 pending requests" message all agree — a
 * request nobody decided on before its time passed no longer represents an
 * open slot to squat on, so it shouldn't keep counting against the cap.
 */
export async function countOpenPendingBookings(
  supabase: SupabaseClient,
  userId: string
): Promise<number> {
  const { data } = await supabase
    .from("bookings")
    .select("date, end_time")
    .eq("user_id", userId)
    .eq("status", "pending");

  return (data ?? []).filter((b) => !isBookingPast(b.date, b.end_time)).length;
}
