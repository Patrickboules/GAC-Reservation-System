"use client"

import * as React from "react"
import { Button as ButtonPrimitive } from "@base-ui/react/button"
import { Tooltip } from "@base-ui/react/tooltip"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const iconButtonVariants = cva(
  "inline-flex shrink-0 items-center justify-center rounded-md transition-all outline-none select-none focus-visible:ring-2 focus-visible:ring-sky-300 active:scale-[.98] disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        primary: "bg-sky-600 text-white hover:bg-sky-700",
        secondary: "border border-line bg-white text-ink-700 hover:bg-sky-50",
        ghost: "bg-transparent text-ink-500 hover:bg-sky-50 hover:text-ink-700",
        danger:
          "bg-status-rejected-bg text-status-rejected-fg hover:bg-status-rejected-fg/15",
      },
      size: {
        sm: "size-8",
        md: "size-10",
        lg: "size-12",
      },
    },
    defaultVariants: {
      variant: "ghost",
      size: "md",
    },
  }
)

interface IconButtonProps
  extends ButtonPrimitive.Props,
    VariantProps<typeof iconButtonVariants> {
  /** Accessible name — required since the button has no visible text. */
  label: string
  /** Optional tooltip content shown on hover/focus, in addition to the aria-label. */
  tooltip?: React.ReactNode
}

function IconButton({
  className,
  variant,
  size,
  label,
  tooltip,
  children,
  ...props
}: IconButtonProps) {
  const button = (
    <ButtonPrimitive
      data-slot="icon-button"
      aria-label={label}
      className={cn(iconButtonVariants({ variant, size, className }))}
      {...props}
    >
      {children}
    </ButtonPrimitive>
  )

  if (!tooltip) {
    return button
  }

  return (
    <Tooltip.Root>
      <Tooltip.Trigger render={button} />
      <Tooltip.Portal>
        <Tooltip.Positioner sideOffset={6}>
          <Tooltip.Popup className="z-50 rounded-sm bg-ink-900 px-2 py-1 text-caption text-white shadow-md">
            {tooltip}
          </Tooltip.Popup>
        </Tooltip.Positioner>
      </Tooltip.Portal>
    </Tooltip.Root>
  )
}

export { IconButton, iconButtonVariants }
export type { IconButtonProps }
