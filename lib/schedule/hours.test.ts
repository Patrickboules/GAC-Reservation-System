import { describe, expect, it } from "vitest";

import {
  SCHEDULE_END_HOUR,
  SCHEDULE_START_HOUR,
  percentForTime,
  timeAxisGridlines,
  timeForPercent,
} from "./hours";

describe("percentForTime", () => {
  it("returns 0 at SCHEDULE_START_HOUR", () => {
    expect(percentForTime(`${String(SCHEDULE_START_HOUR).padStart(2, "0")}:00`)).toBe(0);
  });

  it("returns 100 at SCHEDULE_END_HOUR", () => {
    expect(percentForTime(`${String(SCHEDULE_END_HOUR).padStart(2, "0")}:00`)).toBe(100);
  });

  it("returns 50 at the midpoint of the operating window", () => {
    const midHour = SCHEDULE_START_HOUR + (SCHEDULE_END_HOUR - SCHEDULE_START_HOUR) / 2;
    expect(percentForTime(`${String(midHour).padStart(2, "0")}:00`)).toBeCloseTo(50);
  });

  it("clamps times before SCHEDULE_START_HOUR to 0", () => {
    expect(percentForTime("00:00")).toBe(0);
  });

  it("clamps times after SCHEDULE_END_HOUR to 100", () => {
    expect(percentForTime("23:59")).toBe(100);
  });
});

describe("timeForPercent", () => {
  it("is the inverse of percentForTime at 0", () => {
    expect(timeForPercent(0)).toBe(`${String(SCHEDULE_START_HOUR).padStart(2, "0")}:00`);
  });

  it("is the inverse of percentForTime at 100", () => {
    expect(timeForPercent(100)).toBe(`${String(SCHEDULE_END_HOUR).padStart(2, "0")}:00`);
  });

  it("clamps out-of-range percentages", () => {
    expect(timeForPercent(-10)).toBe(`${String(SCHEDULE_START_HOUR).padStart(2, "0")}:00`);
    expect(timeForPercent(150)).toBe(`${String(SCHEDULE_END_HOUR).padStart(2, "0")}:00`);
  });

  it("snaps to the booking time step", () => {
    // A percent that lands mid-step should round to the nearest 30-minute mark.
    const nearHalfHour = percentForTime("09:10");
    expect(timeForPercent(nearHalfHour)).toBe("09:00");
  });
});

describe("timeAxisGridlines", () => {
  const marks = timeAxisGridlines();

  it("includes an on-the-hour mark for every hour in the operating window", () => {
    const hourMarks = marks.filter((m) => !m.isHalfHour);
    expect(hourMarks).toHaveLength(SCHEDULE_END_HOUR - SCHEDULE_START_HOUR + 1);
    expect(hourMarks[0].percent).toBe(0);
    expect(hourMarks[hourMarks.length - 1].percent).toBe(100);
  });

  it("includes a half-hour mark for every hour except the last", () => {
    const halfHourMarks = marks.filter((m) => m.isHalfHour);
    expect(halfHourMarks).toHaveLength(SCHEDULE_END_HOUR - SCHEDULE_START_HOUR);
  });

  it("orders marks with percent increasing across the window", () => {
    const percents = marks.map((m) => m.percent).sort((a, b) => a - b);
    expect(percents[0]).toBe(0);
    expect(percents[percents.length - 1]).toBe(100);
  });
});
