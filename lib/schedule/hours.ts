import { minutesToTime, snapMinutesToStep, timeToMinutes } from "@/lib/dates";
import { BOOKING_TIME_STEP_MINUTES } from "@/lib/bookings/time-granularity";

/** Hour range the resource-day calendar renders, per UI-Redesign-Spec section 3. */
export const SCHEDULE_START_HOUR = 8;
export const SCHEDULE_END_HOUR = 23;

/** Row height for one hour, per UI-Redesign-Spec section 3 ("~56px tall"). */
export const HOUR_ROW_HEIGHT_PX = 56;

const RANGE_START_MINUTES = SCHEDULE_START_HOUR * 60;
const RANGE_END_MINUTES = SCHEDULE_END_HOUR * 60;

/** Hours from SCHEDULE_START_HOUR to SCHEDULE_END_HOUR inclusive, for gridline/axis rendering. */
export function scheduleHours(): number[] {
  return Array.from({ length: SCHEDULE_END_HOUR - SCHEDULE_START_HOUR + 1 }, (_, i) => SCHEDULE_START_HOUR + i);
}

export function formatHourLabel(hour: number): string {
  const period = hour >= 12 ? "PM" : "AM";
  const displayHour = hour % 12 === 0 ? 12 : hour % 12;
  return `${displayHour} ${period}`;
}

/** Vertical offset (px) of a "HH:MM:SS" time within the grid, clamped to the visible range. */
export function offsetForTime(time: string): number {
  const minutes = Math.min(Math.max(timeToMinutes(time), RANGE_START_MINUTES), RANGE_END_MINUTES);
  return ((minutes - RANGE_START_MINUTES) / 60) * HOUR_ROW_HEIGHT_PX;
}

/**
 * Inverse of offsetForTime (US-036 drag-to-create): a vertical pixel offset within
 * the grid -> a "HH:MM" time, clamped to the visible range and snapped to the same
 * step used by the time-range picker so a drag lines up with what the booking sheet
 * will actually submit.
 */
export function timeForOffset(offsetPx: number): string {
  const clampedPx = Math.min(Math.max(offsetPx, 0), (SCHEDULE_END_HOUR - SCHEDULE_START_HOUR) * HOUR_ROW_HEIGHT_PX);
  const minutes = RANGE_START_MINUTES + (clampedPx / HOUR_ROW_HEIGHT_PX) * 60;
  return minutesToTime(snapMinutesToStep(minutes, BOOKING_TIME_STEP_MINUTES));
}
