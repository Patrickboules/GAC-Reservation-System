# Deployment

## How production deploys work

- Production deploys are triggered by a push (or merge) to `main`. `vercel.json`'s
  `git.deploymentEnabled` restricts Vercel to building only the `main` branch
  (`"main": true`, `"*": false`) — no other branch or PR preview build fires a deployment.
- The build command Vercel runs is the same one used locally: `npm run build`
  (`next build --turbopack`, see `package.json`). There is no separate Vercel-only
  build override.
- Production environment variables live in Vercel's **Production** environment scope
  (Project Settings → Environment Variables), using the same names documented in
  `.env.example`: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`,
  `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`.
- Before code ever reaches `main`, `.github/workflows/ci.yml` gates every pull request:
  it runs `npx tsc --noEmit`, `npm run lint`, and `npm test` with placeholder Supabase
  env vars (no live DB access needed), and any failing step blocks the merge.

## Manual setup checklist (project owner — requires Vercel/GitHub dashboard access)

These steps can't be performed by an autonomous coding agent and must be done by hand:

- [ ] Create or connect the GitHub repo (`gac-reservation-system`) to Vercel.
- [ ] Create a Vercel project importing that repo.
- [ ] Set the Vercel project's **Production Branch** to `main`.
- [ ] Add the four env vars from `.env.example` under Vercel's **Production** environment
      scope, using real Supabase values (not the placeholders).
- [ ] Trigger a real Vercel build and verify `next build --turbopack` succeeds.
      - **Fallback:** if `--turbopack` fails specifically on Vercel's build infrastructure,
        drop `--turbopack` from the `build` script in `package.json` (keep it on `dev`)
        and rebuild.
