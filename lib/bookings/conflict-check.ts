import type { SupabaseClient } from "@supabase/supabase-js";

export type BookingStatus = "pending" | "approved" | "rejected" | "cancelled";

/** Statuses that occupy a slot and must be checked for overlap. */
export const CONFLICTING_STATUSES: readonly BookingStatus[] = ["pending", "approved"];

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
 * Server-side helper: fetches the candidate slot's room/date bookings and runs them
 * through the same overlap logic used everywhere else. Queries `bookings_schedule`
 * (not the base `bookings` table) because bookings' own RLS policy only lets a member
 * read their own rows — the schedule view exposes every member's pending/approved
 * room_id/date/start_time/end_time/status so conflicts against other members' requests
 * are actually detected.
 *
 * `statuses` defaults to both pending and approved (creation/edit/availability: any
 * held slot blocks a new one). Admin approval passes `['approved']` only, since its
 * re-check is a race guard against another *already-approved* booking for the same
 * slot — a sibling still-pending request must not itself block the first approval.
 */
export async function fetchConflictingBookings(
  supabase: SupabaseClient,
  candidate: ConflictCandidate,
  statuses: readonly BookingStatus[] = CONFLICTING_STATUSES
): Promise<BookingTimeSlot[]> {
  const { data, error } = await supabase
    .from("bookings_schedule")
    .select("id, room_id, date, start_time, end_time, status")
    .eq("room_id", candidate.room_id)
    .eq("date", candidate.date)
    .in("status", statuses);

  if (error) {
    throw error;
  }

  return findConflictingBookings(candidate, (data ?? []) as BookingTimeSlot[]);
}
