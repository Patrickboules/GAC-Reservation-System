import { ensureReminderNotifications, getRecentNotifications, type NotificationListItem } from "@/lib/notifications";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
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
    .select("id, name, capacity, amenities, location")
    .order("name");

  return (
    <TopBar
      profile={profile}
      notifications={notifications}
      unreadCount={unreadCount}
      rooms={rooms ?? []}
      variant="desktop"
      className="hidden lg:flex"
    />
  );
}
