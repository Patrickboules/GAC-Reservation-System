"use client";

import { useState } from "react";

import { DayStrip } from "@/components/schedule/day-strip";
import { DesktopResourceGrid } from "@/components/schedule/desktop-resource-grid";
import { MobileDayCalendar, type ScheduleRoom } from "@/components/schedule/mobile-day-calendar";
import { todayDateString } from "@/lib/dates";

/** Owns the selected day so the day strip and both calendar views stay in sync. */
export function ScheduleContent({ rooms }: { rooms: ScheduleRoom[] }) {
  const [date, setDate] = useState(() => todayDateString());

  return (
    <div className="flex w-full min-w-0 flex-col gap-4">
      <DayStrip date={date} onDateChange={setDate} />
      <MobileDayCalendar rooms={rooms} date={date} onDateChange={setDate} />
      <DesktopResourceGrid rooms={rooms} date={date} />
    </div>
  );
}
