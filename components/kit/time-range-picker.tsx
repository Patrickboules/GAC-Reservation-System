"use client"

import * as React from "react"
import { AlertTriangle, CheckCircle2, ChevronDown, ChevronUp } from "lucide-react"

import { cn } from "@/lib/utils"
import { formatTimeLabel, minutesToTime, snapMinutesToStep, timeToMinutes } from "@/lib/dates"
import { BOOKING_TIME_STEP_MINUTES } from "@/lib/bookings/time-granularity"
import { LATEST_BOOKING_END_MINUTES } from "@/lib/bookings/limits"

const MAX_MINUTES = LATEST_BOOKING_END_MINUTES

interface TimeStepperProps {
  label: string
  time: string
  stepMinutes: number
  onChange: (time: string) => void
  disabled?: boolean
  /** Lower bound in minutes-since-midnight. @default 0 */
  minMinutes?: number
  /** Upper bound in minutes-since-midnight. @default MAX_MINUTES */
  maxMinutes?: number
}

function TimeStepper({
  label,
  time,
  stepMinutes,
  onChange,
  disabled,
  minMinutes = 0,
  maxMinutes = MAX_MINUTES,
}: TimeStepperProps) {
  const minutes = timeToMinutes(time)

  function step(direction: 1 | -1) {
    const next = snapMinutesToStep(minutes + direction * stepMinutes, stepMinutes)
    onChange(minutesToTime(Math.min(Math.max(next, minMinutes), maxMinutes)))
  }

  return (
    <div
      data-slot="time-stepper"
      className="flex flex-col items-center gap-1 rounded-md border border-line bg-white px-3 py-2"
    >
      <button
        type="button"
        aria-label={`Increase ${label} by ${stepMinutes} minutes`}
        disabled={disabled || minutes >= maxMinutes}
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
        disabled={disabled || minutes <= minMinutes}
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
  /** Shown in a success-styled banner when set and `hasConflict` is false —
   * lets the caller confirm "this slot is free" instead of leaving a
   * successful check silent. Ignored while `hasConflict` is true. */
  freeMessage?: React.ReactNode
  disabled?: boolean
  className?: string
}

/**
 * Start/end steppers that stay a valid range on their own: moving the start
 * carries the end along by the same duration, and the end can never be stepped
 * to or before the start — so an invalid "9:30 PM to 3:30 PM" can't be produced
 * and the user never has to fix the end time by hand.
 */
function TimeRangePicker({
  startTime,
  endTime,
  onStartTimeChange,
  onEndTimeChange,
  stepMinutes = BOOKING_TIME_STEP_MINUTES,
  hasConflict = false,
  conflictMessage = "This time may conflict with an existing booking.",
  freeMessage,
  disabled,
  className,
}: TimeRangePickerProps) {
  const startMinutes = timeToMinutes(startTime)
  const endMinutes = timeToMinutes(endTime)
  const durationMinutes = Math.max(0, endMinutes - startMinutes)
  const hours = Math.floor(durationMinutes / 60)
  const minutes = durationMinutes % 60

  function handleStartChange(next: string) {
    onStartTimeChange(next)

    // Keep the booking the same length as the user moves the start, so the end
    // follows automatically instead of being left behind (or before) the start.
    const heldDuration = Math.max(endMinutes - startMinutes, stepMinutes)
    const nextEnd = Math.min(timeToMinutes(next) + heldDuration, MAX_MINUTES)
    if (nextEnd !== endMinutes) {
      onEndTimeChange(minutesToTime(nextEnd))
    }
  }

  function handleEndChange(next: string) {
    // The end stepper is already bounded below, but guard the value itself too.
    const floor = Math.min(startMinutes + stepMinutes, MAX_MINUTES)
    onEndTimeChange(minutesToTime(Math.max(timeToMinutes(next), floor)))
  }

  return (
    <div data-slot="time-range-picker" className={cn("flex flex-col gap-2", className)}>
      <div className="flex items-center gap-3">
        <TimeStepper
          label="start time"
          time={startTime}
          stepMinutes={stepMinutes}
          onChange={handleStartChange}
          disabled={disabled}
          maxMinutes={MAX_MINUTES - stepMinutes}
        />
        <span aria-hidden="true" className="text-sm text-ink-500">
          to
        </span>
        <TimeStepper
          label="end time"
          time={endTime}
          stepMinutes={stepMinutes}
          onChange={handleEndChange}
          disabled={disabled}
          minMinutes={Math.min(startMinutes + stepMinutes, MAX_MINUTES)}
        />
      </div>
      <p className="font-mono text-caption tabular-nums text-ink-500">
        duration: {hours}h {minutes}m
      </p>
      {hasConflict ? (
        <div
          role="alert"
          className="flex items-start gap-1.5 rounded-md bg-status-pending-bg px-2.5 py-2 text-caption font-medium text-status-pending-fg"
        >
          <AlertTriangle aria-hidden="true" className="size-4 shrink-0" />
          <span>{conflictMessage}</span>
        </div>
      ) : (
        freeMessage && (
          <div
            role="status"
            className="flex items-start gap-1.5 rounded-md bg-status-approved-bg px-2.5 py-2 text-caption font-medium text-status-approved-fg"
          >
            <CheckCircle2 aria-hidden="true" className="size-4 shrink-0" />
            <span>{freeMessage}</span>
          </div>
        )
      )}
    </div>
  )
}

export { TimeRangePicker }
export type { TimeRangePickerProps }
