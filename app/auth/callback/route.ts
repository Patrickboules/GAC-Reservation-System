import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

// Only accept relative, same-origin destinations — reject '//', schemes, and
// anything that would send the user off-site after login.
function safeNext(next: string | null): string {
  if (!next) return "/schedule";
  // Reject protocol-relative ('//', '/\') and non-relative paths so login can't
  // be used as an open redirect.
  if (!next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) {
    return "/schedule";
  }
  return next;
}

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = safeNext(searchParams.get("next"));

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }

    return NextResponse.redirect(
      `${origin}/login?error=${encodeURIComponent(error.message)}`,
    );
  }

  return NextResponse.redirect(
    `${origin}/login?error=${encodeURIComponent("Missing OAuth code")}`,
  );
}
