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

export type BookingBucket = "upcoming" | "pending" | "past" | "cancelled";

/** Buckets a booking for "My bookings": cancelled and rejected are terminal
 * (never "upcoming"), everything else moves to "past" once its end time has
 * elapsed regardless of status. */
export function bucketForBooking(
  status: BookingStatus,
  date: string,
  endTime: string
): BookingBucket {
  if (status === "cancelled") return "cancelled";
  if (status === "rejected") return "past";
  if (isBookingPast(date, endTime)) return "past";
  return status === "pending" ? "pending" : "upcoming";
}
