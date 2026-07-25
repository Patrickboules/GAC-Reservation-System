import { minutesToTime, snapMinutesToStep, timeToMinutes } from "@/lib/dates";
import { BOOKING_TIME_STEP_MINUTES } from "@/lib/bookings/time-granularity";

/** Hour range the timeline grid renders, per UI-Redesign-Spec section 3. */
export const SCHEDULE_START_HOUR = 8;
export const SCHEDULE_END_HOUR = 23;

const RANGE_START_MINUTES = SCHEDULE_START_HOUR * 60;
const RANGE_END_MINUTES = SCHEDULE_END_HOUR * 60;

export function formatHourLabel(hour: number): string {
  const period = hour >= 12 ? "PM" : "AM";
  const displayHour = hour % 12 === 0 ? 12 : hour % 12;
  return `${displayHour} ${period}`;
}

const RANGE_MINUTES = RANGE_END_MINUTES - RANGE_START_MINUTES;

/** Horizontal position (0-100) of a "HH:MM:SS" time along the time axis, clamped to the visible range. */
export function percentForTime(time: string): number {
  const minutes = Math.min(Math.max(timeToMinutes(time), RANGE_START_MINUTES), RANGE_END_MINUTES);
  return ((minutes - RANGE_START_MINUTES) / RANGE_MINUTES) * 100;
}

/**
 * Inverse of percentForTime: a 0-100 horizontal percent along the time axis -> a
 * "HH:MM" time, clamped to the visible range and snapped to the same step used by
 * the time-range picker so a drag lines up with what the booking sheet will submit.
 */
export function timeForPercent(percent: number): string {
  const clampedPercent = Math.min(Math.max(percent, 0), 100);
  const minutes = RANGE_START_MINUTES + (clampedPercent / 100) * RANGE_MINUTES;
  return minutesToTime(snapMinutesToStep(minutes, BOOKING_TIME_STEP_MINUTES));
}

export interface TimeAxisGridline {
  hour: number;
  /** true for a half-hour mark (minute 30), false for an on-the-hour mark. */
  isHalfHour: boolean;
  percent: number;
}

/** Hour and half-hour marks across the operating window as percentages, shared by the time header and background gridlines. */
export function timeAxisGridlines(): TimeAxisGridline[] {
  const marks: TimeAxisGridline[] = [];
  for (let hour = SCHEDULE_START_HOUR; hour <= SCHEDULE_END_HOUR; hour++) {
    marks.push({ hour, isHalfHour: false, percent: percentForTime(minutesToTime(hour * 60)) });
    if (hour < SCHEDULE_END_HOUR) {
      marks.push({ hour, isHalfHour: true, percent: percentForTime(minutesToTime(hour * 60 + 30)) });
    }
  }
  return marks;
}
