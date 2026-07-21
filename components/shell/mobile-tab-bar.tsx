"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  BarChart3,
  Building2,
  Calendar,
  CalendarPlus,
  ClipboardList,
  DoorClosed,
  Inbox,
  LayoutDashboard,
  MoreHorizontal,
} from "lucide-react";

import { cn } from "@/lib/utils";
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalTitle,
} from "@/components/kit/modal";

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  isActive: (pathname: string) => boolean;
}

const tabItems: NavItem[] = [
  {
    label: "Schedule",
    href: "/schedule",
    icon: Calendar,
    isActive: (pathname) => pathname.startsWith("/schedule"),
  },
  {
    label: "Book",
    href: "/bookings/new",
    icon: CalendarPlus,
    isActive: (pathname) => pathname.startsWith("/bookings/new"),
  },
  {
    label: "My Bookings",
    href: "/bookings",
    icon: ClipboardList,
    isActive: (pathname) =>
      pathname === "/bookings" ||
      (pathname.startsWith("/bookings/") && !pathname.startsWith("/bookings/new")),
  },
];

const moreDestinations: NavItem[] = [
  {
    label: "Rooms",
    href: "/rooms",
    icon: Building2,
    isActive: (pathname) => pathname.startsWith("/rooms"),
  },
];

const adminDestinations: NavItem[] = [
  {
    label: "Dashboard",
    href: "/admin",
    icon: LayoutDashboard,
    isActive: (pathname) => pathname === "/admin",
  },
  {
    label: "Requests",
    href: "/admin/requests",
    icon: Inbox,
    isActive: (pathname) => pathname.startsWith("/admin/requests"),
  },
  {
    label: "Manage Rooms",
    href: "/admin/rooms",
    icon: DoorClosed,
    isActive: (pathname) => pathname.startsWith("/admin/rooms"),
  },
  {
    label: "Reports",
    href: "/admin/reports",
    icon: BarChart3,
    isActive: (pathname) => pathname.startsWith("/admin/reports"),
  },
];

function TabLink({ item, active }: { item: NavItem; active: boolean }) {
  const Icon = item.icon;

  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex flex-1 flex-col items-center justify-center gap-0.5 py-2 text-caption font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300",
        active ? "text-sky-600" : "text-ink-500",
      )}
    >
      <Icon className="size-5" />
      <span>{item.label}</span>
    </Link>
  );
}

function SheetLink({
  item,
  active,
  onNavigate,
}: {
  item: NavItem;
  active: boolean;
  onNavigate: () => void;
}) {
  const Icon = item.icon;

  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      onClick={onNavigate}
      className={cn(
        "flex items-center gap-3 rounded-md px-3 py-2 text-body font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300",
        active
          ? "bg-sky-100 text-sky-600"
          : "text-ink-500 hover:bg-sky-50 hover:text-ink-700",
      )}
    >
      <Icon className="size-5 shrink-0" />
      <span>{item.label}</span>
    </Link>
  );
}

interface MobileTabBarProps {
  isAdmin: boolean;
}

export function MobileTabBar({ isAdmin }: MobileTabBarProps) {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);

  const isMoreActive =
    pathname.startsWith("/rooms") || pathname.startsWith("/admin");

  return (
    <>
      <nav
        className="fixed inset-x-0 bottom-0 z-40 flex h-16 shrink-0 items-stretch border-t border-line bg-surface pb-[env(safe-area-inset-bottom)] lg:hidden"
        aria-label="Primary"
      >
        {tabItems.map((item) => (
          <TabLink
            key={item.href}
            item={item}
            active={item.isActive(pathname)}
          />
        ))}
        <button
          type="button"
          onClick={() => setMoreOpen(true)}
          className={cn(
            "flex flex-1 flex-col items-center justify-center gap-0.5 py-2 text-caption font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300",
            isMoreActive ? "text-sky-600" : "text-ink-500",
          )}
        >
          <MoreHorizontal className="size-5" />
          <span>More</span>
        </button>
      </nav>

      <Modal open={moreOpen} onOpenChange={setMoreOpen}>
        <ModalContent>
          <ModalHeader>
            <ModalTitle>More</ModalTitle>
          </ModalHeader>
          <nav className="flex flex-col gap-1">
            {moreDestinations.map((item) => (
              <SheetLink
                key={item.href}
                item={item}
                active={item.isActive(pathname)}
                onNavigate={() => setMoreOpen(false)}
              />
            ))}

            {isAdmin && (
              <>
                <div
                  role="separator"
                  aria-hidden="true"
                  className="my-2 border-t border-line"
                />
                <span className="px-3 text-caption font-semibold tracking-wide text-ink-300 uppercase">
                  Admin
                </span>
                {adminDestinations.map((item) => (
                  <SheetLink
                    key={item.href}
                    item={item}
                    active={item.isActive(pathname)}
                    onNavigate={() => setMoreOpen(false)}
                  />
                ))}
              </>
            )}
          </nav>
        </ModalContent>
      </Modal>
    </>
  );
}
