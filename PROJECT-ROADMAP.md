# Project Roadmap — Graphify (GAC Reservations)

This roadmap replaces the 2026-08-23 version entirely, from a fresh verification pass over the current codebase (2026-08-24) — nothing from the old version was assumed to still be true; every claim below was re-checked directly against the current files. Phases are ordered by dependency and risk, not just severity — each is shippable on its own.

## What's shipped since the last roadmap

- **Fix 1 — capacity field removed.** Confirmed still fully removed from code and schema.
- **Fix 2 — double-booking protection**, and it has evolved further: the exclusion constraint now blocks only `approved` bookings, not `pending` ones (see below).
- **Phase 2 — mutation feedback, Rejected tab, loading/error states.** All confirmed still working end to end.
- **UI/UX redesign across all six core screens** (Rooms directory, Schedule/timeline, Booking form, My Bookings, Admin requests queue, Admin rooms management), implemented screen-by-screen from approved mockups. Mostly landed cleanly, but the screen-by-screen approach left a few identifiable seams — see Phase 2 below.

## Recently resolved (verified against current code — not open work)

- **Double-booking protection, now a two-tier policy.** Two overlapping `pending` requests are allowed to coexist (the member just sees a warning) — only an `approved` booking blocks a write. This is consistently implemented across every layer: `lib/bookings/conflict-check.ts` (`BLOCKING_STATUSES = ["approved"]` vs. the display-only `CONFLICTING_STATUSES`), both `requestBooking`/`updateBooking` in `app/(app)/bookings/actions.ts`, `approveBookingById` in `app/(app)/admin/actions.ts`, the DB layer (`supabase/migrations/20260823000000_add_bookings_no_overlap_exclusion.sql` narrowed one day later by `20260824000000_bookings_no_overlap_approved_only.sql` to `where (status = 'approved')`), and `supabase/tests/bookings-no-overlap.integration.test.ts`, whose two test cases now assert exactly this policy. All pieces agree — no drift found.
- **Capacity feature** — zero functional references remain in `app/`, `components/`, or `lib/`. (One documentation drift found — see Phase 1.)
- **Admin quick-actions (approve/reject)** — still genuinely wired to `app/(app)/admin/actions.ts`, not dead UI.
- **Mutation feedback (Phase 2)** — all six mutation surfaces (admin approve/reject, room create/update, room delete, booking create/edit/cancel) have both success and failure feedback. Two different mechanisms are used by design, not by accident: admin/room mutations call `toast.success()`/`toast.error()` directly, while booking create/edit/cancel redirect first (a Server Action `redirect()` throws before the client sees a resolved promise) and `components/bookings/booking-toast-feedback.tsx` reads a one-shot `?submitted=1`/`?updated=1`/`?cancelled=1` query param to show the toast after landing. This asymmetry is intentional and documented in that file — not an inconsistency to "fix."
- **Dedicated Rejected tab** — `lib/bookings/status.ts`'s `BookingBucket` has its own `"rejected"` value (checked before the past/upcoming split, so a rejected booking never gets miscategorized by date), `components/bookings/my-bookings-tabs.tsx` renders it as its own tab with a dedicated empty state, and `components/kit/booking-card.tsx` shows the reject reason inline.
- **Loading/error states** — all five list-view route segments (`rooms`, `rooms/[id]`, `bookings`, `admin/requests`, `admin/rooms`) have both `loading.tsx` and `error.tsx`, and every `error.tsx` is a thin wrapper around the shared `components/kit/route-error.tsx` (not five separate reimplementations).

---

## Phase 1 — Fix CLAUDE.md's stale schema documentation ✅ Done (2026-08-25)

**Goal:** The project's own instructions file stops describing a schema that hasn't existed since early August.

**Effort:** XS

**Items:**

- **[Documentation accuracy]** ✅ `CLAUDE.md`'s "Planned data model" section listed `rooms: id, name, capacity, amenities (text[]/jsonb), location, rules, created_at` — three of those columns (`capacity`, `location`, `rules`) were dropped by `supabase/migrations/20260801000000_adopt_rooms_json_schema.sql` weeks ago and replaced by `building`/`floor`/`category_color`. Fixed: the line now reads `id, name, building, floor, room_type, amenities (text[]), category_color, created_at`, matching the live schema.
- **[Documentation accuracy]** The prior roadmap itself cited `app/(app)/admin/rooms/actions.ts:55,59` as containing "explanatory comments" about capacity — that citation is also stale; the current file has no mention of capacity anywhere. (This rewrite fixes that by not repeating it.)

