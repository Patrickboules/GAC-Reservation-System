import type * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"
import type { BookingStatus } from "@/lib/bookings/conflict-check"

const statusBadgeVariants = cva(
  "inline-flex w-fit items-center gap-1.5 rounded-full px-2.5 py-0.5 text-caption font-medium",
  {
    variants: {
      status: {
        approved: "bg-status-approved-bg text-status-approved-fg",
        pending: "bg-status-pending-bg text-status-pending-fg",
        rejected: "border border-status-rejected-fg/30 bg-status-rejected-bg text-status-rejected-fg",
        cancelled: "bg-status-cancelled-bg text-status-cancelled-fg",
      } satisfies Record<BookingStatus, string>,
    },
  }
)

const STATUS_LABELS: Record<BookingStatus, string> = {
  approved: "Approved",
  pending: "Pending",
  rejected: "Rejected",
  cancelled: "Cancelled",
}

interface StatusBadgeProps extends VariantProps<typeof statusBadgeVariants> {
  status: BookingStatus
  /** Show a small leading dot in addition to the text label. */
  dot?: boolean
  /** Overrides the default status label with custom text (e.g. "Free until 3:00 PM") — the color still comes from `status`. */
  label?: React.ReactNode
  className?: string
}

function StatusBadge({ status, dot = false, label, className }: StatusBadgeProps) {
  return (
    <span
      data-slot="status-badge"
      className={cn(statusBadgeVariants({ status }), className)}
    >
      {dot && (
        <span
          aria-hidden="true"
          className="size-1.5 shrink-0 rounded-full bg-current"
        />
      )}
      {label ?? STATUS_LABELS[status]}
    </span>
  )
}

export { StatusBadge, statusBadgeVariants, STATUS_LABELS }
export type { StatusBadgeProps }
