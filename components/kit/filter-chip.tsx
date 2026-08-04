"use client"

import * as React from "react"
import { Toggle } from "@base-ui/react/toggle"
import { Check, X } from "lucide-react"

import { cn } from "@/lib/utils"

interface FilterChipProps {
  selected?: boolean
  onSelectedChange?: (selected: boolean) => void
  /** Optional count badge shown after the label. */
  count?: number
  /** Shows a trailing remove (×) control when true. */
  removable?: boolean
  onRemove?: () => void
  children: React.ReactNode
  className?: string
  disabled?: boolean
}

function FilterChip({
  selected = false,
  onSelectedChange,
  count,
  removable = false,
  onRemove,
  children,
  className,
  disabled,
}: FilterChipProps) {
  return (
    <div
      data-slot="filter-chip"
      data-selected={selected || undefined}
      className={cn(
        "group inline-flex h-8 shrink-0 items-center rounded-full border border-line bg-white text-ink-700 transition-colors",
        "data-[selected]:border-sky-600 data-[selected]:bg-sky-600 data-[selected]:text-white",
        className
      )}
    >
      <Toggle
        pressed={selected}
        onPressedChange={onSelectedChange}
        disabled={disabled}
        className={cn(
          "inline-flex h-full items-center gap-1.5 rounded-full py-0.5 pl-3 text-[0.8125rem] font-medium outline-none select-none",
          "focus-visible:ring-2 focus-visible:ring-sky-300 disabled:pointer-events-none disabled:opacity-50",
          removable ? "pr-1.5" : "pr-3"
        )}
      >
        {selected && <Check aria-hidden="true" className="size-3.5 shrink-0" />}
        {children}
        {typeof count === "number" && (
          <span
            className={cn(
              "inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-sky-100 px-1 text-[0.6875rem] font-semibold text-sky-700",
              "group-data-[selected]:bg-white/20 group-data-[selected]:text-white"
            )}
          >
            {count}
          </span>
        )}
      </Toggle>
      {removable && (
        <button
          type="button"
          aria-label="Remove filter"
          disabled={disabled}
          onClick={onRemove}
          className="mr-1 inline-flex size-6 shrink-0 items-center justify-center rounded-full outline-none hover:bg-black/10 focus-visible:ring-2 focus-visible:ring-sky-300 disabled:pointer-events-none disabled:opacity-50"
        >
          <X className="size-3" />
        </button>
      )}
    </div>
  )
}

export { FilterChip }
export type { FilterChipProps }
