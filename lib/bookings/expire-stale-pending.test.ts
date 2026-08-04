import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";

import { EXPIRED_PENDING_REASON, expireStalePendingBookings } from "./expire-stale-pending";

interface FakeBooking {
  id: string;
  room_id: string;
  date: string;
  start_time: string;
  end_time: string;
}

interface FakeAdminOptions {
  bookings: FakeBooking[];
  rooms?: Record<string, { name: string } | undefined>;
  /** Booking ids for which the update should match zero rows (simulating an
   * admin decision landing first). Defaults to every row succeeding. */
  loseRaceFor?: string[];
  onUpdate?: (id: string, patch: Record<string, unknown>) => void;
  onInsert?: (table: string, rows: unknown) => void;
}

function createFakeAdmin(opts: FakeAdminOptions) {
  const client = {
    from(table: string) {
      if (table === "bookings") {
        return {
          select: () => ({
            eq: () => ({
              eq: () => Promise.resolve({ data: opts.bookings, error: null }),
            }),
          }),
          update: (patch: Record<string, unknown>) => ({
            eq: (_col: string, id: string) => ({
              eq: () => ({
                select: () => {
                  opts.onUpdate?.(id, patch);
                  const lost = opts.loseRaceFor?.includes(id);
                  return Promise.resolve({ data: lost ? [] : [{ id }], error: null });
                },
              }),
            }),
          }),
        };
      }
      if (table === "rooms") {
        return {
          select: () => ({
            eq: (_col: string, val: string) => ({
              single: async () => ({ data: opts.rooms?.[val] ?? null, error: null }),
            }),
          }),
        };
      }
      if (table === "notifications") {
        return {
          insert: async (rows: unknown) => {
            opts.onInsert?.(table, rows);
            return { error: null };
          },
        };
      }
      throw new Error(`unexpected table ${table}`);
    },
  };
  return client as unknown as SupabaseClient;
}

function hoursFromNow(hours: number): { date: string; end_time: string } {
  const at = new Date(Date.now() + hours * 60 * 60 * 1000);
  const date = `${at.getFullYear()}-${String(at.getMonth() + 1).padStart(2, "0")}-${String(
    at.getDate()
  ).padStart(2, "0")}`;
  const end_time = `${String(at.getHours()).padStart(2, "0")}:${String(at.getMinutes()).padStart(
    2,
    "0"
  )}:00`;
  return { date, end_time };
}

describe("expireStalePendingBookings", () => {
  it("rejects a pending booking whose end time has already passed", async () => {
    const past = hoursFromNow(-2);
    const updates: { id: string; patch: Record<string, unknown> }[] = [];
    const inserts: unknown[] = [];
    const admin = createFakeAdmin({
      bookings: [
        { id: "booking-1", room_id: "room-1", date: past.date, start_time: "08:00", end_time: past.end_time },
      ],
      rooms: { "room-1": { name: "Fellowship Hall" } },
      onUpdate: (id, patch) => updates.push({ id, patch }),
      onInsert: (_table, rows) => inserts.push(rows),
    });

    await expireStalePendingBookings(admin, "user-1");

    expect(updates).toEqual([
      { id: "booking-1", patch: { status: "rejected", reject_reason: EXPIRED_PENDING_REASON } },
    ]);
    expect(inserts).toEqual([
      {
        user_id: "user-1",
        type: "rejected",
        booking_id: "booking-1",
        message: expect.stringContaining(EXPIRED_PENDING_REASON),
      },
    ]);
  });

  it("leaves a pending booking whose slot hasn't happened yet", async () => {
    const future = hoursFromNow(2);
    const updates: unknown[] = [];
    const admin = createFakeAdmin({
      bookings: [
        { id: "booking-1", room_id: "room-1", date: future.date, start_time: "08:00", end_time: future.end_time },
      ],
      onUpdate: (id, patch) => updates.push({ id, patch }),
    });

    await expireStalePendingBookings(admin, "user-1");

    expect(updates).toHaveLength(0);
  });

  it("doesn't send a false expiry notification when an admin decision wins the race", async () => {
    const past = hoursFromNow(-2);
    const inserts: unknown[] = [];
    const admin = createFakeAdmin({
      bookings: [
        { id: "booking-1", room_id: "room-1", date: past.date, start_time: "08:00", end_time: past.end_time },
      ],
      rooms: { "room-1": { name: "Fellowship Hall" } },
      loseRaceFor: ["booking-1"],
      onInsert: (_table, rows) => inserts.push(rows),
    });

    await expireStalePendingBookings(admin, "user-1");

    expect(inserts).toHaveLength(0);
  });

  it("does nothing when there are no pending bookings", async () => {
    const updates: unknown[] = [];
    const admin = createFakeAdmin({
      bookings: [],
      onUpdate: (id, patch) => updates.push({ id, patch }),
    });

    await expireStalePendingBookings(admin, "user-1");

    expect(updates).toHaveLength(0);
  });
});
