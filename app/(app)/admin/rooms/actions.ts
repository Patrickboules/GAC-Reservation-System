"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

import { isBookingPast } from "@/lib/dates";
import { isRoomCategoryColor } from "@/lib/rooms/category-colors";
import { createClient } from "@/lib/supabase/server";

export interface RoomActionResult {
  ok: boolean;
  error?: string;
}

export interface RoomInput {
  name: string;
  building: string | null;
  floor: string | null;
  roomType: string | null;
  amenities: string[];
  categoryColor: string | null;
}

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

function validateRoomInput(input: RoomInput): string | null {
  if (!input.name.trim()) return "Name is required.";
  if (input.categoryColor && !isRoomCategoryColor(input.categoryColor)) {
    return "Invalid category color.";
  }
  return null;
}

function toRow(input: RoomInput) {
  return {
    name: input.name.trim(),
    building: input.building?.trim() || null,
    floor: input.floor?.trim() || null,
    room_type: input.roomType?.trim() || null,
    amenities: input.amenities,
    category_color: input.categoryColor,
  };
}

function friendlyError(error: { message: string }): string {
  return error.message;
}

export async function createRoomAction(input: RoomInput): Promise<RoomActionResult> {
  const supabase = await requireAdmin();
  const validationError = validateRoomInput(input);
  if (validationError) return { ok: false, error: validationError };

  const { error } = await supabase.from("rooms").insert(toRow(input));
  if (error) return { ok: false, error: friendlyError(error) };

  revalidatePath("/admin/rooms");
  return { ok: true };
}

export async function updateRoomAction(
  roomId: string,
  input: RoomInput
): Promise<RoomActionResult> {
  const supabase = await requireAdmin();
  const validationError = validateRoomInput(input);
  if (validationError) return { ok: false, error: validationError };

  const { error } = await supabase.from("rooms").update(toRow(input)).eq("id", roomId);
  if (error) return { ok: false, error: friendlyError(error) };

  revalidatePath("/admin/rooms");
  return { ok: true };
}

/** Blocks deletion if the room has any pending booking, or any approved
 * booking that hasn't ended yet — mirrors the future/past logic already
 * shared by lib/bookings/status.ts via lib/dates.ts's isBookingPast. */
export async function deleteRoomAction(roomId: string): Promise<RoomActionResult> {
  const supabase = await requireAdmin();

  const { data: blockingBookings, error: fetchError } = await supabase
    .from("bookings")
    .select("date, end_time, status")
    .eq("room_id", roomId)
    .in("status", ["pending", "approved"]);

  if (fetchError) {
    return { ok: false, error: fetchError.message };
  }

  const hasBlockingBooking = (blockingBookings ?? []).some(
    (booking) => booking.status === "pending" || !isBookingPast(booking.date, booking.end_time)
  );

  if (hasBlockingBooking) {
    return {
      ok: false,
      error: "This room has pending or upcoming approved bookings and can't be deleted.",
    };
  }

  const { error } = await supabase.from("rooms").delete().eq("id", roomId);
  if (error) return { ok: false, error: friendlyError(error) };

  revalidatePath("/admin/rooms");
  return { ok: true };
}
