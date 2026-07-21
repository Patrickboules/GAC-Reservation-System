# PRD: UI Redesign v2

## 1. Introduction/Overview

GAC Reservations v1 (US-001 through US-016, all complete) shipped a functional but visually generic member/admin booking app: default shadcn styling, no persistent navigation shell, a basic calendar/list toggle for the schedule, and an admin experience limited to a single approval-queue page. This PRD redesigns the entire UI on top of that working foundation — bright, airy, baby-blue-on-white-and-beige visual identity, a persistent app shell so no screen is orphaned, a signature Google-Calendar-style resource day view for the schedule, and one consistent component kit used everywhere.

Full visual direction, tokens, and component anatomy are specified in `prd_plans/UI-Redesign-Spec.md` (the source design spec) — this PRD turns that spec into ordered, buildable user stories against this specific Next.js 15 / Supabase codebase. Three areas the spec depicts don't exist in the app at all yet (notifications, room management CRUD, usage reports); per direction from the requester, this PRD builds real backend support for all three rather than stubbing them.

**Decisions locked in for this PRD** (resolved via clarifying questions, override the source spec where they conflict):

- **Scope:** the full spec, not a phased subset — tokens → shell → component kit → calendar → pages → admin, in dependency order.
- **Calendar priority:** CLAUDE.md's mobile-first constraint wins over the spec's "desktop-first" assumption. The single-room mobile view (§4.6 of the spec) is the baseline that must work well on its own; the 50+-column desktop resource grid is a progressive enhancement layered on top, not the other way around.
- **Component base:** a new component kit is built per the spec's inventory, living alongside (not replacing in place) the existing shadcn/ui primitives in `components/ui/`. See Technical Considerations for the migration path.
- **Fonts:** Bricolage Grotesque + Geist + Geist Mono are all adopted via `next/font`, as specified.
- **New subsystems:** notifications, room management CRUD, and usage reports get real schema/migrations and server logic, not visual-only placeholders.

## 2. Goals

- Every route in the app is reachable from a persistent shell (sidebar/top bar on desktop, bottom tabs on mobile) — no orphaned screens.
- The schedule becomes the product's hero screen: a resource day view that works cleanly on a phone first, and scales to 50+ rooms on desktop.
- One component kit (tokens, primitives, patterns) is used consistently across all 16+ use cases so the product feels like one system, not 16 bolted-together screens.
- Admins get real room-management CRUD and usage reports; members and admins both get real notifications (reminders, approval/rejection, cancellation notices) instead of relying on manually checking My Bookings.
- No regression to existing functional guarantees: RLS enforcement, the shared conflict-check utility, the 5-pending-booking cap, and the approval/status lifecycle all continue to work exactly as before — this is a visual and navigational redesign plus three additive subsystems, not a rewrite of booking logic.
- Mobile-first holds throughout: every screen, especially the calendar, works with no horizontal scroll on small viewports.

## 3. User Stories

Stories are grouped into epics and ordered by dependency within and across epics. Each is sized to be completable in one focused session; several will be split further when converted to `prd.json` via the `ralph` skill.

### Epic A — Design foundation

#### US-101: Add Tailwind design tokens
**Description:** As a developer, I need the spec's color, radius, shadow, and spacing tokens in the Tailwind theme so every subsequent component can reference them.
**Acceptance Criteria:**
- [ ] `canvas`, `surface`, `line`, `ink` (900/700/500/300), `sky` (50–700), `sand` (50/100/200), and `status` (approved/pending/rejected/cancelled fg+bg) color tokens added per spec §1.1
- [ ] `borderRadius` (sm/md/lg/xl) and `boxShadow` (sm/md/lg) tokens added per spec §1.1
- [ ] Existing pages still build without visual breakage (tokens additive, not yet applied everywhere)
- [ ] Typecheck passes

