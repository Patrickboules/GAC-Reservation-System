import { Ban, Check, Clock, X } from "lucide-react"
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
        rejected: "bg-status-rejected-bg text-status-rejected-fg",
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

// Color alone shouldn't carry the status — pairs each badge with a distinct
// icon so it still reads correctly for colorblind users, on a grayscale
// screen, or in print.
const STATUS_ICONS: Record<BookingStatus, React.ComponentType<{ className?: string }>> = {
  approved: Check,
  pending: Clock,
  rejected: X,
  cancelled: Ban,
}

interface StatusBadgeProps extends VariantProps<typeof statusBadgeVariants> {
  status: BookingStatus
  className?: string
}

function StatusBadge({ status, className }: StatusBadgeProps) {
  const Icon = STATUS_ICONS[status]
  return (
    <span
      data-slot="status-badge"
      className={cn(statusBadgeVariants({ status }), className)}
    >
      <Icon aria-hidden="true" className="size-3 shrink-0" />
      {STATUS_LABELS[status]}
    </span>
  )
}

export { StatusBadge, statusBadgeVariants, STATUS_LABELS }
export type { StatusBadgeProps }
