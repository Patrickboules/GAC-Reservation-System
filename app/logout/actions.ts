"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  // The app shell (sidebar/tab bar) is rendered from the session, so drop the
  // cached layout render — otherwise the signed-in nav lingers until a refresh.
  revalidatePath("/", "layout");
  redirect("/login");
}
