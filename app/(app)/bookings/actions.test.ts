import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createClient: vi.fn(),
  createAdminClient: vi.fn(),
  redirect: vi.fn((url: string) => {
    throw new Error(`REDIRECT:${url}`);
  }),
  revalidatePath: vi.fn(),
  notifyAdminsNewRequest: vi.fn(),
  notifyBookingCancelled: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({ createClient: mocks.createClient }));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: mocks.createAdminClient }));
vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));
vi.mock("@/lib/notifications", () => ({
  notifyAdminsNewRequest: mocks.notifyAdminsNewRequest,
  notifyBookingCancelled: mocks.notifyBookingCancelled,
}));

import { cancelBooking, requestBooking, requestCollectiveBooking, updateBooking } from "./actions";
import { FakeSupabaseClient } from "@/lib/testing/fake-supabase";

const MEMBER_ID = "member-1";
const ROOM_ID = "room-1";
const HALL_ID = "hall-1";
const SUBROOM_1_ID = "subroom-1";
const SUBROOM_2_ID = "subroom-2";
const FUTURE_DATE = "2999-01-01";
const PAST_DATE = "2000-01-01";

function formData(fields: Record<string, string | string[]>): FormData {
  const fd = new FormData();
  for (const [key, value] of Object.entries(fields)) {
    if (Array.isArray(value)) {
      for (const v of value) fd.append(key, v);
    } else {
      fd.set(key, value);
    }
  }
  return fd;
}

function validRequestFields(overrides: Record<string, string> = {}) {
  return {
    room_id: ROOM_ID,
    date: FUTURE_DATE,
    start_time: "10:00",
    end_time: "11:00",
    service: "Liturgy",
    ...overrides,
  };
}

function existingBooking(overrides: Record<string, unknown> = {}) {
  return {
    id: "booking-1",
    user_id: MEMBER_ID,
    room_id: ROOM_ID,
    date: FUTURE_DATE,
    start_time: "10:00:00",
    end_time: "11:00:00",
    status: "pending",
    ...overrides,
  };
}

function setupClient(opts: {
  userId?: string | null;
  bookings?: Record<string, unknown>[];
  scheduleRows?: Record<string, unknown>[];
  rooms?: Record<string, unknown>[];
}) {
  const client = new FakeSupabaseClient({
    user: opts.userId ? { id: opts.userId } : null,
    tables: {
      bookings: opts.bookings ?? [],
      bookings_schedule: opts.scheduleRows ?? [],
      rooms: opts.rooms ?? [],
    },
  });
  mocks.createClient.mockResolvedValue(client);
  mocks.createAdminClient.mockReturnValue(client);
  return client;
}

const SUBROOMS = [
  { id: SUBROOM_1_ID, name: "401", parent_room_id: HALL_ID },
  { id: SUBROOM_2_ID, name: "402", parent_room_id: HALL_ID },
];

beforeEach(() => {
  vi.clearAllMocks();
  mocks.redirect.mockImplementation((url: string) => {
    throw new Error(`REDIRECT:${url}`);
  });
});

