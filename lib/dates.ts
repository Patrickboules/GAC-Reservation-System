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

export function formatTimeLabel(timeStr: string): string {
  const [hourStr, minuteStr] = timeStr.split(":");
  const hour = Number(hourStr);
  const period = hour >= 12 ? "PM" : "AM";
  const displayHour = hour % 12 === 0 ? 12 : hour % 12;
  return `${displayHour}:${minuteStr} ${period}`;
}
