"use client"

import * as React from "react"
import { Popover } from "@base-ui/react/popover"
import { Calendar, ChevronLeft, ChevronRight } from "lucide-react"

import { cn } from "@/lib/utils"
import { formatDateLabel, todayDateString, toDateString } from "@/lib/dates"

const WEEKDAY_LABELS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"]

function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1)
}

function addMonths(date: Date, months: number): Date {
  return new Date(date.getFullYear(), date.getMonth() + months, 1)
}

/** Weeks (each 7 entries) covering `month`, padded with `null` outside the month. */
function buildMonthGrid(month: Date): (Date | null)[][] {
  const first = startOfMonth(month)
  const daysInMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate()
  const leadingBlanks = first.getDay()

  const cells: (Date | null)[] = Array.from({ length: leadingBlanks }, () => null)
  for (let day = 1; day <= daysInMonth; day++) {
    cells.push(new Date(month.getFullYear(), month.getMonth(), day))
  }
  while (cells.length % 7 !== 0) {
    cells.push(null)
  }

  const weeks: (Date | null)[][] = []
  for (let i = 0; i < cells.length; i += 7) {
    weeks.push(cells.slice(i, i + 7))
  }
  return weeks
}

interface DatePickerCalendarProps {
  value: string | null
  onValueChange: (value: string) => void
  isDateDisabled?: (dateStr: string) => boolean
}

function DatePickerCalendar({ value, onValueChange, isDateDisabled }: DatePickerCalendarProps) {
  const today = todayDateString()
  const [viewMonth, setViewMonth] = React.useState(() =>
    startOfMonth(value ? new Date(`${value}T00:00:00`) : new Date())
  )
  const weeks = React.useMemo(() => buildMonthGrid(viewMonth), [viewMonth])
  const monthLabel = viewMonth.toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
  })

  return (
    <div data-slot="date-picker-calendar" className="w-72 select-none">
      <div className="mb-2 flex items-center justify-between">
        <button
          type="button"
          aria-label="Previous month"
          onClick={() => setViewMonth((m) => addMonths(m, -1))}
          className="inline-flex size-8 items-center justify-center rounded-md text-ink-500 outline-none transition-colors hover:bg-sky-50 hover:text-ink-700 focus-visible:ring-2 focus-visible:ring-sky-300"
        >
          <ChevronLeft aria-hidden="true" className="size-4" />
        </button>
        <p className="text-sm font-medium text-ink-900" aria-live="polite">
          {monthLabel}
        </p>
        <button
          type="button"
          aria-label="Next month"
          onClick={() => setViewMonth((m) => addMonths(m, 1))}
          className="inline-flex size-8 items-center justify-center rounded-md text-ink-500 outline-none transition-colors hover:bg-sky-50 hover:text-ink-700 focus-visible:ring-2 focus-visible:ring-sky-300"
        >
          <ChevronRight aria-hidden="true" className="size-4" />
        </button>
      </div>
      <div className="grid grid-cols-7 gap-y-1" role="grid">
        {WEEKDAY_LABELS.map((label) => (
          <div
            key={label}
            aria-hidden="true"
            className="flex h-8 items-center justify-center text-caption text-ink-500"
          >
            {label}
          </div>
        ))}
        {weeks.map((week, weekIndex) =>
          week.map((date, dayIndex) => {
            if (!date) {
              return <div key={`${weekIndex}-${dayIndex}`} aria-hidden="true" />
            }
            const dateStr = toDateString(date)
            const isSelected = dateStr === value
            const isToday = dateStr === today
            const disabled = isDateDisabled?.(dateStr) ?? false

            return (
              <button
                key={dateStr}
                type="button"
                role="gridcell"
                aria-selected={isSelected}
                aria-current={isToday ? "date" : undefined}
                disabled={disabled}
                onClick={() => onValueChange(dateStr)}
                className={cn(
                  "mx-auto inline-flex size-9 items-center justify-center rounded-full text-sm text-ink-900 outline-none transition-colors",
                  "hover:bg-sky-50 focus-visible:ring-2 focus-visible:ring-sky-300",
                  isToday && !isSelected && "ring-2 ring-sky-300",
                  isSelected && "bg-sky-600 text-white hover:bg-sky-600",
                  disabled && "pointer-events-none text-ink-300 hover:bg-transparent"
                )}
              >
                {date.getDate()}
              </button>
            )
          })
        )}
      </div>
    </div>
  )
}

interface DatePickerProps {
  value: string | null
  onValueChange: (value: string) => void
  /** `inline` renders the calendar directly; `popover` renders a trigger button that opens it. */
  mode?: "inline" | "popover"
  isDateDisabled?: (dateStr: string) => boolean
  label?: React.ReactNode
  placeholder?: string
  disabled?: boolean
  className?: string
}

function DatePicker({
  value,
  onValueChange,
  mode = "inline",
  isDateDisabled,
  label,
  placeholder = "Select a date",
  disabled,
  className,
}: DatePickerProps) {
  const [open, setOpen] = React.useState(false)
  const id = React.useId()

  if (mode === "inline") {
    return (
      <div data-slot="date-picker" className={cn("flex flex-col gap-1.5", className)}>
        {label && (
          <span id={id} className="text-sm font-medium text-ink-700">
            {label}
          </span>
        )}
        <div aria-labelledby={label ? id : undefined}>
          <DatePickerCalendar
            value={value}
            onValueChange={onValueChange}
            isDateDisabled={isDateDisabled}
          />
        </div>
      </div>
    )
  }

  return (
    <div data-slot="date-picker" className={cn("flex flex-col gap-1.5", className)}>
      {label && (
        <label htmlFor={id} className="text-sm font-medium text-ink-700">
          {label}
        </label>
      )}
      <Popover.Root open={open} onOpenChange={setOpen}>
        <Popover.Trigger
          id={id}
          disabled={disabled}
          className={cn(
            "flex h-10 w-full items-center gap-2 rounded-md border border-line bg-white px-3 text-sm text-ink-900 outline-none transition-colors",
            "focus-visible:border-sky-600 focus-visible:ring-2 focus-visible:ring-sky-300",
            "disabled:pointer-events-none disabled:opacity-50 disabled:bg-sand-50"
          )}
        >
          <Calendar aria-hidden="true" className="size-4 shrink-0 text-ink-500" />
          <span className={cn("truncate", !value && "text-ink-500")}>
            {value ? formatDateLabel(value) : placeholder}
          </span>
        </Popover.Trigger>
        <Popover.Portal>
          <Popover.Positioner sideOffset={4} className="z-50 outline-none">
            <Popover.Popup className="rounded-md border border-line bg-white p-3 shadow-md outline-none">
              <DatePickerCalendar
                value={value}
                onValueChange={(next) => {
                  onValueChange(next)
                  setOpen(false)
                }}
                isDateDisabled={isDateDisabled}
              />
            </Popover.Popup>
          </Popover.Positioner>
        </Popover.Portal>
      </Popover.Root>
    </div>
  )
}

export { DatePicker }
export type { DatePickerProps }
