import { createClient } from "@/lib/supabase/server";
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
  }

  return (
    <>
      <MobileTopBar profile={profile} />
      <MobileTabBar isAdmin={isAdmin} />
    </>
  );
}
