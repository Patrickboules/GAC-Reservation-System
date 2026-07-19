import { describe, expect, it } from "vitest";
import {
  findConflictingBookings,
  hasConflict,
  type BookingTimeSlot,
} from "./conflict-check";

const ROOM_A = "11111111-1111-1111-1111-111111111111";
const ROOM_B = "22222222-2222-2222-2222-222222222222";

function slot(overrides: Partial<BookingTimeSlot>): BookingTimeSlot {
  return {
    id: "booking-1",
    room_id: ROOM_A,
    date: "2026-08-01",
    start_time: "10:00",
    end_time: "11:00",
    status: "approved",
    ...overrides,
  };
}

describe("findConflictingBookings", () => {
  it("flags an overlapping approved booking in the same room and date", () => {
    const existing = [slot({ id: "existing-1" })];
    const result = findConflictingBookings(
      { room_id: ROOM_A, date: "2026-08-01", start_time: "10:30", end_time: "11:30" },
      existing
    );
    expect(result.map((b) => b.id)).toEqual(["existing-1"]);
  });

  it("flags an overlapping pending booking", () => {
    const existing = [slot({ id: "existing-1", status: "pending" })];
    const result = findConflictingBookings(
      { room_id: ROOM_A, date: "2026-08-01", start_time: "10:30", end_time: "11:30" },
      existing
    );
    expect(result).toHaveLength(1);
  });

  it("ignores rejected and cancelled bookings", () => {
    const existing = [
      slot({ id: "rejected-1", status: "rejected" }),
      slot({ id: "cancelled-1", status: "cancelled" }),
    ];
    const result = findConflictingBookings(
      { room_id: ROOM_A, date: "2026-08-01", start_time: "10:30", end_time: "11:30" },
      existing
    );
    expect(result).toHaveLength(0);
  });

  it("ignores bookings in a different room", () => {
    const existing = [slot({ id: "existing-1", room_id: ROOM_B })];
    const result = findConflictingBookings(
      { room_id: ROOM_A, date: "2026-08-01", start_time: "10:30", end_time: "11:30" },
      existing
    );
    expect(result).toHaveLength(0);
  });

  it("ignores bookings on a different date", () => {
    const existing = [slot({ id: "existing-1", date: "2026-08-02" })];
    const result = findConflictingBookings(
      { room_id: ROOM_A, date: "2026-08-01", start_time: "10:30", end_time: "11:30" },
      existing
    );
    expect(result).toHaveLength(0);
  });

  it("does not flag back-to-back bookings that only touch at the boundary", () => {
    const existing = [slot({ id: "existing-1", start_time: "09:00", end_time: "10:00" })];
    const result = findConflictingBookings(
      { room_id: ROOM_A, date: "2026-08-01", start_time: "10:00", end_time: "11:00" },
      existing
    );
    expect(result).toHaveLength(0);
  });

  it("flags a candidate fully contained inside an existing booking", () => {
    const existing = [slot({ id: "existing-1", start_time: "09:00", end_time: "12:00" })];
    const result = findConflictingBookings(
      { room_id: ROOM_A, date: "2026-08-01", start_time: "10:00", end_time: "10:30" },
      existing
    );
    expect(result).toHaveLength(1);
  });

  it("excludes a booking id from the check (edit-in-place case)", () => {
    const existing = [slot({ id: "existing-1" })];
    const result = findConflictingBookings(
      {
        room_id: ROOM_A,
        date: "2026-08-01",
        start_time: "10:30",
        end_time: "11:30",
        excludeBookingId: "existing-1",
      },
      existing
    );
    expect(result).toHaveLength(0);
  });
});

describe("hasConflict", () => {
  it("returns false when there are no overlapping bookings", () => {
    const existing = [slot({ id: "existing-1", start_time: "12:00", end_time: "13:00" })];
    expect(
      hasConflict(
        { room_id: ROOM_A, date: "2026-08-01", start_time: "10:00", end_time: "11:00" },
        existing
      )
    ).toBe(false);
  });

  it("returns true when a conflict exists", () => {
    const existing = [slot({ id: "existing-1" })];
    expect(
      hasConflict(
        { room_id: ROOM_A, date: "2026-08-01", start_time: "10:30", end_time: "11:30" },
        existing
      )
    ).toBe(true);
  });
});
