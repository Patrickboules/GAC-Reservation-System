import { ensureReminderNotifications, getRecentNotifications, type NotificationListItem } from "@/lib/notifications";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatRoomLocation } from "@/lib/rooms";
import { createClient } from "@/lib/supabase/server";
import type { GlobalSearchRoom } from "@/components/shell/global-availability-search";
import { TopBar, type TopBarProfile } from "@/components/shell/top-bar";

const FALLBACK_PROFILE: TopBarProfile = { displayName: "Member", role: "member" };

// Server component: fetches the caller's own profile row so the profile
// menu's name/role can't be forced client-side. Mirrors components/shell/sidebar.tsx.
export async function DesktopTopBar() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  let profile: TopBarProfile = FALLBACK_PROFILE;
  let notifications: NotificationListItem[] = [];
  let unreadCount = 0;

  if (user) {
    const { data } = await supabase
      .from("profiles")
      .select("display_name, role")
      .eq("id", user.id)
      .single();

    profile = {
      displayName: data?.display_name || user.email || FALLBACK_PROFILE.displayName,
      role: data?.role === "admin" ? "admin" : "member",
    };

    await ensureReminderNotifications(createAdminClient(), user.id);
    const recent = await getRecentNotifications(supabase, user.id);
    notifications = recent.notifications;
    unreadCount = recent.unreadCount;
  }

  const { data: rooms } = await supabase
    .from("rooms")
    .select("id, name, amenities, building, floor")
    .order("name");

  // capacity/location dropped in migration 20260801000000 — see lib/rooms.ts.
  const searchRooms: GlobalSearchRoom[] = (rooms ?? []).map((room) => ({
    id: room.id,
    name: room.name,
    capacity: null,
    amenities: room.amenities ?? [],
    location: formatRoomLocation(room.building, room.floor),
  }));

  return (
    <TopBar
      profile={profile}
      notifications={notifications}
      unreadCount={unreadCount}
      rooms={searchRooms}
      authenticated={Boolean(user)}
      variant="desktop"
      className="hidden lg:flex"
    />
  );
}