describe("requestBooking", () => {
  it("requires room, date, times, and service", async () => {
    setupClient({ userId: MEMBER_ID });
    const result = await requestBooking({}, formData({ room_id: ROOM_ID }));
    expect(result.error).toBe("Room, date, start time, end time, and service are required.");
  });

  it("rejects a service outside the fixed list", async () => {
    setupClient({ userId: MEMBER_ID });
    const result = await requestBooking({}, formData(validRequestFields({ service: "Karaoke" })));
    expect(result.error).toBe("Select a valid service/purpose.");
  });

  it("requires the end time to be after the start time", async () => {
    setupClient({ userId: MEMBER_ID });
    const result = await requestBooking(
      {},
      formData(validRequestFields({ start_time: "11:00", end_time: "10:00" }))
    );
    expect(result.error).toBe("End time must be after start time.");
  });

  it("rejects a start time in the past", async () => {
    setupClient({ userId: MEMBER_ID });
    const result = await requestBooking({}, formData(validRequestFields({ date: PAST_DATE })));
    expect(result.error).toBe("Can't request a booking in the past.");
  });

  it("rejects an end time later than 10:30 PM", async () => {
    setupClient({ userId: MEMBER_ID });
    const result = await requestBooking(
      {},
      formData(validRequestFields({ start_time: "22:00", end_time: "22:31" }))
    );
    expect(result.error).toBe("Bookings can't run later than 10:30 PM.");
  });

  it("allows an end time exactly at 10:30 PM", async () => {
    const client = setupClient({ userId: MEMBER_ID });
    await expect(
      requestBooking({}, formData(validRequestFields({ start_time: "22:00", end_time: "22:30" })))
    ).rejects.toThrow("REDIRECT:/bookings?submitted=1");
    expect(client.table("bookings").rows).toHaveLength(1);
  });

  it("redirects to /login when not authenticated", async () => {
    setupClient({ userId: null });
    await expect(requestBooking({}, formData(validRequestFields()))).rejects.toThrow(
      "REDIRECT:/login"
    );
  });

  it("blocks a request that overlaps an existing approved booking", async () => {
    setupClient({
      userId: MEMBER_ID,
      scheduleRows: [
        {
          id: "other",
          room_id: ROOM_ID,
          date: FUTURE_DATE,
          start_time: "10:30",
          end_time: "11:30",
          status: "approved",
        },
      ],
    });
    const result = await requestBooking({}, formData(validRequestFields()));
    expect(result.error).toBe("This slot overlaps an existing approved booking for that room.");
  });

  it("allows two pending requests to coexist for the same slot", async () => {
    const client = setupClient({
      userId: MEMBER_ID,
      scheduleRows: [
        {
          id: "other",
          room_id: ROOM_ID,
          date: FUTURE_DATE,
          start_time: "10:30",
          end_time: "11:30",
          status: "pending",
        },
      ],
    });
    await expect(requestBooking({}, formData(validRequestFields()))).rejects.toThrow(
      "REDIRECT:/bookings?submitted=1"
    );
    expect(client.table("bookings").rows).toHaveLength(1);
  });

  it("enforces the pending-request cap", async () => {
    const pending = Array.from({ length: 5 }, (_, i) =>
      existingBooking({ id: `pending-${i}`, status: "pending" })
    );
    setupClient({ userId: MEMBER_ID, bookings: pending });
    const result = await requestBooking({}, formData(validRequestFields()));
    expect(result.error).toContain("already have 5 pending requests");
  });

  it("inserts the booking, notifies admins, and redirects on success", async () => {
    const client = setupClient({ userId: MEMBER_ID });
    await expect(requestBooking({}, formData(validRequestFields()))).rejects.toThrow(
      "REDIRECT:/bookings?submitted=1"
    );

    expect(client.table("bookings").rows).toHaveLength(1);
    expect(client.table("bookings").rows[0]).toMatchObject({
      room_id: ROOM_ID,
      user_id: MEMBER_ID,
      status: "pending",
      service: "Liturgy",
    });
    expect(mocks.notifyAdminsNewRequest).toHaveBeenCalledOnce();
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/bookings");
  });

  it("maps a 23P01 insert race to the same overlap message", async () => {
    const client = setupClient({ userId: MEMBER_ID });
    client.table("bookings").failNextWriteWith({ message: "exclusion violation", code: "23P01" });

    const result = await requestBooking({}, formData(validRequestFields()));
    expect(result.error).toBe("This slot overlaps an existing approved booking for that room.");
  });

  it("maps an unrelated insert failure to a generic message, without leaking the raw DB error", async () => {
    const client = setupClient({ userId: MEMBER_ID });
    client
      .table("bookings")
      .failNextWriteWith({ message: 'column "notes" of relation "bookings" does not exist', code: "42703" });

    const result = await requestBooking({}, formData(validRequestFields()));
    expect(result.error).toBe(
      "Something went wrong while submitting your request. Please try again."
    );
  });
});

