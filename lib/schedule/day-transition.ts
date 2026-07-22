"use client";

import { useState } from "react";

export type DayTransitionDirection = "forward" | "backward" | null;

/**
 * Tracks whether `date` moved forward or backward since the last render, so
 * callers can key their grid content and pick a slide-in-from-left/right
 * animation class. Uses React's "adjust state during render" pattern so the
 * new direction is available in the same render the date prop changes in.
 */
export function useDayTransitionDirection(date: string): DayTransitionDirection {
  const [state, setState] = useState<{ date: string; direction: DayTransitionDirection }>({
    date,
    direction: null,
  });

  if (state.date !== date) {
    const direction: DayTransitionDirection = date > state.date ? "forward" : "backward";
    setState({ date, direction });
    return direction;
  }

  return state.direction;
}

export function dayTransitionClassName(direction: DayTransitionDirection): string {
  if (direction === "forward") return "animate-schedule-slide-right";
  if (direction === "backward") return "animate-schedule-slide-left";
  return "";
}
