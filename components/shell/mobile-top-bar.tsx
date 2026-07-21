import { TopBar, type TopBarProfile } from "@/components/shell/top-bar";

interface MobileTopBarProps {
  profile: TopBarProfile;
}

// Compact top bar for mobile, shown alongside the bottom tab bar.
export function MobileTopBar({ profile }: MobileTopBarProps) {
  return (
    <TopBar profile={profile} variant="mobile" className="lg:hidden" />
  );
}
