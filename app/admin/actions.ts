"use server";

import { redirect } from "next/navigation";

import { fetchConflictingBookings } from "@/lib/bookings/conflict-check";
import { createClient } from "@/lib/supabase/server";

async function requireAdmin() {
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

export async function approveBooking(formData: FormData) {
  const bookingId = (formData.get("booking_id") as string | null) ?? "";
  if (!bookingId) {
    redirect("/admin?error=Missing booking id.");
  }

  const supabase = await requireAdmin();

  const { data: booking, error: fetchError } = await supabase
    .from("bookings")
    .select("id, room_id, date, start_time, end_time, status")
    .eq("id", bookingId)
    .single();

  if (fetchError || !booking) {
    redirect("/admin?error=Booking not found.");
  }
  if (booking.status !== "pending") {
    redirect("/admin?error=Only pending requests can be approved.");
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
    redirect(
      "/admin?error=" +
        encodeURIComponent(
          "This slot now conflicts with another approved or pending booking. Reject or ask the requester to reschedule."
        )
    );
  }

  const { error: updateError } = await supabase
    .from("bookings")
    .update({ status: "approved", reject_reason: null })
    .eq("id", bookingId)
    .eq("status", "pending");

  if (updateError) {
    redirect("/admin?error=" + encodeURIComponent(updateError.message));
  }

  redirect("/admin");
}

export async function rejectBooking(formData: FormData) {
  const bookingId = (formData.get("booking_id") as string | null) ?? "";
  const reason = ((formData.get("reject_reason") as string | null) ?? "").trim() || null;
  if (!bookingId) {
    redirect("/admin?error=Missing booking id.");
  }

  const supabase = await requireAdmin();

  const { error: updateError } = await supabase
    .from("bookings")
    .update({ status: "rejected", reject_reason: reason })
    .eq("id", bookingId)
    .eq("status", "pending");

  if (updateError) {
    redirect("/admin?error=" + encodeURIComponent(updateError.message));
  }

  redirect("/admin");
}