#### US-102: Load custom fonts
**Description:** As a developer, I need Bricolage Grotesque, Geist, and Geist Mono loaded via `next/font` so display, UI, and tabular-data text can use the spec's type system.
**Acceptance Criteria:**
- [ ] Bricolage Grotesque (600/700), Geist (400/500/600), and Geist Mono (400/500) loaded via `next/font/google` (or `next/font/local` if self-hosted) in the root layout
- [ ] `font-display`, `font-sans`, `font-mono` Tailwind families wired to the loaded fonts per spec §1.1
- [ ] Geist Mono text uses `tabular-nums`
- [ ] Typecheck passes
- [ ] Verify in browser using dev-browser skill

#### US-103: Apply base page background and typography
**Description:** As a member, I want the app's base surface and text to reflect the new bright identity before individual components are redesigned.
**Acceptance Criteria:**
- [ ] Root layout background uses `canvas`; cards/panels default to `surface`
- [ ] Body text defaults to `ink-700` on `font-sans`; headings default to `ink-900` on `font-display`
- [ ] Type scale (display-xl/display/h2/h3/body/small/caption) available as reusable Tailwind utility classes or a typography component
- [ ] Typecheck passes
- [ ] Verify in browser using dev-browser skill

### Epic B — Core component kit

All components in this epic live in a new `components/kit/` directory (see Technical Considerations for why this is parallel to, not a replacement of, `components/ui/`).

#### US-104: Button and Icon Button
**Acceptance Criteria:**
- [ ] Button variants: primary/secondary/ghost/danger; states: default/hover/pressed/disabled/loading; sizes sm/md/lg per spec §3.2
- [ ] Loading state shows a spinner in place of the label with width locked (no layout shift)
- [ ] Icon Button variant with optional tooltip
- [ ] Focus-visible ring (`ring-2 ring-sky-300`) on both
- [ ] Typecheck passes
- [ ] Verify in browser using dev-browser skill

#### US-105: Status badge, filter chip, segmented control
**Acceptance Criteria:**
- [ ] Status badge renders approved/pending/rejected/cancelled with correct fg/bg per spec's semantic table, plus an optional leading dot; status is never conveyed by color alone (label always present)
- [ ] Filter chip has idle/selected states, optional count, and is removable
- [ ] Segmented control supports 2–4 segments with a selected-state indicator
- [ ] Typecheck passes
- [ ] Verify in browser using dev-browser skill

#### US-106: Input, Select, Textarea
**Acceptance Criteria:**
- [ ] Each supports default/focus/error/disabled states with label, helper text, and error text slots
- [ ] Error state is visually distinct (not color-only) and exposes the error via `aria-describedby`
- [ ] Typecheck passes
- [ ] Verify in browser using dev-browser skill

#### US-107: Date picker and time-range picker
**Acceptance Criteria:**
- [ ] Date picker: inline and popover modes; selected day gets `sky-600` fill, today gets a `sky-300` ring, disabled dates are muted and unclickable
- [ ] Time-range picker: two `font-mono` steppers snapping to a configurable granularity (default 30 minutes, per spec §9.2), with a live "duration: Xh Ym" readout
- [ ] Time-range picker shows an inline soft warning when the selected range overlaps an existing booking (visual only in this story — wiring to the real conflict-check utility happens in US-131)
- [ ] Typecheck passes
- [ ] Verify in browser using dev-browser skill

#### US-108: Modal and Sheet
**Acceptance Criteria:**
- [ ] Shared content container renders as a centered modal (`max-w-lg`, `shadow-lg`, `rounded-lg`) on desktop and a bottom sheet with a drag handle on mobile, from one component API
- [ ] Backdrop uses `rgba(16,32,64,.32)`; closes on backdrop click and Escape
- [ ] Sheet respects `prefers-reduced-motion` (no slide-in animation; fades instead)
- [ ] Typecheck passes
- [ ] Verify in browser using dev-browser skill

#### US-109: Toast system
**Acceptance Criteria:**
- [ ] Toast renders success/info/warning/error variants with semantic left accent + icon
- [ ] Positioned top-right on desktop, top on mobile; auto-dismisses after 4s; supports an optional action link
- [ ] A toast provider/hook is available for any client component to trigger a toast
- [ ] Typecheck passes
- [ ] Verify in browser using dev-browser skill

