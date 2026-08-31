"use client";

import { useState } from "react";
import Link from "next/link";
import { Building2, ChevronLeft, ChevronRight, MapPin } from "lucide-react";

import { Button } from "@/components/kit/button";
import { LangToggle, type Lang } from "@/components/kit/lang-toggle";
import { amenityIcon } from "@/components/kit/room-card";
import type { RoomCardAvailability } from "@/components/kit/room-card";
import { NowLine } from "@/components/schedule/now-line";
import type { BookingStatus } from "@/lib/bookings/conflict-check";
import { formatDateLabel, formatTimeLabel } from "@/lib/dates";
import {
  ROOM_CATEGORY_COLOR_HEADER_CLASSES,
  ROOM_CATEGORY_COLOR_ICON_CLASSES,
  type RoomCategoryColor,
} from "@/lib/rooms/category-colors";
import { formatHourLabel, percentForTime, SCHEDULE_END_HOUR, SCHEDULE_START_HOUR } from "@/lib/schedule/hours";
import { cn } from "@/lib/utils";

interface TodayBooking {
  startTime: string;
  endTime: string;
  status: BookingStatus;
  service: string | null;
}

interface DayStripEntry {
  date: string;
  busy: boolean;
}

export interface RoomDetailViewProps {
  roomId: string;
  name: string;
  location: string | null;
  amenities: string[];
  categoryColor: RoomCategoryColor | null;
  availability: RoomCardAvailability;
  todayDate: string;
  todayBookings: TodayBooking[];
  days: DayStripEntry[];
}

// Chrome copy only — room names/amenities are Arabic-sourced data and stay
// lang="ar" dir="rtl" wrapped regardless of which chrome language is picked
// here, same as everywhere else in the app.
const STRINGS: Record<Lang, Record<string, string>> = {
  en: {
    back: "Back to rooms",
    amenities: "Amenities",
    today: "Today's availability",
    next7: "Next 7 days",
    reserve: "Reserve this room",
    free: "Free",
    busy: "Busy",
    freeNow: "Free now",
    busyNow: "Busy now",
    notSpecified: "Not specified",
  },
  ar: {
    back: "عودة للغرف",
    amenities: "المرافق",
    today: "التوفر اليوم",
    next7: "الأيام السبعة القادمة",
    reserve: "حجز هذه القاعة",
    free: "متاح",
    busy: "مشغول",
    freeNow: "متاح الآن",
    busyNow: "مشغول الآن",
    notSpecified: "غير محدد",
  },
};

const HOUR_TICKS = Array.from(
  { length: SCHEDULE_END_HOUR - SCHEDULE_START_HOUR + 1 },
  (_, i) => SCHEDULE_START_HOUR + i
);

/**
 * Room detail page shell — owns the page-local EN/AR chrome toggle (a
 * self-contained bilingual UI, not the app-wide "full mirrored RTL" the
 * roadmap's Phase 6 still has as an open question; this is the first place
 * that mirrors the whole page layout via `dir`, scoped to this one page).
 */
