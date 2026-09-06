import { describe, expect, it } from "vitest";
import {
  computeConflictRoomIds,
  findConflictingBookings,
  hasConflict,
  type BookingTimeSlot,
  type RoomHierarchyInfo,
} from "./conflict-check";

const ROOM_A = "11111111-1111-1111-1111-111111111111";
const ROOM_B = "22222222-2222-2222-2222-222222222222";

const HALL = "33333333-3333-3333-3333-333333333333";
const SUBROOM_1 = "44444444-4444-4444-4444-444444444444";
const SUBROOM_2 = "55555555-5555-5555-5555-555555555555";

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

describe("computeConflictRoomIds", () => {
  it("returns the room itself plus its parent hall for a subroom", () => {
    const relatedRooms: RoomHierarchyInfo[] = [{ id: SUBROOM_1, parent_room_id: HALL }];
    expect(computeConflictRoomIds(SUBROOM_1, relatedRooms).sort()).toEqual(
      [HALL, SUBROOM_1].sort()
    );
  });

  it("returns the room itself plus its subrooms for a hall", () => {
    const relatedRooms: RoomHierarchyInfo[] = [
      { id: HALL, parent_room_id: null },
      { id: SUBROOM_1, parent_room_id: HALL },
      { id: SUBROOM_2, parent_room_id: HALL },
    ];
    expect(computeConflictRoomIds(HALL, relatedRooms).sort()).toEqual(
      [HALL, SUBROOM_1, SUBROOM_2].sort()
    );
  });

  it("returns just the room itself when it has no parent or children", () => {
    const relatedRooms: RoomHierarchyInfo[] = [{ id: ROOM_A, parent_room_id: null }];
    expect(computeConflictRoomIds(ROOM_A, relatedRooms)).toEqual([ROOM_A]);
  });
});

describe("findConflictingBookings with hall/subroom hierarchy", () => {
  it("a subroom booking conflicts with an overlapping approved booking on its parent hall", () => {
    const existing = [slot({ id: "hall-booking", room_id: HALL })];
    const result = findConflictingBookings(
      {
        room_id: SUBROOM_1,
        roomIds: [SUBROOM_1, HALL],
        date: "2026-08-01",
        start_time: "10:30",
        end_time: "11:30",
      },
      existing
    );
    expect(result.map((b) => b.id)).toEqual(["hall-booking"]);
  });

  it("a hall booking conflicts with an overlapping approved booking on any of its subrooms", () => {
    const existing = [slot({ id: "subroom-booking", room_id: SUBROOM_2 })];
    const result = findConflictingBookings(
      {
        room_id: HALL,
        roomIds: [HALL, SUBROOM_1, SUBROOM_2],
        date: "2026-08-01",
        start_time: "10:30",
        end_time: "11:30",
      },
      existing
    );
    expect(result.map((b) => b.id)).toEqual(["subroom-booking"]);
  });

  it("two overlapping approved bookings on sibling subrooms do not conflict with each other", () => {
    const existing = [slot({ id: "sibling-booking", room_id: SUBROOM_2 })];
    const result = findConflictingBookings(
      {
        room_id: SUBROOM_1,
        roomIds: [SUBROOM_1, HALL],
        date: "2026-08-01",
        start_time: "10:30",
        end_time: "11:30",
      },
      existing
    );
    expect(result).toHaveLength(0);
  });

  it("a room with no parent/children behaves exactly as before when roomIds is omitted", () => {
    const existing = [slot({ id: "existing-1" })];
    const result = findConflictingBookings(
      { room_id: ROOM_A, date: "2026-08-01", start_time: "10:30", end_time: "11:30" },
      existing
    );
    expect(result.map((b) => b.id)).toEqual(["existing-1"]);
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
