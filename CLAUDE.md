# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Current state of this repo

**No application code exists yet.** This directory currently contains only planning artifacts and an autonomous-agent ("Ralph Wiggum") execution harness. The actual Next.js app has not been scaffolded — that is itself the first user story (US-001) in `prd.json`. Do not assume a `package.json`, `src/`, or any build tooling exists until you've checked; if it's missing, build/lint/test commands described in this file don't apply yet and the first task is to scaffold the app per US-001.

## What this project is

GAC Reservations: a mobile-first, auth-gated room/hall booking system for Gawargious & Ava Antonious. Members (servants, scoutsmen, guides) browse room schedules, check availability, and submit booking requests; admins approve/reject from a queue. Full spec lives in `tasks/prd-gac-reservations-v1.md` (canonical/detailed PRD) and `prd_plans/V1_prd.md` (earlier draft — the tasks/ version supersedes it, e.g. it clarifies that the **entire app requires authentication**, including schedule browsing).

### Planned tech stack (per PRD — not yet implemented)

- Next.js 15 (App Router) + TypeScript, hosted on Vercel
- Supabase (Postgres, Auth, Realtime) — **no separate ORM**; use `supabase-js` / `@supabase/ssr` plus version-controlled raw SQL migration files
- Tailwind CSS + shadcn/ui
- Calendar UI: react-big-calendar or FullCalendar (pick whichever works better on mobile)

### Planned data model

- **rooms**: `id, name, capacity, amenities (text[]/jsonb), location, rules, created_at`
- **bookings**: `id, room_id (FK), user_id (FK), date, start_time, end_time, service, notes, status ('pending'|'approved'|'rejected'|'cancelled'), reject_reason, created_at, updated_at`
- **profiles** (extends Supabase Auth): `id (FK auth.users), display_name, role ('member'|'admin', default 'member'), created_at`

### Core architectural rules to preserve while implementing

- **RLS is the enforcement boundary, not the UI.** Every table gets Row-Level Security; the service-role key must never reach the client, and admin mutations run server-side. Members read/write only their own bookings; all authenticated members can read room/time/status (not other members' identities/notes) for scheduling; only `role='admin'` can transition a booking to `approved`/`rejected`.
- **One shared conflict-check utility.** Overlap = same `room_id` + `date`, with `start_time < existing.end_time AND end_time > existing.start_time`, checked against bookings with status `approved` or `pending`. This single implementation must be reused by availability search, booking creation, admin approval, and booking edit (US-008 in `prd.json` establishes this module — everything downstream depends on it).
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

None yet — no scaffold exists. Once US-001 completes, this section should be updated with the real `npm`/`pnpm` scripts (dev, build, lint, typecheck, test) from the generated `package.json`, plus how to run a single test and how to apply Supabase SQL migrations locally.
