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
  /**
   * The full set of room ids an existing booking may occupy to conflict with this
   * candidate — the candidate's room, its parent hall (if any), and its subrooms
   * (if any). Defaults to `[room_id]` when omitted, which reproduces the old
   * strict-equality behavior for rooms with no parent/children.
   */
  roomIds?: readonly string[];
}

export interface RoomHierarchyInfo {
  id: string;
  parent_room_id: string | null;
}

/**
 * A room's conflict set: itself, its parent hall (if it's a subroom), and its
 * subrooms (if it's a hall). Sibling subrooms of the same parent are never in
 * each other's set, so they never conflict with each other.
 *
 * `relatedRooms` only needs to contain the room itself (for its parent_room_id)
 * and any rooms whose parent_room_id equals `roomId` (its children) — not the
 * whole rooms table.
 */
export function computeConflictRoomIds(
  roomId: string,
  relatedRooms: readonly RoomHierarchyInfo[]
): string[] {
  const self = relatedRooms.find((room) => room.id === roomId);
  const childIds = relatedRooms
    .filter((room) => room.parent_room_id === roomId)
    .map((room) => room.id);

  const roomIds = new Set<string>([roomId, ...childIds]);
  if (self?.parent_room_id) {
    roomIds.add(self.parent_room_id);
  }
  return Array.from(roomIds);
}

/**
 * Overlap = date match + existing.room_id within the candidate's conflict-set
 * (itself, plus parent hall / subrooms per `roomIds`), with start_time <
 * existing.end_time AND end_time > existing.start_time, checked only against
 * 'pending'/'approved' bookings. This is the single source of truth for conflict
 * detection — reused by availability search, booking creation, admin approval,
 * and booking edit.
 */
export function findConflictingBookings(
  candidate: ConflictCandidate,
  existingBookings: readonly BookingTimeSlot[]
): BookingTimeSlot[] {
  const roomIds = candidate.roomIds ?? [candidate.room_id];
  return existingBookings.filter((existing) => {
    if (candidate.excludeBookingId && existing.id === candidate.excludeBookingId) {
      return false;
    }
    if (!roomIds.includes(existing.room_id) || existing.date !== candidate.date) {
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
 * First resolves the candidate room's conflict set (itself, its parent hall if it's a
 * subroom, its subrooms if it's a hall) via `rooms`, then queries `bookings_schedule`
 * across that whole set instead of a single room_id — this is what makes a hall and
 * its subrooms mutually conflict while sibling subrooms never conflict with each other.
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
  const [{ data: selfRoom, error: selfError }, { data: childRooms, error: childError }] =
    await Promise.all([
      supabase
        .from("rooms")
        .select("id, parent_room_id")
        .eq("id", candidate.room_id)
        .maybeSingle(),
      supabase.from("rooms").select("id, parent_room_id").eq("parent_room_id", candidate.room_id),
    ]);

  if (selfError) {
    throw selfError;
  }
  if (childError) {
    throw childError;
  }

  const relatedRooms: RoomHierarchyInfo[] = [
    ...(selfRoom ? [selfRoom as RoomHierarchyInfo] : []),
    ...((childRooms ?? []) as RoomHierarchyInfo[]),
  ];
  const roomIds = computeConflictRoomIds(candidate.room_id, relatedRooms);

  const { data, error } = await supabase
    .from("bookings_schedule")
    .select("id, room_id, date, start_time, end_time, status")
    .in("room_id", roomIds)
    .eq("date", candidate.date)
    .in("status", statuses);

  if (error) {
    throw error;
  }

  return findConflictingBookings({ ...candidate, roomIds }, (data ?? []) as BookingTimeSlot[]);
}
