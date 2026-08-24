import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createClient as createSupabaseClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Integration test for the bookings_no_overlap exclusion constraint
 * (supabase/migrations/20260823000000_add_bookings_no_overlap_exclusion.sql,
 * narrowed to approved-only by 20260824000000_bookings_no_overlap_approved_only.sql).
 *
 * Requires a running local Supabase stack (`supabase start`) with these
 * migrations applied. It exercises real concurrent writes against Postgres —
 * something the pure-function tests in lib/bookings/conflict-check.test.ts
 * can't do — to prove the database itself, not just the application's
 * check-then-act conflict check, refuses to let two overlapping bookings
 * both land in the 'approved' state, while still allowing two overlapping
 * 'pending' requests to coexist (the admin decides which one gets approved).
 *
 * Skips itself (rather than failing) when no local Supabase is reachable, so
 * `npm test` stays green in CI (.github/workflows/ci.yml runs with
 * placeholder Supabase env vars and no live database).
 */

const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL &&
  process.env.NEXT_PUBLIC_SUPABASE_URL !== "https://placeholder.supabase.co"
    ? process.env.NEXT_PUBLIC_SUPABASE_URL
    : "http://127.0.0.1:54321";

// Falls back to the standard local Supabase CLI demo service-role key — not
// a secret, it's the same fixed value `supabase start` prints for every
// project using the default local JWT secret, which this project's
// supabase/config.toml does not override. Set SUPABASE_SERVICE_ROLE_KEY to
// point this test at a different local instance.
const SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY &&
  process.env.SUPABASE_SERVICE_ROLE_KEY !== "placeholder-service-role-key"
    ? process.env.SUPABASE_SERVICE_ROLE_KEY
    : "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU";

const POSTGRES_EXCLUSION_VIOLATION = "23P01";
const TEST_DATE = "2099-06-15";

async function isReachable(client: SupabaseClient): Promise<boolean> {
  let timer: ReturnType<typeof setTimeout>;
  try {
    const timeout = new Promise<never>((_, reject) => {
      timer = setTimeout(() => reject(new Error("timeout")), 1500);
    });
    const { error } = await Promise.race([client.from("rooms").select("id").limit(1), timeout]);
    return !error;
  } catch {
    return false;
  } finally {
    clearTimeout(timer!);
  }
}

const admin = createSupabaseClient(SUPABASE_URL, SERVICE_ROLE_KEY);
const reachable = await isReachable(admin);

if (!reachable) {
  console.warn(
    `[bookings-no-overlap.integration.test.ts] Skipped: no local Supabase reachable at ${SUPABASE_URL}. ` +
      "Run `supabase start` (and apply migrations) to exercise the race-condition guard."
  );
}

describe.skipIf(!reachable)("bookings_no_overlap exclusion constraint", () => {
  let testUserId: string;
  let testRoomId: string;

  beforeAll(async () => {
    const { data: userData, error: userError } = await admin.auth.admin.createUser({
      email: `bookings-race-test-${Date.now()}@example.com`,
      password: "Test1234!",
      email_confirm: true,
    });
    if (userError || !userData.user) {
      throw new Error(`Failed to create test user: ${userError?.message}`);
    }
    testUserId = userData.user.id;

    const { data: room, error: roomError } = await admin
      .from("rooms")
      .insert({ name: `Race Test Room ${Date.now()}` })
      .select("id")
      .single();
    if (roomError || !room) {
      throw new Error(`Failed to create test room: ${roomError?.message}`);
    }
    testRoomId = room.id;
  });

  afterAll(async () => {
    // Deleting the room cascades to any bookings left over from a failed run.
    if (testRoomId) await admin.from("rooms").delete().eq("id", testRoomId);
    if (testUserId) await admin.auth.admin.deleteUser(testUserId);
  });

  it("prevents two concurrent UPDATEs from producing overlapping approved bookings", async () => {
    // Both rows start 'pending' — that's now a perfectly legal, ordinary
    // state for two overlapping requests to sit in, since the constraint no
    // longer covers pending-pending overlaps. The race only bites once both
    // try to become 'approved' at the same moment.
    const { data: bookingA, error: insertAError } = await admin
      .from("bookings")
      .insert({
        room_id: testRoomId,
        user_id: testUserId,
        date: TEST_DATE,
        start_time: "10:00:00",
        end_time: "11:00:00",
        service: "Meeting",
        status: "pending",
      })
      .select("id")
      .single();
    expect(insertAError).toBeNull();

    const { data: bookingB, error: insertBError } = await admin
      .from("bookings")
      .insert({
        room_id: testRoomId,
        user_id: testUserId,
        date: TEST_DATE,
        start_time: "10:30:00",
        end_time: "11:30:00",
        service: "Meeting",
        status: "pending",
      })
      .select("id")
      .single();
    expect(insertBError).toBeNull();

    // The race: both rows attempt to enter the protected (pending/approved)
    // set at the same moment, on overlapping slots in the same room — the
    // same shape as two admins concurrently approving overlapping requests.
    // Fired without awaiting in between so both HTTP requests are genuinely
    // in flight together, not sequential.
    const [resultA, resultB] = await Promise.all([
      admin.from("bookings").update({ status: "approved" }).eq("id", bookingA!.id).select("id"),
      admin.from("bookings").update({ status: "approved" }).eq("id", bookingB!.id).select("id"),
    ]);

    const outcomes = [resultA, resultB];
    const succeeded = outcomes.filter((r) => !r.error);
    const failed = outcomes.filter((r) => r.error);

    expect(succeeded).toHaveLength(1);
    expect(failed).toHaveLength(1);
    expect(failed[0]!.error!.code).toBe(POSTGRES_EXCLUSION_VIOLATION);

    const { data: finalRows } = await admin
      .from("bookings")
      .select("id, status")
      .in("id", [bookingA!.id, bookingB!.id]);
    const approvedCount = (finalRows ?? []).filter((row) => row.status === "approved").length;
    expect(approvedCount).toBe(1);
  });

  it("allows two concurrent overlapping pending bookings (admin decides which to approve)", async () => {
    const [resultA, resultB] = await Promise.all([
      admin
        .from("bookings")
        .insert({
          room_id: testRoomId,
          user_id: testUserId,
          date: TEST_DATE,
          start_time: "14:00:00",
          end_time: "15:00:00",
          service: "Meeting",
          status: "pending",
        })
        .select("id"),
      admin
        .from("bookings")
        .insert({
          room_id: testRoomId,
          user_id: testUserId,
          date: TEST_DATE,
          start_time: "14:30:00",
          end_time: "15:30:00",
          service: "Meeting",
          status: "pending",
        })
        .select("id"),
    ]);

    expect(resultA.error).toBeNull();
    expect(resultB.error).toBeNull();
  });
});
