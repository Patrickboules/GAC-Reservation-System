"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { fetchConflictingBookings } from "@/lib/bookings/conflict-check";
import { MAX_OPEN_PENDING_BOOKINGS } from "@/lib/bookings/limits";
import { isBookingService } from "@/lib/bookings/services";
import { isBookingModifiable } from "@/lib/bookings/status";
import { isBookingPast, isBookingStartInPast, normalizeTimeString } from "@/lib/dates";
import { notifyAdminsNewRequest, notifyBookingCancelled } from "@/lib/notifications";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

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
  if (isBookingStartInPast(date, startTime)) {
    return { error: "Can't request a booking in the past." };
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

  const { data: inserted, error: insertError } = await supabase
    .from("bookings")
    .insert({
      room_id: roomId,
      user_id: user.id,
      date,
      start_time: startTime,
      end_time: endTime,
      service,
      notes,
      status: "pending",
    })
    .select("id")
    .single();

  if (insertError) {
    // 23P01 = exclusion_violation: the bookings_no_overlap constraint caught
    // a race the conflict check above missed (another request for the same
    // slot landed first). Same message as the check above, since it's the
    // same condition — just caught at the database layer instead.
    if (insertError.code === "23P01") {
      return {
        error: "This slot overlaps an existing pending or approved booking for that room.",
      };
    }
    return { error: insertError.message };
  }

  await notifyAdminsNewRequest(createAdminClient(), {
    bookingId: inserted.id,
    requesterId: user.id,
    roomId,
    date,
    startTime,
    endTime,
  });

  revalidatePath("/bookings");
  redirect("/bookings?submitted=1");
}

export interface UpdateBookingState {
  error?: string;
}

export async function updateBooking(
  _prevState: UpdateBookingState,
  formData: FormData
): Promise<UpdateBookingState> {
  const bookingId = (formData.get("booking_id") as string | null) ?? "";
  const roomId = (formData.get("room_id") as string | null) ?? "";
  const date = (formData.get("date") as string | null) ?? "";
  const rawStartTime = (formData.get("start_time") as string | null) ?? "";
  const rawEndTime = (formData.get("end_time") as string | null) ?? "";
  const service = (formData.get("service") as string | null) ?? "";
  const notes = ((formData.get("notes") as string | null) ?? "").trim() || null;

  if (!bookingId || !roomId || !date || !rawStartTime || !rawEndTime || !service) {
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
  if (isBookingStartInPast(date, startTime)) {
    return { error: "Can't reschedule a booking into the past." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: booking, error: fetchError } = await supabase
    .from("bookings")
    .select("id, user_id, room_id, date, start_time, end_time, status")
    .eq("id", bookingId)
    .single();

  if (fetchError || !booking || booking.user_id !== user.id) {
    return { error: "Booking not found." };
  }
  if (!isBookingModifiable(booking.status, booking.date, booking.end_time)) {
    return { error: "This booking can no longer be edited." };
  }

  const conflicts = await fetchConflictingBookings(supabase, {
    room_id: roomId,
    date,
    start_time: startTime,
    end_time: endTime,
    excludeBookingId: bookingId,
  });
  if (conflicts.length > 0) {
    return {
      error: "This slot overlaps an existing pending or approved booking for that room.",
    };
  }

  const rescheduled =
    roomId !== booking.room_id ||
    date !== booking.date ||
    startTime !== booking.start_time ||
    endTime !== booking.end_time;
  const newStatus = rescheduled ? "pending" : booking.status;

  const { error: updateError } = await supabase
    .from("bookings")
    .update({
      room_id: roomId,
      date,
      start_time: startTime,
      end_time: endTime,
      service,
      notes,
      status: newStatus,
    })
    .eq("id", bookingId)
    .eq("user_id", user.id);

  if (updateError) {
    // 23P01 = exclusion_violation: see the matching comment in requestBooking.
    if (updateError.code === "23P01") {
      return {
        error: "This slot overlaps an existing pending or approved booking for that room.",
      };
    }
    return { error: updateError.message };
  }

  revalidatePath("/bookings");
  revalidatePath(`/bookings/${bookingId}`);
  redirect("/bookings");
}

export interface CancelBookingState {
  error?: string;
}

export async function cancelBooking(
  _prevState: CancelBookingState,
  formData: FormData
): Promise<CancelBookingState> {
  const bookingId = (formData.get("booking_id") as string | null) ?? "";
  if (!bookingId) {
    return { error: "Missing booking id." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: booking, error: fetchError } = await supabase
    .from("bookings")
    .select("id, user_id, room_id, date, start_time, end_time, status")
    .eq("id", bookingId)
    .single();

  if (fetchError || !booking || booking.user_id !== user.id) {
    return { error: "Booking not found." };
  }
  if (booking.status !== "pending" && booking.status !== "approved") {
    return { error: "Only pending or approved bookings can be cancelled." };
  }
  if (isBookingPast(booking.date, booking.end_time)) {
    return { error: "Past bookings can't be cancelled." };
  }

  const { error: updateError } = await supabase
    .from("bookings")
    .update({ status: "cancelled" })
    .eq("id", bookingId)
    .eq("user_id", user.id);

  if (updateError) {
    return { error: updateError.message };
  }

  await notifyBookingCancelled(createAdminClient(), {
    bookingId: booking.id,
    userId: booking.user_id,
    roomId: booking.room_id,
    date: booking.date,
    startTime: booking.start_time,
    endTime: booking.end_time,
  });

  // Drop the cached booking list/detail so the cancelled booking doesn't linger
  // in its old tab after the redirect.
  revalidatePath("/bookings");
  revalidatePath(`/bookings/${bookingId}`);
  redirect("/bookings");
}
