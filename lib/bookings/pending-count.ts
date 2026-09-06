import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Counts open pending *reservations*, not rows — a collective booking (a hall
 * plus any of its subrooms) inserts one row per selected room sharing a
 * `group_id`, so counting raw rows overcounts by however many rooms were in
 * the request. This fetches each pending row's `group_id` and counts the
 * distinct set, matching the grouping already done for the "My Bookings" and
 * admin-queue views (app/(app)/bookings/page.tsx, app/(app)/admin/requests/page.tsx).
 *
 * Pass `userId` to scope the count to one member (the pending-cap check, the
 * "X of 5 pending requests" banner); omit it for an app-wide count (the admin
 * dashboard tile).
 */
export async function countOpenPendingReservations(
  supabase: SupabaseClient,
  userId?: string
): Promise<number> {
  let query = supabase.from("bookings").select("group_id").eq("status", "pending");
  if (userId) {
    query = query.eq("user_id", userId);
  }
  const { data, error } = await query;
  if (error) {
    throw error;
  }
  return new Set((data ?? []).map((row) => row.group_id as string)).size;
}
