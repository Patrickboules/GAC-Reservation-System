import * as React from "react"

import { cn } from "@/lib/utils"

interface CardProps extends Omit<React.ComponentProps<"div">, "ref"> {
  /** Renders as a different container tag — e.g. "ol"/"ul" for a card that's also a list. @default "div" */
  as?: "div" | "ol" | "ul" | "section"
  /** Adds a hover lift + shadow, for cards that act as a click target. @default false */
  interactive?: boolean
}

/**
 * The one place `rounded-lg border border-line bg-surface shadow-sm` is
 * declared — every bordered content box in the app should compose this
 * instead of re-typing the recipe (found independently in 9+ files before
 * this existed). Padding/gap/etc. are left to the caller via `className`,
 * merged with `cn()` so overrides (e.g. a different `p-*`) win cleanly.
 */
function Card({ as = "div", interactive = false, className, ...props }: CardProps) {
  const Component = as as "div"
  return (
    <Component
      data-slot="card"
      className={cn(
        "rounded-lg border border-line bg-surface p-4 shadow-sm",
        interactive && "transition-all hover:-translate-y-0.5 hover:shadow-md",
        className
      )}
      {...props}
    />
  )
}

export { Card }
export type { CardProps }
