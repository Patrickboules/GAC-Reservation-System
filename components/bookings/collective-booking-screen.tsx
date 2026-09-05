"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import Link from "next/link";

import {
  requestCollectiveBooking,
  type RequestCollectiveBookingState,
} from "@/app/(app)/bookings/actions";
import { Button } from "@/components/kit/button";
import { DatePicker } from "@/components/kit/date-picker";
import { LangToggle, type Lang } from "@/components/kit/lang-toggle";
import { Select } from "@/components/kit/select";
import { Textarea } from "@/components/kit/textarea";
import { TimeRangePicker } from "@/components/kit/time-range-picker";
import { findConflictingBookings, type BookingStatus } from "@/lib/bookings/conflict-check";
import { LATEST_BOOKING_END_MINUTES, MAX_OPEN_PENDING_BOOKINGS } from "@/lib/bookings/limits";
import { BOOKING_SERVICES } from "@/lib/bookings/services";
import { createClient } from "@/lib/supabase/client";
import { minutesToTime, normalizeTimeString, timeToMinutes, todayDateString } from "@/lib/dates";
import { cn } from "@/lib/utils";

export interface CollectiveBookingScreenRoom {
  id: string;
  name: string;
}

interface ScheduleBooking {
  id: string;
  room_id: string;
  date: string;
  start_time: string;
  end_time: string;
  status: BookingStatus;
}

const initialState: RequestCollectiveBookingState = {};

const DEFAULT_START_TIME = "09:00";
const DEFAULT_END_TIME = "10:00";

function clampToLatestEnd(time: string): string {
  return minutesToTime(Math.min(timeToMinutes(time), LATEST_BOOKING_END_MINUTES));
}

// Chrome copy only — same convention as components/bookings/booking-screen.tsx.
const STRINGS: Record<Lang, Record<string, string>> = {
  en: {
    title: "Reserve subrooms",
    subtitle:
      "One date and time will be applied to every selected subroom — each becomes its own pending request.",
    cancel: "Cancel",
    pendingPre: "You have",
    of: "of",
    pendingPost: "pending requests in review.",
    pendingCapSuffix: " — cancel one before submitting another.",
    selected: "Selected subrooms",
    dateTime: "Date & Time",
    date: "Date",
    timeRange: "Time range",
    to: "to",
    duration: "duration",
    slotFreePre: "This slot is free for all selected subrooms.",
    conflictApproved: "This slot overlaps an approved booking for:",
    conflictPending: "This slot overlaps another pending request for:",
    details: "Details",
    servicePurpose: "Service / purpose",
    selectService: "Select a service/purpose",
    notes: "Notes (optional)",
    submit: "Submit requests",
  },
  ar: {
    title: "حجز الغرف الفرعية",
    subtitle: "سيتم تطبيق تاريخ ووقت واحد على كل غرفة فرعية محددة — يصبح كل منها طلبًا مستقلًا قيد المراجعة.",
    cancel: "إلغاء",
    pendingPre: "لديك",
    of: "من",
    pendingPost: "طلبات قيد المراجعة.",
    pendingCapSuffix: " — يجب إلغاء أحدها قبل إرسال طلب آخر.",
    selected: "الغرف الفرعية المحددة",
    dateTime: "التاريخ والوقت",
    date: "التاريخ",
    timeRange: "الفترة الزمنية",
    to: "إلى",
    duration: "المدة",
    slotFreePre: "هذا الموعد متاح لجميع الغرف الفرعية المحددة.",
    conflictApproved: "يتعارض هذا الموعد مع حجز معتمد لـ:",
    conflictPending: "يتعارض هذا الموعد مع طلب آخر قيد المراجعة لـ:",
    details: "التفاصيل",
    servicePurpose: "الخدمة / الغرض",
    selectService: "اختر الخدمة أو الغرض",
    notes: "ملاحظات (اختياري)",
    submit: "إرسال الطلبات",
  },
};

