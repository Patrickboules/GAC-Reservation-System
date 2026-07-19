# GAC Reservations System — PRD v1

**Scope:** Discovery & Browsing + Booking Flow (use cases 1–8)
**Status:** Draft for agentic development (Ralph Wiggum loop)
**Owner:** Patrick

---

## 1. Overview

GAC Reservations is a web-based room/hall booking system for Gawargious & Ava Antonious. Members (servants, scoutsmen, guides) browse room availability and request bookings; admins review and approve/reject requests. This v1 covers discovery, availability checking, and the full booking request lifecycle. Notifications, admin management tools, and reporting are out of scope for v1 and will follow in v2.

## 2. Goals

- Let members see what rooms/halls exist and when they're free, without needing to ask an admin.
- Let members submit a booking request in under a minute.
- Give admins a simple queue to approve/reject requests with no double-bookings.
- Keep the system usable on mobile browsers (most members will book from phones).

## 3. Non-Goals (deferred to v2)

- Email/SMS notifications (confirmation, reminders, cancellation notices)
- Admin room management (add/edit/remove rooms, capacity, amenities)
- Admin dashboard / all-bookings view
- Usage reports and analytics
- QR-code/NFC check-in

## 4. Actors

| Actor                            | Description       | Permissions                                                                             |
| -------------------------------- | ----------------- | --------------------------------------------------------------------------------------- |
| Member (Servant/Scoutsman/Guide) | Regular user      | Browse rooms, check availability, request/cancel/modify own bookings, view own bookings |
| Admin                            | Approves requests | Approve/reject booking requests (approval action only in v1 — full admin console is v2) |

## 5. Tech Stack

- **Frontend/Framework:** Next.js 15 (App Router), TypeScript
- **Database & Backend:** Supabase (Postgres, Auth, Realtime)
- **ORM:** Prisma or Drizzle
- **Styling/UI:** Tailwind CSS + shadcn/ui
- **Calendar UI:** react-big-calendar or FullCalendar
- **Hosting:** Vercel (app) + Supabase Cloud (DB/auth)

## 6. Features

### 6.1 View Rooms Schedule

**User story:** As a member, I want to see a calendar/list of room schedules so I can find an open slot.

- Calendar view (default) and list view, toggleable.
- Filter by date and by room.
- Shows booked slots (with status: pending/approved) and free slots distinctly.
- Read-only — no booking details of other members beyond room/time/status.

**Acceptance criteria:**

- Given a member on the schedule page, when they select a room filter, then only that room's bookings render.
- Given a date range, when selected, then the calendar/list updates to that range.
- Pending vs. approved bookings are visually distinguished.

### 6.2 View Room Details

**User story:** As a member, I want to see a room's capacity, amenities, location, and rules before requesting it.

- Room detail page/modal: name, capacity, amenities list, location, usage rules/notes.
- Linked from schedule view and room list.

**Acceptance criteria:**

- Given a room card/row, when clicked, then details render with all fields populated (or "not specified" if empty).

### 6.3 Check Room Availability

**User story:** As a member, I want to search by date/time range to find which rooms are free.

- Search form: date, start time, end time (optionally room type/capacity filter).
- Returns list of available rooms for that slot.

**Acceptance criteria:**

- Given a date/time range with no conflicting approved or pending bookings, the room appears as available.
- Given an overlapping approved booking, the room is excluded from results.
- Pending (not yet approved) bookings should also block the same slot from being requested again (to prevent double-submission) — flagged as "requested, pending approval" rather than fully unavailable.

### 6.4 Request Room/Hall

**User story:** As a member, I want to request a room for a specific date/time and service so it gets reviewed by an admin.

- Form: room, date, start/end time, service/purpose, optional notes.
- Client-side + server-side conflict check against existing approved/pending bookings before submission.
- On submit, booking created with status `pending`.

**Acceptance criteria:**

- Given a conflicting slot, submission is blocked with a clear error before hitting the DB.
- Given a valid request, a booking row is created with status `pending` and linked to the requesting user.
- Given a successful request, the user is redirected to "View My Bookings" or shown a confirmation state.

### 6.5 Request Approval

**User story:** As an admin, I want to approve or reject pending requests so schedules stay conflict-free.

- Simple queue/list of pending requests (admin-only route).
- Approve or reject action, with optional comment/reason on reject.
- Approving a request checks for conflicts one more time (in case another request was approved in the meantime) and blocks approval if a conflict now exists.

**Acceptance criteria:**

- Given a pending request, admin can approve → status becomes `approved`.
- Given a pending request, admin can reject with optional reason → status becomes `rejected`.
- Given two pending requests for the same slot, approving one auto-flags or blocks the other from also being approved.

### 6.6 Cancel Booking Request

**User story:** As a member, I want to cancel my own booking (pending or approved) so the slot frees up.

- Cancel action available on "View My Bookings" for pending and approved bookings (before the event date).
- Cancelling sets status to `cancelled` and frees the slot immediately.

**Acceptance criteria:**

- Given a pending or future approved booking owned by the user, cancel sets status to `cancelled`.
- Given a past booking, cancel action is not available.
- A cancelled slot immediately shows as available in schedule/availability views.

### 6.7 Modify/Reschedule Booking

**User story:** As a member, I want to change the date/time of my request without creating a new one from scratch.

- Edit action on "View My Bookings" for pending or approved bookings (before event date).
- Changing date/time/room re-triggers `pending` status and re-runs conflict check, even if it was previously approved.

**Acceptance criteria:**

- Given an approved booking, editing date/time reverts status to `pending` and requires re-approval.
- Given a modification that conflicts with another approved booking, the change is blocked with an error.
- Edit history is not required in v1 (no audit trail needed yet).

### 6.8 View My Bookings

**User story:** As a member, I want to see my upcoming, past, and pending bookings in one place.

- Tabbed or filterable list: Upcoming / Pending / Past / Cancelled.
- Each row links to detail view with cancel/edit actions where applicable.

**Acceptance criteria:**

- Bookings are correctly bucketed by date and status.
- Only the logged-in user's own bookings are visible (enforced via Supabase RLS, not just UI filtering).

## 7. Data Model (initial)

**rooms**

- id, name, capacity, amenities (text[] or jsonb), location, rules (text), created_at

**bookings**

- id, room_id (FK), user_id (FK), date, start_time, end_time, service/purpose, notes, status (`pending` | `approved` | `rejected` | `cancelled`), reject_reason (nullable), created_at, updated_at

**users**

- Managed by Supabase Auth; extend with a `profiles` table for role (`member` | `admin`) and display name.

## 8. Security

- Supabase Row-Level Security: members can only read/write their own bookings; all members can read room schedules (read-only, no PII of other users beyond room/time/status); only admins can approve/reject.
- Auth required for all booking actions; schedule browsing may be public or auth-gated (to confirm — see Open Questions).

## 9. Open Questions

- Should schedule browsing (6.1–6.3) require login, or be viewable publicly within the org?
- What counts as a valid "service/purpose" — free text, or a fixed list?
- Any limit on how many pending requests one member can have open at once?

## 10. Milestones

1. Data model + Supabase setup + auth
2. Discovery & Browsing (6.1–6.3)
3. Booking Flow (6.4–6.8)
4. QA pass against acceptance criteria above
5. v2 kickoff: notifications, admin console, reporting
