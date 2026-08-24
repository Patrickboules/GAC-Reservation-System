"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import type { SupabaseClient } from "@supabase/supabase-js";

import { fetchConflictingBookings } from "@/lib/bookings/conflict-check";
import { notifyBookingApproved, notifyBookingRejected } from "@/lib/notifications";
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
    .select("id, user_id, room_id, date, start_time, end_time, status")
    .eq("id", bookingId)
    .single();

  if (fetchError || !booking) {
    return { ok: false, error: "Booking not found." };
  }
  if (booking.status !== "pending") {
    return { ok: false, error: "Only pending requests can be approved." };
  }

  const conflicts = await fetchConflictingBookings(
    supabase,
    {
      room_id: booking.room_id,
      date: booking.date,
      start_time: booking.start_time,
      end_time: booking.end_time,
      excludeBookingId: booking.id,
    },
    ["approved"]
  );

  if (conflicts.length > 0) {
    return {
      ok: false,
      error: "This slot now conflicts with another approved booking.",
    };
  }

  const { error: updateError } = await supabase
    .from("bookings")
    .update({ status: "approved", reject_reason: null })
    .eq("id", bookingId)
    .eq("status", "pending");

  if (updateError) {
    // 23P01 = exclusion_violation: the bookings_no_overlap constraint is the
    // real backstop against this race — two concurrent approvals for
    // overlapping slots can both pass the conflict check above before either
    // UPDATE lands, but only one UPDATE can satisfy the constraint. Same
    // message as the check above, since it's the same condition just caught
    // one layer down.
    if (updateError.code === "23P01") {
      return {
        ok: false,
        error: "This slot now conflicts with another approved booking.",
      };
    }
    return { ok: false, error: updateError.message };
  }

  await notifyBookingApproved(createAdminClient(), {
    bookingId: booking.id,
    userId: booking.user_id,
    roomId: booking.room_id,
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
    .select("id, user_id, room_id, date, start_time, end_time, status")
    .eq("id", bookingId)
    .single();

  if (fetchError || !booking) {
    return { ok: false, error: "Booking not found." };
  }
  if (booking.status !== "pending") {
    return { ok: false, error: "Only pending requests can be rejected." };
  }

  const { error: updateError } = await supabase
    .from("bookings")
    .update({ status: "rejected", reject_reason: trimmedReason })
    .eq("id", bookingId)
    .eq("status", "pending");

  if (updateError) {
    return { ok: false, error: updateError.message };
  }

  await notifyBookingRejected(createAdminClient(), {
    bookingId: booking.id,
    userId: booking.user_id,
    roomId: booking.room_id,
    date: booking.date,
    startTime: booking.start_time,
    endTime: booking.end_time,
    reason: trimmedReason,
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
