"use client"

import Link from "next/link"

import { cn } from "@/lib/utils"
import { formatDateLabel, formatTimeLabel } from "@/lib/dates"
import type { BookingStatus } from "@/lib/bookings/conflict-check"
import { isBookingModifiable } from "@/lib/bookings/status"
import { StatusBadge } from "@/components/kit/status-badge"
import { Button } from "@/components/kit/button"
import { CancelBookingButton } from "@/components/bookings/cancel-booking-button"

const STRIPE_CLASSES: Record<BookingStatus, string> = {
  approved: "bg-status-approved-fg",
  pending: "bg-status-pending-fg",
  rejected: "bg-status-rejected-fg",
  cancelled: "bg-status-cancelled-fg",
}

interface BookingCardProps {
  bookingId: string
  roomName: string
  date: string
  startTime: string
  endTime: string
  service: string
  status: BookingStatus
  /** Shown when status is "rejected" (the reason an admin gave). */
  rejectReason?: string | null
  className?: string
}

/**
 * Modify/Cancel render as directly visible buttons (not behind an overflow
 * menu) whenever the booking is still modifiable — same gate the booking
 * detail page uses (lib/bookings/status.ts's isBookingModifiable), so the
 * two surfaces never disagree about which bookings can still be touched.
 * Cancel reuses CancelBookingButton wholesale rather than re-implementing
 * its confirm-modal + Server Action wiring a second time.
 */
function BookingCard({
  bookingId,
  roomName,
  date,
  startTime,
  endTime,
  service,
  status,
  rejectReason,
  className,
}: BookingCardProps) {
  const modifiable = isBookingModifiable(status, date, endTime)

  return (
    <div
      data-slot="booking-card"
      className={cn(
        "flex items-stretch gap-3 overflow-hidden rounded-lg border border-line bg-surface shadow-sm",
        className
      )}
    >
      <div
        className={cn("w-1.5 shrink-0", STRIPE_CLASSES[status])}
        aria-hidden="true"
      />
      <div className="flex min-w-0 flex-1 flex-col gap-1.5 py-3 pr-2">
        <Link
          href={`/bookings/${bookingId}`}
          className="flex min-w-0 flex-col gap-1.5 outline-none focus-visible:ring-2 focus-visible:ring-sky-300"
        >
          <div className="flex items-start justify-between gap-2">
            <span lang="ar" dir="rtl" className="truncate text-body font-semibold text-ink-900">
              {roomName}
            </span>
            <StatusBadge status={status} />
          </div>
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-small text-ink-700">
            <span>{formatDateLabel(date)}</span>
            <span aria-hidden="true" className="text-ink-300">
              ·
            </span>
            <span className="font-mono tabular-nums">
              {formatTimeLabel(startTime)}–{formatTimeLabel(endTime)}
            </span>
          </div>
          {status === "pending" && (
            <p className="text-caption text-status-pending-fg">Awaiting approval</p>
          )}
          {status === "rejected" && (
            <p className="text-caption text-status-rejected-fg">
              Reason: {rejectReason || "Not specified"}
            </p>
          )}
        </Link>

        <div className="flex items-center justify-between gap-2">
          <span className="inline-flex items-center rounded-full bg-sky-50 px-2 py-0.5 text-caption font-medium text-sky-700">
            {service}
          </span>
          {modifiable && (
            <div className="flex shrink-0 gap-1.5">
              <Button
                variant="secondary"
                size="sm"
                render={<Link href={`/bookings/${bookingId}/edit`}>Modify</Link>}
              />
              <CancelBookingButton bookingId={bookingId} />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export { BookingCard }
export type { BookingCardProps }
