# PRD: GAC Reservations System — v1 (Discovery & Booking Flow)

## 1. Introduction/Overview

GAC Reservations is a web-based room/hall booking system for Gawargious & Ava Antonious. Members (servants, scoutsmen, guides) browse room availability and submit booking requests; admins review and approve or reject those requests. Today, booking a room means asking an admin directly and manually checking for conflicts — slow, error-prone, and prone to double-bookings.

This v1 delivers the full self-service loop: discovery (see rooms and when they're free), availability checking, and the complete booking request lifecycle (request → approve/reject → cancel/modify → view). Notifications, admin management tooling, and reporting are explicitly out of scope and deferred to v2.

**The whole application requires authentication** — a logged-in session is needed even to browse schedules (per product decision).

## 2. Goals

- Let members see what rooms/halls exist and when they're free without asking an admin.
- Let a logged-in member submit a booking request in under a minute.
- Give admins a simple queue to approve/reject requests with zero double-bookings.
- Keep the system fully usable on mobile browsers (most members book from phones).
- Enforce data access at the database layer (Supabase RLS), not just in the UI.

## 3. User Stories

### US-001: Set up Supabase project, auth, and data model

**Description:** As a developer, I need the database schema, auth, and access policies in place so every other feature has a foundation to build on.

**Acceptance Criteria:**

- [ ] Supabase project created; environment variables wired into the Next.js app (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and a server-only service role key).
- [ ] SQL migration creates `rooms`, `bookings`, and `profiles` tables per the Data Model (Section 7).
- [ ] `bookings.status` is constrained to `pending | approved | rejected | cancelled` (Postgres enum or CHECK constraint).
- [ ] Supabase Auth enabled (email/password at minimum); a `profiles` row is created on signup with default role `member`.
- [ ] RLS enabled on all three tables with the policies described in Section 8.
- [ ] Seed script inserts at least 3 sample rooms and 1 admin profile for local testing.
- [ ] Typecheck/lint passes.

### US-002: Authentication and session gating

**Description:** As a member, I want to log in so I can access the app, and be blocked from all pages until I do.

**Acceptance Criteria:**

- [ ] Login and signup pages exist and authenticate against Supabase Auth.
- [ ] All app routes (schedule, room details, availability, booking, my bookings, admin) redirect unauthenticated users to login.
- [ ] Logged-in user's session persists across refresh; a logout action ends the session.
- [ ] Admin-only routes additionally reject members (role checked from `profiles`, not just UI hiding).
- [ ] Typecheck/lint passes.
- [ ] Verify in browser using dev-browser skill.

### US-003: View rooms schedule (calendar + list)

**Description:** As a member, I want to see a calendar/list of room schedules so I can find an open slot.

**Acceptance Criteria:**

- [ ] Schedule page defaults to a calendar view with a toggle to a list view.
- [ ] Filter controls for date/date-range and for room.
- [ ] When a room filter is selected, only that room's bookings render.
- [ ] When a date range is selected, the calendar/list updates to that range.
- [ ] Booked slots show status; `pending` and `approved` bookings are visually distinguished (e.g. different color/label); free time reads as available.
- [ ] Read-only: no member's personal booking details are shown beyond room, time, and status.
- [ ] Usable on a mobile viewport (no horizontal scroll, tappable controls).
- [ ] Typecheck/lint passes.
- [ ] Verify in browser using dev-browser skill.

### US-004: View room details

**Description:** As a member, I want to see a room's capacity, amenities, location, and rules before requesting it.

**Acceptance Criteria:**

- [ ] Clicking a room card/row opens a detail page or modal.
- [ ] Detail shows name, capacity, amenities, location, and usage rules/notes.
- [ ] Any empty field renders "Not specified" rather than blank.
- [ ] Reachable from both the schedule view and any room list.
- [ ] Typecheck/lint passes.
- [ ] Verify in browser using dev-browser skill.

### US-005: Check room availability

**Description:** As a member, I want to search by date/time range to find which rooms are free.

**Acceptance Criteria:**

- [ ] Search form with date, start time, end time, and optional capacity filter.
- [ ] Results list rooms available for the requested slot.
- [ ] A room with an overlapping `approved` booking is excluded from results.
- [ ] A room with an overlapping `pending` booking is shown as "Requested — pending approval" (not offered as freely bookable) to prevent duplicate submissions.
- [ ] Empty-state message when no rooms are available for the slot.
- [ ] Typecheck/lint passes.
- [ ] Verify in browser using dev-browser skill.

### US-006: Request a room/hall

**Description:** As a member, I want to request a room for a specific date/time and service so it gets reviewed by an admin.

**Acceptance Criteria:**

- [ ] Form fields: room, date, start time, end time, service/purpose (fixed dropdown — see FR-9), optional notes.
- [ ] Client-side conflict check warns before submission if the slot overlaps an existing `approved` or `pending` booking.
- [ ] Server-side conflict check re-validates before insert; a conflicting request is rejected with a clear error and no row is written.
- [ ] Server-side check rejects the request if the member is already at the pending-request cap (FR-11).
- [ ] A valid request inserts a `bookings` row with status `pending` linked to the requesting user.
- [ ] On success, the user is redirected to "View My Bookings" (or shown a clear confirmation state).
- [ ] Typecheck/lint passes.
- [ ] Verify in browser using dev-browser skill.

### US-007: Admin approval queue

**Description:** As an admin, I want to approve or reject pending requests so schedules stay conflict-free.

**Acceptance Criteria:**

- [ ] Admin-only route lists all `pending` requests (room, requester, date/time, service).
- [ ] Approve action sets status to `approved`.
- [ ] Reject action sets status to `rejected` and stores an optional reason.
- [ ] On approve, a fresh server-side conflict check runs; if another booking was approved for the same slot in the meantime, approval is blocked with a clear message.
- [ ] Given two pending requests for the same slot, approving one prevents the other from also being approved.
- [ ] Non-admins cannot reach this route or invoke its actions (enforced server-side + RLS).
- [ ] Typecheck/lint passes.
- [ ] Verify in browser using dev-browser skill.

### US-008: Cancel a booking

**Description:** As a member, I want to cancel my own booking (pending or approved) so the slot frees up.

**Acceptance Criteria:**

- [ ] Cancel action available on "View My Bookings" for `pending` and future `approved` bookings owned by the user.
- [ ] Cancelling sets status to `cancelled`.
- [ ] Cancel action is not available for past bookings.
- [ ] A cancelled slot immediately shows as available in schedule and availability views.
- [ ] A user cannot cancel another user's booking (enforced via RLS).
- [ ] Typecheck/lint passes.
- [ ] Verify in browser using dev-browser skill.

### US-009: Modify/reschedule a booking

**Description:** As a member, I want to change the date/time/room of my request without creating a new one from scratch.

**Acceptance Criteria:**

- [ ] Edit action on "View My Bookings" for `pending` and future `approved` bookings owned by the user.
- [ ] Editing date, time, or room reverts status to `pending` and re-runs the conflict check.
- [ ] A modification that conflicts with another `approved` or `pending` booking is blocked with a clear error.
- [ ] A previously `approved` booking that is edited requires re-approval by an admin.
- [ ] No edit/audit history is stored in v1.
- [ ] Typecheck/lint passes.
- [ ] Verify in browser using dev-browser skill.

### US-010: View my bookings

**Description:** As a member, I want to see my upcoming, past, pending, and cancelled bookings in one place.

**Acceptance Criteria:**

- [ ] Tabbed or filterable list with buckets: Upcoming / Pending / Past / Cancelled.
- [ ] Bookings are bucketed correctly by date and status.
- [ ] Each row links to a detail view exposing cancel/edit actions where applicable (per US-008/US-009 rules).
- [ ] Only the logged-in user's own bookings are returned (enforced via Supabase RLS, not just UI filtering).
- [ ] Typecheck/lint passes.
- [ ] Verify in browser using dev-browser skill.

## 4. Functional Requirements

- **FR-1:** All application routes require an authenticated session; unauthenticated users are redirected to login.
- **FR-2:** The system must provide a schedule view with a toggle between calendar (default) and list.
- **FR-3:** The schedule must be filterable by room and by date/date-range, and must visually distinguish `pending` from `approved` bookings.
- **FR-4:** The schedule view must expose only room, time, and status of other members' bookings — never their identity or personal notes.
- **FR-5:** The system must provide a room detail view showing name, capacity, amenities, location, and rules, rendering "Not specified" for empty fields.
- **FR-6:** The system must let a member search rooms available for a given date + start/end time, with an optional capacity filter.
- **FR-7:** Availability results must exclude rooms with an overlapping `approved` booking and flag rooms with an overlapping `pending` booking as "requested, pending approval."
- **FR-8:** The booking request form must capture room, date, start time, end time, service/purpose, and optional notes.
- **FR-9:** Service/purpose must be a fixed dropdown list (not free text). Initial list, defined as an app-level constant (not admin-editable in v1): Liturgy, Sunday School, Meeting, Bible Study, Choir Practice, Scouts/Sports Activity, Retreat/Event, Maintenance. (Adjust to the org's actual services during US-006.)
- **FR-10:** Booking submission must run a conflict check both client-side (pre-submit warning) and server-side (authoritative block) against existing `approved` and `pending` bookings; a conflict must prevent the DB insert.
- **FR-11:** A member may hold at most **5** open (`pending`) requests at once; requests beyond the cap are rejected server-side with a clear message.
- **FR-12:** A valid request must create a `bookings` row with status `pending` linked to the requesting user, and redirect/confirm to "View My Bookings."
- **FR-13:** Admins must have a dedicated route listing all `pending` requests with approve/reject actions; reject must accept an optional reason stored on the booking.
- **FR-14:** Approving a request must re-run the conflict check at approval time and block approval if a conflict now exists.
- **FR-15:** Members must be able to cancel their own `pending` or future `approved` bookings; cancel sets status to `cancelled` and is unavailable for past bookings.
- **FR-16:** Members must be able to edit their own `pending` or future `approved` bookings; editing date/time/room reverts status to `pending`, re-runs the conflict check, and requires re-approval.
- **FR-17:** A cancelled booking's slot must immediately appear available in schedule and availability views.
- **FR-18:** "View My Bookings" must bucket bookings into Upcoming / Pending / Past / Cancelled and return only the logged-in user's own bookings.
- **FR-19:** All data access must be enforced by Supabase Row-Level Security: members read/write only their own bookings; all authenticated members read room schedules (room/time/status only); only admins may transition a booking to `approved` or `rejected`.

## 5. Non-Goals (Out of Scope for v1)

- Email/SMS notifications of any kind (confirmations, reminders, cancellations).
- Admin room management (add/edit/remove rooms, capacity, amenities) — rooms are seeded via SQL/seed script in v1.
- Admin dashboard or an all-bookings/global view beyond the pending-approval queue.
- Usage reports and analytics.
- QR-code / NFC check-in.
- Recurring/repeating bookings.
- Edit history / audit trail on bookings.
- Public (unauthenticated) schedule browsing.
- Admin-configurable service/purpose list (it is a code constant in v1).

## 6. Design Considerations

- **Mobile-first:** Most members book from phones — every screen (especially the calendar) must work on small viewports without horizontal scroll.
- **UI kit:** Tailwind CSS + shadcn/ui components for forms, dialogs, tabs, and badges.
- **Calendar:** react-big-calendar or FullCalendar for US-003; pick whichever renders acceptably on mobile.
- **Status treatment:** Use distinct badge colors for `pending` vs `approved` (e.g. amber = pending, green = approved) consistently across schedule, availability, and my-bookings views.
- **Confirmation states:** Cancel and edit-to-pending are consequential — show a confirmation step before committing.

## 7. Technical Considerations

- **Stack:** Next.js 15 (App Router) + TypeScript, Vercel hosting.
- **Data layer:** Supabase (Postgres, Auth, Realtime). **No separate ORM** — use `supabase-js` for queries plus raw SQL migration files for schema (per product decision). Keep migrations version-controlled in the repo.
- **Conflict logic:** Overlap = same `room_id` and `date`, with time ranges intersecting (`start_time < existing.end_time AND end_time > existing.start_time`), against bookings in status `approved` or `pending`. Centralize this check so US-005, US-006, US-007, and US-009 share one implementation. Server-side is authoritative; guard against race conditions at approval time (FR-14).
- **Security:** RLS is the enforcement boundary — UI filtering is convenience only. The service-role key must never reach the client; admin mutations run server-side.
- **Realtime (optional):** Supabase Realtime could keep the schedule/availability views live, but polling/refresh is acceptable for v1.

### Data Model

**rooms**
`id`, `name`, `capacity`, `amenities` (text[] or jsonb), `location`, `rules` (text), `created_at`

**bookings**
`id`, `room_id` (FK → rooms), `user_id` (FK → profiles/auth user), `date`, `start_time`, `end_time`, `service` (from fixed list), `notes` (nullable), `status` (`pending | approved | rejected | cancelled`), `reject_reason` (nullable), `created_at`, `updated_at`

**profiles** (extends Supabase Auth)
`id` (FK → auth.users), `display_name`, `role` (`member | admin`, default `member`), `created_at`

## 8. Row-Level Security Policies (summary)

- **rooms:** any authenticated user may `SELECT`; no member `INSERT/UPDATE/DELETE` in v1 (seeded only).
- **bookings — SELECT:** a member sees their own full rows; a limited view/policy exposes room/time/status of all bookings for the schedule (no other-user identity or notes).
- **bookings — INSERT:** a member may insert only rows where `user_id = auth.uid()` and `status = 'pending'`.
- **bookings — UPDATE (member):** a member may update only their own bookings and may only move them to `cancelled`, or edit fields that force status back to `pending`.
- **bookings — UPDATE (admin):** only users with `role = 'admin'` may set status to `approved` or `rejected`.
- **profiles:** a user may read/update their own profile; role changes are not self-service in v1.

## 9. Success Metrics

- A member can complete a booking request in **under 1 minute** from the schedule page.
- **Zero double-bookings**: no two `approved` bookings ever overlap for the same room.
- Schedule and my-bookings views render usably on a phone with no horizontal scroll.
- 100% of booking-data access is governed by RLS (verified by attempting cross-user reads/writes as a non-owner and confirming they fail).

## 10. Open Questions

- **Service list:** FR-9 provides a starter list — confirm the actual service names the org uses before finalizing US-006.
- **Pending cap value:** FR-11 sets the cap at 5 — confirm this is the right number.
- **Time granularity:** Are bookings free-form start/end times, or slotted (e.g. hourly / half-hourly)? Affects the calendar and conflict UX.
- **Approved-booking edits by owner:** Confirm a member editing an already-`approved` booking reverting it to `pending` (and losing the approval) is the desired behavior vs. requiring cancel-and-rebook.
- **Timezone handling:** Confirm all dates/times are stored and displayed in the org's single local timezone (no multi-timezone support needed).

## 11. Milestones

1. Data model + Supabase setup + auth + RLS (US-001, US-002)
2. Discovery & Browsing (US-003, US-004, US-005)
3. Booking Flow (US-006, US-007, US-008, US-009, US-010)
4. QA pass against all acceptance criteria above
5. v2 kickoff: notifications, admin console, reporting
