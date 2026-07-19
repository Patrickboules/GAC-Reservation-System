# Ralph Loop — Autonomous Iteration Instructions

You are one iteration of an autonomous coding loop. You have no memory of previous iterations — everything you need to know is either in this repo's files or in `CLAUDE.md`. Read `CLAUDE.md` first for architecture and conventions.

## What to do this iteration

1. **Read `prd.json`.** Find the user story with the lowest `priority` where `"passes": false`. That is your task for this iteration. Do not work on any other story.
   - If every story has `"passes": true`, skip to "When everything is done" below and stop — do not pick new work.

2. **Make sure you're on the right branch.** `prd.json.branchName` names the git branch this project's work belongs on. If you're not currently on that branch, create it (`git checkout -b <branchName>`) or switch to it if it already exists.

3. **Implement the story.** Satisfy every item in its `acceptanceCriteria` array. Nothing more — don't scope-creep into later stories, don't refactor unrelated code. Follow the architectural rules in `CLAUDE.md` (RLS as the real enforcement boundary, the shared conflict-check utility, the booking status lifecycle, mobile-first, etc.).

4. **Verify it for real, not just by inspection:**
   - Run typecheck (and lint, if configured) — every story requires this to pass.
   - If the story has a "Tests pass" criterion, run the test suite (or the relevant subset) and confirm it's green.
   - If the story has a "Verify in browser" criterion, actually start the dev server and drive the flow (use the dev-browser skill if available) — don't mark it done on faith.
   - If any criterion can't be verified as true, the story is not done. Fix it before moving on — do not mark `passes: true` on a partial implementation.

5. **Update `prd.json`:** set this story's `"passes"` to `true` and write a one- or two-line summary of what you did in `"notes"`. Leave every other story untouched.

6. **Append to `progress.txt`:** one short entry — story id, what changed, and the verification you ran (e.g. `US-003: added rooms/bookings/profiles migration; typecheck passes`).

7. **Commit your work.** Stage exactly the files this story touched (plus `prd.json` and `progress.txt`) and commit with a message referencing the story id, e.g. `git commit -m "US-003: add SQL migration for rooms, bookings, profiles"`. Never use `--no-verify`. Never force-push. Never touch other branches.

## Rules

- One story per iteration. If a story turns out to be too large to finish within this iteration, implement as much as you can safely, leave `"passes": false`, write an honest, specific `"notes"` entry describing exactly what's left, and commit the partial progress — the next iteration will pick up from there. Do not fake completion.
- Never invent acceptance criteria that aren't in `prd.json`. Never delete or renumber stories.
- Don't touch `.env.local` secrets or commit credentials.
- If a story is blocked by something outside your control (e.g. missing Supabase credentials, missing CLI tool), say so plainly in `notes` and `progress.txt`, leave `passes: false`, and stop — don't work around it with mocks/stubs that mask the real requirement.

## When everything is done

Once every story in `prd.json` has `"passes": true`, output exactly this line at the end of your response, on its own:

```
<promise>COMPLETE</promise>
```

Do not output this unless you've verified every story is actually marked `passes: true` — the loop watches for this literal string to stop iterating.