#### US-110: Admin table
**Acceptance Criteria:**
- [ ] Sticky header, sortable columns, row hover (`bg-sky-50`), status rendered via the Status badge, row actions in a trailing kebab menu
- [ ] Supports pagination
- [ ] Has dedicated empty and loading (skeleton row) states
- [ ] Typecheck passes
- [ ] Verify in browser using dev-browser skill

#### US-111: Avatar and role badge
**Acceptance Criteria:**
- [ ] Avatar renders initials fallback when no image is set
- [ ] Role badge renders member/servant/scout/guide/admin with distinct, legible styling
- [ ] Typecheck passes
- [ ] Verify in browser using dev-browser skill

#### US-112: Empty, loading, error states + Skeleton, Tooltip, Dropdown menu
**Acceptance Criteria:**
- [ ] Empty state: centered display-font headline + one primary action slot (never a dead end)
- [ ] Loading state: skeleton shimmer in the real layout shape, not a spinner-only screen
- [ ] Error state: inline card with explanation + Retry action
- [ ] Skeleton, Tooltip, and Dropdown menu primitives available for reuse
- [ ] Typecheck passes
- [ ] Verify in browser using dev-browser skill

#### US-113: Room card
**Acceptance Criteria:**
- [ ] Card shows color header, room name + code (`font-mono`), capacity, up to 4 amenity icons + "+n" overflow, location line, and a live availability dot (green free / amber busy now)
- [ ] Whole card is the tap target
- [ ] Grid and list density variants
- [ ] Typecheck passes
- [ ] Verify in browser using dev-browser skill

#### US-114: Booking card
**Acceptance Criteria:**
- [ ] Left color stripe reflects status; shows room, date, `font-mono` time range, service-type chip, and status badge
- [ ] Trailing overflow menu offers Modify/Cancel where applicable (guarded by confirm)
- [ ] Pending variant shows an "Awaiting approval" line
- [ ] Typecheck passes
- [ ] Verify in browser using dev-browser skill

### Epic C — App shell and navigation

#### US-115: Desktop sidebar shell
**Acceptance Criteria:**
- [ ] Fixed left sidebar with primary nav (Schedule, Book, My Bookings, Rooms) and an Admin group (Dashboard, Requests, Manage Rooms, Reports) that renders only when `profile.role === 'admin'`
- [ ] Collapsible between icon-only and icon+label
- [ ] Active item gets `sky-100` fill, `sky-600` text, and a 3px left indicator
- [ ] Typecheck passes
- [ ] Verify in browser using dev-browser skill

#### US-116: Mobile bottom tab bar + More sheet
**Acceptance Criteria:**
- [ ] Bottom tab bar with 4 primary items (Schedule, Book, My Bookings, More) plus a compact top app bar
- [ ] "More" opens a sheet with secondary destinations (Rooms, and the Admin group when applicable)
- [ ] Active tab gets `sky-600` icon+label; others `ink-500`
- [ ] Typecheck passes
- [ ] Verify in browser using dev-browser skill

#### US-117: Top bar (date context, search, notifications, profile)
**Acceptance Criteria:**
- [ ] Top bar holds: date context slot (populated on calendar pages), a global room-availability search entry point, a notifications bell with an unread-count dot, and a profile menu (avatar, role badge)
- [ ] Notifications bell and profile menu are functional stubs in this story (real notification data wired in US-137); search entry point opens the panel built in US-130
- [ ] Typecheck passes
- [ ] Verify in browser using dev-browser skill

#### US-118: Wire the shell into every route
**Acceptance Criteria:**
- [ ] Root layout renders AppShell (sidebar+topbar desktop, bottom tabs+topbar mobile) wrapping all authenticated routes; `/login` remains shell-free
- [ ] Every existing route (`/`, `/schedule`, `/availability`, `/rooms`, `/rooms/[id]`, `/bookings`, `/bookings/[id]`, `/bookings/[id]/edit`, `/bookings/new`, `/admin`) renders inside the shell with no layout breakage
- [ ] No horizontal scroll on any route at 375px width
- [ ] Typecheck passes
- [ ] Verify in browser using dev-browser skill

### Epic D — Resource calendar (Schedule redesign)

