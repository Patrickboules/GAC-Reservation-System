"use client";

import { useEffect, useMemo, useRef } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { Button } from "@/components/kit/button";
import { IconButton } from "@/components/kit/icon-button";
import { addDays, parseDateString, todayDateString } from "@/lib/dates";
import { cn } from "@/lib/utils";

/** Booking horizon: today plus the next 6 days (7 days total). */
const DAYS_AFTER = 6;

interface DayStripProps {
  date: string;
  onDateChange: (date: string) => void;
}

/**
 * Day-pill strip (US-029) scoped to the bookable window — today through
 * today+7 days. Tapping a pill jumps the calendar to that day, arrow buttons
 * step one day (clamped to the window), and "Today" snaps back to the
 * current date. Shared by both the mobile and desktop schedule views.
 */
export function DayStrip({ date, onDateChange }: DayStripProps) {
  const today = todayDateString();
  const lastDay = useMemo(() => addDays(today, DAYS_AFTER), [today]);
  const days = useMemo(
    () => Array.from({ length: DAYS_AFTER + 1 }, (_, i) => addDays(today, i)),
    [today]
  );

  const selectedRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    selectedRef.current?.scrollIntoView({ block: "nearest", inline: "center" });
  }, [date]);

  const isToday = date === today;
  const isFirstDay = date <= today;
  const isLastDay = date >= lastDay;

  return (
    <div className="flex w-full min-w-0 items-center gap-2">
      <IconButton
        label="Previous day"
        onClick={() => onDateChange(addDays(date, -1))}
        disabled={isFirstDay}
      >
        <ChevronLeft aria-hidden="true" />
      </IconButton>

      <div
        role="tablist"
        aria-label="Select a day"
        className="flex min-w-0 flex-1 gap-1.5 overflow-x-auto py-1"
      >
        {days.map((day) => {
          const selected = day === date;
          const parsed = parseDateString(day);
          return (
            <button
              key={day}
              ref={selected ? selectedRef : null}
              type="button"
              role="tab"
              aria-selected={selected}
              onClick={() => onDateChange(day)}
              className={cn(
                "flex shrink-0 flex-col items-center rounded-md px-3 py-1.5 text-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300",
                selected ? "bg-sky-600 text-white" : "text-ink-700 hover:bg-sky-50"
              )}
            >
              <span className="text-caption uppercase">
                {parsed.toLocaleDateString(undefined, { weekday: "short" })}
              </span>
              <span className="font-mono text-small">{parsed.getDate()}</span>
            </button>
          );
        })}
      </div>

      <IconButton
        label="Next day"
        onClick={() => onDateChange(addDays(date, 1))}
        disabled={isLastDay}
      >
        <ChevronRight aria-hidden="true" />
      </IconButton>

      <Button variant="secondary" size="sm" onClick={() => onDateChange(today)} disabled={isToday}>
        Today
      </Button>
    </div>
  );
}
