import type { SupabaseClient } from "@supabase/supabase-js";

export type BookingStatus = "pending" | "approved" | "rejected" | "cancelled";

/** Statuses that occupy a slot for display/warning purposes (schedule, availability
 * search, the client-side warning banner while filling out the booking form). */
export const CONFLICTING_STATUSES: readonly BookingStatus[] = ["pending", "approved"];

/** Statuses that actually block a submission. Two pending requests for the same
 * slot are allowed to coexist — members just see a warning — since only one can
 * ever be approved; the admin picks which. Only an already-approved booking is a
 * hard conflict, because approving is what makes a slot truly unavailable. */
export const BLOCKING_STATUSES: readonly BookingStatus[] = ["approved"];

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
 * `statuses` defaults to both pending and approved (used for display/availability
 * purposes — anything held shows as busy). Creation, edit, and admin approval all
 * pass `BLOCKING_STATUSES` (`['approved']` only) explicitly, since only an
 * already-approved booking should ever block a write — two pending requests for
 * the same slot are allowed to coexist; the admin decides which one gets approved.
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
