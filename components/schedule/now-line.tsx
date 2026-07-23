"use client";

import { useNowOffsetPercent } from "@/lib/schedule/now-line";

/**
 * Sky-300 current-time indicator for the timeline grid's horizontal time axis.
 * Renders nothing unless `date` is today; position refreshes on an interval.
 */
export function NowLine({ date, showDot = true }: { date: string; showDot?: boolean }) {
  const percent = useNowOffsetPercent(date);
  if (percent === null) return null;

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-y-0 z-20 border-l-2 border-sky-300"
      style={{ left: `${percent}%` }}
    >
      {showDot ? (
        <span className="absolute -left-1.5 -top-1 h-3 w-3 rounded-full bg-sky-300" />
      ) : null}
    </div>
  );
}
