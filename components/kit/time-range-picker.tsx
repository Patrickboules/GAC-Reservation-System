"use client"

import * as React from "react"
import { AlertTriangle, ChevronDown, ChevronUp } from "lucide-react"

import { cn } from "@/lib/utils"
import { formatTimeLabel, minutesToTime, snapMinutesToStep, timeToMinutes } from "@/lib/dates"
import { BOOKING_TIME_STEP_MINUTES } from "@/lib/bookings/time-granularity"

const MAX_MINUTES = 23 * 60 + 59

interface TimeStepperProps {
  label: string
  time: string
  stepMinutes: number
  onChange: (time: string) => void
  disabled?: boolean
}

function TimeStepper({ label, time, stepMinutes, onChange, disabled }: TimeStepperProps) {
  const minutes = timeToMinutes(time)

  function step(direction: 1 | -1) {
    const next = snapMinutesToStep(minutes + direction * stepMinutes, stepMinutes)
    onChange(minutesToTime(Math.min(Math.max(next, 0), MAX_MINUTES)))
  }

  return (
    <div
      data-slot="time-stepper"
      className="flex flex-col items-center gap-1 rounded-md border border-line bg-white px-3 py-2"
    >
      <button
        type="button"
        aria-label={`Increase ${label} by ${stepMinutes} minutes`}
        disabled={disabled || minutes >= MAX_MINUTES}
        onClick={() => step(1)}
        className="inline-flex size-6 items-center justify-center rounded-sm text-ink-500 outline-none transition-colors hover:bg-sky-50 hover:text-ink-700 focus-visible:ring-2 focus-visible:ring-sky-300 disabled:pointer-events-none disabled:opacity-40"
      >
        <ChevronUp aria-hidden="true" className="size-4" />
      </button>
      <span
        aria-live="polite"
        className="font-mono text-lg font-medium tabular-nums text-ink-900"
      >
        {formatTimeLabel(time)}
      </span>
      <button
        type="button"
        aria-label={`Decrease ${label} by ${stepMinutes} minutes`}
        disabled={disabled || minutes <= 0}
        onClick={() => step(-1)}
        className="inline-flex size-6 items-center justify-center rounded-sm text-ink-500 outline-none transition-colors hover:bg-sky-50 hover:text-ink-700 focus-visible:ring-2 focus-visible:ring-sky-300 disabled:pointer-events-none disabled:opacity-40"
      >
        <ChevronDown aria-hidden="true" className="size-4" />
      </button>
    </div>
  )
}

interface TimeRangePickerProps {
  startTime: string
  endTime: string
  onStartTimeChange: (time: string) => void
  onEndTimeChange: (time: string) => void
  /** Snap interval in minutes for both steppers. @default BOOKING_TIME_STEP_MINUTES */
  stepMinutes?: number
  /** Externally supplied conflict flag — this component only renders the warning. */
  hasConflict?: boolean
  conflictMessage?: React.ReactNode
  disabled?: boolean
  className?: string
}

function TimeRangePicker({
  startTime,
  endTime,
  onStartTimeChange,
  onEndTimeChange,
  stepMinutes = BOOKING_TIME_STEP_MINUTES,
  hasConflict = false,
  conflictMessage = "This time may conflict with an existing booking.",
  disabled,
  className,
}: TimeRangePickerProps) {
  const durationMinutes = Math.max(0, timeToMinutes(endTime) - timeToMinutes(startTime))
  const hours = Math.floor(durationMinutes / 60)
  const minutes = durationMinutes % 60

  return (
    <div data-slot="time-range-picker" className={cn("flex flex-col gap-2", className)}>
      <div className="flex items-center gap-3">
        <TimeStepper
          label="start time"
          time={startTime}
          stepMinutes={stepMinutes}
          onChange={onStartTimeChange}
          disabled={disabled}
        />
        <span aria-hidden="true" className="text-sm text-ink-500">
          to
        </span>
        <TimeStepper
          label="end time"
          time={endTime}
          stepMinutes={stepMinutes}
          onChange={onEndTimeChange}
          disabled={disabled}
        />
      </div>
      <p className="font-mono text-caption tabular-nums text-ink-500">
        duration: {hours}h {minutes}m
      </p>
      {hasConflict && (
        <div
          role="alert"
          className="flex items-start gap-1.5 rounded-md bg-status-pending-bg px-2.5 py-2 text-caption font-medium text-status-pending-fg"
        >
          <AlertTriangle aria-hidden="true" className="size-4 shrink-0" />
          <span>{conflictMessage}</span>
        </div>
      )}
    </div>
  )
}

export { TimeRangePicker }
export type { TimeRangePickerProps }
