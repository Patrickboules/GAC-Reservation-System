import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The Arabic face is served from public/fonts rather than next/font (see the
  // @font-face block in app/globals.css for why), which means it loses the
  // immutable caching next/font gives its content-hashed URLs and would
  // otherwise revalidate on every load. The filenames carry their weight and
  // are replaced, never edited, so pinning them is safe.
  async headers() {
    return [
      {
        source: "/fonts/:path*",
        headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }],
      },
    ];
  },
};

export default nextConfig;
