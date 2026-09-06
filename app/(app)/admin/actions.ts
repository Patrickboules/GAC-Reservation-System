"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import type { SupabaseClient } from "@supabase/supabase-js";

import { fetchConflictingBookings } from "@/lib/bookings/conflict-check";
import { notifyBookingApproved, notifyBookingRejected } from "@/lib/notifications";
import { sendBookingStatusEmail } from "@/lib/email";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export interface BookingActionResult {
  id: string;
  ok: boolean;
  error?: string;
}

export async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") {
    redirect("/");
  }

  return supabase;
}

/**
 * Shared approve logic reused by the single-row and bulk approve actions below —
 * re-runs the same approved-only conflict re-check as a race-condition guard,
 * regardless of which entry point triggered it.
 */
async function approveBookingById(
  supabase: SupabaseClient,
  bookingId: string
): Promise<Omit<BookingActionResult, "id">> {
  const { data: booking, error: fetchError } = await supabase
    .from("bookings")
    .select("id, user_id, room_id, date, start_time, end_time, status, group_id")
    .eq("id", bookingId)
    .single();

  if (fetchError || !booking) {
    return { ok: false, error: "Booking not found." };
  }

  // A reservation is approved as one atomic unit: every room sharing this
  // group_id must currently be pending, and every one of them is re-checked
  // for an approved conflict before any of them are written.
  const { data: groupRows, error: groupFetchError } = await supabase
    .from("bookings")
    .select("id, room_id, status")
    .eq("group_id", booking.group_id);

  if (groupFetchError || !groupRows || groupRows.length === 0) {
    console.error("approveBookingById: failed to load reservation group", groupFetchError);
    return { ok: false, error: "Something went wrong while loading this reservation. Please try again." };
  }
  if (groupRows.some((row) => row.status !== "pending")) {
    return { ok: false, error: "Only pending requests can be approved." };
  }

  const conflictResults = await Promise.all(
    groupRows.map((row) =>
      fetchConflictingBookings(
        supabase,
        {
          room_id: row.room_id,
          date: booking.date,
          start_time: booking.start_time,
          end_time: booking.end_time,
          excludeBookingId: row.id,
        },
        ["approved"]
      )
    )
  );

  if (conflictResults.some((conflicts) => conflicts.length > 0)) {
    return {
      ok: false,
      error: "This slot now conflicts with another approved booking.",
    };
  }

  const { error: updateError } = await supabase
    .from("bookings")
    .update({ status: "approved", reject_reason: null })
    .eq("group_id", booking.group_id)
    .eq("status", "pending");

  if (updateError) {
    // 23P01 = exclusion_violation: the bookings_no_overlap constraint is the
    // real backstop against this race — two concurrent approvals for
    // overlapping slots can both pass the conflict check above before either
    // UPDATE lands, but only one UPDATE can satisfy the constraint. Same
    // message as the check above, since it's the same condition just caught
    // one layer down. A single UPDATE statement is atomic, so a conflict on
    // any one room in the group rolls back the whole reservation's approval.
    if (updateError.code === "23P01") {
      return {
        ok: false,
        error: "This slot now conflicts with another approved booking.",
      };
    }
    console.error("approveBookingById: failed to update booking", updateError);
    return {
      ok: false,
      error: "Something went wrong while approving this request. Please try again.",
    };
  }

  const admin = createAdminClient();
  const roomIds = groupRows.map((row) => row.room_id);
  await notifyBookingApproved(admin, {
    bookingId: booking.id,
    userId: booking.user_id,
    roomIds,
    date: booking.date,
    startTime: booking.start_time,
    endTime: booking.end_time,
  });
  await sendBookingStatusEmail(admin, {
    bookingId: booking.id,
    status: "approved",
    requesterId: booking.user_id,
    roomIds,
    date: booking.date,
    startTime: booking.start_time,
    endTime: booking.end_time,
  });

  return { ok: true };
}

/** Shared reject logic reused by the single-row and bulk reject actions below. */
async function rejectBookingById(
  supabase: SupabaseClient,
  bookingId: string,
  reason: string
): Promise<Omit<BookingActionResult, "id">> {
  const trimmedReason = reason.trim();
  if (!trimmedReason) {
    return { ok: false, error: "A rejection reason is required." };
  }

  const { data: booking, error: fetchError } = await supabase
    .from("bookings")
    .select("id, user_id, room_id, date, start_time, end_time, status, group_id")
    .eq("id", bookingId)
    .single();

  if (fetchError || !booking) {
    return { ok: false, error: "Booking not found." };
  }

  const { data: groupRows, error: groupFetchError } = await supabase
    .from("bookings")
    .select("room_id, status")
    .eq("group_id", booking.group_id);

  if (groupFetchError || !groupRows || groupRows.length === 0) {
    console.error("rejectBookingById: failed to load reservation group", groupFetchError);
    return { ok: false, error: "Something went wrong while loading this reservation. Please try again." };
  }
  if (groupRows.some((row) => row.status !== "pending")) {
    return { ok: false, error: "Only pending requests can be rejected." };
  }

  const { error: updateError } = await supabase
    .from("bookings")
    .update({ status: "rejected", reject_reason: trimmedReason })
    .eq("group_id", booking.group_id)
    .eq("status", "pending");

  if (updateError) {
    console.error("rejectBookingById: failed to update booking", updateError);
    return {
      ok: false,
      error: "Something went wrong while rejecting this request. Please try again.",
    };
  }

  const admin = createAdminClient();
  const roomIds = groupRows.map((row) => row.room_id);
  await notifyBookingRejected(admin, {
    bookingId: booking.id,
    userId: booking.user_id,
    roomIds,
    date: booking.date,
    startTime: booking.start_time,
    endTime: booking.end_time,
    reason: trimmedReason,
  });
  await sendBookingStatusEmail(admin, {
    bookingId: booking.id,
    status: "rejected",
    requesterId: booking.user_id,
    roomIds,
    date: booking.date,
    startTime: booking.start_time,
    endTime: booking.end_time,
    rejectReason: trimmedReason,
  });

  return { ok: true };
}

export async function approveBookingAction(bookingId: string): Promise<BookingActionResult> {
  const supabase = await requireAdmin();
  const result = await approveBookingById(supabase, bookingId);
  revalidatePath("/admin/requests");
  return { id: bookingId, ...result };
}

export async function rejectBookingAction(
  bookingId: string,
  reason: string
): Promise<BookingActionResult> {
  const supabase = await requireAdmin();
  const result = await rejectBookingById(supabase, bookingId, reason);
  revalidatePath("/admin/requests");
  return { id: bookingId, ...result };
}

/** Bulk-approves each row, re-running the conflict re-check per row and reporting which rows failed. */
export async function bulkApproveBookingsAction(
  bookingIds: string[]
): Promise<BookingActionResult[]> {
  const supabase = await requireAdmin();
  const results: BookingActionResult[] = [];
  for (const id of bookingIds) {
    results.push({ id, ...(await approveBookingById(supabase, id)) });
  }
  revalidatePath("/admin/requests");
  return results;
}

/** Bulk-rejects each row with one shared required reason, reporting which rows failed. */
export async function bulkRejectBookingsAction(
  bookingIds: string[],
  reason: string
): Promise<BookingActionResult[]> {
  const supabase = await requireAdmin();
  const results: BookingActionResult[] = [];
  for (const id of bookingIds) {
    results.push({ id, ...(await rejectBookingById(supabase, id, reason)) });
  }
  revalidatePath("/admin/requests");
  return results;
}
