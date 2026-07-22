import { describe, expect, it } from "vitest";

import { layoutOverlappingEvents, type TimedEvent } from "./event-layout";

function event(id: string, start_time: string, end_time: string): TimedEvent {
  return { id, start_time, end_time };
}

describe("layoutOverlappingEvents", () => {
  it("gives every event columnCount 1 when nothing overlaps", () => {
    const result = layoutOverlappingEvents([
      event("a", "09:00", "10:00"),
      event("b", "10:00", "11:00"),
      event("c", "11:30", "12:00"),
    ]);

    expect(result.every((r) => r.columnCount === 1 && r.columnIndex === 0)).toBe(true);
  });

  it("splits two overlapping events into two columns", () => {
    const result = layoutOverlappingEvents([
      event("a", "09:00", "10:00"),
      event("b", "09:30", "10:30"),
    ]);

    const byId = Object.fromEntries(result.map((r) => [r.event.id, r]));
    expect(byId.a.columnCount).toBe(2);
    expect(byId.b.columnCount).toBe(2);
    expect(byId.a.columnIndex).not.toBe(byId.b.columnIndex);
  });

  it("reuses a freed column once an earlier event ends", () => {
    const result = layoutOverlappingEvents([
      event("a", "09:00", "10:00"),
      event("b", "09:15", "09:45"),
      event("c", "09:50", "10:15"),
    ]);

    const byId = Object.fromEntries(result.map((r) => [r.event.id, r]));
    // a and b overlap (2 columns); c starts after b ends, so it can reuse b's column,
    // but c still overlaps a, so the whole cluster stays at columnCount 2.
    expect(byId.a.columnCount).toBe(2);
    expect(byId.b.columnCount).toBe(2);
    expect(byId.c.columnCount).toBe(2);
    expect(byId.c.columnIndex).toBe(byId.b.columnIndex);
    expect(byId.c.columnIndex).not.toBe(byId.a.columnIndex);
  });

  it("resets columnCount to 1 after a cluster fully closes before the next event starts", () => {
    const result = layoutOverlappingEvents([
      event("a", "09:00", "10:00"),
      event("b", "09:30", "10:30"),
      event("c", "11:00", "12:00"),
    ]);

    const byId = Object.fromEntries(result.map((r) => [r.event.id, r]));
    expect(byId.a.columnCount).toBe(2);
    expect(byId.b.columnCount).toBe(2);
    expect(byId.c.columnCount).toBe(1);
    expect(byId.c.columnIndex).toBe(0);
  });

  it("handles three mutually overlapping events with three columns", () => {
    const result = layoutOverlappingEvents([
      event("a", "09:00", "10:30"),
      event("b", "09:15", "10:00"),
      event("c", "09:30", "09:45"),
    ]);

    const columnCounts = result.map((r) => r.columnCount);
    expect(columnCounts.every((c) => c === 3)).toBe(true);
    const columnIndexes = result.map((r) => r.columnIndex).sort();
    expect(columnIndexes).toEqual([0, 1, 2]);
  });
});
