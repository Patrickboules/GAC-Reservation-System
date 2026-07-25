import { describe, expect, it } from "vitest";

import { findNextEventBlockId, type NavigableEvent } from "./event-block-navigation";

function ev(id: string, roomIndex: number, startMinutes: number): NavigableEvent {
  return { id, roomIndex, startMinutes };
}

describe("findNextEventBlockId", () => {
  const events: NavigableEvent[] = [
    ev("a1", 0, 9 * 60),
    ev("a2", 0, 11 * 60),
    ev("b1", 1, 9 * 60 + 30),
    ev("c1", 2, 10 * 60),
  ];

  it("moves right to the next-later event in the same room row", () => {
    expect(findNextEventBlockId(events, "a1", "right")).toBe("a2");
  });

  it("moves left to the previous-earlier event in the same room row", () => {
    expect(findNextEventBlockId(events, "a2", "left")).toBe("a1");
  });

  it("returns null moving right past the last event in a row", () => {
    expect(findNextEventBlockId(events, "a2", "right")).toBeNull();
  });

  it("returns null moving left past the first event in a row", () => {
    expect(findNextEventBlockId(events, "a1", "left")).toBeNull();
  });

  it("moves down to the nearest-start-time event in the next room row", () => {
    expect(findNextEventBlockId(events, "a1", "down")).toBe("b1");
  });

  it("moves up to the nearest-start-time event in the previous room row", () => {
    expect(findNextEventBlockId(events, "c1", "up")).toBe("b1");
  });

  it("returns null moving up from the first room row", () => {
    expect(findNextEventBlockId(events, "a1", "up")).toBeNull();
  });

  it("returns null moving down from the last room row", () => {
    expect(findNextEventBlockId(events, "c1", "down")).toBeNull();
  });

  it("skips empty room rows when moving up/down", () => {
    const withGap: NavigableEvent[] = [ev("x", 0, 9 * 60), ev("y", 3, 9 * 60)];
    expect(findNextEventBlockId(withGap, "x", "down")).toBe("y");
    expect(findNextEventBlockId(withGap, "y", "up")).toBe("x");
  });

  it("returns null for an unknown current id", () => {
    expect(findNextEventBlockId(events, "missing", "down")).toBeNull();
  });
});
