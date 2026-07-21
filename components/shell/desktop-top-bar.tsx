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
  }

  return <TopBar profile={profile} variant="desktop" className="hidden lg:flex" />;
}
