import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";

import {
  formatAdminNewRequestMessage,
  formatApprovedMessage,
  formatCancelledMessage,
  formatRejectedMessage,
  notifyAdminsNewRequest,
  notifyBookingApproved,
  notifyBookingCancelled,
  notifyBookingRejected,
  type BookingSlotSummary,
} from "./notifications";

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
});

interface FakeAdminOptions {
  rooms?: Record<string, { name: string } | undefined>;
  profiles?: Record<string, { display_name: string | null } | undefined>;
  admins?: { id: string }[];
  onInsert?: (table: string, rows: unknown) => void;
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