function RoomDetailView({
  roomId,
  name,
  location,
  amenities,
  categoryColor,
  availability,
  todayDate,
  todayBookings,
  days,
}: RoomDetailViewProps) {
  const [lang, setLang] = useState<Lang>("en");
  const isAr = lang === "ar";
  const t = STRINGS[lang];
  const dir = isAr ? "rtl" : "ltr";
  const BackIcon = isAr ? ChevronRight : ChevronLeft;

  return (
    <div dir={dir} className="mx-auto flex min-h-full w-full max-w-4xl flex-col gap-4 p-4">
      {/* top utility row */}
      <div className="flex items-center justify-between gap-3">
        <Link
          href="/rooms"
          className="flex items-center gap-1.5 rounded-md px-1 py-2 text-small font-semibold text-ink-500 outline-none transition-colors hover:text-ink-900 focus-visible:ring-2 focus-visible:ring-sky-300"
        >
          <BackIcon aria-hidden="true" className="size-4" />
          {t.back}
        </Link>
        <LangToggle lang={lang} onLangChange={setLang} />
      </div>

      {/* main card */}
      <div className="overflow-hidden rounded-xl border border-line bg-surface shadow-sm">
        {/* hero */}
        <div
          className={cn(
            "relative flex h-[220px] w-full items-center justify-center",
            categoryColor ? ROOM_CATEGORY_COLOR_HEADER_CLASSES[categoryColor] : "bg-sky-100"
          )}
        >
          <Building2
            aria-hidden="true"
            className={cn(
              "size-12 opacity-70",
              categoryColor ? ROOM_CATEGORY_COLOR_ICON_CLASSES[categoryColor] : "text-sky-500"
            )}
          />
          <span
            className={cn(
              "absolute top-4 inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-small font-semibold shadow-sm",
              isAr ? "left-4" : "right-4",
              availability === "free" ? "text-status-approved-fg" : "text-status-pending-fg"
            )}
          >
            <span
              aria-hidden="true"
              className={cn(
                "size-1.5 rounded-full",
                availability === "free" ? "bg-status-approved-fg" : "bg-status-pending-fg"
              )}
            />
            {availability === "free" ? t.freeNow : t.busyNow}
          </span>
        </div>

        {/* title */}
        <div className="border-b border-line px-6 py-5">
          <h1 lang="ar" dir="rtl" className="font-display text-h2 text-ink-900">
            {name}
          </h1>
          <div className="mt-2 flex items-center gap-2 text-small text-ink-500">
            <MapPin className="size-3.5 shrink-0" aria-hidden="true" />
            <span lang="ar" dir="rtl" className="truncate">
              {location || t.notSpecified}
            </span>
          </div>
        </div>

        {/* body */}
        <div className="flex flex-wrap gap-8 p-6">
          {/* main column */}
          <div className="flex min-w-0 flex-1 basis-[480px] flex-col gap-6">
            {/* amenities */}
            <div>
              <p className="mb-3 text-caption font-bold uppercase tracking-wide text-ink-500">
                {t.amenities}
              </p>
              {amenities.length > 0 ? (
                <div className="flex flex-wrap gap-3">
                  {amenities.map((amenity) => {
                    const Icon = amenityIcon(amenity);
                    return (
                      <div
                        key={amenity}
                        className="flex items-center gap-2.5 rounded-full border border-line py-1.5 pl-1.5 pr-3.5"
                      >
                        <span className="flex size-8 shrink-0 items-center justify-center rounded-[9px] bg-sky-50">
                          <Icon className="size-4 text-sky-600" aria-hidden="true" />
                        </span>
                        <span lang="ar" dir="rtl" className="text-small font-medium text-ink-900">
                          {amenity}
                        </span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-small text-ink-500">{t.notSpecified}</p>
              )}
            </div>

            {/* today's availability */}
            <div>
              <div className="mb-3 flex items-baseline justify-between gap-2">
                <p className="text-caption font-bold uppercase tracking-wide text-ink-500">{t.today}</p>
                <div className="flex gap-3.5">
                  <span className="flex items-center gap-1.5 text-caption text-ink-500">
                    <span aria-hidden="true" className="size-2 rounded-sm border border-ink-300 bg-canvas" />
                    {t.free}
                  </span>
                  <span className="flex items-center gap-1.5 text-caption text-ink-500">
                    <span aria-hidden="true" className="size-2 rounded-sm bg-status-pending-fg" />
                    {t.busy}
                  </span>
                </div>
              </div>

              <div className="relative h-[60px] w-full overflow-hidden rounded-md border border-line bg-canvas">
                {HOUR_TICKS.map((hour) => (
                  <div
                    key={hour}
                    aria-hidden="true"
                    className="absolute inset-y-0 w-px bg-line"
                    style={{ left: `${percentForTime(`${String(hour).padStart(2, "0")}:00:00`)}%` }}
                  />
                ))}
                {todayBookings.map((booking, i) => {
                  const left = percentForTime(booking.startTime);
                  const width = Math.max(percentForTime(booking.endTime) - left, 2);
                  return (
                    <div
                      key={i}
                      title={`${formatTimeLabel(booking.startTime)}–${formatTimeLabel(booking.endTime)}`}
                      className={cn(
                        "absolute inset-y-1.5 flex flex-col justify-center overflow-hidden rounded px-2",
                        booking.status === "approved" ? "bg-status-approved-fg/85" : "bg-status-pending-fg/85"
                      )}
                      style={{ left: `${left}%`, width: `${width}%` }}
                    >
                      {booking.service && (
                        <span className="truncate text-[0.6875rem] font-semibold leading-tight text-white">
                          {booking.service}
                        </span>
                      )}
                      <span className="truncate text-[0.625rem] leading-tight text-white/85">
                        {formatTimeLabel(booking.startTime)}–{formatTimeLabel(booking.endTime)}
                      </span>
                    </div>
                  );
                })}
                <NowLine date={todayDate} showDot />
                {todayBookings.length > 0 && (
                  <ul className="sr-only">
                    {todayBookings.map((booking, i) => (
                      <li key={i}>
                        {formatTimeLabel(booking.startTime)}–{formatTimeLabel(booking.endTime)}, {booking.status}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <div className="mt-1.5 flex justify-between text-caption text-ink-500">
                <span>{formatHourLabel(SCHEDULE_START_HOUR)}</span>
                <span>{formatHourLabel(SCHEDULE_END_HOUR)}</span>
              </div>
            </div>
          </div>

          {/* sidebar */}
          <div className="flex min-w-0 flex-1 basis-[240px] flex-col gap-4">
            <Button size="lg" render={<Link href={`/bookings/new?room=${roomId}`}>{t.reserve}</Link>} />

            <div className="rounded-xl border border-line bg-canvas p-4">
              <p className="mb-2.5 text-caption font-bold uppercase tracking-wide text-ink-500">{t.next7}</p>
              <div className="flex flex-col">
                {days.map((day) => (
                  <div
                    key={day.date}
                    className="flex items-center justify-between border-b border-line py-2.5 last:border-b-0"
                  >
                    <span className="text-small font-medium text-ink-900">
                      {formatDateLabel(day.date, isAr ? "ar" : undefined)}
                    </span>
                    <span
                      className={cn(
                        "flex items-center gap-1.5 text-caption font-semibold",
                        day.busy ? "text-status-pending-fg" : "text-status-approved-fg"
                      )}
                    >
                      <span
                        aria-hidden="true"
                        className={cn(
                          "size-1.5 rounded-full",
                          day.busy ? "bg-status-pending-fg" : "bg-status-approved-fg"
                        )}
                      />
                      {day.busy ? t.busy : t.free}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export { RoomDetailView };
