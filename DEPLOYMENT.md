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

## Google OAuth setup (Google-only sign-in)

Sign-in is handled exclusively by Google OAuth through Supabase Auth (no email/password).
Set this up once per environment.

### Google Cloud Console

1. Open <https://console.cloud.google.com/> and select or create a project.
2. **APIs & Services → OAuth consent screen**: configure the consent screen.
   - User type **External**, fill in app name, support email, and developer contact.
   - Add the scopes `openid`, `.../auth/userinfo.email`, and `.../auth/userinfo.profile`.
   - **Do not** add a Google Workspace domain restriction — any Google account may sign in.
   - Publish the app (or add test users while it stays in "Testing").
3. **APIs & Services → Credentials → Create credentials → OAuth client ID**:
   - Application type: **Web application**.
   - **Authorized JavaScript origins**: your site origin(s), e.g. `http://127.0.0.1:3000`
     for local dev and your production domain.
   - **Authorized redirect URIs**: the Supabase Auth callback,
     `https://<your-project-ref>.supabase.co/auth/v1/callback` for the hosted project
     (and `http://127.0.0.1:54321/auth/v1/callback` if testing against the local Supabase stack).
   - Copy the generated **Client ID** and **Client secret**.

### Supabase dashboard (production project)

1. **Authentication → Providers → Google**: toggle **Enabled** and paste the
   **Client ID** and **Client Secret** from Google Cloud.
2. **Authentication → URL Configuration**: set **Site URL** to your production domain and
   add your production callback (`https://<your-domain>/auth/callback`) to
   **Redirect URLs** (these mirror `site_url` / `additional_redirect_urls` in
   `supabase/config.toml`).
3. Do not set a hosted-domain restriction — any Google account is allowed.

### Local development

- Provide `SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_ID` and
  `SUPABASE_AUTH_EXTERNAL_GOOGLE_SECRET` (see `.env.example`) so the
  `[auth.external.google]` block in `supabase/config.toml` resolves. `skip_nonce_check = true`
  is required for local Google sign-in.