Mobile-first ordering per this PRD's locked decision: the single-room mobile view ships and is fully usable before the multi-room desktop grid is built.

#### US-119: Single-room mobile calendar (baseline)
**Acceptance Criteria:**
- [ ] Mobile `/schedule` shows a room selector (dropdown/search), an hour axis (default range 08:00–23:00) down the side, and that room's bookings as full-width event blocks for the selected day
- [ ] Swiping left/right changes the day; changing the room via the selector updates the same view
- [ ] Off-hours band (`sand-100`) renders before opening / after closing
- [ ] Zero horizontal scroll at 375px
- [ ] Typecheck passes
- [ ] Verify in browser using dev-browser skill

#### US-120: Desktop multi-room resource grid
**Acceptance Criteria:**
- [ ] At ≥1024px, `/schedule` shows rooms as columns with a sticky time gutter (`font-mono` hour labels) and a sticky room-header row that scrolls horizontally in sync with the body
- [ ] Room columns are min 132px wide; an edge-fade or scrollbar hint signals additional rooms off-screen
- [ ] Off-hours band and hour gridlines match the mobile view's time semantics
- [ ] Typecheck passes
- [ ] Verify in browser using dev-browser skill

#### US-121: Day strip navigation
**Acceptance Criteria:**
- [ ] Horizontally scrollable day-pill strip under the header; tapping a day jumps the grid to it; selected day gets `sky-600` fill
- [ ] `◀ ▶` arrows step one day; a "Today" button snaps back to the current date
- [ ] Grid transition is 300ms slide, reduced to a fade under `prefers-reduced-motion`
- [ ] Typecheck passes
- [ ] Verify in browser using dev-browser skill

#### US-122: Now-line indicator
**Acceptance Criteria:**
- [ ] A `sky-300` horizontal line with a leading dot renders at the current time, only when viewing today
- [ ] Updates without a full page reload while the tab stays open (e.g. minute-interval client-side re-render)
- [ ] Typecheck passes
- [ ] Verify in browser using dev-browser skill

#### US-123: Event block component
**Acceptance Criteria:**
- [ ] Renders time range (`font-mono`), service-type category color (left accent + tint fill), requester, and a status dot; `top`/`height` reflect start time and duration
- [ ] Pending events render at 70% opacity with a dashed border; cancelled events render struck/greyed
- [ ] Blocks under ~40px height collapse to a single time-only line; hover shows a popover with full detail; click opens the detail sheet
- [ ] Overlapping bookings in the same room/day split the column width
- [ ] Real button semantics with `aria-label` describing room, time, and status
- [ ] Typecheck passes
- [ ] Verify in browser using dev-browser skill

#### US-124: Room filter bar and grouping
**Acceptance Criteria:**
- [ ] Multi-select filter chips narrow visible room columns/rows by building, floor, room type, capacity, and amenities, with a selection count on the chip
- [ ] Optional sticky group headers span columns (e.g. "Building A") in the desktop grid
- [ ] Filters apply identically to the mobile room selector (narrows the searchable list) and desktop grid (narrows visible columns)
- [ ] Typecheck passes
- [ ] Verify in browser using dev-browser skill

#### US-125: Pinned/favorite rooms
**Description:** As a member, I want to pin rooms I use often so they're quick to find in the room selector and float to the left of the desktop grid.
**Acceptance Criteria:**
- [ ] New `favorite_rooms` table (`user_id` FK, `room_id` FK, `created_at`, unique on the pair) with RLS scoping reads/writes to the owning user
- [ ] Pin/unpin toggle available from the room selector (mobile) and room column header (desktop)
- [ ] Pinned rooms sort first in both the mobile room list and the desktop column order
- [ ] Typecheck passes
- [ ] Verify in browser using dev-browser skill

#### US-126: Room quick-jump and hide-free-rooms toggle
**Acceptance Criteria:**
- [ ] A searchable room dropdown scrolls the desktop grid to a selected room's column
- [ ] A "hide free rooms" toggle dims or hides columns with no bookings on the selected day
- [ ] Typecheck passes
- [ ] Verify in browser using dev-browser skill

