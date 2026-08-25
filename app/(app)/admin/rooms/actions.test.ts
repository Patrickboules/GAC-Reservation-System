import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createClient: vi.fn(),
  redirect: vi.fn((url: string) => {
    throw new Error(`REDIRECT:${url}`);
  }),
  revalidatePath: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({ createClient: mocks.createClient }));
vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));

import { createRoomAction, deleteRoomAction, updateRoomAction, type RoomInput } from "./actions";
import { FakeSupabaseClient } from "@/lib/testing/fake-supabase";

const ADMIN_ID = "admin-1";
const MEMBER_ID = "member-1";
const ROOM_ID = "room-1";
const FUTURE_DATE = "2999-01-01";
const PAST_DATE = "2000-01-01";

function validInput(overrides: Partial<RoomInput> = {}): RoomInput {
  return {
    name: "Fellowship Hall",
    building: "Main",
    floor: "1st",
    amenities: ["projector"],
    categoryColor: "sky",
    ...overrides,
  };
}

function setupClient(opts: {
  userId?: string | null;
  role?: string;
  rooms?: Record<string, unknown>[];
  bookings?: Record<string, unknown>[];
}) {
  const client = new FakeSupabaseClient({
    user: opts.userId ? { id: opts.userId } : null,
    tables: {
      profiles: opts.userId ? [{ id: opts.userId, role: opts.role ?? "admin" }] : [],
      rooms: opts.rooms ?? [{ id: ROOM_ID, name: "Fellowship Hall" }],
      bookings: opts.bookings ?? [],
    },
  });
  mocks.createClient.mockResolvedValue(client);
  return client;
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.redirect.mockImplementation((url: string) => {
    throw new Error(`REDIRECT:${url}`);
  });
});

describe("admin guard", () => {
  it("redirects to /login when not authenticated", async () => {
    setupClient({ userId: null });
    await expect(createRoomAction(validInput())).rejects.toThrow("REDIRECT:/login");
  });

  it("redirects to / when the caller isn't an admin", async () => {
    setupClient({ userId: MEMBER_ID, role: "member" });
    await expect(createRoomAction(validInput())).rejects.toThrow("REDIRECT:/");
  });
});

describe("createRoomAction", () => {
  it("requires a name", async () => {
    setupClient({ userId: ADMIN_ID });
    const result = await createRoomAction(validInput({ name: "  " }));
    expect(result).toEqual({ ok: false, error: "Name is required." });
  });

  it("rejects a category color outside the fixed palette", async () => {
    setupClient({ userId: ADMIN_ID });
    const result = await createRoomAction(validInput({ categoryColor: "magenta" }));
    expect(result).toEqual({ ok: false, error: "Invalid category color." });
  });

  it("inserts a valid room and revalidates", async () => {
    const client = setupClient({ userId: ADMIN_ID, rooms: [] });
    const result = await createRoomAction(validInput());

    expect(result).toEqual({ ok: true });
    expect(client.table("rooms").rows).toEqual([
      {
        id: "generated-0",
        name: "Fellowship Hall",
        building: "Main",
        floor: "1st",
        amenities: ["projector"],
        category_color: "sky",
      },
    ]);
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/admin/rooms");
  });
});

describe("updateRoomAction", () => {
  it("validates input before writing", async () => {
    setupClient({ userId: ADMIN_ID });
    const result = await updateRoomAction(ROOM_ID, validInput({ name: "" }));
    expect(result).toEqual({ ok: false, error: "Name is required." });
  });

  it("updates the matching room", async () => {
    const client = setupClient({ userId: ADMIN_ID });
    const result = await updateRoomAction(ROOM_ID, validInput({ name: "Renamed Hall" }));

    expect(result).toEqual({ ok: true });
    expect(client.table("rooms").rows[0]).toMatchObject({ name: "Renamed Hall" });
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/admin/rooms");
  });
});

describe("deleteRoomAction", () => {
  it("deletes a room with no pending or upcoming bookings", async () => {
    const client = setupClient({ userId: ADMIN_ID, bookings: [] });
    const result = await deleteRoomAction(ROOM_ID);

    expect(result).toEqual({ ok: true });
    expect(client.table("rooms").rows).toHaveLength(0);
  });

  it("blocks deletion when a pending booking exists", async () => {
    const client = setupClient({
      userId: ADMIN_ID,
      bookings: [
        { room_id: ROOM_ID, date: FUTURE_DATE, end_time: "11:00:00", status: "pending" },
      ],
    });
    const result = await deleteRoomAction(ROOM_ID);

    expect(result).toEqual({
      ok: false,
      error: "This room has pending or upcoming approved bookings and can't be deleted.",
    });
    expect(client.table("rooms").rows).toHaveLength(1);
  });

  it("blocks deletion when an upcoming approved booking exists", async () => {
    setupClient({
      userId: ADMIN_ID,
      bookings: [
        { room_id: ROOM_ID, date: FUTURE_DATE, end_time: "11:00:00", status: "approved" },
      ],
    });
    const result = await deleteRoomAction(ROOM_ID);

    expect(result.ok).toBe(false);
  });

  it("allows deletion when the only bookings are past and approved", async () => {
    const client = setupClient({
      userId: ADMIN_ID,
      bookings: [
        { room_id: ROOM_ID, date: PAST_DATE, end_time: "11:00:00", status: "approved" },
      ],
    });
    const result = await deleteRoomAction(ROOM_ID);

    expect(result).toEqual({ ok: true });
    expect(client.table("rooms").rows).toHaveLength(0);
  });
});
