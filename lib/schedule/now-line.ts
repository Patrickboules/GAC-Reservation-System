"use client";

import { useEffect, useState } from "react";

import { toDateString } from "@/lib/dates";
import { offsetForTime } from "@/lib/schedule/hours";

/** How often the now-line position refreshes while the tab stays open. */
const REFRESH_INTERVAL_MS = 60_000;

function currentTimeOfDay(now: Date): string {
  return `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}:${String(
    now.getSeconds()
  ).padStart(2, "0")}`;
}

/**
 * Pixel offset (within the schedule grid's coordinate system, see lib/schedule/hours.ts)
 * of the current time, or null when `date` isn't today. Recomputes on an interval so the
 * now-line moves without a page reload while the tab stays open.
 */
export function useNowOffsetPx(date: string): number | null {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), REFRESH_INTERVAL_MS);
    return () => clearInterval(id);
  }, []);

  if (toDateString(now) !== date) return null;
  return offsetForTime(currentTimeOfDay(now));
}