**Not in this phase:** no code changes — `rooms`' actual schema is correct and fully wired; this is purely bringing the docs in line with reality.

---

## Phase 2 — Finish the six-screen redesign ✅ Mostly done (2026-08-25) — one item deferred

**Goal:** Close the specific, identifiable seams left by implementing the redesign one screen at a time — no new visual design, just applying the same patterns already established elsewhere in the redesign to the spots that were missed.

**Effort:** S/M

**Items:**

- **[Structure & architecture]** ✅ Both pages migrated to `kit/*`:
  - `app/(app)/bookings/page.tsx` — `Button` now imports from `@/components/kit/button` (variant `secondary` for the "New request"/"Home" header actions), header/error text now uses `font-display text-h2 text-ink-900`, `text-small text-ink-500`, `text-status-rejected-fg`.
  - `app/(app)/bookings/[id]/page.tsx` — migrated off `components/ui/button`/`components/ui/card` to `kit/button` and a plain `kit`-styled card shell (`rounded-lg border border-line bg-surface shadow-sm`, matching the pattern already used by `app/(app)/rooms/[id]/page.tsx` and `kit/booking-card.tsx`), and off `components/schedule/booking-status-badge.tsx` onto `kit/status-badge.tsx`.
- **[UI / visual design]** ✅ `components/schedule/booking-status-badge.tsx` retired and deleted — confirmed zero remaining consumers after the detail-page migration above. Resolves the "3 status-badge implementations" fragmentation from the old roadmap's Phase 5.
- **[UI / visual design]** ⏸ Deferred — `app/(app)/availability/page.tsx` orphaned-page decision. Asked the user; answer was to leave it as-is for now rather than delete or re-link. Still open — see Open Questions.
- **[UI / visual design]** ✅ RTL/Arabic-name wrapping fixed in all 5 identified spots, matching the existing `<span lang="ar" dir="rtl">` pattern:
  - `components/kit/room-card.tsx:158` — room-name span now wrapped.
  - `components/kit/booking-card.tsx:72-74` — My Bookings' room name now wrapped.
  - `components/schedule/event-block.tsx` — room name wrapped in both the hover popover and tap-modal; the English `service` fixed-dropdown label (`lib/bookings/services.ts`) is deliberately left unwrapped since it's never Arabic — only the `roomName` fallback/secondary text gets `lang="ar" dir="rtl"`, restructured as a nested span rather than wrapping the whole `service ?? roomName` expression.
  - `components/admin/room-utilization-chart.tsx:17-18` — admin reports chart room labels now wrapped.
  - `app/(app)/rooms/[id]/page.tsx:136` — room detail page's `<h1>` now wrapped.

**Verification:** `npx tsc --noEmit` clean, `npm run lint` clean (pre-existing unrelated errors only, in `.claude/skills/*` scripts), `npm run build` compiles all 17 routes successfully. Visual confirmation in a signed-in browser session wasn't possible in this environment (Google OAuth required) — worth a manual pass before considering this phase fully closed.

