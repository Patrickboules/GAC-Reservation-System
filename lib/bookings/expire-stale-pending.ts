import type { SupabaseClient } from "@supabase/supabase-js";

import { isBookingPast } from "@/lib/dates";
import { notifyBookingRejected } from "@/lib/notifications";

export const EXPIRED_PENDING_REASON =
  "Expired — no decision was made before the requested time.";

interface StalePendingRow {
  id: string;
  room_id: string;
  date: string;
  start_time: string;
  end_time: string;
}

/**
 * On-demand sweep (no scheduling infrastructure, mirrors
 * ensureReminderNotifications in lib/notifications.ts): a pending request
 * whose slot has already elapsed with no admin decision is auto-rejected with
 * a fixed reason, instead of sitting forever as a "Pending"/"Awaiting
 * approval" item under the Past tab in My Bookings. countOpenPendingBookings
 * (lib/bookings/limits.ts) already excludes these from the open-pending cap;
 * this closes the loop by giving them a real terminal status so they read
 * correctly wherever booking status is shown, and stop being permanently
 * un-cancellable, un-editable dead weight for the requester.
 *
 * Safe to call on every shell page load: the `.eq("status", "pending")` guard
 * on the update means a booking can only be expired once, and if an admin
 * decides it first the update simply matches zero rows (checked via the
 * returned row, not just the absence of an error) so no false "expired"
 * notification is sent on top of the real decision.
 */
export async function expireStalePendingBookings(
  admin: SupabaseClient,
  userId: string
): Promise<void> {
  const { data } = await admin
    .from("bookings")
    .select("id, room_id, date, start_time, end_time")
    .eq("user_id", userId)
    .eq("status", "pending");

  const stale = ((data ?? []) as StalePendingRow[]).filter((b) =>
    isBookingPast(b.date, b.end_time)
  );
  if (stale.length === 0) return;

  for (const booking of stale) {
    const { data: updated, error } = await admin
      .from("bookings")
      .update({ status: "rejected", reject_reason: EXPIRED_PENDING_REASON })
      .eq("id", booking.id)
      .eq("status", "pending")
      .select("id");

    if (error) {
      console.error(`Failed to expire stale pending booking ${booking.id}`, error);
      continue;
    }
    if (!updated || updated.length === 0) continue;

    await notifyBookingRejected(admin, {
      bookingId: booking.id,
      userId,
      roomId: booking.room_id,
      date: booking.date,
      startTime: booking.start_time,
      endTime: booking.end_time,
      reason: EXPIRED_PENDING_REASON,
    });
  }
}
