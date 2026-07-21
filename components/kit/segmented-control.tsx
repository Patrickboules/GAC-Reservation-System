"use client"

import * as React from "react"
import { ToggleGroup } from "@base-ui/react/toggle-group"
import { Toggle } from "@base-ui/react/toggle"

import { cn } from "@/lib/utils"

interface SegmentedControlOption<Value extends string> {
  value: Value
  label: React.ReactNode
}

interface SegmentedControlProps<Value extends string> {
  /** 2–4 segments. */
  options: readonly SegmentedControlOption<Value>[]
  value: Value
  onValueChange: (value: Value) => void
  disabled?: boolean
  className?: string
}

function SegmentedControl<Value extends string>({
  options,
  value,
  onValueChange,
  disabled,
  className,
}: SegmentedControlProps<Value>) {
  return (
    <ToggleGroup
      data-slot="segmented-control"
      value={[value]}
      onValueChange={(next) => {
        const nextValue = next[0] as Value | undefined
        if (nextValue) onValueChange(nextValue)
      }}
      disabled={disabled}
      className={cn(
        "inline-flex items-center gap-0.5 rounded-md border border-line bg-sand-50 p-1",
        className
      )}
    >
      {options.map((option) => (
        <Toggle
          key={option.value}
          value={option.value}
          className={cn(
            "inline-flex h-8 items-center justify-center rounded-sm px-3 text-[0.8125rem] font-medium text-ink-500 outline-none transition-all select-none",
            "hover:text-ink-700 focus-visible:ring-2 focus-visible:ring-sky-300",
            "data-[pressed]:bg-white data-[pressed]:text-ink-900 data-[pressed]:shadow-sm",
            "disabled:pointer-events-none disabled:opacity-50"
          )}
        >
          {option.label}
        </Toggle>
      ))}
    </ToggleGroup>
  )
}

export { SegmentedControl }
export type { SegmentedControlProps, SegmentedControlOption }
