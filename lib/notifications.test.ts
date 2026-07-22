import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";

import {
  ensureReminderNotifications,
  formatAdminNewRequestMessage,
  formatApprovedMessage,
  formatCancelledMessage,
  formatReminderMessage,
  formatRejectedMessage,
  notifyAdminsNewRequest,
  notifyBookingApproved,
  notifyBookingCancelled,
  notifyBookingRejected,
  type BookingSlotSummary,
} from "./notifications";
import { toDateString } from "./dates";

const slot: BookingSlotSummary = {
  roomName: "Fellowship Hall",
  date: "2026-08-01",
  startTime: "10:00",
  endTime: "11:00",
};

describe("message formatters", () => {
  it("formats an approved message", () => {
    expect(formatApprovedMessage(slot)).toBe(
      "Your booking for Fellowship Hall on 2026-08-01 from 10:00–11:00 was approved."
    );
  });

  it("formats a rejected message with a reason", () => {
    expect(formatRejectedMessage(slot, "Room double-booked")).toBe(
      "Your booking for Fellowship Hall on 2026-08-01 from 10:00–11:00 was rejected. Reason: Room double-booked"
    );
  });

  it("formats a rejected message without a reason", () => {
    expect(formatRejectedMessage(slot, null)).toBe(
      "Your booking for Fellowship Hall on 2026-08-01 from 10:00–11:00 was rejected."
    );
  });

  it("formats a cancelled message", () => {
    expect(formatCancelledMessage(slot)).toBe(
      "Your booking for Fellowship Hall on 2026-08-01 from 10:00–11:00 was cancelled."
    );
  });

  it("formats an admin new-request message", () => {
    expect(formatAdminNewRequestMessage(slot, "Mina")).toBe(
      "Mina requested Fellowship Hall on 2026-08-01 from 10:00–11:00."
    );
  });

  it("formats a reminder message", () => {
    expect(formatReminderMessage(slot)).toBe(
      "Reminder: your booking for Fellowship Hall on 2026-08-01 from 10:00–11:00 starts soon."
    );
  });
});

interface FakeAdminOptions {
  rooms?: Record<string, { name: string } | undefined>;
  profiles?: Record<string, { display_name: string | null } | undefined>;
  admins?: { id: string }[];
  bookings?: { id: string; room_id: string; date: string; start_time: string; end_time: string }[];
  remindedBookingIds?: string[];
  onInsert?: (table: string, rows: unknown) => void;
}

/** Chainable fake query builder: every filter method returns itself, and it
 * resolves (via `then`) to `{ data, error: null }` regardless of which
 * filters were applied — good enough for unit-testing the in-memory logic in
 * ensureReminderNotifications, which is what these tests exercise. */
function fakeQuery<T>(data: T) {
  const builder = {
    eq: () => builder,
    in: () => builder,
    gte: () => builder,
    lte: () => builder,
    select: () => builder,
    then: (resolve: (result: { data: T; error: null }) => void) => resolve({ data, error: null }),
  };
  return builder;
}