#### US-127: Drag-to-create booking
**Acceptance Criteria:**
- [ ] Dragging across empty grid cells (desktop) or tap-and-drag (touch) pre-fills room, date, and time range and opens the booking sheet from US-131
- [ ] Dropping onto an occupied slot shows an inline conflict warning instead of opening the booking sheet
- [ ] Typecheck passes
- [ ] Verify in browser using dev-browser skill

### Epic E — Rooms pages

#### US-128: Room directory redesign
**Acceptance Criteria:**
- [ ] `/rooms` renders the Room card (US-113) in a responsive grid with a live availability dot per card
- [ ] Preserves existing filtering/search behavior from the current `/rooms` page
- [ ] Typecheck passes
- [ ] Verify in browser using dev-browser skill

#### US-129: Room detail redesign
**Acceptance Criteria:**
- [ ] `/rooms/[id]` shows a color header, capacity, an amenity grid (icon + label), location, rules list, and a mini 7-day availability strip
- [ ] Primary CTA "Book this room" opens the booking sheet (US-131) pre-filled with the room
- [ ] Empty fields still render "Not specified" (preserving existing US-010 behavior)
- [ ] Typecheck passes
- [ ] Verify in browser using dev-browser skill

#### US-130: Global availability search
**Acceptance Criteria:**
- [ ] Top-bar search entry point (US-117) opens a filter panel: date, time range, optional capacity, optional amenities
- [ ] Results render as a Room card grid with free/busy badges, using the existing shared conflict-check utility (no duplicate overlap logic)
- [ ] Each result links into the schedule pre-filtered to that room and date
- [ ] Typecheck passes
- [ ] Verify in browser using dev-browser skill

### Epic F — Booking flow

#### US-131: Booking sheet/modal redesign
**Acceptance Criteria:**
- [ ] Replaces the current `/bookings/new` form UI with the Modal/Sheet (US-108) containing: room select (prefilled when opened from calendar/room detail), date picker, time-range picker with live conflict check wired to the existing conflict-check utility, service-type select (existing fixed dropdown constant, unchanged), notes
- [ ] Submitting shows an optimistic "Pending" booking card and a success toast
- [ ] All existing server-side validation (conflict re-check, 5-pending cap) continues to run unchanged
- [ ] Typecheck passes
- [ ] Verify in browser using dev-browser skill

#### US-132: My Bookings redesign
**Acceptance Criteria:**
- [ ] `/bookings` renders the existing Upcoming/Pending/Past/Cancelled buckets using the Segmented control (US-105) and Booking card (US-114)
- [ ] Each tab has its own empty state per US-112
- [ ] Bucketing logic (`bucketForBooking`) is unchanged
- [ ] Typecheck passes
- [ ] Verify in browser using dev-browser skill

#### US-133: Modify/reschedule redesign
**Acceptance Criteria:**
- [ ] `/bookings/[id]/edit` opens the same Booking sheet (US-131) pre-populated with the existing booking
- [ ] If date/time/room changes, an inline "this will need re-approval" note shows before submit
- [ ] Existing revert-to-pending-on-conflict-changing-edit logic is unchanged
- [ ] Typecheck passes
- [ ] Verify in browser using dev-browser skill

#### US-134: Cancel confirmation redesign
**Acceptance Criteria:**
- [ ] Cancel action opens the redesigned confirm dialog (built on Modal/Sheet US-108) instead of the current alert-dialog styling
- [ ] Confirming cancellation fires the cancellation-notice notification (US-138) and the existing cancel server action, unchanged
- [ ] Typecheck passes
- [ ] Verify in browser using dev-browser skill

### Epic G — Notifications (new subsystem)

#### US-135: Notifications schema
**Description:** As a developer, I need a notifications table so reminders, approval/rejection, and cancellation events can be persisted per user.
**Acceptance Criteria:**
- [ ] Migration creates `notifications` (`id`, `user_id` FK, `type` — 'reminder' | 'approved' | 'rejected' | 'cancelled' | 'admin_new_request', `booking_id` FK nullable, `message`, `read_at` nullable, `created_at`)
- [ ] RLS: a user may SELECT/UPDATE (mark-read) only their own notifications; INSERT is server-side only (no client insert policy)
- [ ] Typecheck passes

