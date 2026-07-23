# PRD: Schedule Timeline Grid (Rooms-as-Rows Rewrite)

## Introduction/Overview

The schedule page currently renders two separate column-per-room calendars: a desktop grid (`components/schedule/desktop-resource-grid.tsx`) with one vertical column per room and time flowing top-to-bottom, and a mobile view (`components/schedule/mobile-day-calendar.tsx`) that shows one room at a time via a selector, also with time flowing top-to-bottom. The column-per-room desktop layout breaks down at real venue scale — with 10–15 rooms each column is under 80px wide and titles become unreadable, and it only gets worse toward the 30-room ceiling this app needs to support.

This feature replaces both with a single, responsive **timeline grid**: rooms as rows (Y axis), time as a horizontal axis (X axis) spanning the venue's operating window, with bookings as absolutely-positioned blocks inside each room's row. One component serves phone through desktop — mobile is the priority breakpoint to get right, since that's where most members will actually use the schedule.

## Goals

- Replace the column-per-room desktop grid and the single-room mobile view with one row-per-room timeline grid that works at every breakpoint (phone, tablet, desktop) and scales to 30 rooms without becoming unreadable.
- Preserve every interaction the current calendars already have: drag-to-create bookings, pin/favorite rooms, "Hide free rooms," building group headers, hover/click booking details, and keyboard navigation between bookings — re-implemented against the new row/time-axis orientation, not dropped.
- Keep the room column and time header both visible (sticky) while the grid scrolls, so users never lose track of which room or what time they're looking at.
- Match the existing app's operating window (08:00–23:00, unchanged) rather than silently narrowing or widening booking hours as a side effect of this layout rewrite.

## User Stories

### US-001: Horizontal time-axis math utilities

**Description:** As a developer, I need percentage-based time↔position conversion functions (the horizontal-axis equivalent of the existing pixel-based `offsetForTime`/`timeForOffset` in `lib/schedule/hours.ts`) so every component that positions something along the time axis shares one implementation.

**Acceptance Criteria:**

- [ ] `percentForTime(time)` returns 0 at `SCHEDULE_START_HOUR` and 100 at `SCHEDULE_END_HOUR` (existing constants: 8 and 23), clamped for times outside that range
- [ ] `timeForPercent(percent)` is the inverse, snapped to `BOOKING_TIME_STEP_MINUTES` the same way the existing `timeForOffset` is
- [ ] A gridline helper returns hour and half-hour marks as percentages across the operating window, for the time header and background gridlines to share
- [ ] Existing vertical `offsetForTime`/`timeForOffset` stay in place untouched until US-012 removes them, so nothing else in the app breaks mid-refactor
- [ ] Typecheck passes
- [ ] Tests pass

### US-002: Horizontal now-line

**Description:** As a member checking the schedule, I want the "current time" indicator to be a vertical line at today's current time (not a horizontal one), matching the new left-to-right time axis.

**Acceptance Criteria:**

- [ ] `useNowOffsetPx`'s logic is adapted (or a new hook added) to return a 0–100 percent position via US-001's `percentForTime`, still `null` whenever the viewed date isn't today, still refreshing every 60 seconds
- [ ] `NowLine` renders a 2px accent-colored vertical line at `left: X%` with a small dot at the top, spanning the full height of its container (previously a horizontal line spanning full width)
- [ ] Typecheck passes
- [ ] Verify in browser using dev-browser skill

### US-003: Horizontal event block

**Description:** As a member scanning the schedule, I want each booking rendered as a horizontal block positioned by time, showing as much detail as its width allows.

**Acceptance Criteria:**

- [ ] `EventBlock` positions itself by `left`/`width` percentages (via US-001) instead of the current `top`/`height` + column-based `left`/`width`; `top`/`height` become its lane position within the room row (for concurrent-overlap stacking, see US-005)
- [ ] At rendered width ≥90px: title/service, time range, and requester name all show (existing priority order)
- [ ] Between 40–90px: title only, truncated with ellipsis
- [ ] Below 40px: no text at all, just the colored block; hovering/focusing shows the existing kit `Tooltip` with the full title, time range, and requester
- [ ] `DragCreateOverlay` is updated to the same `left`/`width` horizontal positioning, keeping its existing pending/conflict styling
- [ ] Typecheck passes
- [ ] Verify in browser using dev-browser skill

### US-004: TimelineGrid skeleton — sticky room column, sticky time header

