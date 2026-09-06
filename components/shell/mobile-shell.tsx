import type { NotificationListItem } from "@/lib/notifications";
import type { GlobalSearchRoom } from "@/components/shell/global-availability-search";
import { MobileTopBar } from "@/components/shell/mobile-top-bar";
import { MobileTabBar } from "@/components/shell/mobile-tab-bar";
import type { TopBarProfile } from "@/components/shell/top-bar";

interface MobileShellProps {
  profile: TopBarProfile;
  notifications: NotificationListItem[];
  unreadCount: number;
  rooms: GlobalSearchRoom[];
  isAdmin: boolean;
}

// Presentational: all of the profile/notifications/rooms/isAdmin data is
// fetched and derived once in app-shell.tsx and passed down, since this
// component and DesktopTopBar are both always rendered server-side (only CSS
// decides which is visible), and each independently re-fetching/re-deriving
// it used to double that work for markup that's immediately hidden by the
// other.
export function MobileShell({ profile, notifications, unreadCount, rooms, isAdmin }: MobileShellProps) {
  return (
    <>
      <MobileTopBar
        profile={profile}
        notifications={notifications}
        unreadCount={unreadCount}
        rooms={rooms}
        authenticated
      />
      <MobileTabBar isAdmin={isAdmin} />
    </>
  );
}
