import type { NotificationListItem } from "@/lib/notifications";
import { TopBar, type TopBarProfile } from "@/components/shell/top-bar";
import type { GlobalSearchRoom } from "@/components/shell/global-availability-search";

interface MobileTopBarProps {
  profile: TopBarProfile;
  notifications: NotificationListItem[];
  unreadCount: number;
  rooms: GlobalSearchRoom[];
}

// Compact top bar for mobile, shown alongside the bottom tab bar.
export function MobileTopBar({ profile, notifications, unreadCount, rooms }: MobileTopBarProps) {
  return (
    <TopBar
      profile={profile}
      notifications={notifications}
      unreadCount={unreadCount}
      rooms={rooms}
      variant="mobile"
      className="lg:hidden"
    />
  );
}
