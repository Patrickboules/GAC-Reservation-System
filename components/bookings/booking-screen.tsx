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
import { Select } from "@/components/kit/select";
import { Textarea } from "@/components/kit/textarea";
import { TimeRangePicker } from "@/components/kit/time-range-picker";
import { findConflictingBookings, type BookingStatus } from "@/lib/bookings/conflict-check";
import { MAX_OPEN_PENDING_BOOKINGS } from "@/lib/bookings/limits";
import { BOOKING_SERVICES } from "@/lib/bookings/services";
import { createClient } from "@/lib/supabase/client";
import { normalizeTimeString, todayDateString } from "@/lib/dates";
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
    booking ? booking.start_time.slice(0, 5) : (defaultStartTime ?? DEFAULT_START_TIME)
  );
  const [endTime, setEndTime] = useState(
    booking ? booking.end_time.slice(0, 5) : (defaultEndTime ?? DEFAULT_END_TIME)
  );
  const [service, setService] = useState(booking?.service ?? "");
  const [notes, setNotes] = useState(booking?.notes ?? "");
  const [warning, setWarning] = useState<string | null>(null);
  // Distinguishes "checked and free" from "not yet checked" (invalid inputs,
  // or the check hasn't resolved yet) — setWarning(null) alone can't tell
  // those apart, and the free-slot confirmation should only show once a real
  // check has actually completed.
  const [slotChecked, setSlotChecked] = useState(false);

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
      setWarning(null);
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
        setWarning(null);
      } else if (conflicts.some((c) => c.status === "approved")) {
        setWarning("This slot overlaps an approved booking for this room.");
      } else {
        setWarning("This slot overlaps another pending request for this room.");
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

  return (
    <div className="mx-auto flex min-h-full w-full max-w-2xl flex-col gap-4 p-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h1 className="font-display text-h2 text-ink-900">
            {isEdit ? "Edit request" : "Reserve a room"}
          </h1>
          <p className="text-small text-ink-500">
            {isEdit
              ? booking!.status === "approved"
                ? "Changing the date or time reverts this to pending and requires re-approval."
                : "Update your request details below."
              : "Choose a date and time, add the meeting details, then submit for approval."}
          </p>
        </div>
        <Button
          variant="secondary"
          size="sm"
          render={<Link href={isEdit ? "/bookings" : `/rooms/${room.id}`}>Cancel</Link>}
        />
      </div>

      {/* The room is already decided — shown here for confirmation, never re-picked
          (except via the "Change room" link below, create flow only: editing an
          existing booking has no picker to return to, so changing rooms there
          would strand the user mid-edit — see booking-form implementation notes). */}
      <div className="rounded-md border border-sky-600 bg-sky-50 px-3 py-3">
        <div className="flex items-start justify-between gap-2">
          <div>
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
            <Link
              href="/rooms"
              className="shrink-0 text-caption font-medium text-sky-700 underline underline-offset-2 hover:text-sky-800"
            >
              Change room
            </Link>
          )}
        </div>
      </div>

      {!isEdit && (
        <div
          role={atPendingCap ? "alert" : undefined}
          className={cn(
            "flex items-center justify-between gap-2 rounded-md border px-3 py-2",
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
            You have{" "}
            <strong>
              {openPendingCount} of {MAX_OPEN_PENDING_BOOKINGS}
            </strong>{" "}
            pending requests in review{atPendingCap ? " — cancel one before submitting another." : "."}
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

      <form action={formAction} className="flex flex-col gap-6 pb-24 lg:pb-0">
        {isEdit && <input type="hidden" name="booking_id" value={booking!.id} />}
        <input type="hidden" name="room_id" value={room.id} />
        <input type="hidden" name="date" value={date} />
        <input type="hidden" name="start_time" value={startTime} />
        <input type="hidden" name="end_time" value={endTime} />
        <input type="hidden" name="service" value={service} />

        <section className="flex flex-col gap-3">
          <h2 className="text-caption font-semibold tracking-wide text-ink-500 uppercase">
            Date &amp; time
          </h2>

          <DatePicker
            label="Date"
            mode="popover"
            value={date}
            onValueChange={setDate}
            isDateDisabled={(d) => d < todayDateString()}
          />

          <div className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-ink-700">Time range</span>
            <TimeRangePicker
              startTime={startTime}
              endTime={endTime}
              onStartTimeChange={setStartTime}
              onEndTimeChange={setEndTime}
              hasConflict={!!warning}
              conflictMessage={warning}
              freeMessage={
                slotChecked && !warning ? (
                  <>
                    This slot is free for{" "}
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
            Details
          </h2>

          <Select
            label="Service / purpose"
            placeholder="Select a service/purpose"
            options={BOOKING_SERVICES.map((option) => ({
              value: option as string,
              label: option,
            }))}
            value={service || null}
            onValueChange={(value) => setService(value)}
            required
          />

          <Textarea
            label="Notes (optional)"
            name="notes"
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </section>

        {willRevertToPending && (
          <p role="status" className="text-small font-medium text-status-pending-fg">
            This will revert the booking to pending and require re-approval.
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
            {isEdit ? "Save changes" : "Submit request"}
          </Button>
        </div>

        <div className="fixed inset-x-0 bottom-[calc(4rem+env(safe-area-inset-bottom))] z-30 border-t border-line bg-surface/95 p-4 backdrop-blur lg:hidden">
          <div className="mx-auto w-full max-w-2xl">
            <Button type="submit" loading={pending} disabled={pending} className="w-full">
              {isEdit ? "Save changes" : "Submit request"}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
