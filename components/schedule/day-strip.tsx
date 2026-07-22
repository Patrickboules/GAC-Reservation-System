"use client";

import { useEffect, useMemo, useRef } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { Button } from "@/components/kit/button";
import { IconButton } from "@/components/kit/icon-button";
import { addDays, parseDateString, todayDateString } from "@/lib/dates";
import { cn } from "@/lib/utils";

/** Pills rendered before/after the selected day, so the strip re-centers as the day changes. */
const DAYS_BEFORE = 5;
const DAYS_AFTER = 13;

interface DayStripProps {
  date: string;
  onDateChange: (date: string) => void;
}

/**
 * Horizontally scrollable day-pill strip (US-029): tapping a pill jumps the
 * calendar to that day, arrow buttons step one day, and "Today" snaps back
 * to the current date. Shared by both the mobile and desktop schedule views.
 */
export function DayStrip({ date, onDateChange }: DayStripProps) {
  const days = useMemo(() => {
    const start = addDays(date, -DAYS_BEFORE);
    return Array.from({ length: DAYS_BEFORE + DAYS_AFTER + 1 }, (_, i) => addDays(start, i));
  }, [date]);

  const selectedRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    selectedRef.current?.scrollIntoView({ block: "nearest", inline: "center" });
  }, [date]);

  const isToday = date === todayDateString();

  return (
    <div className="flex w-full min-w-0 items-center gap-2">
      <IconButton label="Previous day" onClick={() => onDateChange(addDays(date, -1))}>
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

      <IconButton label="Next day" onClick={() => onDateChange(addDays(date, 1))}>
        <ChevronRight aria-hidden="true" />
      </IconButton>

      <Button variant="secondary" size="sm" onClick={() => onDateChange(todayDateString())} disabled={isToday}>
        Today
      </Button>
    </div>
  );
}
