"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { MapPin } from "lucide-react";

import {
  requestBooking,
  updateBooking,
  type RequestBookingState,
} from "@/app/(app)/bookings/actions";
import { Button } from "@/components/kit/button";
import { amenityIcon } from "@/components/kit/room-card";
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

export interface BookingScreenRoom {
  id: string;
  name: string;
  location?: string | null;
  amenities?: string[] | null;
}

interface ScheduleBooking {
  id: string;
  room_id: string;
  date: string;
  start_time: string;
  end_time: string;
  status: BookingStatus;
}

export interface BookingScreenBooking {
  id: string;
  room_id: string;
  date: string;
  start_time: string;
  end_time: string;
  service: string;
  notes: string | null;
  status: BookingStatus;
}

const initialState: RequestBookingState = {};

const DEFAULT_START_TIME = "09:00";
const DEFAULT_END_TIME = "10:00";
const MAX_VISIBLE_ROOM_AMENITIES = 5;

/** Clamps a caller-supplied default (e.g. a ?start=/?end= deep link) to the
 * booking cap, so the picker never opens already past what it will let the
 * user step to or submit. */
function clampToLatestEnd(time: string): string {
  return minutesToTime(Math.min(timeToMinutes(time), LATEST_BOOKING_END_MINUTES));
}

// Chrome copy only — the room name/amenities stay lang="ar" dir="rtl" wrapped
// regardless of which chrome language is picked, same convention as
// components/rooms/room-detail-view.tsx (the other page with this toggle).
const STRINGS: Record<Lang, Record<string, string>> = {
  en: {
    title: "Reserve a room",
    titleEdit: "Edit request",
    subtitleCreate: "Choose a date and time, add the meeting details, then submit for approval.",
    subtitleEditApproved: "Changing the date or time reverts this to pending and requires re-approval.",
    subtitleEditPending: "Update your request details below.",
    cancel: "Cancel",
    pendingPre: "You have",
    of: "of",
    pendingPost: "pending requests in review.",
    pendingCapSuffix: " — cancel one before submitting another.",
    dateTime: "Date & Time",
    date: "Date",
    timeRange: "Time range",
    to: "to",
    duration: "duration",
    slotFreePre: "This slot is free for",
    conflictApproved: "This slot overlaps an approved booking for this room.",
    conflictPending: "This slot overlaps another pending request for this room.",
    details: "Details",
    servicePurpose: "Service / purpose",
    selectService: "Select a service/purpose",
    notes: "Notes (optional)",
    submit: "Submit request",
    saveChanges: "Save changes",
    revertNotice: "This will revert the booking to pending and require re-approval.",
  },
  ar: {
    title: "حجز قاعة",
    titleEdit: "تعديل الطلب",
    subtitleCreate: "اختر التاريخ والوقت، أضف تفاصيل الاجتماع، ثم أرسل الطلب للموافقة.",
    subtitleEditApproved: "سيؤدي تغيير التاريخ أو الوقت إلى إعادة الطلب لحالة قيد المراجعة وسيتطلب موافقة جديدة.",
    subtitleEditPending: "حدّث تفاصيل طلبك أدناه.",
    cancel: "إلغاء",
    pendingPre: "لديك",
    of: "من",
    pendingPost: "طلبات قيد المراجعة.",
    pendingCapSuffix: " — يجب إلغاء أحدها قبل إرسال طلب آخر.",
    dateTime: "التاريخ والوقت",
    date: "التاريخ",
    timeRange: "الفترة الزمنية",
    to: "إلى",
    duration: "المدة",
    slotFreePre: "هذا الموعد متاح لـ",
    conflictApproved: "يتعارض هذا الموعد مع حجز معتمد لهذه القاعة.",
    conflictPending: "يتعارض هذا الموعد مع طلب آخر قيد المراجعة لهذه القاعة.",
    details: "التفاصيل",
    servicePurpose: "الخدمة / الغرض",
    selectService: "اختر الخدمة أو الغرض",
    notes: "ملاحظات (اختياري)",
    submit: "إرسال الطلب",
    saveChanges: "حفظ التغييرات",
    revertNotice: "سيؤدي هذا إلى إعادة الحجز لحالة قيد المراجعة وسيتطلب موافقة جديدة.",
  },
};

