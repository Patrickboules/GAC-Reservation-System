import type { NotificationListItem } from "@/lib/notifications";
import { TopBar, type TopBarProfile } from "@/components/shell/top-bar";

interface MobileTopBarProps {
  profile: TopBarProfile;
  notifications: NotificationListItem[];
  unreadCount: number;
}

// Compact top bar for mobile, shown alongside the bottom tab bar.
export function MobileTopBar({ profile, notifications, unreadCount }: MobileTopBarProps) {
  return (
    <TopBar
      profile={profile}
      notifications={notifications}
      unreadCount={unreadCount}
      variant="mobile"
      className="lg:hidden"
    />
  );
}
