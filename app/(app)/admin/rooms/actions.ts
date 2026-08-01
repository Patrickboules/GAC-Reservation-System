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
  code: string | null;
  capacity: number | null;
  amenities: string[];
  location: string | null;
  rules: string | null;
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

/** Migration 20260801000000 dropped code/capacity/location/rules from rooms, so
 * those RoomInput fields are deliberately not written — including them would make
 * PostgREST reject the insert/update with "column does not exist". The form still
 * collects them; until it's trimmed, values typed into those inputs are discarded. */
function toRow(input: RoomInput) {
  return {
    name: input.name.trim(),
    amenities: input.amenities,
    category_color: input.categoryColor,
  };
}

function friendlyError(error: { code?: string; message: string }): string {
  if (error.code === "23505") return "That room code is already in use.";
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
