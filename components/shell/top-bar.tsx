"use client";

import { useState } from "react";
import { Bell, Search } from "lucide-react";

import { cn } from "@/lib/utils";
import { logout } from "@/app/logout/actions";
import { Avatar } from "@/components/kit/avatar";
import { IconButton } from "@/components/kit/icon-button";
import { RoleBadge, type MemberRole } from "@/components/kit/role-badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuGroupLabel,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/kit/dropdown-menu";
import {
  Modal,
  ModalContent,
  ModalDescription,
  ModalHeader,
  ModalTitle,
} from "@/components/kit/modal";

interface TopBarProfile {
  displayName: string;
  role: MemberRole;
}

interface TopBarProps {
  profile: TopBarProfile;
  /** Unread notification count. Real data is wired in US-025 — defaults to 0. */
  unreadCount?: number;
  /** Left-side slot populated by calendar pages (US-027/US-028); blank until then. */
  dateContext?: React.ReactNode;
  variant?: "desktop" | "mobile";
  className?: string;
}

export function TopBar({
  profile,
  unreadCount = 0,
  dateContext,
  variant = "desktop",
  className,
}: TopBarProps) {
  const [searchOpen, setSearchOpen] = useState(false);
  const compact = variant === "mobile";

  return (
    <header
      className={cn(
        "sticky top-0 z-40 flex shrink-0 items-center justify-between gap-3 border-b border-line bg-surface",
        compact ? "h-14 px-4" : "h-16 px-6",
        className,
      )}
    >
      <div className="flex min-w-0 items-center gap-3">
        {dateContext ??
          (compact && (
            <span className="truncate font-display text-h3 font-semibold text-ink-900">
              GAC
            </span>
          ))}
      </div>

      <div className="flex shrink-0 items-center gap-1">
        <IconButton
          label="Find a room"
          tooltip={compact ? undefined : "Find a room"}
          variant="ghost"
          size={compact ? "sm" : "md"}
          onClick={() => setSearchOpen(true)}
        >
          <Search className={compact ? "size-4" : "size-5"} />
        </IconButton>

        <DropdownMenu>
          {/* No tooltip prop here: IconButton wraps tooltipped triggers in
              Tooltip.Root, which breaks DropdownMenuTrigger's render merge. */}
          <DropdownMenuTrigger
            render={
              <IconButton
                label="Notifications"
                variant="ghost"
                size={compact ? "sm" : "md"}
                className="relative"
              >
                <Bell className={compact ? "size-4" : "size-5"} />
                {unreadCount > 0 && (
                  <span
                    aria-hidden="true"
                    className="absolute top-1.5 right-1.5 size-2 rounded-full bg-status-rejected-fg"
                  />
                )}
              </IconButton>
            }
          />
          <DropdownMenuContent className="w-72">
            <DropdownMenuGroup>
              <DropdownMenuGroupLabel>Notifications</DropdownMenuGroupLabel>
              <div className="px-2 py-6 text-center text-small text-ink-500">
                You&apos;re all caught up.
              </div>
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <button
                type="button"
                aria-label="Profile menu"
                className="flex items-center rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300"
              >
                <Avatar name={profile.displayName} size="sm" />
              </button>
            }
          />
          <DropdownMenuContent className="w-56">
            <div className="flex items-center gap-2 px-2 py-1.5">
              <Avatar name={profile.displayName} size="sm" />
              <div className="min-w-0">
                <p className="truncate text-small font-medium text-ink-900">
                  {profile.displayName}
                </p>
                <RoleBadge role={profile.role} className="mt-0.5" />
              </div>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              variant="danger"
              onClick={() => {
                void logout();
              }}
            >
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <Modal open={searchOpen} onOpenChange={setSearchOpen}>
        <ModalContent>
          <ModalHeader>
            <ModalTitle>Find a room</ModalTitle>
            <ModalDescription>
              Search by date, time, and capacity — coming soon.
            </ModalDescription>
          </ModalHeader>
          <div className="py-6 text-center text-small text-ink-500">
            Room availability search will appear here.
          </div>
        </ModalContent>
      </Modal>
    </header>
  );
}

export type { TopBarProfile };
