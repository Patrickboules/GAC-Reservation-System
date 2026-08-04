import * as React from "react"
import Link from "next/link"
import {
  Coffee,
  MapPin,
  Mic,
  Monitor,
  MonitorSmartphone,
  ParkingCircle,
  PenSquare,
  Plug,
  Projector,
  Speaker,
  Tag,
  Video,
  Wind,
  Wifi,
} from "lucide-react"

import { StatusBadge } from "@/components/kit/status-badge"
import { cn } from "@/lib/utils"

// Keyed in both English and Arabic since seeded room amenities are Arabic
// (migration 20260801000000) while admins can still type free-text amenities
// (RoomFormSheet has no fixed dropdown) in either language.
const AMENITY_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  wifi: Wifi,
  "wi-fi": Wifi,
  "واي فاي": Wifi,
  "واي-فاي": Wifi,

  projector: Projector,
  بروجيكتور: Projector,
  بروجكتور: Projector,

  whiteboard: PenSquare,
  سبورة: PenSquare,

  "smart display": MonitorSmartphone,
  "شاشة ذكية": MonitorSmartphone,
  screen: Monitor,
  tv: Monitor,
  monitor: Monitor,
  شاشة: Monitor,

  microphone: Mic,
  mic: Mic,
  ميكروفون: Mic,

  speaker: Speaker,
  speakers: Speaker,
  sound: Speaker,
  audio: Speaker,
  صوتيات: Speaker,
  "مكبرات صوت": Speaker,

  "video conferencing": Video,
  video: Video,

  ac: Wind,
  "air conditioning": Wind,
  تكييف: Wind,
  "تكييف هواء": Wind,

  parking: ParkingCircle,
  مواقف: ParkingCircle,
  "موقف سيارات": ParkingCircle,

  coffee: Coffee,
  kitchen: Coffee,

  "power outlets": Plug,
  outlets: Plug,
  مقابس: Plug,
  "مقابس كهرباء": Plug,
}

function amenityIcon(amenity: string) {
  const normalized = amenity.trim().toLowerCase()
  if (AMENITY_ICONS[normalized]) return AMENITY_ICONS[normalized]
  const partialMatch = Object.keys(AMENITY_ICONS).find((key) => normalized.includes(key))
  return partialMatch ? AMENITY_ICONS[partialMatch] : Tag
}

export { amenityIcon }

const MAX_VISIBLE_AMENITIES = 4

type RoomCardAvailability = "free" | "busy"

interface RoomCardProps {
  id: string
  name: string
  code?: string | null
  amenities?: string[] | null
  location?: string | null
  /** Simple availability for a specific searched slot (search-result cards): green pill when free, amber when a pending request already holds it. */
  availability?: RoomCardAvailability
  /** Live "right now" status overriding `availability`'s plain text, e.g. "Free until 3:00 PM" (directory cards). */
  statusText?: string
  /** What's running in the room right now, if anything, e.g. "Bible Study". Omitted when free. */
  nowText?: string | null
  /** The next booking today, if any, e.g. "Bible Study, 3:00 PM–4:00 PM". */
  nextText?: string | null
  /** Header accent color (category color); accepts any Tailwind bg-* class. */
  headerColorClassName?: string
  density?: "grid" | "list"
  href?: string
  /** When provided, adds a footer "Reserve" action linking here (directory cards only). */
  reserveHref?: string
  /** Highlights the card as the current pick, e.g. in a search-result list. */
  selected?: boolean
  onClick?: () => void
  className?: string
}

function RoomCard({
  id,
  name,
  code,
  amenities,
  location,
  availability,
  statusText,
  nowText,
  nextText,
  headerColorClassName = "bg-sky-600",
  density = "grid",
  href,
  reserveHref,
  selected = false,
  onClick,
  className,
}: RoomCardProps) {
  const visibleAmenities = (amenities ?? []).slice(0, MAX_VISIBLE_AMENITIES)
  const overflowCount = (amenities?.length ?? 0) - visibleAmenities.length

  const isFree = statusText ? statusText.toLowerCase().startsWith("free") : availability === "free"
  const pillLabel = statusText ?? (availability === "free" ? "Free" : availability === "busy" ? "Busy now" : null)

  const availabilityPill = pillLabel ? (
    <StatusBadge
      status={isFree ? "approved" : "pending"}
      label={pillLabel}
      className="shrink-0 whitespace-nowrap"
    />
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
    <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
      <span className="text-body font-semibold text-ink-900">{name}</span>
      {code && <span className="shrink-0 font-mono text-caption text-ink-500">{code}</span>}
    </div>
  )

  const locationRow = location ? (
    <div className="flex items-center gap-1 text-caption text-ink-500">
      <MapPin className="size-3.5 shrink-0" aria-hidden="true" />
      <span className="truncate">{location}</span>
    </div>
  ) : null

  const targetHref = href ?? `/rooms/${id}`

  if (density === "list") {
    return (
      <Link
        href={targetHref}
        onClick={onClick}
        data-slot="room-card"
        className={cn(
          "flex items-stretch gap-3 overflow-hidden rounded-lg border bg-surface shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300",
          selected ? "border-sky-600 ring-2 ring-sky-100" : "border-line",
          className
        )}
      >
        <div className={cn("w-1.5 shrink-0", headerColorClassName)} aria-hidden="true" />
        <div className="flex min-w-0 flex-1 flex-col gap-1.5 py-3 pr-4">
          <div className="flex items-center justify-between gap-2">
            {nameRow}
            {availabilityPill}
          </div>
          {locationRow && <div className="flex flex-wrap items-center gap-3">{locationRow}</div>}
          {amenityRow}
        </div>
      </Link>
    )
  }

  const metaRow = nowText || nextText ? (
    <div className="flex flex-col gap-0.5 text-caption text-ink-500">
      {nowText && (
        <span>
          Now: <span className="font-medium text-ink-700">{nowText}</span>
        </span>
      )}
      {nextText && (
        <span>
          Next: <span className="font-medium text-ink-700">{nextText}</span>
        </span>
      )}
    </div>
  ) : null

  return (
    <div
      data-slot="room-card"
      className={cn(
        "group relative flex flex-col overflow-hidden rounded-lg border bg-surface shadow-sm transition-all",
        selected ? "border-sky-600 ring-2 ring-sky-100 shadow-md" : "border-line hover:-translate-y-0.5 hover:shadow-md",
        className
      )}
    >
      <div className={cn("h-1.5 w-full", headerColorClassName)} aria-hidden="true" />
      <div className="flex flex-1 flex-col gap-2.5 p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            {nameRow}
            {locationRow}
          </div>
          {availabilityPill}
        </div>
        {metaRow}
        {amenityRow}
      </div>

      {/* Stretched link: the whole card (minus the footer actions, which sit
          above it via z-10) navigates to the room's detail page. */}
      <Link
        href={targetHref}
        onClick={onClick}
        aria-label={`View ${name}`}
        className="absolute inset-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-sky-300"
      />

      {reserveHref && (
        <div className="relative z-10 border-t border-line p-3">
          <Link
            href={reserveHref}
            className="block rounded-md bg-sky-600 px-3 py-2 text-center text-small font-medium text-white transition-colors hover:bg-sky-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300"
          >
            Reserve
          </Link>
        </div>
      )}
    </div>
  )
}

export { RoomCard }
export type { RoomCardProps, RoomCardAvailability }
