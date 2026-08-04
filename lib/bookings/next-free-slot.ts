import { findConflictingBookings, type BookingTimeSlot } from "@/lib/bookings/conflict-check";
import { BOOKING_TIME_STEP_MINUTES, LATEST_BOOKING_END_TIME } from "@/lib/bookings/time-granularity";
import { minutesToTime, timeToMinutes } from "@/lib/dates";
import { SCHEDULE_END_HOUR, SCHEDULE_START_HOUR } from "@/lib/schedule/hours";

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
  const windowEnd = Math.min(SCHEDULE_END_HOUR * 60, timeToMinutes(LATEST_BOOKING_END_TIME));

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