describe("requestCollectiveBooking", () => {
  function collectiveFields(overrides: Record<string, string | string[]> = {}) {
    return {
      room_id: [SUBROOM_1_ID, SUBROOM_2_ID],
      date: FUTURE_DATE,
      start_time: "10:00",
      end_time: "11:00",
      service: "Liturgy",
      ...overrides,
    };
  }

  it("creates one independent pending booking per selected subroom sharing the same date/time/service/notes", async () => {
    const client = setupClient({ userId: MEMBER_ID, rooms: SUBROOMS });
    await expect(
      requestCollectiveBooking({}, formData(collectiveFields({ notes: "Choir rehearsal" })))
    ).rejects.toThrow("REDIRECT:/bookings?submitted=1&count=2");

    const rows = client.table("bookings").rows;
    expect(rows).toHaveLength(2);
    expect(rows.map((r) => r.room_id).sort()).toEqual([SUBROOM_1_ID, SUBROOM_2_ID].sort());
    for (const row of rows) {
      expect(row).toMatchObject({
        user_id: MEMBER_ID,
        date: FUTURE_DATE,
        start_time: "10:00:00",
        end_time: "11:00:00",
        service: "Liturgy",
        notes: "Choir rehearsal",
        status: "pending",
      });
    }
    // Independent rows — no shared batch/linkage id between them.
    expect(rows[0].id).not.toBe(rows[1].id);
    expect(mocks.notifyAdminsNewRequest).toHaveBeenCalledTimes(2);
  });

  it("is all-or-nothing: a blocking conflict on one selected subroom blocks the whole batch", async () => {
    const client = setupClient({
      userId: MEMBER_ID,
      rooms: SUBROOMS,
      scheduleRows: [
        {
          id: "s2-booking",
          room_id: SUBROOM_2_ID,
          date: FUTURE_DATE,
          start_time: "10:30",
          end_time: "11:30",
          status: "approved",
        },
      ],
    });
    const result = await requestCollectiveBooking({}, formData(collectiveFields()));
    expect(result.error).toContain("402");
    expect(result.error).not.toContain("401");
    expect(client.table("bookings").rows).toHaveLength(0);
  });

  it("a hall's approved booking blocks every one of its selected subrooms", async () => {
    const client = setupClient({
      userId: MEMBER_ID,
      rooms: SUBROOMS,
      scheduleRows: [
        {
          id: "hall-booking",
          room_id: HALL_ID,
          date: FUTURE_DATE,
          start_time: "10:30",
          end_time: "11:30",
          status: "approved",
        },
      ],
    });
    const result = await requestCollectiveBooking({}, formData(collectiveFields()));
    expect(result.error).toContain("401");
    expect(result.error).toContain("402");
    expect(client.table("bookings").rows).toHaveLength(0);
  });

  it("succeeds for two sibling subrooms that don't conflict with each other", async () => {
    const client = setupClient({ userId: MEMBER_ID, rooms: SUBROOMS });
    await expect(requestCollectiveBooking({}, formData(collectiveFields()))).rejects.toThrow(
      "REDIRECT:/bookings?submitted=1&count=2"
    );
    expect(client.table("bookings").rows).toHaveLength(2);
  });

  it("enforces the pending cap across the whole batch, all-or-nothing", async () => {
    const pending = Array.from({ length: 4 }, (_, i) =>
      existingBooking({ id: `pending-${i}`, status: "pending" })
    );
    const client = setupClient({ userId: MEMBER_ID, rooms: SUBROOMS, bookings: pending });
    const result = await requestCollectiveBooking({}, formData(collectiveFields()));
    expect(result.error).toContain("4 pending request");
    expect(client.table("bookings").rows).toHaveLength(4);
  });

  it("rejects selecting subrooms from different halls", async () => {
    const client = setupClient({
      userId: MEMBER_ID,
      rooms: [...SUBROOMS, { id: "other-hall-subroom", name: "501", parent_room_id: "hall-2" }],
    });
    const result = await requestCollectiveBooking(
      {},
      formData(collectiveFields({ room_id: [SUBROOM_1_ID, "other-hall-subroom"] }))
    );
    expect(result.error).toBe("Selected rooms must all be subrooms of the same hall.");
    expect(client.table("bookings").rows).toHaveLength(0);
  });

  it("selecting exactly one subroom behaves identically to the standalone single-room flow", async () => {
    const client = setupClient({ userId: MEMBER_ID, rooms: SUBROOMS });
    await expect(
      requestCollectiveBooking({}, formData(collectiveFields({ room_id: [SUBROOM_1_ID] })))
    ).rejects.toThrow("REDIRECT:/bookings?submitted=1");

    const rows = client.table("bookings").rows;
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ room_id: SUBROOM_1_ID, status: "pending" });
  });

  it("maps a 23P01 insert race to the same overlap message", async () => {
    const client = setupClient({ userId: MEMBER_ID, rooms: SUBROOMS });
    client.table("bookings").failNextWriteWith({ message: "exclusion violation", code: "23P01" });

    const result = await requestCollectiveBooking({}, formData(collectiveFields()));
    expect(result.error).toBe("This slot overlaps an existing approved booking for that room.");
  });
});

