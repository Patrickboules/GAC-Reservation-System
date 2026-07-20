import type { BookingStatus } from "@/lib/bookings/conflict-check";
import { isBookingPast } from "@/lib/dates";

/** A booking can be cancelled or edited only while it's pending/approved and not yet past. */
export function isBookingModifiable(
  status: BookingStatus,
  date: string,
  endTime: string
): boolean {
  if (status !== "pending" && status !== "approved") {
    return false;
  }
  return !isBookingPast(date, endTime);
}
