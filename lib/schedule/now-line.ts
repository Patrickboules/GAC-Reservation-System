"use client";

import { useEffect, useState } from "react";

import { formatTimeLabel, toDateString } from "@/lib/dates";
import { percentForTime } from "@/lib/schedule/hours";

/** How often the now-line position refreshes while the tab stays open. */
const REFRESH_INTERVAL_MS = 60_000;

function currentTimeOfDay(now: Date): string {
  return `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}:${String(
    now.getSeconds()
  ).padStart(2, "0")}`;
}

export interface NowOffset {
  /** Horizontal position (0-100) along the time axis (see lib/schedule/hours.ts). */
  percent: number;
  /** Current time formatted for display, e.g. "2:20 PM". */
  timeLabel: string;
}

/**
 * Current position/time along the time axis, or null when `date` isn't
 * today. Recomputes on an interval so the now-line moves (and its label
 * stays accurate) without a page reload while the tab stays open.
 */
export function useNowOffsetPercent(date: string): NowOffset | null {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), REFRESH_INTERVAL_MS);
    return () => clearInterval(id);
  }, []);

  if (toDateString(now) !== date) return null;
  const time = currentTimeOfDay(now);
  return { percent: percentForTime(time), timeLabel: formatTimeLabel(time) };
}
