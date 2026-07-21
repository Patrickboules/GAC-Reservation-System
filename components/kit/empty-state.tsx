import type * as React from "react"

import { cn } from "@/lib/utils"

interface EmptyStateProps extends React.ComponentProps<"div"> {
  /** Optional icon/illustration slot rendered above the headline. */
  icon?: React.ReactNode
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
        <div aria-hidden="true" className="text-ink-300">
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
