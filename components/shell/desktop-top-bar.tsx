import type { NotificationListItem } from "@/lib/notifications";
import type { GlobalSearchRoom } from "@/components/shell/global-availability-search";
import { TopBar, type TopBarProfile } from "@/components/shell/top-bar";

interface DesktopTopBarProps {
  profile: TopBarProfile;
  notifications: NotificationListItem[];
  unreadCount: number;
  rooms: GlobalSearchRoom[];
}

// Presentational: all of the profile/notifications/rooms data is fetched and
// derived once in app-shell.tsx and passed down, since this component and
// MobileShell are both always rendered server-side (only CSS decides which
// is visible), and each independently re-fetching/re-deriving it used to
// double that work for markup that's immediately hidden by the other.
export function DesktopTopBar({ profile, notifications, unreadCount, rooms }: DesktopTopBarProps) {
  return (
    <TopBar
      profile={profile}
      notifications={notifications}
      unreadCount={unreadCount}
      rooms={rooms}
      variant="desktop"
      className="hidden lg:flex"
    />
  );
}
