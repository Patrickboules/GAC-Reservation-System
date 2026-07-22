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
import { serviceColor } from "@/lib/schedule/service-colors"
import { cn } from "@/lib/utils"

const STATUS_DOT_CLASSES: Record<BookingStatus, string> = {
  approved: "bg-status-approved-fg",
  pending: "bg-status-pending-fg",
  rejected: "bg-status-rejected-fg",
  cancelled: "bg-status-cancelled-fg",
}

/** Blocks shorter than this collapse to a single time-only line (density guard, spec 4.3). */
const COLLAPSE_HEIGHT_PX = 40

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
  /** Absolute top offset in px within the caller's hour grid. */
  top: number
  /** Absolute height in px within the caller's hour grid. */
  height: number
  /** 0-based column among bookings that overlap this one in time (lib/schedule/event-layout.ts). */
  columnIndex?: number
  /** Total overlapping columns in this booking's cluster. */
  columnCount?: number
  /**
   * 0-based position of this event's room among the currently-visible rooms,
   * used for left/right arrow-key navigation between room columns (US-046).
   * Defaults to 0, which is correct for single-room views (e.g. mobile).
   */
  roomIndex?: number
  className?: string
}

/**
 * A single booking rendered on the resource-day calendar (US-031): time range,
 * category color by service, requester, and a status dot; collapses to a
 * time-only line when short. Hover shows a summary popover, click opens a
 * detail sheet.
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
  columnIndex = 0,
  columnCount = 1,
  roomIndex = 0,
  className,
}: EventBlockProps) {
  const [hoverOpen, setHoverOpen] = React.useState(false)
  const [detailOpen, setDetailOpen] = React.useState(false)
  const triggerRef = React.useRef<HTMLButtonElement>(null)

  const collapsed = height < COLLAPSE_HEIGHT_PX
  const cancelled = status === "cancelled"
  const timeLabel = `${formatTimeLabel(startTime)}–${formatTimeLabel(endTime)}`
  const { accent, tint } = serviceColor(service)
  const ariaLabel = `${roomName}, ${timeLabel}, ${STATUS_LABELS[status]}`

  const widthPct = 100 / columnCount
  const leftPct = widthPct * columnIndex
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
            left: `calc(${leftPct}% + 4px)`,
            width: `calc(${widthPct}% - 8px)`,
          }}
          className={cn(
            "absolute flex flex-col justify-center gap-0.5 overflow-hidden rounded-md border border-l-4 px-2 py-1 text-left outline-none transition-shadow",
            "hover:shadow-sm focus-visible:ring-2 focus-visible:ring-sky-300",
            cancelled
              ? "border-ink-300 border-l-ink-300 bg-sand-100 opacity-60"
              : cn("border-transparent", accent, tint),
            !cancelled && status === "pending" && "border-dashed opacity-70",
            className
          )}
        >
          <span
            className={cn(
              "truncate font-mono text-caption text-ink-900",
              cancelled && "text-ink-500 line-through"
            )}
          >
            {timeLabel}
          </span>
          {!collapsed && (
            <>
              {service && (
                <span
                  className={cn(
                    "truncate text-caption text-ink-700",
                    cancelled && "text-ink-500 line-through"
                  )}
                >
                  {service}
                </span>
              )}
              <span className="flex items-center gap-1 text-caption text-ink-500">
                {requesterName && (
                  <span className={cn("truncate", cancelled && "line-through")}>by {requesterName}</span>
                )}
                <span
                  aria-hidden="true"
                  className={cn("ml-auto size-1.5 shrink-0 rounded-full", STATUS_DOT_CLASSES[status])}
                />
              </span>
            </>
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
                  <span className="truncate font-display text-small text-ink-900">{roomName}</span>
                  <StatusBadge status={status} dot />
                </div>
                <span className="font-mono text-caption text-ink-700">{timeLabel}</span>
                {service && <span className="text-caption text-ink-700">{service}</span>}
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
            <ModalTitle>{roomName}</ModalTitle>
            <ModalDescription className="font-mono">{timeLabel}</ModalDescription>
          </ModalHeader>
          <div className="flex flex-col gap-2 text-small text-ink-700">
            <StatusBadge status={status} dot />
            {service && <p>Service: {service}</p>}
            {requesterName && <p>Requested by {requesterName}</p>}
          </div>
        </ModalContent>
      </Modal>
    </>
  )
}

export { EventBlock }
