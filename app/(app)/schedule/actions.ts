"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";

/** Pins/unpins a room for the signed-in caller. RLS (favorite_rooms_insert_own /
 * _delete_own) already scopes this to the caller's own rows; the explicit
 * user_id filter/value here is defense in depth, not the boundary. */
export async function toggleFavoriteRoom(roomId: string, favorite: boolean) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return;

  if (favorite) {
    await supabase.from("favorite_rooms").insert({ user_id: user.id, room_id: roomId });
  } else {
    await supabase.from("favorite_rooms").delete().eq("user_id", user.id).eq("room_id", roomId);
  }

  revalidatePath("/schedule");
}