**Description:** As a member on any device, I want one calendar component (not a separate mobile/desktop pair) with a room column that stays visible on the left and a time header that stays visible at the top while I scroll.

**Acceptance Criteria:**

- [ ] New `components/schedule/timeline-grid.tsx`, built mobile-first and responsive, not yet wired with real bookings (structural shell only for this story)
- [ ] Room column is `position: sticky; left: 0`; each cell shows room name, "cap. N" as secondary text (nothing if capacity is null), and a thin colored left bar using the room's existing `category_color`
- [ ] Frozen column width: 140px at ≥1024px, 100px between 768–1023px, ~88px below 768px
- [ ] Time header is `position: sticky; top: 0` inside the scroll container; hour labels every 1 hour when the container is ≥1100px wide, every 2 hours below that; vertical hairline gridlines at each hour, a lighter half-hour gridline when the rendered per-hour width has room for one
- [ ] Renders correctly with a temporary 30-room fixture (removed after verification) without layout breaking
- [ ] Typecheck passes
- [ ] Verify in browser using dev-browser skill

### US-005: Wire bookings into TimelineGrid rows

**Description:** As a member, I want to actually see each room's bookings for the selected day, positioned along the time axis, with overlapping bookings in the same room stacked instead of hidden behind each other.

**Acceptance Criteria:**

