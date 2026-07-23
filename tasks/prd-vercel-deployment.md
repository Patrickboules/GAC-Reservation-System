# PRD: Vercel Production Deployment Pipeline

## Introduction/Overview

The GAC Reservations app currently only runs locally (`npm run dev`/`npm run build`) — there is no GitHub remote configured, no Vercel project, and no CI. This feature wires the repo up so that pushing to `main` automatically builds and redeploys the app on Vercel, using the same Supabase project the app already talks to locally. A GitHub Actions workflow gates pull requests with typecheck/lint/test checks before they can merge into `main`, so a broken change never reaches production in the first place.

This is infrastructure/DevOps work, not application feature work: no new user-facing screens, just a repeatable path from "code merged to main" to "live on the internet."

## Goals

- Every push to `main` triggers an automatic Vercel production build and deploy, with no manual "deploy" step.
- Production on Vercel runs against the same Supabase project as local dev (single environment, per current `.env`), configured via Vercel's Production environment variables — not committed secrets.
- Every pull request into `main` runs typecheck, lint, and the test suite via GitHub Actions before it can be merged.
- Non-`main` branches do not produce Vercel deployments (production-only deploys, no preview URLs for this iteration).
- The deployment process is documented so a future contributor (or agent) can reproduce or modify it without reverse-engineering the Vercel dashboard.

## User Stories

### US-001: Prepare the repo for a clean Vercel build

**Description:** As a developer, I want the repo to build reproducibly from a fresh clone/CI runner so Vercel's build doesn't fail on missing config or leak secrets.

**Acceptance Criteria:**

