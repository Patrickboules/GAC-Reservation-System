"use client"

import * as React from "react"
import Link from "next/link"
import { CalendarClock, History, Hourglass, XCircle } from "lucide-react"

import { SegmentedControl } from "@/components/kit/segmented-control"
import { BookingCard } from "@/components/kit/booking-card"
import { EmptyState } from "@/components/kit/empty-state"
import { Button } from "@/components/kit/button"
import type { BookingStatus } from "@/lib/bookings/conflict-check"
import { MAX_OPEN_PENDING_BOOKINGS } from "@/lib/bookings/limits"
import type { BookingBucket } from "@/lib/bookings/status"

interface MyBookingCardData {
  id: string
  roomName: string
  date: string
  startTime: string
  endTime: string
  service: string
  status: BookingStatus
}

const BUCKETS: { value: BookingBucket; label: string }[] = [
  { value: "upcoming", label: "Upcoming" },
  { value: "pending", label: "Pending" },
  { value: "past", label: "Past" },
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
      <SegmentedControl
        options={BUCKETS.map(({ value, label }) => ({
          value,
          label:
            value === "pending"
              ? `${label} (${buckets[value].length}/${MAX_OPEN_PENDING_BOOKINGS})`
              : `${label} (${buckets[value].length})`,
        }))}
        value={active}
        onValueChange={setActive}
        className="w-full"
      />

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
              <Link href={`/bookings/${booking.id}`} className="block">
                <BookingCard
                  roomName={booking.roomName}
                  date={booking.date}
                  startTime={booking.startTime}
                  endTime={booking.endTime}
                  service={booking.service}
                  status={booking.status}
                />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export { MyBookingsTabs }
export type { MyBookingCardData }
