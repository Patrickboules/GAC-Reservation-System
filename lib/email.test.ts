import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  sendEmail: vi.fn(),
}));

vi.mock("resend", () => ({
  Resend: vi.fn().mockImplementation(function () {
    return { emails: { send: mocks.sendEmail } };
  }),
}));

import type { SupabaseClient } from "@supabase/supabase-js";

import { sendBookingStatusEmail } from "./email";
import { formatDateLabel } from "@/lib/dates";
import { FakeSupabaseClient } from "@/lib/testing/fake-supabase";

const BOOKING_ID = "11111111-2222-3333-4444-555555555555";
const REQUESTER_ID = "member-1";
const ROOM_ID = "room-1";
const BOOKING_DATE = "2026-09-01";
const FORMATTED_DATE = formatDateLabel(BOOKING_DATE);

function baseParams(overrides: Record<string, unknown> = {}) {
  return {
    bookingId: BOOKING_ID,
    status: "pending" as const,
    requesterId: REQUESTER_ID,
    roomId: ROOM_ID,
    date: BOOKING_DATE,
    startTime: "10:00:00",
    endTime: "11:00:00",
    ...overrides,
  };
}

function setupClient(opts: { requesterEmail?: string | null } = {}): SupabaseClient {
  return new FakeSupabaseClient({
    tables: {
      rooms: [{ id: ROOM_ID, name: "Fellowship Hall" }],
      profiles: [{ id: REQUESTER_ID, display_name: "Mina" }],
    },
    authUsers:
      opts.requesterEmail === null
        ? {}
        : { [REQUESTER_ID]: { email: opts.requesterEmail ?? "mina@example.com" } },
  }) as unknown as SupabaseClient;
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.sendEmail.mockResolvedValue({ data: { id: "email-1" }, error: null });
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("sendBookingStatusEmail", () => {
  it("does nothing when RESEND_API_KEY is not set", async () => {
    vi.stubEnv("RESEND_API_KEY", "");
    await sendBookingStatusEmail(setupClient(), baseParams());
    expect(mocks.sendEmail).not.toHaveBeenCalled();
  });

  it("does nothing when the requester has no email on file", async () => {
    vi.stubEnv("RESEND_API_KEY", "test-key");
    await sendBookingStatusEmail(setupClient({ requesterEmail: null }), baseParams());
    expect(mocks.sendEmail).not.toHaveBeenCalled();
  });

  it("sends a pending email to the requester with the correct subject and copy", async () => {
    vi.stubEnv("RESEND_API_KEY", "test-key");

    await sendBookingStatusEmail(setupClient(), baseParams({ status: "pending" }));

    expect(mocks.sendEmail).toHaveBeenCalledOnce();
    const call = mocks.sendEmail.mock.calls[0][0];
    expect(call.to).toBe("mina@example.com");
    expect(call.subject).toBe(`Your Booking Request Has Been Received — Fellowship Hall, ${FORMATTED_DATE}`);
    expect(call.html).toContain("received and is now awaiting approval");
    expect(call.html).not.toContain(BOOKING_ID);
    expect(call.html).not.toContain("Reservation ID");
    expect(call.html).toContain("Mina");
    expect(call.html).toContain("mina@example.com");
    expect(call.html).toContain("Fellowship Hall");
  });

  it("sends an approved email to the requester with the correct subject and copy", async () => {
    vi.stubEnv("RESEND_API_KEY", "test-key");

    await sendBookingStatusEmail(setupClient(), baseParams({ status: "approved" }));

    const call = mocks.sendEmail.mock.calls[0][0];
    expect(call.to).toBe("mina@example.com");
    expect(call.subject).toBe(`Your Booking Has Been Approved — Fellowship Hall, ${FORMATTED_DATE}`);
    expect(call.html).toContain("your booking has been approved");
  });

  it("sends a cancelled email to the requester with the correct subject and copy", async () => {
    vi.stubEnv("RESEND_API_KEY", "test-key");

    await sendBookingStatusEmail(setupClient(), baseParams({ status: "cancelled" }));

    const call = mocks.sendEmail.mock.calls[0][0];
    expect(call.to).toBe("mina@example.com");
    expect(call.subject).toBe(`Your Booking Has Been Cancelled — Fellowship Hall, ${FORMATTED_DATE}`);
    expect(call.html).toContain("Your booking request has been cancelled");
  });

  it("sends a rejected email to the requester including the reject reason", async () => {
    vi.stubEnv("RESEND_API_KEY", "test-key");

    await sendBookingStatusEmail(
      setupClient(),
      baseParams({ status: "rejected", rejectReason: "Room double-booked" })
    );

    const call = mocks.sendEmail.mock.calls[0][0];
    expect(call.to).toBe("mina@example.com");
    expect(call.subject).toBe(`Your Booking Has Been Rejected — Fellowship Hall, ${FORMATTED_DATE}`);
    expect(call.html).toContain("Your booking has been rejected");
    expect(call.html).toContain("Room double-booked");
  });

  it("omits the reason row for a rejected email with no reason given", async () => {
    vi.stubEnv("RESEND_API_KEY", "test-key");

    await sendBookingStatusEmail(setupClient(), baseParams({ status: "rejected", rejectReason: null }));

    const call = mocks.sendEmail.mock.calls[0][0];
    expect(call.html).not.toContain("Reason");
  });

  it("escapes HTML special characters in the reject reason", async () => {
    vi.stubEnv("RESEND_API_KEY", "test-key");

    await sendBookingStatusEmail(
      setupClient(),
      baseParams({ status: "rejected", rejectReason: "<script>alert(1)</script>" })
    );

    const call = mocks.sendEmail.mock.calls[0][0];
    expect(call.html).not.toContain("<script>alert(1)</script>");
    expect(call.html).toContain("&lt;script&gt;");
  });

  it("logs and does not throw when the Resend API returns an error", async () => {
    vi.stubEnv("RESEND_API_KEY", "test-key");
    mocks.sendEmail.mockResolvedValue({ data: null, error: { message: "invalid recipient" } });
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});

    await expect(sendBookingStatusEmail(setupClient(), baseParams())).resolves.toBeUndefined();
    expect(consoleError).toHaveBeenCalled();

    consoleError.mockRestore();
  });

  it("logs and does not throw when an unexpected exception occurs", async () => {
    vi.stubEnv("RESEND_API_KEY", "test-key");
    mocks.sendEmail.mockRejectedValue(new Error("network down"));
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});

    await expect(sendBookingStatusEmail(setupClient(), baseParams())).resolves.toBeUndefined();
    expect(consoleError).toHaveBeenCalled();

    consoleError.mockRestore();
  });
});