#### US-136: Server-side notification triggers
**Acceptance Criteria:**
- [ ] Approving a booking inserts an 'approved' notification for the requester
- [ ] Rejecting a booking inserts a 'rejected' notification (includes the reason) for the requester
- [ ] Cancelling a booking (by member or admin) inserts a 'cancelled' notification for the requester
- [ ] A new pending request inserts an 'admin_new_request' notification for all admins
- [ ] These inserts happen inside the existing approve/reject/cancel server actions (no duplicate logic)
- [ ] Typecheck passes
- [ ] Tests pass

#### US-137: Notifications bell UI
**Acceptance Criteria:**
- [ ] Bell in the top bar (US-117) shows an unread-count dot sourced from real `notifications` rows
- [ ] Clicking opens a panel/list of recent notifications; each links to the related booking
- [ ] Opening the panel (or an explicit "mark all read" action) updates `read_at` server-side
- [ ] Typecheck passes
- [ ] Verify in browser using dev-browser skill

#### US-138: Reminder notifications
**Description:** As a member, I want a reminder before an approved booking starts so I don't forget it.
**Acceptance Criteria:**
- [ ] A scheduled job or on-demand server check inserts a 'reminder' notification for approved bookings starting within a defined lead window (e.g. next 24h), once per booking
- [ ] Reminder notification item renders with a clock icon, distinct from approval/cancellation types
- [ ] Typecheck passes
- [ ] Tests pass

### Epic H — Admin

