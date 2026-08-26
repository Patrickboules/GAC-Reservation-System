"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

// Only accept relative, same-origin destinations for `next` so the login
// round-trip can't be used as an open redirect.
function safeNext(next: FormDataEntryValue | null): string | null {
  if (typeof next !== "string" || next.length === 0) return null;
  if (!next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) {
    return null;
  }
  return next;
}

export async function login(formData: FormData) {
  const next = safeNext(formData.get("next"));

  const headerList = await headers();
  const origin = headerList.get("origin") ?? "";

  const callback = new URL("/auth/callback", origin);
  if (next) {
    callback.searchParams.set("next", next);
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: callback.toString() },
  });

  if (error) {
    console.error("login: signInWithOAuth failed", error);
    redirect(
      `/login?error=${encodeURIComponent("Something went wrong starting Google sign-in. Please try again.")}`
    );
  }

  redirect(data.url);
}
