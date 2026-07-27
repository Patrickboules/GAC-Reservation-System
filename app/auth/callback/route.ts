import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

// Only accept relative, same-origin destinations — reject '//', schemes, and
// anything that would send the user off-site after login.
function safeNext(next: string | null): string {
  // Signing in lands on Rooms — the start of the one booking flow.
  if (!next) return "/rooms";
  // Reject protocol-relative ('//', '/\') and non-relative paths so login can't
  // be used as an open redirect.
  if (!next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) {
    return "/rooms";
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
      // The app shell (sidebar/tab bar) is rendered from the session, so drop
      // the cached signed-out layout render — otherwise the Rooms tab wouldn't
      // appear until the user refreshed.
      revalidatePath("/", "layout");
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
