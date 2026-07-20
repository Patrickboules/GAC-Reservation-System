"use client";

import { useActionState, useEffect, useMemo, useState } from "react";

import { updateBooking, type UpdateBookingState } from "@/app/bookings/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { findConflictingBookings } from "@/lib/bookings/conflict-check";
import type { BookingStatus } from "@/lib/bookings/conflict-check";
import { BOOKING_SERVICES } from "@/lib/bookings/services";
import { createClient } from "@/lib/supabase/client";
import { normalizeTimeString } from "@/lib/dates";

export interface EditBookingFormRoom {
  id: string;
  name: string;
}

export interface EditBookingFormBooking {
  id: string;
  room_id: string;
  date: string;
  start_time: string;
  end_time: string;
  service: string;
  notes: string | null;
}

interface ScheduleBooking {
  id: string;
  room_id: string;
  date: string;
  start_time: string;
  end_time: string;
  status: BookingStatus;
}

const initialState: UpdateBookingState = {};

export function EditBookingForm({
  booking,
  rooms,
}: {
  booking: EditBookingFormBooking;
  rooms: EditBookingFormRoom[];
}) {
  const supabase = useMemo(() => createClient(), []);
  const [state, formAction, pending] = useActionState(updateBooking, initialState);

  const [roomId, setRoomId] = useState(booking.room_id);
  const [date, setDate] = useState(booking.date);
  const [startTime, setStartTime] = useState(booking.start_time.slice(0, 5));
  const [endTime, setEndTime] = useState(booking.end_time.slice(0, 5));
  const [service, setService] = useState(booking.service);
  const [warning, setWarning] = useState<string | null>(null);

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
          excludeBookingId: booking.id,
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
  }, [roomId, date, startTime, endTime, supabase, booking.id]);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="booking_id" value={booking.id} />

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="edit-room">Room</Label>
        <input type="hidden" name="room_id" value={roomId} />
        <Select value={roomId} onValueChange={(value) => setRoomId(value as string)}>
          <SelectTrigger id="edit-room" className="w-full">
            <SelectValue>{rooms.find((r) => r.id === roomId)?.name ?? "Select a room"}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            {rooms.map((room) => (
              <SelectItem key={room.id} value={room.id}>
                {room.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="edit-date">Date</Label>
        <Input
          id="edit-date"
          name="date"
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          required
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="edit-start">Start time</Label>
          <Input
            id="edit-start"
            name="start_time"
            type="time"
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
            required
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="edit-end">End time</Label>
          <Input
            id="edit-end"
            name="end_time"
            type="time"
            value={endTime}
            onChange={(e) => setEndTime(e.target.value)}
            required
          />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="edit-service">Service / purpose</Label>
        <input type="hidden" name="service" value={service} />
        <Select value={service} onValueChange={(value) => setService(value as string)}>
          <SelectTrigger id="edit-service" className="w-full">
            <SelectValue>{service || "Select a service/purpose"}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            {BOOKING_SERVICES.map((option) => (
              <SelectItem key={option} value={option}>
                {option}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="edit-notes">Notes (optional)</Label>
        <Textarea id="edit-notes" name="notes" rows={3} defaultValue={booking.notes ?? ""} />
      </div>

      {warning ? (
        <p role="alert" className="text-sm text-amber-700 dark:text-amber-400">
          {warning}
        </p>
      ) : null}

      {state.error ? (
        <p role="alert" className="text-sm text-destructive">
          {state.error}
        </p>
      ) : null}

      <Button type="submit" disabled={pending}>
        {pending ? "Saving…" : "Save changes"}
      </Button>
    </form>
  );
}
