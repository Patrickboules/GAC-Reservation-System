import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createClient: vi.fn(),
  createAdminClient: vi.fn(),
  redirect: vi.fn((url: string) => {
    throw new Error(`REDIRECT:${url}`);
  }),
  revalidatePath: vi.fn(),
  notifyBookingApproved: vi.fn(),
  notifyBookingRejected: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({ createClient: mocks.createClient }));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: mocks.createAdminClient }));
vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));
vi.mock("@/lib/notifications", () => ({
  notifyBookingApproved: mocks.notifyBookingApproved,
  notifyBookingRejected: mocks.notifyBookingRejected,
}));

import {
  approveBookingAction,
  bulkApproveBookingsAction,
  bulkRejectBookingsAction,
  rejectBookingAction,
  requireAdmin,
} from "./actions";
import { FakeSupabaseClient } from "@/lib/testing/fake-supabase";

const ADMIN_ID = "admin-1";
const MEMBER_ID = "member-1";
const ROOM_ID = "room-1";

function pendingBooking(overrides: Record<string, unknown> = {}) {
  return {
    id: "booking-1",
    user_id: MEMBER_ID,
    room_id: ROOM_ID,
    date: "2026-08-01",
    start_time: "10:00",
    end_time: "11:00",
    status: "pending",
    reject_reason: null,
    ...overrides,
  };
}

function setupClient(opts: {
  userId?: string | null;
  role?: string;
  bookings?: Record<string, unknown>[];
  scheduleRows?: Record<string, unknown>[];
}) {
  const client = new FakeSupabaseClient({
    user: opts.userId ? { id: opts.userId } : null,
    tables: {
      profiles: opts.userId ? [{ id: opts.userId, role: opts.role ?? "admin" }] : [],
      bookings: opts.bookings ?? [pendingBooking()],
      bookings_schedule: opts.scheduleRows ?? [],
    },
  });
  mocks.createClient.mockResolvedValue(client);
  mocks.createAdminClient.mockReturnValue(client);
  return client;
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.redirect.mockImplementation((url: string) => {
    throw new Error(`REDIRECT:${url}`);
  });
});

describe("requireAdmin", () => {
  it("redirects to /login when there is no signed-in user", async () => {
    setupClient({ userId: null });
    await expect(requireAdmin()).rejects.toThrow("REDIRECT:/login");
  });

  it("redirects to / when the signed-in user is not an admin", async () => {
    setupClient({ userId: MEMBER_ID, role: "member" });
    await expect(requireAdmin()).rejects.toThrow("REDIRECT:/");
  });

  it("returns the client when the signed-in user is an admin", async () => {
    const client = setupClient({ userId: ADMIN_ID, role: "admin" });
    await expect(requireAdmin()).resolves.toBe(client);
  });
});

describe("approveBookingAction", () => {
  it("approves a pending booking with no conflict", async () => {
    const client = setupClient({ userId: ADMIN_ID });
    const result = await approveBookingAction("booking-1");

    expect(result).toEqual({ id: "booking-1", ok: true });
    expect(client.table("bookings").rows[0]).toMatchObject({
      status: "approved",
      reject_reason: null,
    });
    expect(mocks.notifyBookingApproved).toHaveBeenCalledOnce();
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/admin/requests");
  });

  it("fails when the booking no longer exists", async () => {
    setupClient({ userId: ADMIN_ID, bookings: [] });
    const result = await approveBookingAction("missing-booking");

    expect(result).toEqual({ id: "missing-booking", ok: false, error: "Booking not found." });
    expect(mocks.notifyBookingApproved).not.toHaveBeenCalled();
  });

  it("fails when the booking is no longer pending", async () => {
    setupClient({ userId: ADMIN_ID, bookings: [pendingBooking({ status: "approved" })] });
    const result = await approveBookingAction("booking-1");

    expect(result).toEqual({
      id: "booking-1",
      ok: false,
      error: "Only pending requests can be approved.",
    });
  });

  it("fails when an already-approved booking now conflicts for the same slot", async () => {
    const client = setupClient({
      userId: ADMIN_ID,
      scheduleRows: [
        {
          id: "other-booking",
          room_id: ROOM_ID,
          date: "2026-08-01",
          start_time: "10:30",
          end_time: "11:30",
          status: "approved",
        },
      ],
    });
    const result = await approveBookingAction("booking-1");

    expect(result).toEqual({
      id: "booking-1",
      ok: false,
      error: "This slot now conflicts with another approved booking.",
    });
    expect(client.table("bookings").rows[0].status).toBe("pending");
  });

  it("maps a 23P01 exclusion-constraint race to the same conflict message", async () => {
    const client = setupClient({ userId: ADMIN_ID });
    client.table("bookings").failNextWriteWith({ message: "exclusion violation", code: "23P01" });

    const result = await approveBookingAction("booking-1");

    expect(result).toEqual({
      id: "booking-1",
      ok: false,
      error: "This slot now conflicts with another approved booking.",
    });
  });
});

describe("rejectBookingAction", () => {
  it("requires a non-empty reason", async () => {
    setupClient({ userId: ADMIN_ID });
    const result = await rejectBookingAction("booking-1", "   ");

    expect(result).toEqual({
      id: "booking-1",
      ok: false,
      error: "A rejection reason is required.",
    });
    expect(mocks.notifyBookingRejected).not.toHaveBeenCalled();
  });

  it("rejects a pending booking with the trimmed reason", async () => {
    const client = setupClient({ userId: ADMIN_ID });
    const result = await rejectBookingAction("booking-1", "  Double booked  ");

    expect(result).toEqual({ id: "booking-1", ok: true });
    expect(client.table("bookings").rows[0]).toMatchObject({
      status: "rejected",
      reject_reason: "Double booked",
    });
    expect(mocks.notifyBookingRejected).toHaveBeenCalledOnce();
  });

  it("fails when the booking is no longer pending", async () => {
    setupClient({ userId: ADMIN_ID, bookings: [pendingBooking({ status: "rejected" })] });
    const result = await rejectBookingAction("booking-1", "reason");

    expect(result).toEqual({
      id: "booking-1",
      ok: false,
      error: "Only pending requests can be rejected.",
    });
  });
});

describe("bulkApproveBookingsAction", () => {
  it("reports per-row results and revalidates once", async () => {
    setupClient({
      userId: ADMIN_ID,
      bookings: [pendingBooking({ id: "booking-1" }), pendingBooking({ id: "booking-2", status: "rejected" })],
    });

    const results = await bulkApproveBookingsAction(["booking-1", "booking-2"]);

    expect(results).toEqual([
      { id: "booking-1", ok: true },
      { id: "booking-2", ok: false, error: "Only pending requests can be approved." },
    ]);
    expect(mocks.revalidatePath).toHaveBeenCalledTimes(1);
  });
});

describe("bulkRejectBookingsAction", () => {
  it("reports per-row results and revalidates once", async () => {
    setupClient({
      userId: ADMIN_ID,
      bookings: [pendingBooking({ id: "booking-1" }), pendingBooking({ id: "booking-2", status: "cancelled" })],
    });

    const results = await bulkRejectBookingsAction(["booking-1", "booking-2"], "Conflict");

    expect(results).toEqual([
      { id: "booking-1", ok: true },
      { id: "booking-2", ok: false, error: "Only pending requests can be rejected." },
    ]);
    expect(mocks.revalidatePath).toHaveBeenCalledTimes(1);
  });
});
