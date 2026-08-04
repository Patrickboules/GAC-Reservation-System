import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";

import { countOpenPendingBookings } from "./limits";

function hoursFromNow(hours: number): { date: string; end_time: string } {
  const at = new Date(Date.now() + hours * 60 * 60 * 1000);
  const date = `${at.getFullYear()}-${String(at.getMonth() + 1).padStart(2, "0")}-${String(
    at.getDate()
  ).padStart(2, "0")}`;
  const end_time = `${String(at.getHours()).padStart(2, "0")}:${String(at.getMinutes()).padStart(
    2,
    "0"
  )}:00`;
  return { date, end_time };
}

function createFakeSupabase(bookings: { date: string; end_time: string }[]) {
  const client = {
    from: () => ({
      select: () => ({
        eq: () => ({
          eq: () => Promise.resolve({ data: bookings, error: null }),
        }),
      }),
    }),
  };
  return client as unknown as SupabaseClient;
}

describe("countOpenPendingBookings", () => {
  it("counts a pending booking whose slot hasn't happened yet", async () => {
    const future = hoursFromNow(2);
    const supabase = createFakeSupabase([{ date: future.date, end_time: future.end_time }]);
    expect(await countOpenPendingBookings(supabase, "user-1")).toBe(1);
  });

  it("excludes a pending booking whose slot has already passed", async () => {
    const past = hoursFromNow(-2);
    const supabase = createFakeSupabase([{ date: past.date, end_time: past.end_time }]);
    expect(await countOpenPendingBookings(supabase, "user-1")).toBe(0);
  });

  it("counts a mix of past and future pending bookings correctly", async () => {
    const future = hoursFromNow(2);
    const past = hoursFromNow(-2);
    const supabase = createFakeSupabase([
      { date: future.date, end_time: future.end_time },
      { date: past.date, end_time: past.end_time },
      { date: future.date, end_time: future.end_time },
    ]);
    expect(await countOpenPendingBookings(supabase, "user-1")).toBe(2);
  });
});
