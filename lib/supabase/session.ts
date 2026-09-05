import { cache } from "react";
import type { User } from "@supabase/supabase-js";

import { ensureReminderNotifications, getRecentNotifications, type NotificationListItem } from "@/lib/notifications";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

/**
 * Request-scoped, deduplicated accessors for data every shell component
 * (Sidebar, DesktopTopBar, MobileShell) and most authenticated pages need.
 *
 * Each is wrapped in React's cache() so, no matter how many components call
 * it during a single request's render, the underlying Supabase call runs
 * exactly once — the first call's promise is reused by every later call
 * within that request. This does not span the middleware/Edge phase (a
 * separate execution context) or cross requests (a fresh render gets a fresh
 * cache), so it can't leak one user's data into another's.
 */

export const getCachedUser = cache(async (): Promise<User | null> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
});

export interface CachedProfile {
  id: string;
  display_name: string | null;
  role: string;
}

export const getCachedProfile = cache(async (): Promise<CachedProfile | null> => {
  const user = await getCachedUser();
  if (!user) return null;

  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("id, display_name, role")
    .eq("id", user.id)
    .single();

  return data;
});

const EMPTY_NOTIFICATIONS = { notifications: [] as NotificationListItem[], unreadCount: 0 };

export const getCachedShellNotifications = cache(
  async (): Promise<{ notifications: NotificationListItem[]; unreadCount: number }> => {
    const user = await getCachedUser();
    if (!user) return EMPTY_NOTIFICATIONS;

    await ensureReminderNotifications(createAdminClient(), user.id);
    const supabase = await createClient();
    return getRecentNotifications(supabase, user.id);
  }
);

export interface CachedShellRoom {
  id: string;
  name: string;
  amenities: string[] | null;
  building: string | null;
  floor: string | null;
}

/** The rooms list backing the top bar / mobile shell's global availability
 * search widget only — not the rooms directory, schedule, or availability
 * page's own (differently-shaped) rooms queries. */
export const getCachedShellRooms = cache(async (): Promise<CachedShellRoom[]> => {
  const supabase = await createClient();
  const { data } = await supabase
    .from("rooms")
    .select("id, name, amenities, building, floor")
    .order("name");
  return data ?? [];
});
