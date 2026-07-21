"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Bell, Search, CalendarClock, CheckCircle2, UserPlus, XCircle, CircleSlash } from "lucide-react";

import { cn } from "@/lib/utils";
import { formatRelativeTime } from "@/lib/dates";
import type { NotificationListItem } from "@/lib/notifications";
import { logout } from "@/app/logout/actions";
import { markNotificationsRead } from "@/app/(app)/notifications/actions";
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

const NOTIFICATION_ICONS = {
  reminder: { icon: CalendarClock, className: "text-sky-600" },
  approved: { icon: CheckCircle2, className: "text-status-approved-fg" },
  rejected: { icon: XCircle, className: "text-status-rejected-fg" },
  cancelled: { icon: CircleSlash, className: "text-status-cancelled-fg" },
  admin_new_request: { icon: UserPlus, className: "text-sky-600" },
} as const;

interface TopBarProps {
  profile: TopBarProfile;
  /** Most recent notifications (US-025), newest first. Defaults to empty. */
  notifications?: NotificationListItem[];
  /** Total unread notification count, may exceed `notifications.length`. */
  unreadCount?: number;
  /** Left-side slot populated by calendar pages (US-027/US-028); blank until then. */
  dateContext?: React.ReactNode;
  variant?: "desktop" | "mobile";
  className?: string;
}

export function TopBar({
  profile,
  notifications = [],
  unreadCount = 0,
  dateContext,
  variant = "desktop",
  className,
}: TopBarProps) {
  const [searchOpen, setSearchOpen] = useState(false);
  const [items, setItems] = useState(notifications);
  const [unread, setUnread] = useState(unreadCount);
  const [, startTransition] = useTransition();
  const compact = variant === "mobile";

  function handleNotificationsOpenChange(open: boolean) {
    if (!open) return;
    const unreadIds = items.filter((item) => !item.readAt).map((item) => item.id);
    if (unreadIds.length === 0) return;

    setItems((current) =>
      current.map((item) =>
        unreadIds.includes(item.id) ? { ...item, readAt: new Date().toISOString() } : item
      )
    );
    setUnread(0);
    startTransition(() => {
      void markNotificationsRead(unreadIds);
    });
  }

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

        <DropdownMenu onOpenChange={handleNotificationsOpenChange}>
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
                {unread > 0 && (
                  <span
                    aria-hidden="true"
                    className="absolute top-1.5 right-1.5 size-2 rounded-full bg-status-rejected-fg"
                  />
                )}
              </IconButton>
            }
          />
          <DropdownMenuContent className="w-80">
            <DropdownMenuGroup>
              <DropdownMenuGroupLabel>Notifications</DropdownMenuGroupLabel>
              {items.length === 0 ? (
                <div className="px-2 py-6 text-center text-small text-ink-500">
                  You&apos;re all caught up.
                </div>
              ) : (
                <div className="max-h-80 overflow-y-auto">
                  {items.map((item) => {
                    const { icon: Icon, className: iconClassName } = NOTIFICATION_ICONS[item.type];
                    const content = (
                      <>
                        <Icon className={cn("mt-0.5 size-4 shrink-0", iconClassName)} />
                        <div className="min-w-0 flex-1">
                          <p
                            className={cn(
                              "text-small text-ink-700",
                              !item.readAt && "font-medium text-ink-900"
                            )}
                          >
                            {item.message}
                          </p>
                          <p className="mt-0.5 text-caption text-ink-500">
                            {formatRelativeTime(item.createdAt)}
                          </p>
                        </div>
                        {!item.readAt && (
                          <span
                            aria-hidden="true"
                            className="mt-1.5 size-1.5 shrink-0 rounded-full bg-sky-600"
                          />
                        )}
                      </>
                    );

                    return (
                      <DropdownMenuItem
                        key={item.id}
                        className="items-start gap-2 whitespace-normal"
                        render={
                          item.bookingId ? <Link href={`/bookings/${item.bookingId}`} /> : <div />
                        }
                      >
                        {content}
                      </DropdownMenuItem>
                    );
                  })}
                </div>
              )}
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
