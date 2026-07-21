import { createClient } from "@/lib/supabase/server";
import { SidebarNav } from "@/components/shell/sidebar-nav";

// Server component: the admin nav group's visibility is decided here, from
// the caller's own session/profile row, so it can't be forced open client-side.
export async function Sidebar() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  let isAdmin = false;

  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    isAdmin = profile?.role === "admin";
  }

  return <SidebarNav isAdmin={isAdmin} />;
}
