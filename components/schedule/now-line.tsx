"use client";

import { useNowOffsetPx } from "@/lib/schedule/now-line";

/**
 * Sky-300 current-time indicator for the resource-day calendar (US-030).
 * Renders nothing unless `date` is today; position refreshes on an interval.
 */
export function NowLine({ date, showDot = true }: { date: string; showDot?: boolean }) {
  const offset = useNowOffsetPx(date);
  if (offset === null) return null;

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-x-0 z-20 border-t-2 border-sky-300"
      style={{ top: offset }}
    >
      {showDot ? (
        <span className="absolute -left-1 -top-1.5 h-3 w-3 rounded-full bg-sky-300" />
      ) : null}
    </div>
  );
}
