"use server";

import { redirect } from "next/navigation";

import { fetchConflictingBookings } from "@/lib/bookings/conflict-check";
import { isBookingService } from "@/lib/bookings/services";
import { normalizeTimeString } from "@/lib/dates";
import { createClient } from "@/lib/supabase/server";

const MAX_OPEN_PENDING_BOOKINGS = 5;

export interface RequestBookingState {
  error?: string;
}

export async function requestBooking(
  _prevState: RequestBookingState,
  formData: FormData
): Promise<RequestBookingState> {
  const roomId = (formData.get("room_id") as string | null) ?? "";
  const date = (formData.get("date") as string | null) ?? "";
  const rawStartTime = (formData.get("start_time") as string | null) ?? "";
  const rawEndTime = (formData.get("end_time") as string | null) ?? "";
  const service = (formData.get("service") as string | null) ?? "";
  const notes = ((formData.get("notes") as string | null) ?? "").trim() || null;

  if (!roomId || !date || !rawStartTime || !rawEndTime || !service) {
    return { error: "Room, date, start time, end time, and service are required." };
  }
  if (!isBookingService(service)) {
    return { error: "Select a valid service/purpose." };
  }

  const startTime = normalizeTimeString(rawStartTime);
  const endTime = normalizeTimeString(rawEndTime);

  if (startTime >= endTime) {
    return { error: "End time must be after start time." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const conflicts = await fetchConflictingBookings(supabase, {
    room_id: roomId,
    date,
    start_time: startTime,
    end_time: endTime,
  });
  if (conflicts.length > 0) {
    return {
      error: "This slot overlaps an existing pending or approved booking for that room.",
    };
  }

  const { count, error: countError } = await supabase
    .from("bookings")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .eq("status", "pending");

  if (countError) {
    return { error: countError.message };
  }
  if ((count ?? 0) >= MAX_OPEN_PENDING_BOOKINGS) {
    return {
      error: `You already have ${MAX_OPEN_PENDING_BOOKINGS} pending requests awaiting a decision. Cancel one or wait for a response before requesting more.`,
    };
  }

  const { error: insertError } = await supabase.from("bookings").insert({
    room_id: roomId,
    user_id: user.id,
    date,
    start_time: startTime,
    end_time: endTime,
    service,
    notes,
    status: "pending",
  });

  if (insertError) {
    return { error: insertError.message };
  }

  redirect("/bookings");
}
