import type * as React from "react"
import { AlertTriangle } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/kit/button"

interface ErrorStateProps extends React.ComponentProps<"div"> {
  title?: string
  description?: string
  onRetry?: () => void
  retryLabel?: string
}

function ErrorState({
  className,
  title = "Something went wrong",
  description,
  onRetry,
  retryLabel = "Retry",
  ...props
}: ErrorStateProps) {
  return (
    <div
      data-slot="error-state"
      role="alert"
      className={cn(
        "flex flex-col items-center gap-3 rounded-lg border border-status-rejected-fg/20 bg-status-rejected-bg px-6 py-8 text-center",
        className
      )}
      {...props}
    >
      <AlertTriangle
        aria-hidden="true"
        className="size-6 text-status-rejected-fg"
      />
      <h3 className="font-display text-h3 text-ink-900">{title}</h3>
      {description && (
        <p className="max-w-sm text-small text-ink-700">{description}</p>
      )}
      {onRetry && (
        <Button variant="secondary" size="sm" onClick={onRetry} className="mt-1">
          {retryLabel}
        </Button>
      )}
    </div>
  )
}

export { ErrorState }
export type { ErrorStateProps }