**Not in this phase:** no full mirrored RTL (that's Phase 6 — a much bigger, still-undecided scope); no wrapping of free-text fields like `service`/`notes`/`reject_reason` (user-typed, indeterminate language — leaving those unwrapped looks like a deliberate, reasonable boundary, not a gap); no visual redesign of anything — every fix here re-applies a pattern that already exists elsewhere in the app.

---

## Phase 3 — Test coverage ✅ 3a + 3b done (2026-08-26), 3c deferred

**Goal:** The logic most likely to silently break — pure booking/room helpers, and every Server Action that mutates state — has real test coverage.

**Effort:** M/L (see sub-phases — they have very different effort/risk profiles and don't need to happen together)

### 3a — Pure-function coverage (cheap, do first) ✅ Done

- **[Correctness]** ✅ `lib/bookings/status.test.ts` added — 13 tests covering `bucketForBooking` and `isBookingModifiable` across all status/date combinations.
- **[Correctness]** ✅ `lib/rooms/category-colors.test.ts` added — covers `isRoomCategoryColor` and that every lookup table (`ROOM_CATEGORY_COLOR_LABELS`/`_SWATCH_CLASSES`/`_HEADER_CLASSES`/`_ICON_CLASSES`) has an entry for all 8 palette colors.

### 3b — Server Action coverage (the real gap, harder) ✅ Done

- **[Correctness / risk-reduction]** ✅ All 6 Server Action files now have test coverage: `app/(app)/admin/actions.test.ts` (13 tests — `requireAdmin`, approve/reject including the 23P01 race-guard mapping and the approved-conflict re-check, bulk actions), `app/(app)/bookings/actions.test.ts` (21 tests — `requestBooking`/`updateBooking`/`cancelBooking`, including the pending-cap, the two-tier conflict policy, and the reschedule-reverts-to-pending transition), `app/(app)/admin/rooms/actions.test.ts` (11 tests, including the delete-blocking logic's past/future and pending/approved distinctions), `app/(app)/notifications/actions.test.ts` (3 tests), `app/login/actions.test.ts` (6 tests, including the open-redirect guard on `next`), `app/logout/actions.test.ts` (1 test). 55 new Server Action tests total.
- **Approach taken:** neither of the two options the previous pass of this roadmap considered — instead, `vi.mock` on `@/lib/supabase/server`, `@/lib/supabase/admin`, `next/navigation`, and `next/cache` swaps in a new shared in-memory fake client (`lib/testing/fake-supabase.ts`) via dependency injection at the module level, with no changes to production code and no local Supabase instance required. `FakeSupabaseClient`/`FakeTable` implement the subset of the supabase-js query builder these action files actually use (`select`/`update`/`insert`/`delete` chained with `eq`/`in`/`is`/`single`/`maybeSingle`, plus `{count: "exact", head: true}` and a `failNextWriteWith()` hook for exercising `23P01` exclusion-constraint races) — not a general Postgres simulator, but enough to test real branching logic against real in-memory state.
- Verified: `npx tsc --noEmit`, `npm run lint`, `npx vitest run` (164 passed, 2 skipped — the pre-existing self-skipping integration test), and `npm run build` all clean.

### 3c — New redesign component coverage ⏸ Deferred (needs a tooling decision — asked, user chose to skip for now)

- **[Structure & architecture]** 9 components/behaviors created or substantially rewritten during the redesign have zero test coverage: `components/rooms/rooms-directory.tsx`, `components/kit/booking-card.tsx`, `components/kit/route-error.tsx`, `components/kit/table.tsx`'s `renderMobileCard` prop, `components/kit/status-badge.tsx`, `components/kit/time-range-picker.tsx`, `components/schedule/now-line.tsx` + `lib/schedule/now-line.ts`, `components/bookings/booking-toast-feedback.tsx`, `components/bookings/my-bookings-tabs.tsx`.
- This repo currently has **no component-testing setup at all** (Vitest covers pure functions plus Server Actions plus one DB integration test — no React Testing Library, no component render tests anywhere). Asked the user whether to invest in React Testing Library for this; answer was to skip for now. Still open — see Open Questions.

**Not in this phase:** no refactoring of the Server Actions to add a repository seam "to make testing easier" — 3b's tests were written against the current structure via module mocking, not a production-code seam.

---

## Phase 4 — Performance & batching

**Goal:** Bulk admin operations and per-row notification lookups no longer scale linearly with sequential round-trips — without weakening the per-row conflict guard.

**Effort:** S/M, but see the correctness note below before treating this as pure performance work

**Items:**

- **[Performance]** `bulkApproveBookingsAction`/`bulkRejectBookingsAction` (`app/(app)/admin/actions.ts:181-205`) are still sequential `for...await` loops, unchanged since the last roadmap. Each iteration does a fetch, a conflict re-check, an update, and a notification insert (which itself does its own per-row room-name lookup — see next item) — roughly 3-4 sequential round trips per booking, so a 20-row bulk action is on the order of 60-80 round trips.
- **[Performance]** `getRoomName` (`lib/notifications.ts:96-99`) is still called once per booking inside `notifyBookingApproved`/`notifyBookingRejected`/`notifyBookingCancelled`, rather than batched. `notifyAdminsNewRequest` (`lib/notifications.ts:170-210`) remains the correct reference pattern (one `Promise.all`, one multi-row insert) — but note it solves a *different* shape of batching (one booking, many admin recipients) than what bulk actions need (many bookings, one recipient each). A more directly-relevant partial precedent already exists: `ensureReminderNotifications` (`lib/notifications.ts:268-283`) runs its per-booking `getRoomName` calls inside a `Promise.all` — still N queries, not a single `IN (...)` batch, but concurrent instead of sequential. That's a smaller, lower-risk stepping stone worth replicating in the bulk actions before attempting a full query-count reduction.
- **[Correctness risk — read before implementing]** Naively wrapping the bulk-approve loop in `Promise.all` is not obviously safe: a single batch can contain two bookings that would newly conflict with *each other* once both are approved, and the sequential loop's ordering may currently be incidentally relied on to catch that (approving row 1 changes the conflict set row 2's re-check sees). The DB exclusion constraint is still a real backstop either way (concurrent approvals of a true conflict will hit `23P01` regardless of app-level ordering), but the *reported result* to the admin (which rows "succeeded" vs. "failed: conflict") could come out differently under parallelization. Since Phase 3b doesn't exist yet, there's currently no test to catch a regression here — treat this as a correctness-sensitive refactor, not a drop-in performance fix, and ideally sequence Phase 3b's `admin/actions.ts` coverage before this.

**Not in this phase:** no change to per-row correctness semantics (each row still needs its own conflict re-check); no caching layer; no code-splitting work (still no `next/dynamic` usage anywhere in the repo — not urgent at current scale).

---

## Phase 5 — Breakpoint strategy & final `ui/*` retirement

**Goal:** Either the app's breakpoints are explicitly mapped to the stated 390/768/1440 target viewports, or that target is revised to match what's actually implemented — and the last remnants of the pre-redesign component system are gone or deliberately kept for a stated reason.

**Effort:** S, mostly a decision + small mechanical follow-through

**Items:**

- **[UI / visual design]** Confirmed unchanged: no `--breakpoint-*` override exists in `app/globals.css`, and the entire mobile-vs-desktop shell switch (`app-shell.tsx:26`, `mobile-tab-bar.tsx:144`, `mobile-top-bar.tsx:23`, `sidebar-nav.tsx:131`) gates exclusively at Tailwind's default `lg:` (1024px), with no `md:` (768) step. None of 390/768/1440 maps to a named breakpoint today. This needs a decision (see Open Questions) before it's worth touching — reconciling code to a spec vs. revising the documented spec are very different amounts of work.
- **[Structure & architecture]** `components/ui/*` (5 files: badge, button, card, input, label) is down to exactly the consumers identified fresh this pass: the orphaned `/availability` page (Phase 2 — likely deleted, which would remove this consumer for free), `app/login/page.tsx` (never in scope for the six-screen redesign), and `app/(app)/bookings/[id]/page.tsx` (Phase 2 — being migrated). Once Phase 2 lands, `ui/*`'s only remaining consumer is the login page. Correction to the old roadmap: several color-token citations it made against `kit/*` files (`kit/button.tsx`, `kit/room-card.tsx`, `schedule/room-filter-bar.tsx`, `admin/room-utilization-chart.tsx`'s sky-color usage, `admin-requests-table.tsx`) were **wrong** — `sky-*` is a first-class defined token scale in `app/globals.css`'s `@theme` block (an 8-step `--color-sky-50` through `--color-sky-700` ramp), not a bypass. There is no remaining hardcoded-color problem inside the redesigned screens themselves.

**Not in this phase:** no further token audit needed — this pass found the color-token system is in good shape; the only real gap was the two files already covered by Phase 2 (`booking-status-badge.tsx`, `availability-search.tsx`).

---

## Phase 6 — Full mirrored RTL

**Goal:** TBD — pending a product decision on whether the bidi-wrapping approach already shipped (Phase 2 closes its remaining gaps) is the permanent answer, or whether the app eventually needs full mirrored RTL (layout direction, icon mirroring, logical CSS properties throughout).

**Effort:** Unsized — blocked on product decision

**What's currently true (a meaningfully different baseline than the last roadmap):**

- The claim "RTL support is zero" is **no longer accurate**. The redesign added real, systematic `lang="ar" dir="rtl"` wrapping across 6 files for room names, building/floor labels, and amenity names — this is genuine bidi-correctness work, not accidental browser behavior.
- What's still true: `app/layout.tsx:40` still hardcodes `<html lang="en">`, there is no page- or layout-level `dir="rtl"` anywhere, and this remains exclusively inline per-field wrapping — never full mirroring. Free-text fields (`service`, `notes`, `reject_reason`) are deliberately left unwrapped as user-typed, indeterminate-language content.
- Practically, this phase is now much smaller in scope than it looked a day ago: the hard design question ("bidi-in-LTR-shell vs. full mirror") has been implicitly answered by the redesign work itself. What's left to decide is only whether that implicit answer is the final one, or whether full mirroring is still wanted for some future audience.

**Not in this phase:** the specific unwrapped fields found in Phase 2 (`room-card.tsx`, `booking-card.tsx`, `event-block.tsx`, `room-utilization-chart.tsx`, room detail page) — those are cheap, already-decided-scope fixes and belong in Phase 2, not blocked on this larger question.

---

## If you only do 3 things next

1. ~~**Phase 1 — fix CLAUDE.md's stale schema.**~~ ✅ Done (2026-08-25).
2. ~~**Phase 2 — finish the redesign.**~~ ✅ Done (2026-08-25), except the `/availability` orphaned-page decision, deferred at the user's request.
3. ~~**Phase 3a + 3b — test coverage, pure functions first, then Server Actions.**~~ ✅ Done (2026-08-26). The two-tier conflict policy and the exclusion-constraint race guard now have real regression protection at the Server Action layer.

## Open questions (need a product decision, not just implementation)

- **Orphaned `/availability` page (Phase 2):** delete it outright, or does it have functionality worth preserving that `/schedule` doesn't cover? It currently has zero inbound navigation links anywhere in the app.
- **`components/ui/*` / login page (Phase 5):** once Phase 2 migrates the booking detail page, `ui/*`'s only consumer is `app/login/page.tsx`. Migrate that too and delete `ui/*` entirely, or deliberately keep it as a base for future shadcn-generated components?
- **Breakpoint numbers (Phase 5):** formalize 390/768/1440 as actual named breakpoints (touches every `lg:`/`md:` in the shell plus a `--breakpoint-*` override), or accept the current Tailwind-default `lg:`-only gating as good enough and revise the documented target instead?
- **Component/UI test tooling (Phase 3c):** the app currently has zero React component tests (pure functions + Server Actions + one DB integration test only, as of 2026-08-26). Asked the user 2026-08-26 whether to invest in a component-testing setup (e.g. React Testing Library) for the 9 newly-identified untested components; chose to skip for now. Revisit if that changes.
- **Full mirrored RTL (Phase 6):** is the bidi-in-LTR-shell approach already shipped the permanent answer, or does the product eventually need full mirrored RTL for a fully Arabic-first audience?
- **Reminder delivery channel:** unchanged from before — `lib/notifications.ts` confirms reminders are deliberately on-demand/in-app only per the original PRD. Still acceptable, or does a member who doesn't open the app before their booking need to be reached another way (email/push/SMS)? Infrastructure decision, not a small fix.
- **Recurring bookings / cross-room availability during booking / duplicate-past-booking:** confirmed still absent from the code (no recurrence logic, no duplicate affordance). Given the project's v1 philosophy of fixed, non-editable service types, is any of this in near-term scope?
- **Multi-tenancy ambition:** unchanged from before — if there's real appetite for supporting more than one organization eventually, it reshapes how Phase 5/6 (breakpoints, i18n, RTL) should be scoped, since "build for one language/org now" and "build the i18n/multi-tenant system now" are very different amounts of work.
