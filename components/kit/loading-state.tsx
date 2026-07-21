import type * as React from "react"

import { cn } from "@/lib/utils"
import { Skeleton } from "@/components/kit/skeleton"

interface LoadingStateProps extends React.ComponentProps<"div"> {
  /** Shape of skeleton to shimmer — pick whichever matches the real layout being loaded. */
  variant?: "list" | "cards" | "rows"
  /** Number of skeleton items to render. */
  count?: number
}

function LoadingState({
  className,
  variant = "list",
  count = 4,
  ...props
}: LoadingStateProps) {
  return (
    <div
      data-slot="loading-state"
      role="status"
      aria-label="Loading"
      className={cn(
        variant === "cards"
          ? "grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
          : "flex flex-col gap-3",
        className
      )}
      {...props}
    >
      {Array.from({ length: count }).map((_, i) =>
        variant === "cards" ? (
          <div
            key={i}
            className="flex flex-col gap-3 rounded-lg border border-line bg-surface p-4"
          >
            <Skeleton className="h-24 w-full rounded-md" />
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-3 w-1/3" />
          </div>
        ) : variant === "rows" ? (
          <div
            key={i}
            className="flex items-center gap-4 rounded-md border border-line bg-surface px-4 py-3"
          >
            <Skeleton className="h-4 w-1/4" />
            <Skeleton className="h-4 w-1/6" />
            <Skeleton className="h-4 w-1/6" />
            <Skeleton className="ml-auto h-6 w-16 rounded-full" />
          </div>
        ) : (
          <div
            key={i}
            className="flex items-center gap-3 rounded-lg border border-line bg-surface p-3"
          >
            <Skeleton className="size-10 shrink-0 rounded-full" />
            <div className="flex flex-1 flex-col gap-2">
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-3 w-1/3" />
            </div>
          </div>
        )
      )}
    </div>
  )
}

export { LoadingState }
export type { LoadingStateProps }
