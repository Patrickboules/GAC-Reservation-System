"use client"

import * as React from "react"
import { MoreVertical } from "lucide-react"

import { cn } from "@/lib/utils"
import { formatDateLabel, formatTimeLabel } from "@/lib/dates"
import type { BookingStatus } from "@/lib/bookings/conflict-check"
import { StatusBadge } from "@/components/kit/status-badge"
import { IconButton } from "@/components/kit/icon-button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/kit/dropdown-menu"
import {
  Modal,
  ModalClose,
  ModalContent,
  ModalDescription,
  ModalFooter,
  ModalHeader,
  ModalTitle,
} from "@/components/kit/modal"
import { Button } from "@/components/kit/button"

const STRIPE_CLASSES: Record<BookingStatus, string> = {
  approved: "bg-status-approved-fg",
  pending: "bg-status-pending-fg",
  rejected: "bg-status-rejected-fg",
  cancelled: "bg-status-cancelled-fg",
}

interface BookingCardProps {
  roomName: string
  date: string
  startTime: string
  endTime: string
  service: string
  status: BookingStatus
  /** When provided, the overflow menu offers a "Modify" item linking here. */
  onModify?: () => void
  /** When provided, the overflow menu offers a "Cancel" item, guarded by a confirm step. */
  onCancel?: () => void
  className?: string
}

function BookingCard({
  roomName,
  date,
  startTime,
  endTime,
  service,
  status,
  onModify,
  onCancel,
  className,
}: BookingCardProps) {
  const [confirmOpen, setConfirmOpen] = React.useState(false)
  const showMenu = Boolean(onModify || onCancel)

  return (
    <div
      data-slot="booking-card"
      className={cn(
        "flex items-stretch gap-3 overflow-hidden rounded-lg border border-line bg-surface shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md",
        className
      )}
    >
      <div
        className={cn("w-1.5 shrink-0", STRIPE_CLASSES[status])}
        aria-hidden="true"
      />
      <div className="flex min-w-0 flex-1 flex-col gap-1.5 py-3 pr-2">
        <div className="flex items-start justify-between gap-2">
          <span className="truncate text-body font-semibold text-ink-900">
            {roomName}
          </span>
          <StatusBadge status={status} />
        </div>
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-small text-ink-700">
          <span>{formatDateLabel(date)}</span>
          <span aria-hidden="true" className="text-ink-300">
            ·
          </span>
          <span className="font-mono tabular-nums">
            {formatTimeLabel(startTime)}–{formatTimeLabel(endTime)}
          </span>
        </div>
        <div>
          <span className="inline-flex items-center rounded-full bg-sky-50 px-2 py-0.5 text-caption font-medium text-sky-700">
            {service}
          </span>
        </div>
        {status === "pending" && (
          <p className="text-caption text-status-pending-fg">Awaiting approval</p>
        )}
      </div>
      {showMenu && (
        <div className="flex shrink-0 items-start pt-2 pr-2">
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <IconButton label="Booking actions" variant="ghost" size="sm">
                  <MoreVertical />
                </IconButton>
              }
            />
            <DropdownMenuContent>
              {onModify && (
                <DropdownMenuItem onClick={onModify}>Modify</DropdownMenuItem>
              )}
              {onCancel && (
                <DropdownMenuItem
                  variant="danger"
                  onClick={() => setConfirmOpen(true)}
                >
                  Cancel
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}
      {onCancel && (
        <Modal open={confirmOpen} onOpenChange={setConfirmOpen}>
          <ModalContent>
            <ModalHeader>
              <ModalTitle>Cancel this booking?</ModalTitle>
              <ModalDescription>
                This frees up the slot immediately and can&apos;t be undone.
              </ModalDescription>
            </ModalHeader>
            <ModalFooter>
              <ModalClose render={<Button variant="secondary">Keep booking</Button>} />
              <Button
                variant="danger"
                onClick={() => {
                  setConfirmOpen(false)
                  onCancel()
                }}
              >
                Cancel booking
              </Button>
            </ModalFooter>
          </ModalContent>
        </Modal>
      )}
    </div>
  )
}

export { BookingCard }
export type { BookingCardProps }
