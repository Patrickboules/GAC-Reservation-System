import type * as React from "react"

import { cn } from "@/lib/utils"

type EmptyStateTone = "neutral" | "approved" | "pending"

const TONE_CLASSES: Record<EmptyStateTone, string> = {
  neutral: "bg-sand-100 text-ink-300",
  approved: "bg-status-approved-bg text-status-approved-fg",
  pending: "bg-status-pending-bg text-status-pending-fg",
}

interface EmptyStateProps extends React.ComponentProps<"div"> {
  /** Optional icon/illustration slot rendered above the headline. */
  icon?: React.ReactNode
  /** Tints the icon's background chip to match what the emptiness means — e.g. "approved" for a reassuring "nothing pending" state. @default "neutral" */
  tone?: EmptyStateTone
  /** Display-font headline, e.g. "No bookings yet". */
  title: string
  /** Supporting copy shown under the headline. */
  description?: string
  /** One primary action, e.g. a Button — an empty screen is an invitation to act. */
  action?: React.ReactNode
}

function EmptyState({
  className,
  icon,
  tone = "neutral",
  title,
  description,
  action,
  ...props
}: EmptyStateProps) {
  return (
    <div
      data-slot="empty-state"
      className={cn(
        "flex flex-col items-center gap-3 rounded-lg border border-dashed border-line px-6 py-12 text-center",
        className
      )}
      {...props}
    >
      {icon && (
        <div
          aria-hidden="true"
          className={cn("flex size-12 items-center justify-center rounded-full", TONE_CLASSES[tone])}
        >
          {icon}
        </div>
      )}
      <h3 className="font-display text-h3 text-ink-900">{title}</h3>
      {description && (
        <p className="max-w-sm text-small text-ink-500">{description}</p>
      )}
      {action && <div className="mt-2">{action}</div>}
    </div>
  )
}

export { EmptyState }
export type { EmptyStateProps }