describe("updateBooking", () => {
  function updateFields(overrides: Record<string, string> = {}) {
    return {
      booking_id: "booking-1",
      room_id: ROOM_ID,
      date: FUTURE_DATE,
      start_time: "10:00",
      end_time: "11:00",
      service: "Liturgy",
      ...overrides,
    };
  }

  it("rejects rescheduling to an end time later than 10:30 PM", async () => {
    setupClient({ userId: MEMBER_ID, bookings: [existingBooking()] });
    const result = await updateBooking(
      {},
      formData(updateFields({ start_time: "22:00", end_time: "22:31" }))
    );
    expect(result.error).toBe("Bookings can't run later than 10:30 PM.");
  });

  it("fails when the booking doesn't exist or isn't owned by the caller", async () => {
    setupClient({ userId: MEMBER_ID, bookings: [] });
    const result = await updateBooking({}, formData(updateFields()));
    expect(result.error).toBe("Booking not found.");
  });

  it("fails when the booking is no longer modifiable", async () => {
    setupClient({ userId: MEMBER_ID, bookings: [existingBooking({ status: "rejected" })] });
    const result = await updateBooking({}, formData(updateFields()));
    expect(result.error).toBe("This booking can no longer be edited.");
  });

  it("blocks an edit that overlaps another approved booking", async () => {
    setupClient({
      userId: MEMBER_ID,
      bookings: [existingBooking()],
      scheduleRows: [
        {
          id: "other",
          room_id: ROOM_ID,
          date: FUTURE_DATE,
          start_time: "10:30",
          end_time: "11:30",
          status: "approved",
        },
      ],
    });
    const result = await updateBooking({}, formData(updateFields()));
    expect(result.error).toBe("This slot overlaps an existing approved booking for that room.");
  });

  it("reverts an approved booking to pending when the slot actually changes", async () => {
    const client = setupClient({
      userId: MEMBER_ID,
      bookings: [existingBooking({ status: "approved" })],
    });
    await expect(
      updateBooking({}, formData(updateFields({ start_time: "12:00", end_time: "13:00" })))
    ).rejects.toThrow("REDIRECT:/bookings?updated=1");

    expect(client.table("bookings").rows[0]).toMatchObject({
      status: "pending",
      start_time: "12:00:00",
      end_time: "13:00:00",
    });
  });

  it("keeps an approved booking's status when nothing schedule-relevant changes", async () => {
    const client = setupClient({
      userId: MEMBER_ID,
      bookings: [existingBooking({ status: "approved" })],
    });
    await expect(
      updateBooking({}, formData(updateFields({ service: "Meeting" })))
    ).rejects.toThrow("REDIRECT:/bookings?updated=1");

    expect(client.table("bookings").rows[0]).toMatchObject({
      status: "approved",
      service: "Meeting",
    });
  });

  it("maps a 23P01 update race to the same overlap message", async () => {
    const client = setupClient({ userId: MEMBER_ID, bookings: [existingBooking()] });
    client.table("bookings").failNextWriteWith({ message: "exclusion violation", code: "23P01" });

    const result = await updateBooking(
      {},
      formData(updateFields({ start_time: "12:00", end_time: "13:00" }))
    );
    expect(result.error).toBe("This slot overlaps an existing approved booking for that room.");
  });
});

describe("cancelBooking", () => {
  it("requires a booking id", async () => {
    setupClient({ userId: MEMBER_ID });
    const result = await cancelBooking({}, formData({}));
    expect(result.error).toBe("Missing booking id.");
  });

  it("fails when the booking doesn't exist or isn't owned by the caller", async () => {
    setupClient({ userId: MEMBER_ID, bookings: [] });
    const result = await cancelBooking({}, formData({ booking_id: "booking-1" }));
    expect(result.error).toBe("Booking not found.");
  });

  it("fails for a booking that isn't pending or approved", async () => {
    setupClient({ userId: MEMBER_ID, bookings: [existingBooking({ status: "rejected" })] });
    const result = await cancelBooking({}, formData({ booking_id: "booking-1" }));
    expect(result.error).toBe("Only pending or approved bookings can be cancelled.");
  });

  it("fails for a booking that's already past", async () => {
    setupClient({
      userId: MEMBER_ID,
      bookings: [existingBooking({ date: PAST_DATE, end_time: "11:00", status: "approved" })],
    });
    const result = await cancelBooking({}, formData({ booking_id: "booking-1" }));
    expect(result.error).toBe("Past bookings can't be cancelled.");
  });

  it("cancels a pending booking, notifies, and redirects", async () => {
    const client = setupClient({ userId: MEMBER_ID, bookings: [existingBooking()] });
    await expect(
      cancelBooking({}, formData({ booking_id: "booking-1" }))
    ).rejects.toThrow("REDIRECT:/bookings?cancelled=1");

    expect(client.table("bookings").rows[0].status).toBe("cancelled");
    expect(mocks.notifyBookingCancelled).toHaveBeenCalledOnce();
  });
});
