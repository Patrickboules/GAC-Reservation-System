"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { BLOCKING_STATUSES, fetchConflictingBookings } from "@/lib/bookings/conflict-check";
import { LATEST_BOOKING_END_MINUTES, MAX_OPEN_PENDING_BOOKINGS } from "@/lib/bookings/limits";
import { countOpenPendingReservations } from "@/lib/bookings/pending-count";
import { isBookingService } from "@/lib/bookings/services";
import { isBookingModifiable } from "@/lib/bookings/status";
import {
  isBookingPast,
  isBookingStartInPast,
  normalizeTimeString,
  timeToMinutes,
} from "@/lib/dates";
import { notifyAdminsNewRequest, notifyBookingCancelled } from "@/lib/notifications";
import { sendBookingStatusEmail } from "@/lib/email";
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
  if (timeToMinutes(endTime) > LATEST_BOOKING_END_MINUTES) {
    return { error: "Bookings can't run later than 10:30 PM." };
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

  // Only an already-approved booking blocks a new request — two pending
  // requests for the same slot are allowed to coexist, and the admin decides
  // which one gets approved.
  const conflicts = await fetchConflictingBookings(
    supabase,
    {
      room_id: roomId,
      date,
      start_time: startTime,
      end_time: endTime,
    },
    BLOCKING_STATUSES
  );
  if (conflicts.length > 0) {
    return {
      error: "This slot overlaps an existing approved booking for that room.",
    };
  }

  // Counts reservations (distinct group_id), not rows — a member who already
  // holds a multi-room collective reservation shouldn't have it count as more
  // than 1 against their cap here either.
  const openReservationCount = await countOpenPendingReservations(supabase, user.id);
  if (openReservationCount >= MAX_OPEN_PENDING_BOOKINGS) {
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
        error: "This slot overlaps an existing approved booking for that room.",
      };
    }
    console.error("requestBooking: failed to insert booking", insertError);
    return { error: "Something went wrong while submitting your request. Please try again." };
  }

  const admin = createAdminClient();
  await notifyAdminsNewRequest(admin, {
    bookingId: inserted.id,
    requesterId: user.id,
    roomIds: [roomId],
    date,
    startTime,
    endTime,
  });
  await sendBookingStatusEmail(admin, {
    bookingId: inserted.id,
    status: "pending",
    requesterId: user.id,
    roomIds: [roomId],
    date,
    startTime,
    endTime,
  });

  revalidatePath("/bookings");
  redirect("/bookings?submitted=1");
}

export interface RequestCollectiveBookingState {
  error?: string;
}

/**
 * Same as requestBooking, but creates one independent pending booking per
 * selected room (a hall and/or any of its subrooms) from a single shared
 * date/time/service/notes submission.
 * All-or-nothing: the whole batch is inserted in one `insert([...])` call, so
 * a single INSERT statement either commits every row or (on a conflict caught
 * by the DB's hall<->subroom exclusion trigger) rolls back all of them —
 * matching the app-level all-or-nothing conflict/cap checks run first below.
 */