export interface CollectiveBookingScreenProps {
  /** 2+ subrooms of the same hall, already chosen on the hall detail page. */
  rooms: CollectiveBookingScreenRoom[];
  defaultDate?: string;
  defaultStartTime?: string;
  defaultEndTime?: string;
  /** Requester's currently open pending-request count, surfaced before the server-enforced cap blocks submission. */
  openPendingCount?: number;
}

/**
 * Collective booking step: N subrooms of one hall were already multi-selected
 * on the hall detail page, so they're fixed here (shown, never re-picked) and
 * only the shared date, time, and meeting details remain — mirrors
 * components/bookings/booking-screen.tsx's single-room flow.
 */
export function CollectiveBookingScreen({
  rooms,
  defaultDate,
  defaultStartTime,
  defaultEndTime,
  openPendingCount = 0,
}: CollectiveBookingScreenProps) {
  const supabase = useMemo(() => createClient(), []);
  const [state, formAction, pending] = useActionState(requestCollectiveBooking, initialState);

  const [date, setDate] = useState(defaultDate ?? todayDateString());
  const [startTime, setStartTime] = useState(clampToLatestEnd(defaultStartTime ?? DEFAULT_START_TIME));
  const [endTime, setEndTime] = useState(clampToLatestEnd(defaultEndTime ?? DEFAULT_END_TIME));
  const [service, setService] = useState("");
  const [notes, setNotes] = useState("");
  const [conflictKind, setConflictKind] = useState<"approved" | "pending" | null>(null);
  const [conflictRoomNames, setConflictRoomNames] = useState<string[]>([]);
  const [slotChecked, setSlotChecked] = useState(false);

  const [lang, setLang] = useState<Lang>("en");
  const isAr = lang === "ar";
  const dir = isAr ? "rtl" : "ltr";
  const t = STRINGS[lang];

  const roomIds = useMemo(() => rooms.map((r) => r.id), [rooms]);

  // Per-room conflict check against this room's own bookings only, same as
  // booking-screen.tsx's warning banner — informational, not a hard block
  // (only an approved conflict blocks the actual submission server-side).
  useEffect(() => {
    let cancelled = false;

    if (!date || !startTime || !endTime || startTime >= endTime) {
      setConflictKind(null);
      setConflictRoomNames([]);
      setSlotChecked(false);
      return;
    }

    async function checkConflict() {
      const { data } = await supabase
        .from("bookings_schedule")
        .select("id, room_id, date, start_time, end_time, status")
        .in("room_id", roomIds)
        .eq("date", date);

      if (cancelled) return;

      const rows = (data ?? []) as ScheduleBooking[];
      let worstKind: "approved" | "pending" | null = null;
      const affectedNames = new Set<string>();

      for (const room of rooms) {
        const conflicts = findConflictingBookings(
          {
            room_id: room.id,
            date,
            start_time: normalizeTimeString(startTime),
            end_time: normalizeTimeString(endTime),
          },
          rows.filter((row) => row.room_id === room.id)
        );
        if (conflicts.length === 0) continue;
        affectedNames.add(room.name);
        if (conflicts.some((c) => c.status === "approved")) {
          worstKind = "approved";
        } else if (worstKind !== "approved") {
          worstKind = "pending";
        }
      }

      setConflictKind(worstKind);
      setConflictRoomNames(Array.from(affectedNames));
      setSlotChecked(true);
    }

    checkConflict();
    return () => {
      cancelled = true;
    };
  }, [roomIds, rooms, date, startTime, endTime, supabase]);

  const atPendingCap = openPendingCount + rooms.length > MAX_OPEN_PENDING_BOOKINGS;

  return (
    <div dir={dir} className="mx-auto flex min-h-full w-full max-w-2xl flex-col gap-4 p-4">
      <div className="flex justify-end">
        <LangToggle lang={lang} onLangChange={setLang} />
      </div>

      <div className="rounded-xl border border-line bg-surface p-4 shadow-sm sm:p-6">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h1 className="font-display text-h2 text-ink-900">{t.title}</h1>
            <p className="text-small text-ink-500">{t.subtitle}</p>
          </div>
          <Button variant="secondary" size="sm" render={<Link href="/rooms">{t.cancel}</Link>} />
        </div>

        <div className="mt-5">
          <p className="mb-2 text-caption font-bold uppercase tracking-wide text-ink-500">
            {t.selected}
          </p>
          <div className="flex flex-wrap gap-2">
            {rooms.map((room) => (
              <span
                key={room.id}
                lang="ar"
                dir="rtl"
                className="rounded-full border border-sky-600 bg-sky-50 px-3 py-1.5 text-small font-semibold text-ink-900"
              >
                {room.name}
              </span>
            ))}
          </div>
        </div>

        <div
          role={atPendingCap ? "alert" : undefined}
          className={cn(
            "mt-3 flex items-center justify-between gap-2 rounded-md border px-3 py-2",
            atPendingCap ? "border-status-rejected-fg/30 bg-status-rejected-bg" : "border-sky-200 bg-sky-50"
          )}
        >
          <span
            className={cn("text-caption", atPendingCap ? "font-medium text-status-rejected-fg" : "text-sky-700")}
          >
            {t.pendingPre}{" "}
            <strong>
              {openPendingCount} {t.of} {MAX_OPEN_PENDING_BOOKINGS}
            </strong>{" "}
            {t.pendingPost}
            {atPendingCap && t.pendingCapSuffix}
          </span>
        </div>

        <form action={formAction} className="mt-6 flex flex-col gap-6 pb-24 lg:pb-0">
          {roomIds.map((id) => (
            <input key={id} type="hidden" name="room_id" value={id} />
          ))}
          <input type="hidden" name="date" value={date} />
          <input type="hidden" name="start_time" value={startTime} />
          <input type="hidden" name="end_time" value={endTime} />
          <input type="hidden" name="service" value={service} />

          <section className="flex flex-col gap-3">
            <h2 className="text-caption font-semibold tracking-wide text-ink-500 uppercase">
              {t.dateTime}
            </h2>

            <DatePicker
              label={t.date}
              mode="popover"
              value={date}
              onValueChange={setDate}
              isDateDisabled={(d) => d < todayDateString()}
            />

            <div className="flex flex-col gap-1.5">
              <span className="text-sm font-medium text-ink-700">{t.timeRange}</span>
              <TimeRangePicker
                startTime={startTime}
                endTime={endTime}
                onStartTimeChange={setStartTime}
                onEndTimeChange={setEndTime}
                toLabel={t.to}
                durationLabel={t.duration}
                hasConflict={!!conflictKind}
                conflictMessage={
                  conflictKind ? (
                    <>
                      {conflictKind === "approved" ? t.conflictApproved : t.conflictPending}{" "}
                      <span lang="ar" dir="rtl">
                        {conflictRoomNames.join("، ")}
                      </span>
                    </>
                  ) : undefined
                }
                freeMessage={slotChecked && !conflictKind ? t.slotFreePre : undefined}
              />
            </div>
          </section>

          <section className="flex flex-col gap-3">
            <h2 className="text-caption font-semibold tracking-wide text-ink-500 uppercase">
              {t.details}
            </h2>

            <Select
              label={t.servicePurpose}
              placeholder={t.selectService}
              options={BOOKING_SERVICES.map((option) => ({
                value: option as string,
                label: option,
              }))}
              value={service || null}
              onValueChange={(value) => setService(value)}
              required
            />

            <Textarea
              label={t.notes}
              name="notes"
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </section>

          {state.error && (
            <p role="alert" className="text-small font-medium text-status-rejected-fg">
              {state.error}
            </p>
          )}

          <div className="hidden lg:block">
            <Button type="submit" loading={pending} disabled={pending}>
              {t.submit}
            </Button>
          </div>

          <div className="fixed inset-x-0 bottom-[calc(4rem+env(safe-area-inset-bottom))] z-30 border-t border-line bg-surface/95 p-4 backdrop-blur lg:hidden">
            <div className="mx-auto w-full max-w-2xl">
              <Button type="submit" loading={pending} disabled={pending} className="w-full">
                {t.submit}
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
