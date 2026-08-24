"use client"

import * as React from "react"
import Link from "next/link"
import { Ban, CalendarClock, History, Hourglass, XCircle } from "lucide-react"

import { SegmentedControl } from "@/components/kit/segmented-control"
import { BookingCard } from "@/components/kit/booking-card"
import { EmptyState } from "@/components/kit/empty-state"
import { Button } from "@/components/kit/button"
import type { BookingStatus } from "@/lib/bookings/conflict-check"
import { MAX_OPEN_PENDING_BOOKINGS } from "@/lib/bookings/limits"
import type { BookingBucket } from "@/lib/bookings/status"
import { cn } from "@/lib/utils"

interface MyBookingCardData {
  id: string
  roomName: string
  date: string
  startTime: string
  endTime: string
  service: string
  status: BookingStatus
  /** Set when status is "rejected" — the reason an admin gave. */
  rejectReason?: string | null
}

const BUCKETS: { value: BookingBucket; label: string }[] = [
  { value: "upcoming", label: "Upcoming" },
  { value: "pending", label: "Pending" },
  { value: "past", label: "Past" },
  { value: "rejected", label: "Rejected" },
  { value: "cancelled", label: "Cancelled" },
]

const EMPTY_STATE_CONTENT: Record<
  BookingBucket,
  { icon: React.ReactNode; title: string; description: string; showAction?: boolean }
> = {
  upcoming: {
    icon: <CalendarClock className="size-6" aria-hidden="true" />,
    title: "No upcoming bookings",
    description: "Approved bookings that haven't happened yet will show up here.",
    showAction: true,
  },
  pending: {
    icon: <Hourglass className="size-6" aria-hidden="true" />,
    title: "No pending requests",
    description: "Booking requests awaiting admin approval will appear here.",
  },
  past: {
    icon: <History className="size-6" aria-hidden="true" />,
    title: "No past bookings",
    description: "Bookings that have already happened will show up here.",
  },
  rejected: {
    icon: <Ban className="size-6" aria-hidden="true" />,
    title: "No rejected requests",
    description: "Requests an admin has rejected, with their reason, will appear here.",
  },
  cancelled: {
    icon: <XCircle className="size-6" aria-hidden="true" />,
    title: "No cancelled bookings",
    description: "Bookings you've cancelled will appear here.",
  },
}

interface MyBookingsTabsProps {
  buckets: Record<BookingBucket, MyBookingCardData[]>
}

function MyBookingsTabs({ buckets }: MyBookingsTabsProps) {
  const [active, setActive] = React.useState<BookingBucket>("upcoming")
  const bookings = buckets[active]
  const empty = EMPTY_STATE_CONTENT[active]

  return (
    <div className="flex flex-col gap-4">
      {/* Natural (not full-width) tab widths inside a horizontally-scrolling
          strip: 5 tabs with count badges don't fit a 390px screen without
          either wrapping or truncating if forced into one full-width row. */}
      <div className="-mx-1 overflow-x-auto px-1">
        <SegmentedControl
          options={BUCKETS.map(({ value, label }) => ({
            value,
            label: (
              <>
                {label}{" "}
                <span
                  className={cn(
                    "rounded-full px-1.5 text-[0.6875rem] font-semibold",
                    value === "pending"
                      ? "bg-status-pending-bg text-status-pending-fg"
                      : "bg-sand-100 text-ink-500"
                  )}
                >
                  {value === "pending"
                    ? `${buckets[value].length}/${MAX_OPEN_PENDING_BOOKINGS}`
                    : buckets[value].length}
                </span>
              </>
            ),
          }))}
          value={active}
          onValueChange={setActive}
        />
      </div>

      {bookings.length === 0 ? (
        <EmptyState
          icon={empty.icon}
          title={empty.title}
          description={empty.description}
          action={
            empty.showAction ? (
              <Button size="sm" render={<Link href="/rooms">Request a room</Link>} />
            ) : undefined
          }
        />
      ) : (
        <ul className="flex flex-col gap-3">
          {bookings.map((booking) => (
            <li key={booking.id}>
              <BookingCard
                bookingId={booking.id}
                roomName={booking.roomName}
                date={booking.date}
                startTime={booking.startTime}
                endTime={booking.endTime}
                service={booking.service}
                status={booking.status}
                rejectReason={booking.rejectReason}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export { MyBookingsTabs }
export type { MyBookingCardData }
