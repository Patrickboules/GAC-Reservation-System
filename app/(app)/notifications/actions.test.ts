import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createClient: vi.fn(),
  revalidatePath: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({ createClient: mocks.createClient }));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));

import { markNotificationsRead } from "./actions";
import { FakeSupabaseClient } from "@/lib/testing/fake-supabase";

const MEMBER_ID = "member-1";

function setupClient(opts: { userId?: string | null; notifications?: Record<string, unknown>[] }) {
  const client = new FakeSupabaseClient({
    user: opts.userId ? { id: opts.userId } : null,
    tables: {
      notifications: opts.notifications ?? [],
    },
  });
  mocks.createClient.mockResolvedValue(client);
  return client;
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("markNotificationsRead", () => {
  it("does nothing when given no ids", async () => {
    setupClient({ userId: MEMBER_ID });
    await markNotificationsRead([]);
    expect(mocks.createClient).not.toHaveBeenCalled();
  });

  it("does nothing when not authenticated", async () => {
    const client = setupClient({
      userId: null,
      notifications: [{ id: "n1", user_id: MEMBER_ID, read_at: null }],
    });
    await markNotificationsRead(["n1"]);
    expect(client.table("notifications").rows[0].read_at).toBeNull();
    expect(mocks.revalidatePath).not.toHaveBeenCalled();
  });

  it("marks the caller's own unread notifications as read", async () => {
    const client = setupClient({
      userId: MEMBER_ID,
      notifications: [
        { id: "n1", user_id: MEMBER_ID, read_at: null },
        { id: "n2", user_id: MEMBER_ID, read_at: "2026-01-01T00:00:00.000Z" },
        { id: "n3", user_id: "other-user", read_at: null },
      ],
    });

    await markNotificationsRead(["n1", "n2", "n3"]);

    const rows = client.table("notifications").rows;
    expect(rows.find((r) => r.id === "n1")?.read_at).not.toBeNull();
    expect(rows.find((r) => r.id === "n3")?.read_at).toBeNull();
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/", "layout");
  });
});
