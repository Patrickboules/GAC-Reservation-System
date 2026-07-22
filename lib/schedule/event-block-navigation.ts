import type * as React from "react";

/** data-attribute key event blocks use to name their id (kept in sync with EventBlock). */
const EVENT_BLOCK_SELECTOR = '[data-slot="event-block"]';

const ARROW_KEY_DIRECTIONS: Record<string, EventNavigationDirection> = {
  ArrowUp: "up",
  ArrowDown: "down",
  ArrowLeft: "left",
  ArrowRight: "right",
};

/**
 * Arrow-key handler shared by the desktop resource grid and the mobile day
 * calendar (US-046), attached once at the grid container rather than per
 * event block. This is deliberate: while an event block's hover/focus
 * popover (US-031) is mid-close-transition, the browser can transiently park
 * DOM focus on the closing popup — a React-tree sibling of the button that's
 * portalled elsewhere in the DOM. A per-button keydown listener would miss
 * keys pressed during that window; a container-level listener still catches
 * them, since React re-dispatches portalled events through the component
 * tree (not the DOM tree) for bubbling purposes. The "current" event is
 * tracked via `data-focused-event-id` (set by each block's onFocus) rather
 * than `document.activeElement`, so navigation stays correct through that
 * same transient window.
 */
export function handleScheduleGridKeyDown(event: React.KeyboardEvent<HTMLElement>): void {
  const direction = ARROW_KEY_DIRECTIONS[event.key];
  if (!direction) return;

  const grid = event.currentTarget;
  const currentId = grid.dataset.focusedEventId;
  if (!currentId) return;

  const candidates: NavigableEvent[] = Array.from(
    grid.querySelectorAll<HTMLElement>(EVENT_BLOCK_SELECTOR)
  ).map((el) => ({
    id: el.dataset.eventId ?? "",
    roomIndex: Number(el.dataset.roomIndex ?? 0),
    startMinutes: Number(el.dataset.startMinutes ?? 0),
  }));

  const targetId = findNextEventBlockId(candidates, currentId, direction);
  if (!targetId) return;

  const targetEl = grid.querySelector<HTMLElement>(
    `${EVENT_BLOCK_SELECTOR}[data-event-id="${CSS.escape(targetId)}"]`
  );
  if (!targetEl) return;

  event.preventDefault();
  targetEl.focus();
}

export interface NavigableEvent {
  id: string;
  /** Position of the containing room column among currently-visible rooms. */
  roomIndex: number;
  /** Start time in minutes since midnight, for ordering within a room column. */
  startMinutes: number;
}

export type EventNavigationDirection = "up" | "down" | "left" | "right";

/**
 * Given the full set of currently-rendered event blocks, finds the id of the
 * event that arrow-key navigation should move focus to from `currentId`
 * (US-046): up/down step through the same room column in time order,
 * left/right jump to the nearest-start-time event in the next non-empty
 * room column in that direction. Returns null when there's nowhere to go.
 */
export function findNextEventBlockId(
  events: NavigableEvent[],
  currentId: string,
  direction: EventNavigationDirection
): string | null {
  const current = events.find((event) => event.id === currentId);
  if (!current) return null;

  if (direction === "up" || direction === "down") {
    const sameColumn = events
      .filter((event) => event.roomIndex === current.roomIndex)
      .sort((a, b) => a.startMinutes - b.startMinutes);
    const index = sameColumn.findIndex((event) => event.id === currentId);
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    return sameColumn[targetIndex]?.id ?? null;
  }

  const roomIndexes = Array.from(new Set(events.map((event) => event.roomIndex))).sort(
    (a, b) => a - b
  );
  const currentPos = roomIndexes.indexOf(current.roomIndex);
  const targetPos = direction === "left" ? currentPos - 1 : currentPos + 1;
  const targetRoomIndex = roomIndexes[targetPos];
  if (targetRoomIndex === undefined) return null;

  const candidates = events.filter((event) => event.roomIndex === targetRoomIndex);
  let closest: NavigableEvent | null = null;
  let closestDiff = Infinity;
  for (const candidate of candidates) {
    const diff = Math.abs(candidate.startMinutes - current.startMinutes);
    if (diff < closestDiff) {
      closest = candidate;
      closestDiff = diff;
    }
  }
  return closest?.id ?? null;
}
