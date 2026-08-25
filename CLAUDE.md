# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Current state of this repo

US-001 is complete: a Next.js 15 (App Router, TypeScript, Tailwind, shadcn/ui) app is scaffolded at the repo root (`app/`, `components/`, `lib/`, `package.json`). No Supabase wiring, schema, auth, or feature UI exists yet — those are US-002 onward in `prd.json`. Check `prd.json` for the next `passes: false` story before assuming any later capability exists.

## What this project is

GAC Reservations: a mobile-first room/hall booking system for Gawargious & Ava Antonious. Members (servants, scoutsmen, guides) browse room schedules, check availability, and submit booking requests; admins approve/reject from a queue. Full spec lives in `tasks/prd-gac-reservations-v1.md` (canonical/detailed PRD) and `prd_plans/V1_prd.md` (earlier draft — the tasks/ version supersedes it).

**Auth model (current):** the schedule is public — any visitor can browse it, and it is the landing page. Booking and all member/admin actions require signing in **with Google (Supabase Google OAuth only — no email/password, no self-serve signup)**. This supersedes the older "entire app requires authentication" rule from `tasks/prd-gac-reservations-v1.md`; see `tasks/prd-google-auth-public-schedule.md` for the authoritative auth + schedule-visibility spec.

See `DEPLOYMENT.md` for how the Vercel production deploy pipeline and PR CI gate work, plus the manual dashboard setup checklist.

### Planned tech stack (per PRD — not yet implemented)

- Next.js 15 (App Router) + TypeScript, hosted on Vercel
- Supabase (Postgres, Auth, Realtime) — **no separate ORM**; use `supabase-js` / `@supabase/ssr` plus version-controlled raw SQL migration files
- Tailwind CSS + shadcn/ui
- Calendar UI: react-big-calendar or FullCalendar (pick whichever works better on mobile)

### Planned data model

- **rooms**: `id, name, building, floor, room_type, amenities (text[]), category_color, created_at`
- **bookings**: `id, room_id (FK), user_id (FK), date, start_time, end_time, service, notes, status ('pending'|'approved'|'rejected'|'cancelled'), reject_reason, created_at, updated_at`
- **profiles** (extends Supabase Auth): `id (FK auth.users), display_name, role ('member'|'admin', default 'member'), created_at`

### Core architectural rules to preserve while implementing

- **RLS is the enforcement boundary, not the UI.** Every table gets Row-Level Security; the service-role key must never reach the client, and admin mutations run server-side. Members read/write only their own bookings; all authenticated members can read room/time/status (not other members' identities/notes) for scheduling; only `role='admin'` can transition a booking to `approved`/`rejected`.
- **One shared conflict-check utility, two tiers of overlap.** Overlap = same `room_id` + `date`, with `start_time < existing.end_time AND end_time > existing.start_time` (`lib/bookings/conflict-check.ts`). `CONFLICTING_STATUSES` (`pending` + `approved`) is informational — used by the schedule, availability search, and the warning banner shown while filling out the booking form. `BLOCKING_STATUSES` (`approved` only) is what actually blocks a write: booking creation, booking edit, and admin approval all reject only on an already-*approved* conflict. Two pending requests for the same slot are allowed to coexist — the requester just sees a warning — since only one can ever be approved and the admin decides which; this is enforced at the DB layer too (the `bookings_no_overlap` exclusion constraint applies `where (status = 'approved')`). This single implementation must be reused everywhere overlap is checked (US-008 in `prd.json` establishes this module — everything downstream depends on it).
- **Status lifecycle**: a booking is `pending` on creation → `approved`/`rejected` by admin → editing an `approved` booking's date/time/room reverts it to `pending` and requires re-approval → `cancelled` is terminal and immediately frees the slot. Approval re-runs the conflict check at approval time (race-condition guard against a second request being approved for the same slot).
- **Pending-request cap**: a member may hold at most 5 open `pending` bookings at once (server-enforced).
- **Service/purpose is a fixed dropdown**, defined as an app-level constant — not free text, not admin-editable in v1.
- Mobile-first is a hard constraint, not a nice-to-have — every screen (especially the calendar) must work with no horizontal scroll on small viewports.

## The Ralph autonomous-loop workflow

This repo is driven by a "Ralph Wiggum" loop: a script that repeatedly invokes an AI coding agent against a JSON task list until all stories pass.

- **`prd.json`** — the machine-readable task list Ralph executes against. Each entry has `id`, `title`, `description`, `acceptanceCriteria`, `priority`, `passes` (bool), `notes`. Stories are ordered by dependency (schema → backend → UI) and are sized to complete in a single agent context window. `prd.json` currently defines US-001 through US-016 for the v1 scope, all with `passes: false`.
- **`ralph.sh [--tool amp|claude] [max_iterations]`** — runs the loop. Each iteration invokes the chosen tool (`amp` by default, or `claude --dangerously-skip-permissions --print`) against the prompt, and stops early if the tool's output contains `<promise>COMPLETE</promise>`. Also handles archiving: if `prd.json`'s `branchName` differs from the value stored in `.last-branch`, the previous `prd.json`/`progress.txt` are copied into `archive/YYYY-MM-DD-<feature>/` before the new run starts.
- **`progress.txt`** — running log Ralph appends to across iterations.
- **`.last-branch`** — tracks the branch name of the last run, used by `ralph.sh` to detect when to archive.
- **`.claude/skills/prd/`** — generates a new PRD from a feature description into `tasks/prd-[feature-name].md`. Asks clarifying questions first, does not implement.
- **`.claude/skills/ralph/`** — converts an existing PRD into the `prd.json` format Ralph consumes. Key rules if regenerating or extending `prd.json`: each story must be completable in one iteration (2-3 sentences to describe, or split it), stories are ordered strictly by dependency, every story ends with "Typecheck passes" (add "Tests pass" for testable logic, "Verify in browser using dev-browser skill" for anything UI-facing), and criteria must be objectively checkable — not vague.

When working on a story from `prd.json` directly (rather than via the `ralph.sh` loop), treat its `acceptanceCriteria` as the definition of done and flip `passes` to `true` only once every criterion is actually satisfied.

## Commands

- `npm run dev` — start the dev server (Turbopack) at http://localhost:3000
- `npm run build` — production build (also type-checks and lints)
- `npm run start` — serve the production build
- `npm run lint` — ESLint (flat config, `eslint-config-next`)
- `npx tsc --noEmit` — typecheck only
- No test runner is configured yet; add one when a story first needs "Tests pass" (US-008 is the first).

npx skills add supabase/agent-skills
npm install @supabase/supabase-js @supabase/ssr