- [ ] Fetches the selected date's bookings from `bookings_schedule` the same way the current components do, and renders them as `EventBlock`s (US-003) positioned via `percentForTime` (US-001) inside their room's row
- [ ] Bookings that overlap in time within the same room stack into vertical lanes (reusing `lib/schedule/event-layout.ts`'s existing overlap-clustering — its `columnIndex`/`columnCount` output reinterpreted as lane position instead of side-by-side columns); the room row grows tall enough to fit its tallest lane stack
- [ ] Loading/error/empty states reuse the existing kit `LoadingState`/`ErrorState`/`EmptyState` components
- [ ] Typecheck passes
- [ ] Verify in browser using dev-browser skill

### US-006: Now-line wired into TimelineGrid

**Description:** As a member viewing today's schedule, I want to see the current-time line running down through all visible rooms.

**Acceptance Criteria:**

- [ ] US-002's horizontal `NowLine` renders inside TimelineGrid, spanning the full height of all currently-visible room rows, only when the viewed date is today
- [ ] No now-line renders for any other date
- [ ] Typecheck passes
- [ ] Verify in browser using dev-browser skill

### US-007: Drag-to-create bookings along the time axis (mouse)

**Description:** As a member on desktop or tablet, I want to click-drag across empty space in a room's row to create a booking for that time range, like I can today (just horizontally now instead of vertically).

**Acceptance Criteria:**

- [ ] Mouse-dragging horizontally within an empty area of a room row shows a live ghost overlay (US-003's `DragCreateOverlay`) with the dragged time range, using `timeForPercent` (US-001)
- [ ] Releasing with no conflict routes to `/bookings/new` prefilled with room, date, start, and end — unchanged from today's behavior
- [ ] Releasing over a conflict shows the existing conflict-warning overlay for ~3 seconds and does not navigate
- [ ] Typecheck passes
- [ ] Verify in browser using dev-browser skill

### US-008: Drag-to-create bookings along the time axis (touch)

**Description:** As a member on a phone or tablet, I want to still be able to create a booking by dragging, without that gesture fighting with scrolling the timeline horizontally to see other times.

**Acceptance Criteria:**

- [ ] A plain horizontal touch-drag scrolls the timeline (native scroll) — this is the primary way to see the full operating window on a narrow screen
- [ ] A press-and-hold (~300ms, no movement) arms drag-create mode with a brief visual cue; horizontal movement after that draws the live ghost overlay and behaves like US-007 (same conflict check, same redirect)
- [ ] A drag started without the hold never triggers drag-create — it's always a scroll
- [ ] Typecheck passes
- [ ] Verify in browser using dev-browser skill

### US-009: Keyboard navigation between booking blocks

**Description:** As a keyboard user, I want arrow keys to move between bookings in a way that matches the new row-per-room layout.

**Acceptance Criteria:**

- [ ] `lib/schedule/event-block-navigation.ts` updated: ArrowLeft/ArrowRight move focus to the previous/next booking within the same room row (time order) — this is what ArrowUp/ArrowDown did in the old column layout
- [ ] ArrowUp/ArrowDown move focus to the nearest-start-time booking in the room row above/below — this is what ArrowLeft/ArrowRight did in the old column layout
- [ ] Reuses `EventBlock`'s existing `data-room-index`/`data-start-minutes` attributes, no new data attributes needed
- [ ] Typecheck passes
- [ ] Verify in browser using dev-browser skill

### US-010: Pin/favorite rooms and "Hide free rooms" in TimelineGrid

**Description:** As a member, I want to still be able to pin rooms I use often to the top of the list and hide rooms with nothing booked, same as today.

**Acceptance Criteria:**

- [ ] Each room row has the existing pin/unpin `IconButton`; pinned rooms float to the top via the existing `sortRoomsByFavorite` (unchanged)
- [ ] A "Hide free rooms" toggle above the grid hides rows with zero bookings for the selected date; shows an `EmptyState` if that leaves nothing visible
- [ ] Typecheck passes
- [ ] Verify in browser using dev-browser skill

### US-011: Building group headers in TimelineGrid

**Description:** As a member browsing a multi-building venue, I want same-building rooms visually grouped, same as the current desktop grid.

**Acceptance Criteria:**

- [ ] Consecutive same-building room rows (via the existing `buildingGroupSpans`) render under one sticky building-name header, adapted from the old column-spanning header to a row-spanning one
- [ ] Rooms without a building sort last and render without a group header, matching current behavior
- [ ] Typecheck passes
- [ ] Verify in browser using dev-browser skill

### US-012: Replace old components and wire schedule-content.tsx

**Description:** As a developer, I want the old column-per-room components fully removed once TimelineGrid covers everything they did, so there's one calendar implementation, not two.

**Acceptance Criteria:**

- [ ] `components/schedule/schedule-content.tsx` renders a single `<TimelineGrid>` for every breakpoint — no more `lg:hidden` / `hidden lg:block` split between two components
- [ ] `components/schedule/desktop-resource-grid.tsx` and `components/schedule/mobile-day-calendar.tsx` deleted, with no remaining imports anywhere
- [ ] Now-dead code removed, including the old vertical `offsetForTime`/`timeForOffset` in `lib/schedule/hours.ts` if nothing else references them
- [ ] Lint reports no unused exports/imports
- [ ] Typecheck passes
- [ ] Verify in browser using dev-browser skill

## Functional Requirements

- FR-1: The schedule calendar must render one row per room (Y axis) and time as a horizontal axis (X axis), replacing the current one-column-per-room layout.
- FR-2: The room column must be visually frozen (`position: sticky; left: 0`) while the timeline scrolls horizontally; each room cell must show room name, capacity ("cap. N"), and a colored left bar from the room's `category_color`.
- FR-3: The frozen room column must be 140px wide at desktop widths (≥1024px), 100px at tablet widths (768–1023px), and ~88px below that.
- FR-4: The time header must be frozen to the top of the scroll container; it must show hourly labels at container widths ≥1100px and every-2-hours labels below that, with hour gridlines and half-hour gridlines when there's room for them.
- FR-5: Bookings must render as absolutely-positioned blocks inside their room's row, with `left`/`width` computed as a percentage of the operating window (08:00–23:00, the app's existing constants).
- FR-6: Bookings that overlap in time within the same room must stack into distinct vertical lanes rather than overlapping visually; the row must grow to fit.
- FR-7: A booking block must show title/service, time range, and requester name at ≥90px rendered width; title only (truncated) between 40–90px; no text (colored block + hover tooltip) below 40px.
- FR-8: A "now" indicator — a 2px vertical accent line with a dot at the top — must render at the current time's horizontal position, spanning all visible room rows, only when the viewed date is today, and must update every 60 seconds.
- FR-9: Dragging horizontally across empty space in a room's row must create a booking for that time range (mouse drag on desktop/tablet; press-and-hold-then-drag on touch, to avoid colliding with horizontal scroll) — reusing the existing conflict check and redirect-to-prefilled-booking-sheet flow.
- FR-10: Arrow-key navigation must move focus left/right between bookings in the same room row (by time) and up/down to the nearest-time booking in the adjacent room row.
- FR-11: Pin/favorite rooms, "Hide free rooms," and building group headers must all work against the new row-per-room layout, matching their current behavior.
- FR-12: The same TimelineGrid component must serve phone, tablet, and desktop — no separate single-room mobile view and multi-room desktop view.
- FR-13: The grid must render correctly with up to 30 rooms without breaking layout (typical case: 10–15).

## Non-Goals (Out of Scope)

- No new room-category data model. The "colored bar keyed to room category" reuses the existing `category_color` field (added for room management, 8-color palette) rather than introducing a new hall/meeting-room/classroom/outdoor enum or migration.
- No admin-editable operating window. 08:00–23:00 stays an app-level code constant (`SCHEDULE_START_HOUR`/`SCHEDULE_END_HOUR` in `lib/schedule/hours.ts`), consistent with this project's existing "fixed constant, not admin-editable in v1" pattern — not a new settings table or admin UI.
- No changes to booking business logic: the conflict-check utility, the pending-request cap, the approval/rejection lifecycle, and the booking sheet form are all unchanged. This PRD is a rendering/layout rewrite of the schedule view only.
- No virtualization or other rendering-performance work for very large room counts — 30 rows of plain DOM is expected to perform fine; revisit only if real testing shows otherwise.
- No day-swipe touch gesture on the calendar surface. The existing `DayStrip` (tap-to-select-day, prev/next arrows) is the only day-navigation UI going forward — a horizontal swipe on the calendar itself now means "scroll the timeline," so the old swipe-to-change-day gesture is dropped rather than made to coexist with it.

## Design Considerations

- Reuse existing kit components throughout: `Tooltip`, `LoadingState`, `ErrorState`, `EmptyState`, `IconButton`, `StatusBadge`, the booking detail `Modal`/`Popover` pattern already in `EventBlock`.
- Row height (and per-lane height within a row, for stacked overlapping bookings) isn't specified by the source spec beyond block-width thresholds; pick values that read well against the app's existing `HOUR_ROW_HEIGHT_PX`-family tokens for visual consistency with the rest of the kit, rather than inventing an unrelated scale.
- The frozen-column width at phone size (~88px) and the long-press duration for touch drag-create (~300ms) are this PRD's own reasonable defaults, not explicitly specified by the source spec — both are cheap to tune during implementation if they feel wrong in hand.

## Technical Considerations

- Requires one scroll container that can be sticky on both axes at once (room column sticky-left, time header sticky-top, with a sticky top-left corner cell). This needs a single bounded-height, two-axis scroll container (not the page itself scrolling), matching the "frozen header + frozen column" spreadsheet pattern.
- `lib/schedule/event-layout.ts`'s overlap-clustering algorithm is reused as-is (US-005) — only its consumer changes, from laying columns out left-to-right to laying lanes out top-to-bottom.
- Touch drag-to-create (US-008) is the trickiest interaction change: dragging horizontally is now overloaded between "scroll the timeline" and "create a booking." The long-press-to-arm approach is this PRD's chosen resolution; flagged below as worth a quick usability check once built, since it's a new gesture pattern for this app.
- This is a full rewrite of the schedule rendering layer touching `lib/schedule/hours.ts`, `lib/schedule/event-layout.ts` (consumer only), `lib/schedule/event-block-navigation.ts`, `lib/schedule/now-line.ts`, and `components/schedule/{now-line,event-block,drag-create-overlay,desktop-resource-grid,mobile-day-calendar,schedule-content}.tsx`. `DayStrip` and `RoomFilterBar` are unaffected and stay as-is.

## Success Metrics

- The schedule is fully usable (all rooms readable, all bookings legible or tooltip-accessible) at 15 rooms on a 375px-wide phone screen and at 30 rooms on desktop, with no horizontal-scroll-breaking layout bugs.
- No regression in existing interactions: drag-to-create, pin/favorite, hide-free-rooms, building groups, and keyboard navigation all work post-rewrite, verified story-by-story via the dev-browser skill.
- Zero remaining references to the deleted `desktop-resource-grid.tsx`/`mobile-day-calendar.tsx` after US-012.

## Open Questions

- The long-press-to-arm gesture for touch drag-to-create (US-008) is this PRD's proposed resolution to the "drag now means scroll" conflict — worth a quick real-device usability pass once built, since it's untested against how members actually hold/tap on the calendar.
- Exact row/lane pixel heights are left to implementation (see Design Considerations) rather than specified here — call out if a specific density is wanted instead.
- The source spec's illustrative default operating window (08:00–22:00) differs from this app's already-established 08:00–23:00; this PRD keeps the existing 23:00 close, flagging in case that was meant to actually change the venue's hours rather than just illustrate the mechanism.