- [ ] `.env.example` added at repo root listing every required env var name (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`) with placeholder values and a one-line comment on where to find each in the Supabase dashboard.
- [ ] `.gitignore` confirmed to exclude `.env` (and any other local env files); verify `.env` has never been committed via `git log --all --full-history -- .env`.
- [ ] `npm run build` succeeds from a clean install (`rm -rf .next node_modules && npm install && npm run build`) using only vars from `.env.example` populated with real dev values.
- [ ] Typecheck passes.

### US-002: Add GitHub Actions CI workflow for pull requests

**Description:** As a developer, I want every PR into `main` to automatically run typecheck, lint, and tests so a broken change is caught before merge, independent of Vercel's own build step.

**Acceptance Criteria:**

- [ ] `.github/workflows/ci.yml` added, triggered on `pull_request` targeting `main` (and optionally `push` to `main` as a safety net).
- [ ] Workflow installs dependencies (with npm cache) and runs, as separate steps: `npx tsc --noEmit`, `npm run lint`, `npm test`.
- [ ] Any step failing fails the workflow run (non-zero exit propagates).
- [ ] Workflow does not require Supabase env vars to pass (typecheck/lint/test run without live DB access); if `npm test` needs env vars to run, stub/mock them in the workflow rather than using real credentials.
- [ ] Typecheck passes.

### US-003: Connect the GitHub repo to a Vercel project

**Description:** As the project owner, I want Vercel linked to my GitHub repo so pushes to `main` trigger builds automatically.

**Acceptance Criteria:**

- [ ] Vercel project created and connected to the GitHub repository (owner connects the existing repo per their own setup; this story documents the required settings rather than assuming Claude Code has Vercel/GitHub account access).
- [ ] Production Branch set to `main` in Vercel project settings.
- [ ] Vercel's Git integration configured so non-`main` branches do **not** produce deployments (Project Settings → Git → disable preview deployments for branches, or set an Ignored Build Step that only proceeds on `main`).
- [ ] Framework preset confirmed as Next.js; build command `npm run build`, output handled by Vercel's Next.js runtime (no custom output dir needed).
- [ ] Note documented (see US-005) flagging that `next build` currently runs with `--turbopack`; confirm this succeeds on a real Vercel build (Turbopack production builds are newer/less battle-tested than webpack) and fall back to plain `next build` in `package.json` if Vercel's build fails or behaves unexpectedly.

### US-004: Configure production environment variables in Vercel

**Description:** As the project owner, I want Vercel's Production environment to have the same Supabase credentials as local dev, set as encrypted project env vars — never committed to the repo.

**Acceptance Criteria:**

- [ ] All four vars from `.env.example` (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`) added in Vercel Project Settings → Environment Variables, scoped to Production, with the same values as the local `.env`.
- [ ] `SUPABASE_SERVICE_ROLE_KEY` confirmed **not** prefixed `NEXT_PUBLIC_` (so it's never bundled to the client), consistent with the RLS boundary rule in `CLAUDE.md`.
- [ ] A production deploy triggered (e.g. an empty commit to `main`, or the Vercel dashboard's "Redeploy") and confirmed to build successfully with these vars.

### US-005: Verify and document the end-to-end deploy flow

**Description:** As a developer, I want to confirm a real push-to-deploy round trip works and leave a short doc so the process is repeatable.

**Acceptance Criteria:**

- [ ] A test change pushed to `main` (or merged via a PR that passed CI from US-002) is confirmed to produce a new Vercel production deployment, visible and functioning at the Vercel-assigned production URL (default `*.vercel.app` domain — no custom domain in this iteration).
- [ ] App loads and can reach Supabase from the deployed URL (spot-check: sign-in page renders, no env-var-related runtime errors in Vercel's function logs).
- [ ] A short "Deployment" section added to `CLAUDE.md` (or a new `DEPLOYMENT.md` linked from it) covering: how production deploys are triggered, where env vars live, how CI gates PRs, and the Turbopack-build fallback note from US-003.
- [ ] Typecheck passes.

## Functional Requirements

- FR-1: A push to `main` on the connected GitHub repo must trigger a Vercel production build and deploy with no manual step.
- FR-2: Vercel must not create deployments for branches other than `main` (no preview deployments in this iteration).
- FR-3: Production runtime env vars must be set in Vercel's dashboard (Production scope), matching the four vars currently in local `.env`, and must never be committed to the repo.
- FR-4: `.env.example` must document every required env var name without real values.
- FR-5: A GitHub Actions workflow must run on every pull request targeting `main`, executing typecheck, lint, and tests, and must fail the check if any step fails.
- FR-6: The build command used by both Vercel and CI must be the same underlying `npm run build` defined in `package.json` (single source of truth, no divergent build config between local/CI/Vercel).
- FR-7: Documentation (`CLAUDE.md` or `DEPLOYMENT.md`) must describe the deploy pipeline well enough that a new contributor doesn't need Vercel dashboard access to understand how it works.

## Non-Goals (Out of Scope)

- No preview/staging deployments for non-`main` branches or PRs (explicitly production-only for this iteration).
- No second Supabase project for dev/staging isolation — production and local dev continue sharing the one existing Supabase project.
- No custom domain setup — ship on the default `*.vercel.app` domain; custom domains can be a later, separate change.
- No automated Supabase migration-deploy step as part of the Vercel build (migrations are already applied directly against the shared Supabase project per existing project convention; this PRD doesn't change that workflow).
- No branch-protection rule configuration in GitHub is mandated by this PRD, but is a natural follow-up once CI (US-002) exists — call it out as an open question below rather than a requirement, since it changes how the repo owner merges PRs.
- No rollback tooling beyond what Vercel provides out of the box (Vercel keeps prior deployments and supports one-click rollback in its dashboard already).

## Design Considerations

Not applicable — no UI changes.

## Technical Considerations

- `package.json`'s `build` script currently runs `next build --turbopack`. Turbopack production builds are newer than the stable webpack build path; US-003 explicitly calls for verifying this works on Vercel's build infrastructure before relying on it, with a documented fallback to plain `next build`.
- The repo has no GitHub remote today — per the user's answer, connecting it to an existing/new GitHub repo is the user's own responsibility outside this PRD's scope; these stories assume that repo exists by the time US-003 starts.
- `SUPABASE_SERVICE_ROLE_KEY` must stay server-only per the RLS enforcement rule already documented in `CLAUDE.md` — this PRD doesn't change that boundary, just makes sure the production copy of the key is set correctly in Vercel and never leaks into a `NEXT_PUBLIC_`-prefixed var or client bundle.
- `npm test` currently runs via `vitest run`; confirm in US-002 whether any existing tests need Supabase connectivity — if so, they should be mocked/stubbed in CI rather than given real credentials, since CI should not require production secrets to pass.

## Success Metrics

- Time from "PR merged to main" to "live on production URL" is fully automatic (0 manual deploy steps).
- A PR with a typecheck, lint, or test failure is blocked from showing green/mergeable status before this PRD; after, GitHub Actions marks it failing before merge.
- Zero secrets committed to the repo (verified via `.env.example` containing no real values and `.env` git-history check in US-001).

## Open Questions

- Should GitHub branch protection on `main` (require CI to pass, require PR review) be turned on once US-002 ships? Left out of scope here since it's a repo-settings/process decision, not a build-pipeline one — flagging for the user to decide separately.
- If a custom domain is wanted later, that's a follow-up PRD (DNS + Vercel domain config), not covered here.
- If preview deployments are wanted later (e.g. to review UI changes before merging), that reverses the "production only" decision made for this iteration and would need its own environment-variable scoping decision (same Supabase project vs. separate).
