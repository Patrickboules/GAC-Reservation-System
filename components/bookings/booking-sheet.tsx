"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { requestBooking, type RequestBookingState } from "@/app/bookings/actions";
import { Button } from "@/components/kit/button";
import { BookingCard } from "@/components/kit/booking-card";
import { DatePicker } from "@/components/kit/date-picker";
import {
  Modal,
  ModalContent,
  ModalDescription,
  ModalFooter,
  ModalHeader,
  ModalTitle,
} from "@/components/kit/modal";
import { Select } from "@/components/kit/select";
import { Textarea } from "@/components/kit/textarea";
import { TimeRangePicker } from "@/components/kit/time-range-picker";
import { useToast } from "@/components/kit/toast";
import { findConflictingBookings, type BookingStatus } from "@/lib/bookings/conflict-check";
import { BOOKING_SERVICES } from "@/lib/bookings/services";
import { createClient } from "@/lib/supabase/client";
import { normalizeTimeString, todayDateString } from "@/lib/dates";

export interface BookingSheetRoom {
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

const initialState: RequestBookingState = {};

const DEFAULT_START_TIME = "09:00";
const DEFAULT_END_TIME = "10:00";

export interface BookingSheetProps {
  rooms: BookingSheetRoom[];
  defaultRoomId?: string;
  defaultDate?: string;
  defaultStartTime?: string;
  defaultEndTime?: string;
}

export function BookingSheet({
  rooms,
  defaultRoomId,
  defaultDate,
  defaultStartTime,
  defaultEndTime,
}: BookingSheetProps) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const toast = useToast();
  const [state, formAction, pending] = useActionState(requestBooking, initialState);

  const [open, setOpen] = useState(true);
  const [roomId, setRoomId] = useState(defaultRoomId ?? "");
  const [date, setDate] = useState(defaultDate ?? todayDateString());
  const [startTime, setStartTime] = useState(defaultStartTime ?? DEFAULT_START_TIME);
  const [endTime, setEndTime] = useState(defaultEndTime ?? DEFAULT_END_TIME);
  const [service, setService] = useState("");
  const [notes, setNotes] = useState("");
  const [warning, setWarning] = useState<string | null>(null);
  const [showOptimistic, setShowOptimistic] = useState(false);

  useEffect(() => {
    let cancelled = false;

    if (!roomId || !date || !startTime || !endTime || startTime >= endTime) {
      setWarning(null);
      return;
    }

    async function checkConflict() {
      const { data } = await supabase
        .from("bookings_schedule")
        .select("id, room_id, date, start_time, end_time, status")
        .eq("room_id", roomId)
        .eq("date", date);

      if (cancelled) return;

      const conflicts = findConflictingBookings(
        {
          room_id: roomId,
          date,
          start_time: normalizeTimeString(startTime),
          end_time: normalizeTimeString(endTime),
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
    }

    checkConflict();
    return () => {
      cancelled = true;
    };
  }, [roomId, date, startTime, endTime, supabase]);

  useEffect(() => {
    if (state.error) {
      setShowOptimistic(false);
    }
  }, [state.error]);

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (!next) {
      router.push("/bookings");
    }
  }

  function handleSubmit() {
    setShowOptimistic(true);
    toast.success({
      title: "Request submitted",
      description: "Your booking request is pending approval.",
    });
  }

  const roomName = rooms.find((r) => r.id === roomId)?.name ?? "";

  return (
    <Modal open={open} onOpenChange={handleOpenChange}>
      <ModalContent>
        <ModalHeader>
          <ModalTitle>Request a room</ModalTitle>
          <ModalDescription>
            Submit a request for review — an admin will approve or reject it.
          </ModalDescription>
        </ModalHeader>

        {showOptimistic ? (
          <div className="flex flex-col gap-4 py-2">
            <BookingCard
              roomName={roomName}
              date={date}
              startTime={normalizeTimeString(startTime)}
              endTime={normalizeTimeString(endTime)}
              service={service}
              status="pending"
            />
            <p className="text-small text-ink-500">Submitting your request…</p>
          </div>
        ) : (
          <form action={formAction} onSubmit={handleSubmit} className="flex flex-col gap-4">
            <input type="hidden" name="room_id" value={roomId} />
            <input type="hidden" name="date" value={date} />
            <input type="hidden" name="start_time" value={startTime} />
            <input type="hidden" name="end_time" value={endTime} />
            <input type="hidden" name="service" value={service} />

            <Select
              label="Room"
              placeholder="Select a room"
              options={rooms.map((room) => ({ value: room.id, label: room.name }))}
              value={roomId || null}
              onValueChange={(value) => setRoomId(value)}
              required
            />

            <DatePicker label="Date" mode="popover" value={date} onValueChange={setDate} />

            <div className="flex flex-col gap-1.5">
              <span className="text-sm font-medium text-ink-700">Time range</span>
              <TimeRangePicker
                startTime={startTime}
                endTime={endTime}
                onStartTimeChange={setStartTime}
                onEndTimeChange={setEndTime}
                hasConflict={!!warning}
                conflictMessage={warning}
              />
            </div>

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

            {state.error && (
              <p role="alert" className="text-small font-medium text-status-rejected-fg">
                {state.error}
              </p>
            )}

            <ModalFooter>
              <Button type="submit" loading={pending} disabled={pending}>
                Submit request
              </Button>
            </ModalFooter>
          </form>
        )}
      </ModalContent>
    </Modal>
  );
}