#### US-139: Admin dashboard redesign
**Acceptance Criteria:**
- [ ] `/admin` (dashboard) shows a KPI stat row (today's bookings, pending count, utilization %) plus a recent-activity list
- [ ] Existing pending-approval-queue functionality moves to `/admin/requests` (US-140); `/admin` becomes the overview
- [ ] Typecheck passes
- [ ] Verify in browser using dev-browser skill

#### US-140: Admin requests queue redesign
**Acceptance Criteria:**
- [ ] `/admin/requests` renders pending bookings in the Admin table (US-110) with inline Approve/Reject actions and a required reason field on reject
- [ ] Supports bulk-select and bulk approve/reject on selected rows, re-running the conflict check per row and reporting which rows failed
- [ ] Each row deep-links to the calendar slot (US-119/120)
- [ ] Existing race-condition re-check on approve is unchanged
- [ ] Typecheck passes
- [ ] Verify in browser using dev-browser skill

#### US-141: Manage rooms — schema additions
**Description:** As a developer, I need room fields the current schema lacks (short code, category color) before building room CRUD UI.
**Acceptance Criteria:**
- [ ] Migration adds `code` (short unique text, e.g. "A101") and `category_color` (text, one of the spec's calendar category palette keys) to `rooms`, nullable/backfilled for existing rows
- [ ] Typecheck passes

#### US-142: Manage rooms CRUD
**Acceptance Criteria:**
- [ ] `/admin/rooms` lists rooms in the Admin table with add/edit via a Sheet (name, code, capacity, amenities multi-select, location, rules, category color)
- [ ] Create and edit are admin-only server actions enforced by RLS (mirroring the existing admin-only booking-status-transition pattern)
- [ ] Delete is guarded by a confirm dialog and blocked (with a clear error) if the room has any pending or future approved bookings
- [ ] Typecheck passes
- [ ] Verify in browser using dev-browser skill

#### US-143: Usage reports
**Acceptance Criteria:**
- [ ] `/admin/reports` offers a date-range picker and computes, from existing `bookings`/`rooms` data (no new tables): a room-utilization bar chart, a most-active-members list, and a peak-hours heatmap
- [ ] Figures use `font-mono` tabular numerals
- [ ] A CSV export button downloads the current date-range's underlying booking data
- [ ] Typecheck passes
- [ ] Verify in browser using dev-browser skill

### Epic I — States, accessibility, cleanup

#### US-144: Loading/empty/error states everywhere
**Acceptance Criteria:**
- [ ] Every list, table, and the calendar itself uses the Empty/Loading/Error components (US-112) instead of ad hoc handling
- [ ] Typecheck passes
- [ ] Verify in browser using dev-browser skill

#### US-145: Keyboard and screen-reader accessibility pass
**Acceptance Criteria:**
- [ ] Visible focus ring (`ring-2 ring-sky-300`) on every interactive element across the redesigned app
- [ ] Calendar grid is navigable by arrow keys between event blocks/cells
- [ ] All body/action color pairs meet WCAG AA contrast (spot-checked against the token table)
- [ ] Typecheck passes
- [ ] Verify in browser using dev-browser skill

#### US-146: Reduced-motion pass
**Acceptance Criteria:**
- [ ] All slide/transition animations (day-strip transition, sheet open/close) are disabled and replaced with fades when `prefers-reduced-motion: reduce` is set
- [ ] Typecheck passes
- [ ] Verify in browser using dev-browser skill

#### US-147: Legacy component cleanup
**Acceptance Criteria:**
- [ ] Any `components/ui/` (shadcn) usage fully superseded by `components/kit/` equivalents is removed
- [ ] No dead imports remain; `npm run build` succeeds
- [ ] Typecheck passes

## 4. Functional Requirements

**Foundation**
- FR-1: The app must use the token set defined in spec §1.1 (colors, radius, shadow) as the single source of truth for styling — no ad hoc hex values in new components.
- FR-2: The app must load Bricolage Grotesque (display), Geist (UI/body), and Geist Mono (time/data figures, `tabular-nums`) via `next/font`.

**Shell & navigation**
- FR-3: Every authenticated route must render inside a persistent AppShell (sidebar+top bar on desktop ≥1024px, bottom tabs+top bar on mobile <768px, icon-collapsed sidebar on tablet 768–1023px).
- FR-4: The Admin nav group must render only when the signed-in user's `profiles.role === 'admin'`, checked server-side (mirrors existing `/admin` route-guard pattern), not just hidden client-side.
- FR-5: The top bar must expose date context (calendar pages), global availability search, a notifications bell with unread indicator, and a profile menu.

**Calendar**
- FR-6: The mobile single-room calendar view must be fully functional (room switch, day navigation, event display, drag-to-create) independent of the desktop grid — it is not a degraded fallback.
- FR-7: The desktop resource grid must support 50+ room columns via horizontal scroll with a sticky time gutter and sticky room-header row.
- FR-8: Calendar operating hours default to 08:00–23:00 and time-range snapping defaults to 30 minutes (spec §9 assumptions); both must be defined as a single app-level constant, not hardcoded per component.
- FR-9: Event blocks must reuse the existing shared conflict-check utility for all conflict detection (drag-create, warnings) — no new overlap-detection logic is introduced.
- FR-10: Booking status must never be conveyed by color alone; a label or status dot always accompanies the color.

**Rooms & booking flow**
- FR-11: Room and booking mutations continue to run through existing server actions/RLS policies; this redesign does not change who can create/edit/cancel/approve what.
- FR-12: The booking sheet must prefill room/date/time when opened from the calendar (click or drag), room detail page, or availability search results.

**Notifications**
- FR-13: Notification rows are only ever inserted server-side (approve/reject/cancel actions, admin-new-request, reminder job); there is no client-side insert path.
- FR-14: A user may only read and mark-read their own notifications (RLS-enforced).

**Room management**
- FR-15: Room create/edit/delete actions are admin-only, enforced server-side and via RLS — not just hidden in the UI for non-admins.
- FR-16: Deleting a room is blocked if it has any pending or future-approved bookings, with a clear error explaining why.

**Reports**
- FR-17: Report figures (utilization, activity, peak hours) are computed from existing `bookings`/`rooms` data at request time — no new persistent aggregate tables are introduced in v1.

**Accessibility & responsiveness**
- FR-18: No route may produce horizontal scroll at 375px viewport width.
- FR-19: Every interactive element has a visible focus state; the calendar grid supports arrow-key navigation between cells/events.
- FR-20: All slide-based transitions must fall back to fades under `prefers-reduced-motion: reduce`.

## 5. Non-Goals (Out of Scope)

- Arabic RTL support — the token/layout system should stay RTL-adaptable, but no RTL implementation ships in this PRD.
- A full-month, all-rooms calendar view — intentionally omitted per spec §9.3 (unusable at 50+ rooms); Day is primary, personal Week view lives only in My Bookings.
- QR/NFC deep-link handling — the profile menu shows a QR entry-point slot, but the actual QR generation/scan target is not defined or built in this PRD (spec §9.8 open question, deferred).
- Push/email/SMS delivery for notifications — v1 notifications are in-app only (bell + panel), no external delivery channel.
- Changing the underlying booking/approval business logic, the 5-pending cap, or RLS policies for existing tables — this PRD is additive (new tables for notifications/favorites, new columns on rooms) and visual, not a rules change.
- Dark mode — spec is explicitly light-mode only.
- A "compare mode" showing 2–3 pinned rooms side-by-side on mobile (spec §4.6 mentions it as a possible future addition) — not built in this PRD.

## 6. Design Considerations

- Full component anatomy, states, and page-by-page layout direction: `prd_plans/UI-Redesign-Spec.md` §§3–5. Treat that document as the visual/behavioral reference for every story above; this PRD does not repeat its detail.
- New kit components live in `components/kit/`; calendar-specific components in `components/calendar/`; shell components in `components/shell/` — matching the spec's suggested structure (§8), adapted from its generic `src/` layout to this repo's `app/` + `components/` root layout.
- Reuse the existing `lib/bookings/conflict-check.ts`, `lib/dates.ts`, and `lib/bookings/status.ts` utilities everywhere the spec calls for conflict detection, time formatting, or bucketing — do not reimplement.

## 7. Technical Considerations

- **Component kit coexistence:** `components/ui/` (shadcn, Radix-based) stays in place until every page that uses it has been migrated to `components/kit/` (tracked by US-147, the final cleanup story). Do not delete a shadcn component until nothing imports it.
- **New tables required:** `favorite_rooms` (US-125), `notifications` (US-135), plus `code`/`category_color` columns on `rooms` (US-141). All follow the existing migration convention in `supabase/migrations/` and must ship RLS policies in the same migration or an immediately-following one, per this repo's established pattern (see `20260719000100_add_rls_policies.sql`).
- **Reminder job (US-138):** needs a scheduled trigger. If Supabase cron/pg_cron is unavailable in the target environment, implement as an on-demand check run on relevant page loads (e.g., dashboard/notifications fetch) rather than introducing new infrastructure — decide at implementation time and document the choice in that story's notes.
- **No new state library:** filter/selection state (room filters, pinned rooms, day navigation) should use URL search params and component state consistent with the existing codebase's approach — no new global state library.
- Follow existing project conventions: `npx tsc --noEmit` and `npm run lint` must pass on every story; stories touching testable logic (conflict-check reuse, notification triggers, reminder windowing) get `npm run test` coverage per the `vitest` setup already in place.

## 8. Success Metrics

- Every route reachable within 2 taps/clicks from the shell on both mobile and desktop (manual nav audit).
- Zero horizontal scroll across all redesigned routes at 375px (verified per-story via dev-browser skill).
- All existing automated tests (`npm run test`) and the full v1 Playwright verification flows continue to pass unmodified after the redesign (regression check, not a new metric to build toward).
- Admin can complete room create, approve/reject, and report export without leaving the new admin shell.

## 9. Open Questions

Carried over from the source spec (`prd_plans/UI-Redesign-Spec.md` §9) where not already resolved by this PRD's clarifying questions:

1. Operating hours default to 08:00–23:00 (FR-8) — confirm this matches actual usage patterns, or provide real open/close hours.
2. Time granularity defaults to 30-minute snapping (FR-8) — confirm, or specify 15-minute.
3. QR/NFC quick-access target is unresolved (see Non-Goals) — needs a decision before that entry point can do anything beyond opening the profile menu.
4. Reminder lead window (US-138) is assumed at 24 hours before a booking starts — confirm or adjust.
5. Whether bulk approve/reject (US-140) needs an audit trail beyond the existing `updated_at`/`reject_reason` fields is unresolved — flag if compliance/audit needs surface later.
