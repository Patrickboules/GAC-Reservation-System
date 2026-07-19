import type { SupabaseClient } from "@supabase/supabase-js";

export type BookingStatus = "pending" | "approved" | "rejected" | "cancelled";

/** Statuses that occupy a slot and must be checked for overlap. */
const CONFLICTING_STATUSES: readonly BookingStatus[] = ["pending", "approved"];

export interface BookingTimeSlot {
  id: string;
  room_id: string;
  date: string;
  start_time: string;
  end_time: string;
  status: BookingStatus;
}

export interface ConflictCandidate {
  room_id: string;
  date: string;
  start_time: string;
  end_time: string;
  /** Exclude this booking id from the check (used when editing an existing booking). */
  excludeBookingId?: string;
}

/**
 * Overlap = same room_id + date, with start_time < existing.end_time AND
 * end_time > existing.start_time, checked only against 'pending'/'approved' bookings.
 * This is the single source of truth for conflict detection — reused by availability
 * search, booking creation, admin approval, and booking edit.
 */
export function findConflictingBookings(
  candidate: ConflictCandidate,
  existingBookings: readonly BookingTimeSlot[]
): BookingTimeSlot[] {
  return existingBookings.filter((existing) => {
    if (candidate.excludeBookingId && existing.id === candidate.excludeBookingId) {
      return false;
    }
    if (existing.room_id !== candidate.room_id || existing.date !== candidate.date) {
      return false;
    }
    if (!CONFLICTING_STATUSES.includes(existing.status)) {
      return false;
    }
    return candidate.start_time < existing.end_time && candidate.end_time > existing.start_time;
  });
}

export function hasConflict(
  candidate: ConflictCandidate,
  existingBookings: readonly BookingTimeSlot[]
): boolean {
  return findConflictingBookings(candidate, existingBookings).length > 0;
}

/**
 * Server-side helper: fetches the candidate slot's room/date bookings from Supabase
 * (RLS-visible rows are enough — status/time are readable by all authenticated members)
 * and runs them through the same overlap logic used everywhere else.
 */
export async function fetchConflictingBookings(
  supabase: SupabaseClient,
  candidate: ConflictCandidate
): Promise<BookingTimeSlot[]> {
  const { data, error } = await supabase
    .from("bookings")
    .select("id, room_id, date, start_time, end_time, status")
    .eq("room_id", candidate.room_id)
    .eq("date", candidate.date)
    .in("status", CONFLICTING_STATUSES);

  if (error) {
    throw error;
  }

  return findConflictingBookings(candidate, (data ?? []) as BookingTimeSlot[]);
}
