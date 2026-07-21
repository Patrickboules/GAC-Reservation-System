import { createClient } from "@/lib/supabase/server";
import { MobileTopBar } from "@/components/shell/mobile-top-bar";
import { MobileTabBar } from "@/components/shell/mobile-tab-bar";

// Server component: the More sheet's admin group visibility is decided here,
// from the caller's own session/profile row, so it can't be forced open
// client-side. Mirrors components/shell/sidebar.tsx.
export async function MobileShell() {
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

  return (
    <>
      <MobileTopBar />
      <MobileTabBar isAdmin={isAdmin} />
    </>
  );
}
