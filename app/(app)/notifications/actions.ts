"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";

/** Marks the given notification ids read for the signed-in caller. RLS
 * (notifications_update_own) already scopes this to the caller's own rows;
 * the explicit user_id filter here is defense in depth, not the boundary. */
export async function markNotificationsRead(ids: string[]) {
  if (ids.length === 0) return;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return;

  await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .in("id", ids)
    .eq("user_id", user.id)
    .is("read_at", null);

  revalidatePath("/", "layout");
}
