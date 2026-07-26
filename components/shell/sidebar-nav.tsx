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
  LogIn,
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";

import { logout } from "@/app/logout/actions";
import { cn } from "@/lib/utils";
import { IconButton } from "@/components/kit/icon-button";

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  isActive: (pathname: string) => boolean;
}

const primaryNavItems: NavItem[] = [
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
  {
    label: "Rooms",
    href: "/rooms",
    icon: Building2,
    isActive: (pathname) => pathname.startsWith("/rooms"),
  },
];

const adminNavItems: NavItem[] = [
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

function NavLink({
  item,
  collapsed,
  active,
}: {
  item: NavItem;
  collapsed: boolean;
  active: boolean;
}) {
  const Icon = item.icon;

  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "relative flex items-center gap-3 rounded-md px-3 py-2 text-body font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300",
        collapsed && "justify-center px-0",
        active
          ? "bg-sky-100 text-sky-700"
          : "text-ink-500 hover:bg-sky-50 hover:text-ink-700",
      )}
    >
      {active && (
        <span
          aria-hidden="true"
          className="absolute inset-y-1 left-0 w-[3px] rounded-full bg-sky-600"
        />
      )}
      <Icon className="size-5 shrink-0" />
      {!collapsed && <span className="truncate">{item.label}</span>}
    </Link>
  );
}

interface SidebarNavProps {
  isAdmin: boolean;
  /** When false (signed-out visitor, US-006), the Log out control becomes a Sign in link. */
  authenticated: boolean;
}

export function SidebarNav({ isAdmin, authenticated }: SidebarNavProps) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      className={cn(
        "sticky top-0 hidden h-screen shrink-0 flex-col border-r border-line bg-surface transition-[width] duration-200 lg:flex",
        collapsed ? "w-[72px]" : "w-60",
      )}
    >
      <div
        className={cn(
          "flex h-16 shrink-0 items-center border-b border-line px-4",
          collapsed ? "justify-center px-0" : "justify-between",
        )}
      >
        {!collapsed && (
          <span className="font-display text-h3 font-semibold text-ink-900">
            GAC
          </span>
        )}
        <IconButton
          label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          tooltip={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          variant="ghost"
          size="sm"
          onClick={() => setCollapsed((current) => !current)}
        >
          {collapsed ? (
            <PanelLeftOpen className="size-4" />
          ) : (
            <PanelLeftClose className="size-4" />
          )}
        </IconButton>
      </div>

      <nav className="flex flex-1 flex-col gap-1 overflow-y-auto p-3">
        {primaryNavItems.map((item) => (
          <NavLink
            key={item.href}
            item={item}
            collapsed={collapsed}
            active={item.isActive(pathname)}
          />
        ))}

        {isAdmin && (
          <>
            <div
              role="separator"
              aria-hidden="true"
              className="my-2 border-t border-line"
            />
            {!collapsed && (
              <span className="px-3 text-caption font-semibold tracking-wide text-ink-300 uppercase">
                Admin
              </span>
            )}
            {adminNavItems.map((item) => (
              <NavLink
                key={item.href}
                item={item}
                collapsed={collapsed}
                active={item.isActive(pathname)}
              />
            ))}
          </>
        )}
      </nav>

      <div className="border-t border-line p-3">
        {authenticated ? (
          <button
            type="button"
            onClick={() => {
              void logout();
            }}
            className={cn(
              "flex w-full items-center gap-3 rounded-md px-3 py-2 text-body font-medium text-ink-500 transition-colors hover:bg-sky-50 hover:text-ink-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300",
              collapsed && "justify-center px-0",
            )}
          >
            <LogOut className="size-5 shrink-0" />
            {!collapsed && <span className="truncate">Log out</span>}
          </button>
        ) : (
          <Link
            href="/login"
            className={cn(
              "flex w-full items-center gap-3 rounded-md px-3 py-2 text-body font-medium text-ink-500 transition-colors hover:bg-sky-50 hover:text-ink-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300",
              collapsed && "justify-center px-0",
            )}
          >
            <LogIn className="size-5 shrink-0" />
            {!collapsed && <span className="truncate">Sign in</span>}
          </Link>
        )}
      </div>
    </aside>
  );
}
