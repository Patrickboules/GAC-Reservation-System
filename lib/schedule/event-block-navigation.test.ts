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

  it("moves down to the next-later event in the same room column", () => {
    expect(findNextEventBlockId(events, "a1", "down")).toBe("a2");
  });

  it("moves up to the previous-earlier event in the same room column", () => {
    expect(findNextEventBlockId(events, "a2", "up")).toBe("a1");
  });

  it("returns null moving down past the last event in a column", () => {
    expect(findNextEventBlockId(events, "a2", "down")).toBeNull();
  });

  it("returns null moving up past the first event in a column", () => {
    expect(findNextEventBlockId(events, "a1", "up")).toBeNull();
  });

  it("moves right to the nearest-start-time event in the next room column", () => {
    expect(findNextEventBlockId(events, "a1", "right")).toBe("b1");
  });

  it("moves left to the nearest-start-time event in the previous room column", () => {
    expect(findNextEventBlockId(events, "c1", "left")).toBe("b1");
  });

  it("returns null moving left from the first room column", () => {
    expect(findNextEventBlockId(events, "a1", "left")).toBeNull();
  });

  it("returns null moving right from the last room column", () => {
    expect(findNextEventBlockId(events, "c1", "right")).toBeNull();
  });

  it("skips empty room columns when moving left/right", () => {
    const withGap: NavigableEvent[] = [ev("x", 0, 9 * 60), ev("y", 3, 9 * 60)];
    expect(findNextEventBlockId(withGap, "x", "right")).toBe("y");
    expect(findNextEventBlockId(withGap, "y", "left")).toBe("x");
  });

  it("returns null for an unknown current id", () => {
    expect(findNextEventBlockId(events, "missing", "down")).toBeNull();
  });
});
