"use client";

import { useNowOffsetPercent } from "@/lib/schedule/now-line";

/**
 * Sky-300 current-time indicator for the timeline grid's horizontal time axis.
 * Renders nothing unless `date` is today; position and label refresh on an
 * interval. Carries a "Now · <time>" label so the line's meaning is legible
 * to a first-time visitor, not just a bare colored line.
 */
export function NowLine({ date, showDot = true }: { date: string; showDot?: boolean }) {
  const offset = useNowOffsetPercent(date);
  if (offset === null) return null;

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-y-0 z-20 border-l-2 border-sky-300"
      style={{ left: `${offset.percent}%` }}
    >
      {showDot ? (
        <span className="absolute -left-1.5 -top-1 h-3 w-3 rounded-full bg-sky-300" />
      ) : null}
      <span className="absolute -top-[1px] -translate-x-1/2 whitespace-nowrap rounded-full bg-sky-300 px-1.5 py-0.5 text-[0.625rem] font-semibold text-white shadow-sm">
        Now · {offset.timeLabel}
      </span>
    </div>
  );
}
