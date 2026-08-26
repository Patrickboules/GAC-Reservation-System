import { findConflictingBookings, type BookingTimeSlot } from "@/lib/bookings/conflict-check";
import { LATEST_BOOKING_END_MINUTES } from "@/lib/bookings/limits";
import { BOOKING_TIME_STEP_MINUTES } from "@/lib/bookings/time-granularity";
import { minutesToTime } from "@/lib/dates";
import { SCHEDULE_START_HOUR } from "@/lib/schedule/hours";

const SLOT_DURATION_MINUTES = 60;

/**
 * First `SLOT_DURATION_MINUTES`-long slot, snapped to the booking time step, that
 * doesn't overlap any of `existingBookings` for `roomId`/`date` within the
 * operating window. Used to give a room-first booking entry a sensible default
 * time instead of a blind 9–10am that may already be taken. Returns null if the
 * whole operating window is booked solid.
 */
export function findNextFreeSlot(
  roomId: string,
  date: string,
  existingBookings: readonly BookingTimeSlot[]
): { startTime: string; endTime: string } | null {
  const windowStart = SCHEDULE_START_HOUR * 60;
  // Bounded by the booking cap, not the schedule view's (later) visual
  // rendering window — a suggested slot must itself be a bookable slot.
  const windowEnd = LATEST_BOOKING_END_MINUTES;

  for (
    let candidateStart = windowStart;
    candidateStart + SLOT_DURATION_MINUTES <= windowEnd;
    candidateStart += BOOKING_TIME_STEP_MINUTES
  ) {
    const startTime = minutesToTime(candidateStart);
    const endTime = minutesToTime(candidateStart + SLOT_DURATION_MINUTES);
    const conflicts = findConflictingBookings(
      { room_id: roomId, date, start_time: startTime, end_time: endTime },
      existingBookings
    );
    if (conflicts.length === 0) {
      return { startTime, endTime };
    }
  }

  return null;
}
