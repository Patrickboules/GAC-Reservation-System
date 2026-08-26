import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV !== "production";

// Derived so this doesn't drift from the real project URL. Browser-side
// supabase-js (lib/supabase/client.ts) fetches this origin directly for
// auth/REST; wss:// is included even though Realtime is unused today
// (grepped — no .channel() calls anywhere) since it's the same origin and
// costs nothing to allow ahead of time.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const supabaseWsUrl = supabaseUrl.replace(/^http/, "ws");

// A real, checked-against-this-app policy, not a boilerplate default:
//   - script-src needs 'unsafe-inline' because the App Router streams RSC
//     payloads via inline <script> tags on every page load — there's no
//     inline <script> in this app's own code (no dangerouslySetInnerHTML
//     anywhere), but Next.js's own hydration bootstrap requires it absent a
//     nonce-based setup (a stricter follow-up, not attempted here).
//     'unsafe-eval' is added in dev only — Turbopack's Fast Refresh needs it;
//     production builds don't.
//   - style-src needs 'unsafe-inline' because several components (schedule
//     grid, charts, the now-line) use React's style={{...}} prop for
//     computed positions, which renders as an inline style attribute.
//   - img-src/font-src are 'self' only — no external images are ever loaded
//     (grepped every <Avatar> call site: always name-only, never a src) and
//     both font families are self-hosted (next/font/google inlines Geist/
//     Geist Mono/Bricolage Grotesque at build time; the Arabic face ships
//     from public/fonts — see the headers() block below).
//   - connect-src allows this project's own Supabase origin (REST + auth)
//     plus, in dev only, the Turbopack HMR websocket, which CSP's 'self'
//     does not cover on its own (different scheme, ws: vs http:).
const contentSecurityPolicy = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data:",
  "font-src 'self' data:",
  `connect-src 'self' ${supabaseUrl} ${supabaseWsUrl}${isDev ? " ws://localhost:* wss://localhost:*" : ""}`,
  "frame-ancestors 'none'",
  "form-action 'self'",
  "base-uri 'self'",
  "object-src 'none'",
]
  .filter(Boolean)
  .join("; ");

const nextConfig: NextConfig = {
  // No X-Powered-By: Next.js header on responses.
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "Content-Security-Policy", value: contentSecurityPolicy },
          // frame-ancestors above is CSP's modern equivalent and takes
          // precedence in browsers that support both; X-Frame-Options stays
          // for older browsers that only honor it.
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Content-Type-Options", value: "nosniff" },
        ],
      },
      // The Arabic face is served from public/fonts rather than next/font (see the
      // @font-face block in app/globals.css for why), which means it loses the
      // immutable caching next/font gives its content-hashed URLs and would
      // otherwise revalidate on every load. The filenames carry their weight and
      // are replaced, never edited, so pinning them is safe.
      {
        source: "/fonts/:path*",
        headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }],
      },
    ];
  },
};

export default nextConfig;
