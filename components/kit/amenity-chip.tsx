import { amenityIcon } from "@/components/kit/room-card"
import { cn } from "@/lib/utils"

interface AmenityChipProps {
  amenity: string
  className?: string
}

/** Read-only amenity pill: icon-in-circle + label. Distinct from FilterChip,
 * which is a Toggle-backed selection control — this is purely informational,
 * so it stays a plain span with no interactive semantics. */
function AmenityChip({ amenity, className }: AmenityChipProps) {
  const Icon = amenityIcon(amenity)
  return (
    <span
      className={cn(
        "group inline-flex items-center gap-2 rounded-full border border-line bg-white py-1 pr-3.5 pl-1 text-small font-medium text-ink-700 transition-all duration-150 hover:-translate-y-0.5 hover:border-sky-200 hover:bg-sky-50 hover:shadow-sm",
        className
      )}
    >
      <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-sky-50 text-sky-700 transition-colors group-hover:bg-sky-100">
        <Icon className="size-3.5" aria-hidden="true" />
      </span>
      <span className="truncate">{amenity}</span>
    </span>
  )
}

export { AmenityChip }
export type { AmenityChipProps }
