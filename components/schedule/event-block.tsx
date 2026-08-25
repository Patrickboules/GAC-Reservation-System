"use client"

import * as React from "react"
import { Popover } from "@base-ui/react/popover"
import { User } from "lucide-react"

import { StatusBadge, STATUS_LABELS } from "@/components/kit/status-badge"
import {
  Modal,
  ModalContent,
  ModalDescription,
  ModalHeader,
  ModalTitle,
} from "@/components/kit/modal"
import type { BookingStatus } from "@/lib/bookings/conflict-check"
import { formatTimeLabel, timeToMinutes } from "@/lib/dates"
import { percentForTime } from "@/lib/schedule/hours"
import { serviceColor } from "@/lib/schedule/service-colors"
import { cn } from "@/lib/utils"

/**
 * At or above this rendered width (px), the block shows its service label.
 * Below it there is no room for legible text, so the block renders as a bare
 * colored bar and the popover carries the detail.
 */
const LABEL_MIN_WIDTH_PX = 40

export interface EventBlockProps {
  id: string
  roomName: string
  startTime: string
  endTime: string
  status: BookingStatus
  /** Service/purpose (US-031's category color + label); omitted lines don't render. */
  service?: string | null
  /** Requester's display name; omitted for scheduling views that don't expose other members' identities. */
  requesterName?: string | null
  /** Vertical (px) offset of this event's lane within its room row, for stacking concurrent overlaps (US-005). */
  top: number
  /** Vertical (px) height of this event's lane within its room row. */
  height: number
  /**
   * 0-based position of this event's room among the currently-visible rooms,
   * used for left/right arrow-key navigation between room columns (US-046).
   * Defaults to 0, which is correct for single-room views (e.g. mobile).
   */
  roomIndex?: number
  className?: string
}

/**
 * A single booking rendered as a horizontal block positioned along the time
 * axis, tinted by service category.
 *
 * The face carries one line only — the service that reserved the slot. The lane
 * is a fixed 48px (EVENT_LANE_HEIGHT_PX in timeline-grid), which stacking
 * service/time/requester used to overflow and clip. Time range, requester and
 * status live in the hover/focus popover and the click-through detail sheet,
 * where they have room; status also stays legible on the face itself through
 * the dashed border (pending) and struck-through grey treatment (cancelled).
 */
function EventBlock({
  id,
  roomName,
  startTime,
  endTime,
  status,
  service,
  requesterName,
  top,
  height,
  roomIndex = 0,
  className,
}: EventBlockProps) {
  const [hoverOpen, setHoverOpen] = React.useState(false)
  const [detailOpen, setDetailOpen] = React.useState(false)
  const triggerRef = React.useRef<HTMLButtonElement>(null)
  const [renderedWidth, setRenderedWidth] = React.useState(0)

  React.useEffect(() => {
    const el = triggerRef.current
    if (!el) return
    const observer = new ResizeObserver(() => {
      setRenderedWidth(el.getBoundingClientRect().width)
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  const showLabel = renderedWidth >= LABEL_MIN_WIDTH_PX
  const cancelled = status === "cancelled"
  const timeLabel = `${formatTimeLabel(startTime)}–${formatTimeLabel(endTime)}`
  const { accent, tint } = serviceColor(service)
  const ariaLabel = `${service ? `${service}, ` : ""}${roomName}, ${timeLabel}, ${STATUS_LABELS[status]}`

  const leftPct = percentForTime(startTime)
  const widthPct = percentForTime(endTime) - leftPct
  const startMinutes = timeToMinutes(startTime)

  function handleFocus(event: React.FocusEvent<HTMLButtonElement>) {
    setHoverOpen(true)
    // Tracked on the grid container (US-046) so arrow-key navigation has a
    // stable "current event" reference even if DOM focus transiently lands
    // elsewhere (e.g. a closing popover) — see handleScheduleGridKeyDown.
    const grid = event.currentTarget.closest<HTMLElement>("[data-schedule-grid]")
    if (grid) grid.dataset.focusedEventId = id
  }

  return (
    <>
      <Popover.Root open={hoverOpen} onOpenChange={setHoverOpen}>
        <button
          ref={triggerRef}
          type="button"
          data-slot="event-block"
          data-event-id={id}
          data-room-index={roomIndex}
          data-start-minutes={startMinutes}
          aria-label={ariaLabel}
          onMouseEnter={() => setHoverOpen(true)}
          onMouseLeave={() => setHoverOpen(false)}
          onFocus={handleFocus}
          onBlur={() => setHoverOpen(false)}
          onClick={() => setDetailOpen(true)}
          style={{
            top,
            height,
            left: `calc(${leftPct}% + 1px)`,
            width: `calc(${widthPct}% - 2px)`,
          }}
          className={cn(
            "absolute flex items-center overflow-hidden rounded-md border border-l-4 px-2 py-1 text-left outline-none transition-shadow",
            "hover:shadow-sm focus-visible:ring-2 focus-visible:ring-sky-300",
            cancelled
              ? "border-ink-300 border-l-ink-300 bg-sand-100 opacity-60"
              : cn("border-transparent", accent, tint),
            !cancelled && status === "pending" && "border-dashed opacity-70",
            className
          )}
        >
          {showLabel && (
            <span
              className={cn(
                "min-w-0 truncate font-medium text-caption text-ink-900",
                cancelled && "text-ink-500 line-through"
              )}
            >
              {service ?? "Booked"}
            </span>
          )}
        </button>

        <Popover.Portal>
          <Popover.Positioner anchor={triggerRef} side="right" sideOffset={8} className="z-40 outline-none">
            <Popover.Popup
              initialFocus={false}
              finalFocus={false}
              className="w-64 rounded-md border border-line bg-white p-3 shadow-md outline-none"
            >
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate font-display text-small text-ink-900">
                    {service ?? (
                      <span lang="ar" dir="rtl">
                        {roomName}
                      </span>
                    )}
                  </span>
                  <StatusBadge status={status} />
                </div>
                {service && (
                  <span lang="ar" dir="rtl" className="truncate text-caption text-ink-700">
                    {roomName}
                  </span>
                )}
                <span className="font-mono text-caption text-ink-700">{timeLabel}</span>
                {requesterName && (
                  <span className="flex items-center gap-1 text-caption text-ink-700">
                    <User aria-hidden="true" className="size-3 shrink-0" />
                    <span className="truncate">{requesterName}</span>
                  </span>
                )}
              </div>
            </Popover.Popup>
          </Popover.Positioner>
        </Popover.Portal>
      </Popover.Root>

      <Modal open={detailOpen} onOpenChange={setDetailOpen}>
        <ModalContent>
          <ModalHeader>
            <ModalTitle>
              {service ?? (
                <span lang="ar" dir="rtl">
                  {roomName}
                </span>
              )}
            </ModalTitle>
            <ModalDescription className="font-mono">{timeLabel}</ModalDescription>
          </ModalHeader>
          <div className="flex flex-col gap-2 text-small text-ink-700">
            <StatusBadge status={status} />
            <p>
              Room:{" "}
              <span lang="ar" dir="rtl">
                {roomName}
              </span>
            </p>
            {requesterName && <p>Requested by {requesterName}</p>}
          </div>
        </ModalContent>
      </Modal>
    </>
  )
}

export { EventBlock }
