import * as React from "react"
import Link from "next/link"
import {
  Coffee,
  MapPin,
  Mic,
  Monitor,
  ParkingCircle,
  PenSquare,
  Projector,
  Speaker,
  Tag,
  Users,
  Video,
  Wind,
  Wifi,
} from "lucide-react"

import { cn } from "@/lib/utils"

const AMENITY_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  wifi: Wifi,
  projector: Projector,
  whiteboard: PenSquare,
  screen: Monitor,
  tv: Monitor,
  monitor: Monitor,
  microphone: Mic,
  mic: Mic,
  speaker: Speaker,
  sound: Speaker,
  audio: Speaker,
  "video conferencing": Video,
  video: Video,
  ac: Wind,
  "air conditioning": Wind,
  parking: ParkingCircle,
  coffee: Coffee,
  kitchen: Coffee,
}

function amenityIcon(amenity: string) {
  return AMENITY_ICONS[amenity.trim().toLowerCase()] ?? Tag
}

const MAX_VISIBLE_AMENITIES = 4

type RoomCardAvailability = "free" | "busy"

interface RoomCardProps {
  id: string
  name: string
  code?: string | null
  capacity?: number | null
  amenities?: string[] | null
  location?: string | null
  /** Live availability: green dot when free, amber dot when busy right now. */
  availability?: RoomCardAvailability
  /** Header accent color (category color); accepts any Tailwind bg-* class. */
  headerColorClassName?: string
  density?: "grid" | "list"
  href?: string
  className?: string
}

function RoomCard({
  id,
  name,
  code,
  capacity,
  amenities,
  location,
  availability,
  headerColorClassName = "bg-sky-100",
  density = "grid",
  href,
  className,
}: RoomCardProps) {
  const visibleAmenities = (amenities ?? []).slice(0, MAX_VISIBLE_AMENITIES)
  const overflowCount = (amenities?.length ?? 0) - visibleAmenities.length

  const availabilityDot = availability ? (
    <span
      className="inline-flex items-center gap-1.5 text-caption font-medium text-ink-500"
      aria-label={availability === "free" ? "Free now" : "Busy now"}
    >
      <span
        aria-hidden="true"
        className={cn(
          "size-2 shrink-0 rounded-full",
          availability === "free" ? "bg-status-approved-fg" : "bg-status-pending-fg"
        )}
      />
      {availability === "free" ? "Free" : "Busy now"}
    </span>
  ) : null

  const amenityRow =
    visibleAmenities.length > 0 ? (
      <div className="flex items-center gap-1.5 text-ink-500">
        {visibleAmenities.map((amenity) => {
          const Icon = amenityIcon(amenity)
          return (
            <span
              key={amenity}
              title={amenity}
              className="flex size-6 items-center justify-center rounded-full bg-sky-50"
            >
              <Icon className="size-3.5" />
            </span>
          )
        })}
        {overflowCount > 0 && (
          <span className="text-caption font-medium text-ink-500">+{overflowCount}</span>
        )}
      </div>
    ) : null

  const nameRow = (
    <div className="flex items-baseline gap-2">
      <span className="truncate text-body font-semibold text-ink-900">{name}</span>
      {code && <span className="shrink-0 font-mono text-caption text-ink-500">{code}</span>}
    </div>
  )

  const locationRow = location ? (
    <div className="flex items-center gap-1 text-caption text-ink-500">
      <MapPin className="size-3.5 shrink-0" aria-hidden="true" />
      <span className="truncate">{location}</span>
    </div>
  ) : null

  const capacityRow = (
    <div className="flex items-center gap-1 text-caption text-ink-500">
      <Users className="size-3.5 shrink-0" aria-hidden="true" />
      <span>{capacity ?? "–"}</span>
    </div>
  )

  if (density === "list") {
    return (
      <Link
        href={href ?? `/rooms/${id}`}
        data-slot="room-card"
        className={cn(
          "flex items-stretch gap-3 overflow-hidden rounded-lg border border-line bg-surface shadow-sm transition-colors hover:bg-sky-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300",
          className
        )}
      >
        <div className={cn("w-2 shrink-0", headerColorClassName)} aria-hidden="true" />
        <div className="flex min-w-0 flex-1 flex-col gap-1.5 py-3 pr-4">
          <div className="flex items-center justify-between gap-2">
            {nameRow}
            {availabilityDot}
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {capacityRow}
            {locationRow}
          </div>
          {amenityRow}
        </div>
      </Link>
    )
  }

  return (
    <Link
      href={href ?? `/rooms/${id}`}
      data-slot="room-card"
      className={cn(
        "flex flex-col overflow-hidden rounded-lg border border-line bg-surface shadow-sm transition-shadow hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300",
        className
      )}
    >
      <div className={cn("h-16 w-full", headerColorClassName)} aria-hidden="true" />
      <div className="flex flex-1 flex-col gap-2 p-4">
        <div className="flex items-start justify-between gap-2">
          {nameRow}
          {availabilityDot}
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {capacityRow}
          {locationRow}
        </div>
        {amenityRow}
      </div>
    </Link>
  )
}

export { RoomCard }
export type { RoomCardProps, RoomCardAvailability }
