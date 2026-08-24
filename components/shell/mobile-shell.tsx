import { ensureReminderNotifications, getRecentNotifications, type NotificationListItem } from "@/lib/notifications";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatRoomLocation } from "@/lib/rooms";
import { createClient } from "@/lib/supabase/server";
import type { GlobalSearchRoom } from "@/components/shell/global-availability-search";
import { MobileTopBar } from "@/components/shell/mobile-top-bar";
import { MobileTabBar } from "@/components/shell/mobile-tab-bar";
import type { TopBarProfile } from "@/components/shell/top-bar";

const FALLBACK_PROFILE: TopBarProfile = { displayName: "Member", role: "member" };

// Server component: the More sheet's admin group visibility and the profile
// menu's identity are decided here, from the caller's own session/profile
// row, so neither can be forced client-side. Mirrors components/shell/sidebar.tsx.
export async function MobileShell() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  let isAdmin = false;
  let profile: TopBarProfile = FALLBACK_PROFILE;
  let notifications: NotificationListItem[] = [];
  let unreadCount = 0;

  if (user) {
    const { data } = await supabase
      .from("profiles")
      .select("display_name, role")
      .eq("id", user.id)
      .single();

    isAdmin = data?.role === "admin";
    profile = {
      displayName: data?.display_name || user.email || FALLBACK_PROFILE.displayName,
      role: isAdmin ? "admin" : "member",
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

  // location dropped in migration 20260801000000 — see lib/rooms.ts.
  const searchRooms: GlobalSearchRoom[] = (rooms ?? []).map((room) => ({
    id: room.id,
    name: room.name,
    amenities: room.amenities ?? [],
    location: formatRoomLocation(room.building, room.floor),
  }));

  return (
    <>
      <MobileTopBar
        profile={profile}
        notifications={notifications}
        unreadCount={unreadCount}
        rooms={searchRooms}
        authenticated={Boolean(user)}
      />
      <MobileTabBar isAdmin={isAdmin} />
    </>
  );
}
