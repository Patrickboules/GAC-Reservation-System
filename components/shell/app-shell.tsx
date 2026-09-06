import type { GlobalSearchRoom } from "@/components/shell/global-availability-search";
import { Sidebar } from "@/components/shell/sidebar";
import { DesktopTopBar } from "@/components/shell/desktop-top-bar";
import { MobileShell } from "@/components/shell/mobile-shell";
import type { TopBarProfile } from "@/components/shell/top-bar";
import { formatRoomLocation } from "@/lib/rooms";
import {
  getCachedProfile,
  getCachedShellNotifications,
  getCachedShellRooms,
  getCachedUser,
} from "@/lib/supabase/session";

const FALLBACK_PROFILE: TopBarProfile = { displayName: "Member", role: "member" };

// Composes the desktop sidebar+top bar (US-021/US-023) and the mobile
// top bar+bottom tabs (US-022/US-023) around every authenticated route.
// Signed-out visitors get no shell at all — the only thing they can reach is
// the public, view-only schedule, which carries its own sign-in call to action.
export async function AppShell({ children }: { children: React.ReactNode }) {
  const user = await getCachedUser();

  if (!user) {
    return <div className="flex min-h-screen w-full flex-col">{children}</div>;
  }

  // Fetched once here (each accessor is itself cache()-deduplicated per
  // request, see lib/supabase/session.ts) and passed down as props so
  // DesktopTopBar and MobileShell — both always rendered server-side, with
  // only CSS (hidden lg:flex / lg:hidden) picking which is visible — don't
  // each redo this derivation for markup half of which is immediately hidden.
  const [profileRow, shellNotifications, rooms] = await Promise.all([
    getCachedProfile(),
    getCachedShellNotifications(),
    getCachedShellRooms(),
  ]);

  const isAdmin = profileRow?.role === "admin";
  const profile: TopBarProfile = {
    displayName: profileRow?.display_name || user.email || FALLBACK_PROFILE.displayName,
    role: isAdmin ? "admin" : "member",
  };

  // location dropped in migration 20260801000000 — see lib/rooms.ts.
  const searchRooms: GlobalSearchRoom[] = rooms.map((room) => ({
    id: room.id,
    name: room.name,
    amenities: room.amenities ?? [],
    location: formatRoomLocation(room.building, room.floor),
  }));

  return (
    <div className="flex min-h-screen w-full">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <DesktopTopBar
          profile={profile}
          notifications={shellNotifications.notifications}
          unreadCount={shellNotifications.unreadCount}
          rooms={searchRooms}
        />
        <MobileShell
          profile={profile}
          notifications={shellNotifications.notifications}
          unreadCount={shellNotifications.unreadCount}
          rooms={searchRooms}
          isAdmin={isAdmin}
        />
        <main className="min-w-0 flex-1 pb-[calc(4rem+env(safe-area-inset-bottom))] lg:pb-0">
          {children}
        </main>
      </div>
    </div>
  );
}