export async function requestCollectiveBooking(
  _prevState: RequestCollectiveBookingState,
  formData: FormData
): Promise<RequestCollectiveBookingState> {
  const roomIds = Array.from(new Set(formData.getAll("room_id").map(String).filter(Boolean)));
  const date = (formData.get("date") as string | null) ?? "";
  const rawStartTime = (formData.get("start_time") as string | null) ?? "";
  const rawEndTime = (formData.get("end_time") as string | null) ?? "";
  const service = (formData.get("service") as string | null) ?? "";
  const notes = ((formData.get("notes") as string | null) ?? "").trim() || null;

  if (roomIds.length === 0 || !date || !rawStartTime || !rawEndTime || !service) {
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
  if (timeToMinutes(endTime) > LATEST_BOOKING_END_MINUTES) {
    return { error: "Bookings can't run later than 10:30 PM." };
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

  const { data: selectedRooms, error: roomsError } = await supabase
    .from("rooms")
    .select("id, name, parent_room_id")
    .in("id", roomIds);

  if (roomsError) {
    console.error("requestCollectiveBooking: failed to load selected rooms", roomsError);
    return { error: "Something went wrong while checking the selected rooms. Please try again." };
  }
  const roomsById = new Map((selectedRooms ?? []).map((r) => [r.id as string, r]));
  if (roomsById.size !== roomIds.length) {
    return { error: "One or more selected rooms no longer exist." };
  }
  // Selection is scoped to one hall per request: every selected room must
  // either *be* the hall (its own parent_room_id is null) or be one of that
  // hall's subrooms (parent_room_id equal to the hall's id) — so a request
  // can mix the hall with any subset of its subrooms, but never rooms from
  // two different halls.
  const topLevelIds = roomIds.filter((id) => roomsById.get(id)!.parent_room_id === null);
  const parentIds = new Set(
    roomIds.map((id) => roomsById.get(id)!.parent_room_id).filter((id): id is string => id !== null)
  );
  const validSelection =
    topLevelIds.length <= 1 &&
    parentIds.size <= 1 &&
    (parentIds.size === 0 || topLevelIds.length === 0 || parentIds.has(topLevelIds[0]));
  if (!validSelection) {
    return { error: "Selected rooms must all belong to the same hall." };
  }

  // Only an already-approved booking blocks a request (see requestBooking) —
  // checked independently per selected room so the response can name which
  // one(s) caused the failure.
  const conflictResults = await Promise.all(
    roomIds.map((roomId) =>
      fetchConflictingBookings(supabase, { room_id: roomId, date, start_time: startTime, end_time: endTime }, BLOCKING_STATUSES)
    )
  );
  const conflictingRoomIds = roomIds.filter((_, i) => conflictResults[i].length > 0);
  if (conflictingRoomIds.length > 0) {
    if (roomIds.length === 1) {
      return { error: "This slot overlaps an existing approved booking for that room." };
    }
    const names = conflictingRoomIds.map((id) => roomsById.get(id)!.name as string);
    return {
      error: `This slot overlaps an existing approved booking for: ${names.join(", ")}.`,
    };
  }

  // This whole submission becomes one reservation (one group_id) regardless
  // of how many rooms it spans, so the cap counts reservations, not rows —
  // a hall + N subrooms only ever costs 1 against the member's cap of 5.
  const openReservationCount = await countOpenPendingReservations(supabase, user.id);
  if (openReservationCount >= MAX_OPEN_PENDING_BOOKINGS) {
    return {
      error: `You already have ${MAX_OPEN_PENDING_BOOKINGS} pending requests awaiting a decision. Cancel one or wait for a response before requesting more.`,
    };
  }

  // Every row created by this submission shares one group_id, so the whole
  // selection is treated as a single reservation from here on: one status,
  // approved/rejected/edited/cancelled together (see app/(app)/admin/actions.ts
  // and the update/cancel actions below, which resolve and act on the full
  // group rather than a single row).
  const groupId = crypto.randomUUID();

  const { data: inserted, error: insertError } = await supabase
    .from("bookings")
    .insert(
      roomIds.map((roomId) => ({
        room_id: roomId,
        user_id: user.id,
        date,
        start_time: startTime,
        end_time: endTime,
        service,
        notes,
        status: "pending",
        group_id: groupId,
      }))
    )
    .select("id, room_id");

  if (insertError) {
    // 23P01 = exclusion_violation: see the matching comment in requestBooking
    // — one insert statement for the whole batch means this rolls back every
    // row in the selection, not just the offending one.
    if (insertError.code === "23P01") {
      return {
        error: "This slot overlaps an existing approved booking for that room.",
      };
    }
    console.error("requestCollectiveBooking: failed to insert bookings", insertError);
    return { error: "Something went wrong while submitting your request. Please try again." };
  }

  const admin = createAdminClient();
  const representativeId = (inserted ?? [])[0]?.id ?? roomIds[0];
  await notifyAdminsNewRequest(admin, {
    bookingId: representativeId,
    requesterId: user.id,
    roomIds,
    date,
    startTime,
    endTime,
  });
  await sendBookingStatusEmail(admin, {
    bookingId: representativeId,
    status: "pending",
    requesterId: user.id,
    roomIds,
    date,
    startTime,
    endTime,
  });

  revalidatePath("/bookings");
  redirect(`/bookings?submitted=1${roomIds.length > 1 ? `&count=${roomIds.length}` : ""}`);
}

export interface UpdateBookingState {
  error?: string;
}

export async function updateBooking(
  _prevState: UpdateBookingState,
  formData: FormData
): Promise<UpdateBookingState> {
  const bookingId = (formData.get("booking_id") as string | null) ?? "";
  const date = (formData.get("date") as string | null) ?? "";
  const rawStartTime = (formData.get("start_time") as string | null) ?? "";
  const rawEndTime = (formData.get("end_time") as string | null) ?? "";
  const service = (formData.get("service") as string | null) ?? "";
  const notes = ((formData.get("notes") as string | null) ?? "").trim() || null;

  if (!bookingId || !date || !rawStartTime || !rawEndTime || !service) {
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
  if (timeToMinutes(endTime) > LATEST_BOOKING_END_MINUTES) {
    return { error: "Bookings can't run later than 10:30 PM." };
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
    .select("id, user_id, room_id, date, start_time, end_time, status, group_id")
    .eq("id", bookingId)
    .single();

  if (fetchError || !booking || booking.user_id !== user.id) {
    return { error: "Booking not found." };
  }
  if (!isBookingModifiable(booking.status, booking.date, booking.end_time)) {
    return { error: "This booking can no longer be edited." };
  }

  // A booking is never edited alone — every row sharing its group_id (the
  // rooms of one collective reservation, or just itself for a standalone
  // booking) moves to the new date/time/service/notes together.
  const { data: groupRows, error: groupFetchError } = await supabase
    .from("bookings")
    .select("id, room_id")
    .eq("group_id", booking.group_id);

  if (groupFetchError || !groupRows || groupRows.length === 0) {
    console.error("updateBooking: failed to load reservation group", groupFetchError);
    return { error: "Something went wrong while loading this reservation. Please try again." };
  }

  const conflictResults = await Promise.all(
    groupRows.map((row) =>
      fetchConflictingBookings(
        supabase,
        { room_id: row.room_id, date, start_time: startTime, end_time: endTime, excludeBookingId: row.id },
        BLOCKING_STATUSES
      )
    )
  );
  if (conflictResults.some((conflicts) => conflicts.length > 0)) {
    return {
      error: "This slot overlaps an existing approved booking for that room.",
    };
  }

  const rescheduled =
    date !== booking.date || startTime !== booking.start_time || endTime !== booking.end_time;
  const newStatus = rescheduled ? "pending" : booking.status;

  const { error: updateError } = await supabase
    .from("bookings")
    .update({
      date,
      start_time: startTime,
      end_time: endTime,
      service,
      notes,
      status: newStatus,
    })
    .eq("group_id", booking.group_id)
    .eq("user_id", user.id);

  if (updateError) {
    // 23P01 = exclusion_violation: see the matching comment in requestBooking.
    if (updateError.code === "23P01") {
      return {
        error: "This slot overlaps an existing approved booking for that room.",
      };
    }
    console.error("updateBooking: failed to update booking", updateError);
    return { error: "Something went wrong while saving your changes. Please try again." };
  }

  revalidatePath("/bookings");
  revalidatePath(`/bookings/${bookingId}`);
  redirect("/bookings?updated=1");
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
    .select("id, user_id, room_id, date, start_time, end_time, status, group_id")
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

  // Cancelling any room of a reservation cancels the whole thing — every row
  // sharing this group_id frees up together.
  const { data: groupRows } = await supabase
    .from("bookings")
    .select("room_id")
    .eq("group_id", booking.group_id);
  const roomIds = (groupRows ?? [booking]).map((row) => row.room_id);

  const { error: updateError } = await supabase
    .from("bookings")
    .update({ status: "cancelled" })
    .eq("group_id", booking.group_id)
    .eq("user_id", user.id);

  if (updateError) {
    console.error("cancelBooking: failed to update booking", updateError);
    return { error: "Something went wrong while cancelling your booking. Please try again." };
  }

  const admin = createAdminClient();
  await notifyBookingCancelled(admin, {
    bookingId: booking.id,
    userId: booking.user_id,
    roomIds,
    date: booking.date,
    startTime: booking.start_time,
    endTime: booking.end_time,
  });
  await sendBookingStatusEmail(admin, {
    bookingId: booking.id,
    status: "cancelled",
    requesterId: booking.user_id,
    roomIds,
    date: booking.date,
    startTime: booking.start_time,
    endTime: booking.end_time,
  });

  // Drop the cached booking list/detail so the cancelled booking doesn't linger
  // in its old tab after the redirect.
  revalidatePath("/bookings");
  revalidatePath(`/bookings/${bookingId}`);
  redirect("/bookings?cancelled=1");
}