function createFakeAdmin(opts: FakeAdminOptions) {
  const client = {
    from(table: string) {
      if (table === "rooms") {
        return {
          select() {
            return {
              eq(_col: string, val: string) {
                return {
                  single: async () => ({ data: opts.rooms?.[val] ?? null, error: null }),
                };
              },
            };
          },
        };
      }
      if (table === "profiles") {
        return {
          select() {
            return {
              eq(col: string, val: string) {
                if (col === "role") {
                  return Promise.resolve({ data: opts.admins ?? [], error: null });
                }
                return {
                  single: async () => ({ data: opts.profiles?.[val] ?? null, error: null }),
                };
              },
            };
          },
        };
      }
      if (table === "bookings") {
        return {
          select: () => fakeQuery(opts.bookings ?? []),
        };
      }
      if (table === "notifications") {
        return {
          select: () => fakeQuery((opts.remindedBookingIds ?? []).map((id) => ({ booking_id: id }))),
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

function timeOfDate(date: Date): string {
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}:${String(
    date.getSeconds()
  ).padStart(2, "0")}`;
}

describe("notifyBookingApproved", () => {
  it("inserts an approved notification for the requester with the room name resolved", async () => {
    const inserts: unknown[] = [];
    const admin = createFakeAdmin({
      rooms: { "room-1": { name: "Fellowship Hall" } },
      onInsert: (_table, rows) => inserts.push(rows),
    });

    await notifyBookingApproved(admin, {
      bookingId: "booking-1",
      userId: "user-1",
      roomId: "room-1",
      date: "2026-08-01",
      startTime: "10:00",
      endTime: "11:00",
    });

    expect(inserts).toEqual([
      {
        user_id: "user-1",
        type: "approved",
        booking_id: "booking-1",
        message: "Your booking for Fellowship Hall on 2026-08-01 from 10:00–11:00 was approved.",
      },
    ]);
  });
});

describe("notifyBookingRejected", () => {
  it("inserts a rejected notification including the reject reason", async () => {
    const inserts: unknown[] = [];
    const admin = createFakeAdmin({
      rooms: { "room-1": { name: "Fellowship Hall" } },
      onInsert: (_table, rows) => inserts.push(rows),
    });

    await notifyBookingRejected(admin, {
      bookingId: "booking-1",
      userId: "user-1",
      roomId: "room-1",
      date: "2026-08-01",
      startTime: "10:00",
      endTime: "11:00",
      reason: "Room double-booked",
    });

    expect(inserts).toEqual([
      {
        user_id: "user-1",
        type: "rejected",
        booking_id: "booking-1",
        message:
          "Your booking for Fellowship Hall on 2026-08-01 from 10:00–11:00 was rejected. Reason: Room double-booked",
      },
    ]);
  });
});

describe("notifyBookingCancelled", () => {
  it("inserts a cancelled notification for the requester", async () => {
    const inserts: unknown[] = [];
    const admin = createFakeAdmin({
      rooms: { "room-1": { name: "Fellowship Hall" } },
      onInsert: (_table, rows) => inserts.push(rows),
    });

    await notifyBookingCancelled(admin, {
      bookingId: "booking-1",
      userId: "user-1",
      roomId: "room-1",
      date: "2026-08-01",
      startTime: "10:00",
      endTime: "11:00",
    });

    expect(inserts).toEqual([
      {
        user_id: "user-1",
        type: "cancelled",
        booking_id: "booking-1",
        message: "Your booking for Fellowship Hall on 2026-08-01 from 10:00–11:00 was cancelled.",
      },
    ]);
  });
});

describe("notifyAdminsNewRequest", () => {
  it("inserts one admin_new_request notification per admin profile", async () => {
    const inserts: unknown[] = [];
    const admin = createFakeAdmin({
      rooms: { "room-1": { name: "Fellowship Hall" } },
      profiles: { "user-1": { display_name: "Mina" } },
      admins: [{ id: "admin-1" }, { id: "admin-2" }],
      onInsert: (_table, rows) => inserts.push(rows),
    });

    await notifyAdminsNewRequest(admin, {
      bookingId: "booking-1",
      requesterId: "user-1",
      roomId: "room-1",
      date: "2026-08-01",
      startTime: "10:00",
      endTime: "11:00",
    });

    expect(inserts).toEqual([
      [
        {
          user_id: "admin-1",
          type: "admin_new_request",
          booking_id: "booking-1",
          message: "Mina requested Fellowship Hall on 2026-08-01 from 10:00–11:00.",
        },
        {
          user_id: "admin-2",
          type: "admin_new_request",
          booking_id: "booking-1",
          message: "Mina requested Fellowship Hall on 2026-08-01 from 10:00–11:00.",
        },
      ],
    ]);
  });

  it("does nothing when there are no admin profiles", async () => {
    const inserts: unknown[] = [];
    const admin = createFakeAdmin({
      rooms: { "room-1": { name: "Fellowship Hall" } },
      admins: [],
      onInsert: (_table, rows) => inserts.push(rows),
    });

    await notifyAdminsNewRequest(admin, {
      bookingId: "booking-1",
      requesterId: "user-1",
      roomId: "room-1",
      date: "2026-08-01",
      startTime: "10:00",
      endTime: "11:00",
    });

    expect(inserts).toHaveLength(0);
  });
});

describe("ensureReminderNotifications", () => {
  function slotStartingIn(hours: number) {
    const at = new Date(Date.now() + hours * 60 * 60 * 1000);
    return { date: toDateString(at), start_time: timeOfDate(at) };
  }

  it("inserts a reminder for an approved booking starting within the 24h window", async () => {
    const inserts: unknown[] = [];
    const soon = slotStartingIn(2);
    const admin = createFakeAdmin({
      rooms: { "room-1": { name: "Fellowship Hall" } },
      bookings: [
        { id: "booking-1", room_id: "room-1", date: soon.date, start_time: soon.start_time, end_time: "23:59:00" },
      ],
      onInsert: (_table, rows) => inserts.push(rows),
    });

    await ensureReminderNotifications(admin, "user-1");

    expect(inserts).toEqual([
      [
        {
          user_id: "user-1",
          type: "reminder",
          booking_id: "booking-1",
          message: `Reminder: your booking for Fellowship Hall on ${soon.date} from ${soon.start_time}–23:59:00 starts soon.`,
        },
      ],
    ]);
  });

  it("does not re-insert a reminder for a booking that already has one", async () => {
    const inserts: unknown[] = [];
    const soon = slotStartingIn(2);
    const admin = createFakeAdmin({
      rooms: { "room-1": { name: "Fellowship Hall" } },
      bookings: [
        { id: "booking-1", room_id: "room-1", date: soon.date, start_time: soon.start_time, end_time: "23:59:00" },
      ],
      remindedBookingIds: ["booking-1"],
      onInsert: (_table, rows) => inserts.push(rows),
    });

    await ensureReminderNotifications(admin, "user-1");

    expect(inserts).toHaveLength(0);
  });

  it("skips bookings starting more than 24h from now", async () => {
    const inserts: unknown[] = [];
    const far = slotStartingIn(48);
    const admin = createFakeAdmin({
      rooms: { "room-1": { name: "Fellowship Hall" } },
      bookings: [
        { id: "booking-1", room_id: "room-1", date: far.date, start_time: far.start_time, end_time: "23:59:00" },
      ],
      onInsert: (_table, rows) => inserts.push(rows),
    });

    await ensureReminderNotifications(admin, "user-1");

    expect(inserts).toHaveLength(0);
  });

  it("skips bookings that have already started", async () => {
    const inserts: unknown[] = [];
    const past = slotStartingIn(-1);
    const admin = createFakeAdmin({
      rooms: { "room-1": { name: "Fellowship Hall" } },
      bookings: [
        { id: "booking-1", room_id: "room-1", date: past.date, start_time: past.start_time, end_time: "23:59:00" },
      ],
      onInsert: (_table, rows) => inserts.push(rows),
    });

    await ensureReminderNotifications(admin, "user-1");

    expect(inserts).toHaveLength(0);
  });

  it("does nothing when there are no approved bookings", async () => {
    const inserts: unknown[] = [];
    const admin = createFakeAdmin({
      bookings: [],
      onInsert: (_table, rows) => inserts.push(rows),
    });

    await ensureReminderNotifications(admin, "user-1");

    expect(inserts).toHaveLength(0);
  });
});
