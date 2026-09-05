import { getCachedProfile, getCachedUser } from "@/lib/supabase/session";
import { SidebarNav } from "@/components/shell/sidebar-nav";

// Server component: the admin nav group's visibility is decided here, from
// the caller's own session/profile row, so it can't be forced open client-side.
export async function Sidebar() {
  const user = await getCachedUser();

  let isAdmin = false;

  if (user) {
    const profile = await getCachedProfile();
    isAdmin = profile?.role === "admin";
  }

  return <SidebarNav isAdmin={isAdmin} authenticated={Boolean(user)} />;
}