export interface BookingScreenProps {
  /** The room being reserved — always chosen already, on the Rooms page. */
  room: BookingScreenRoom;
  /** When supplied, the screen edits this existing booking instead of creating a new one. */
  booking?: BookingScreenBooking;
  defaultDate?: string;
  defaultStartTime?: string;
  defaultEndTime?: string;
  /** Requester's currently open pending-request count (create flow only) — surfaced before the server-enforced cap blocks submission. */
  openPendingCount?: number;
}

/**
 * Final step of the one booking flow: the room was already picked in the Rooms
 * directory, so it is fixed here (shown, never re-selected) and only the date,
 * time, and meeting details remain.
 */
export function BookingScreen({
  room,
  booking,
  defaultDate,
  defaultStartTime,
  defaultEndTime,
  openPendingCount = 0,
}: BookingScreenProps) {
  const isEdit = !!booking;
  const supabase = useMemo(() => createClient(), []);
  const [state, formAction, pending] = useActionState(
    isEdit ? updateBooking : requestBooking,
    initialState
  );

  const [date, setDate] = useState(booking?.date ?? defaultDate ?? todayDateString());
  const [startTime, setStartTime] = useState(
    booking
      ? booking.start_time.slice(0, 5)
      : clampToLatestEnd(defaultStartTime ?? DEFAULT_START_TIME)
  );
  const [endTime, setEndTime] = useState(
    booking ? booking.end_time.slice(0, 5) : clampToLatestEnd(defaultEndTime ?? DEFAULT_END_TIME)
  );
  const [service, setService] = useState(booking?.service ?? "");
  const [notes, setNotes] = useState(booking?.notes ?? "");
  // Kind rather than a rendered message, so toggling `lang` re-localizes the
  // warning without re-running the conflict check.
  const [conflictKind, setConflictKind] = useState<"approved" | "pending" | null>(null);
  // Distinguishes "checked and free" from "not yet checked" (invalid inputs,
  // or the check hasn't resolved yet) — conflictKind === null alone can't tell
  // those apart, and the free-slot confirmation should only show once a real
  // check has actually completed.
  const [slotChecked, setSlotChecked] = useState(false);

  const [lang, setLang] = useState<Lang>("en");
  const isAr = lang === "ar";
  const dir = isAr ? "rtl" : "ltr";
  const t = STRINGS[lang];

  const willRevertToPending =
    isEdit &&
    booking!.status === "approved" &&
    (date !== booking!.date ||
      normalizeTimeString(startTime) !== booking!.start_time ||
      normalizeTimeString(endTime) !== booking!.end_time);

  // Checks this room's bookings for the chosen date/time so a clash shows up
  // while the user is still filling the form, not only after a failed submit.
  useEffect(() => {
    let cancelled = false;

    if (!date || !startTime || !endTime || startTime >= endTime) {
      setConflictKind(null);
      setSlotChecked(false);
      return;
    }

    async function checkConflict() {
      const { data } = await supabase
        .from("bookings_schedule")
        .select("id, room_id, date, start_time, end_time, status")
        .eq("room_id", room.id)
        .eq("date", date);

      if (cancelled) return;

      const conflicts = findConflictingBookings(
        {
          room_id: room.id,
          date,
          start_time: normalizeTimeString(startTime),
          end_time: normalizeTimeString(endTime),
          excludeBookingId: booking?.id,
        },
        (data ?? []) as ScheduleBooking[]
      );

      if (conflicts.length === 0) {
        setConflictKind(null);
      } else if (conflicts.some((c) => c.status === "approved")) {
        setConflictKind("approved");
      } else {
        setConflictKind("pending");
      }
      setSlotChecked(true);
    }

    checkConflict();
    return () => {
      cancelled = true;
    };
  }, [room.id, date, startTime, endTime, supabase, booking?.id]);

  const atPendingCap = !isEdit && openPendingCount >= MAX_OPEN_PENDING_BOOKINGS;
  const amenities = (room.amenities ?? []).slice(0, MAX_VISIBLE_ROOM_AMENITIES);

  const subtitle = isEdit
    ? booking!.status === "approved"
      ? t.subtitleEditApproved
      : t.subtitleEditPending
    : t.subtitleCreate;

  return (
    <div dir={dir} className="mx-auto flex min-h-full w-full max-w-2xl flex-col gap-4 p-4">
      <div className="flex justify-end">
        <LangToggle lang={lang} onLangChange={setLang} />
      </div>

      <div className="rounded-xl border border-line bg-surface p-4 shadow-sm sm:p-6">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h1 className="font-display text-h2 text-ink-900">{isEdit ? t.titleEdit : t.title}</h1>
            <p className="text-small text-ink-500">{subtitle}</p>
          </div>
          <Button
            variant="secondary"
            size="sm"
            render={<Link href={isEdit ? "/bookings" : `/rooms/${room.id}`}>{t.cancel}</Link>}
          />
        </div>

        {/* The room is already decided — shown here for confirmation only, not
            re-picked (the "Change room" link was removed; the flow to pick a
            different room is the Cancel button back to /rooms). */}
        <div className="mt-5 rounded-md border border-sky-600 bg-sky-50 px-3 py-3">
          <p lang="ar" dir="rtl" className="text-body font-semibold text-ink-900">
            {room.name}
          </p>
          <div className="mt-1 flex flex-wrap items-center gap-3 text-caption text-ink-500">
            {room.location && (
              <span className="flex items-center gap-1">
                <MapPin className="size-3.5 shrink-0" aria-hidden="true" />
                {room.location}
              </span>
            )}
            {amenities.length > 0 && (
              <span className="flex items-center gap-1.5">
                {amenities.map((amenity) => {
                  const Icon = amenityIcon(amenity);
                  return (
                    <span key={amenity} title={amenity}>
                      <Icon aria-hidden="true" className="size-3.5 shrink-0" />
                    </span>
                  );
                })}
              </span>
            )}
          </div>
        </div>

        {!isEdit && (
          <div
            role={atPendingCap ? "alert" : undefined}
            className={cn(
              "mt-3 flex items-center justify-between gap-2 rounded-md border px-3 py-2",
              atPendingCap
                ? "border-status-rejected-fg/30 bg-status-rejected-bg"
                : "border-sky-200 bg-sky-50"
            )}
          >
            <span
              className={cn(
                "text-caption",
                atPendingCap ? "font-medium text-status-rejected-fg" : "text-sky-700"
              )}
            >
              {t.pendingPre}{" "}
              <strong>
                {openPendingCount} {t.of} {MAX_OPEN_PENDING_BOOKINGS}
              </strong>{" "}
              {t.pendingPost}
              {atPendingCap && t.pendingCapSuffix}
            </span>
            <div className="flex shrink-0 gap-1" aria-hidden="true">
              {Array.from({ length: MAX_OPEN_PENDING_BOOKINGS }).map((_, i) => (
                <span
                  key={i}
                  className={cn(
                    "size-2 rounded-full",
                    i < openPendingCount
                      ? atPendingCap
                        ? "bg-status-rejected-fg"
                        : "bg-sky-600"
                      : "bg-sky-200"
                  )}
                />
              ))}
            </div>
          </div>
        )}

        <form action={formAction} className="mt-6 flex flex-col gap-6 pb-24 lg:pb-0">
          {isEdit && <input type="hidden" name="booking_id" value={booking!.id} />}
          <input type="hidden" name="room_id" value={room.id} />
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
                  conflictKind === "approved" ? t.conflictApproved : t.conflictPending
                }
                freeMessage={
                  slotChecked && !conflictKind ? (
                    <>
                      {t.slotFreePre}{" "}
                      <span lang="ar" dir="rtl">
                        {room.name}
                      </span>
                      .
                    </>
                  ) : undefined
                }
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

          {willRevertToPending && (
            <p role="status" className="text-small font-medium text-status-pending-fg">
              {t.revertNotice}
            </p>
          )}

          {state.error && (
            <p role="alert" className="text-small font-medium text-status-rejected-fg">
              {state.error}
            </p>
          )}

          {/* Desktop/large screens: normal in-flow button. Below lg, the shell
              switches to the mobile top bar + persistent bottom tab bar (see
              components/shell/app-shell.tsx), so the submit action moves to the
              fixed bar below instead, offset above that tab bar rather than
              duplicating its breakpoint by guesswork. */}
          <div className="hidden lg:block">
            <Button type="submit" loading={pending} disabled={pending}>
              {isEdit ? t.saveChanges : t.submit}
            </Button>
          </div>

          <div className="fixed inset-x-0 bottom-[calc(4rem+env(safe-area-inset-bottom))] z-30 border-t border-line bg-surface/95 p-4 backdrop-blur lg:hidden">
            <div className="mx-auto w-full max-w-2xl">
              <Button type="submit" loading={pending} disabled={pending} className="w-full">
                {isEdit ? t.saveChanges : t.submit}
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
