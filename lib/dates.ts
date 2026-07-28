/** Local-timezone date helpers that operate on "YYYY-MM-DD" strings, matching
 * <input type="date"> and Postgres `date` values — avoids the UTC shift bugs
 * that `Date#toISOString()` introduces. */

export function toDateString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function parseDateString(dateStr: string): Date {
  const [year, month, day] = dateStr.split("-").map(Number);
  return new Date(year, month - 1, day);
}

export function addDays(dateStr: string, days: number): string {
  const date = parseDateString(dateStr);
  date.setDate(date.getDate() + days);
  return toDateString(date);
}

export function todayDateString(): string {
  return toDateString(new Date());
}

/** Inclusive list of "YYYY-MM-DD" strings from start to end, capped at 366
 * days as a sanity guard against runaway ranges. */
export function enumerateDates(start: string, end: string): string[] {
  const dates: string[] = [];
  let cursor = start;
  while (cursor <= end && dates.length < 366) {
    dates.push(cursor);
    cursor = addDays(cursor, 1);
  }
  return dates;
}

export function formatDateLabel(dateStr: string): string {
  return parseDateString(dateStr).toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

/** <input type="time"> yields "HH:MM"; normalize to "HH:MM:SS" so string
 * comparisons against Postgres `time` values (conflict-check, storage) are exact. */
export function normalizeTimeString(time: string): string {
  return time.length === 5 ? `${time}:00` : time;
}

/** True once a booking's end has passed relative to now (local time). */
export function isBookingPast(date: string, endTime: string): boolean {
  const [hour, minute, second] = endTime.split(":").map(Number);
  const end = parseDateString(date);
  end.setHours(hour, minute, second ?? 0, 0);
  return end.getTime() <= Date.now();
}

/** True if a booking's start is already in the past relative to now (local time) — guards against requesting/rescheduling into a slot that's already begun. */
export function isBookingStartInPast(date: string, startTime: string): boolean {
  const [hour, minute, second] = startTime.split(":").map(Number);
  const start = parseDateString(date);
  start.setHours(hour, minute, second ?? 0, 0);
  return start.getTime() < Date.now();
}

export function formatTimeLabel(timeStr: string): string {
  const [hourStr, minuteStr] = timeStr.split(":");
  const hour = Number(hourStr);
  const period = hour >= 12 ? "PM" : "AM";
  const displayHour = hour % 12 === 0 ? 12 : hour % 12;
  return `${displayHour}:${minuteStr} ${period}`;
}

/** "HH:MM" (or "HH:MM:SS") -> minutes since midnight. */
export function timeToMinutes(time: string): number {
  const [hour, minute] = time.split(":").map(Number);
  return hour * 60 + minute;
}

/** Minutes since midnight -> "HH:MM", clamped to a single day (0–1439). */
export function minutesToTime(totalMinutes: number): string {
  const clamped = Math.min(Math.max(totalMinutes, 0), 23 * 60 + 59);
  const hour = Math.floor(clamped / 60);
  const minute = clamped % 60;
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

/** Rounds minutes-since-midnight to the nearest multiple of `stepMinutes`. */
export function snapMinutesToStep(totalMinutes: number, stepMinutes: number): number {
  return Math.round(totalMinutes / stepMinutes) * stepMinutes;
}

/** Short relative label ("Just now", "5m ago", "3h ago", "2d ago") for a
 * timestamptz string, falling back to a short date once past a week. */
export function formatRelativeTime(isoString: string): string {
  const diffMs = Date.now() - new Date(isoString).getTime();
  const diffMinutes = Math.floor(diffMs / 60_000);

  if (diffMinutes < 1) return "Just now";
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  return new Date(isoString).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}
