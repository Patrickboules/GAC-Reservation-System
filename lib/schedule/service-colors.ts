import type { BookingService } from "@/lib/bookings/services";

export interface ServiceColor {
  /** Left-accent border class. */
  accent: string;
  /** Tint background class. */
  tint: string;
}

const SERVICE_COLORS: Record<BookingService, ServiceColor> = {
  Liturgy: { accent: "border-l-violet-500", tint: "bg-violet-50" },
  "Sunday School": { accent: "border-l-amber-500", tint: "bg-amber-50" },
  Meeting: { accent: "border-l-sky-600", tint: "bg-sky-50" },
  "Bible Study": { accent: "border-l-emerald-500", tint: "bg-emerald-50" },
  "Choir Practice": { accent: "border-l-rose-500", tint: "bg-rose-50" },
  "Scouts/Sports Activity": { accent: "border-l-orange-500", tint: "bg-orange-50" },
  "Retreat/Event": { accent: "border-l-teal-500", tint: "bg-teal-50" },
  Maintenance: { accent: "border-l-ink-500", tint: "bg-sand-100" },
};

const DEFAULT_SERVICE_COLOR: ServiceColor = { accent: "border-l-sky-600", tint: "bg-sky-50" };

/** Category color (US-031 event block) for a booking's service/purpose. Falls back to a neutral sky tint. */
export function serviceColor(service?: string | null): ServiceColor {
  if (service && service in SERVICE_COLORS) {
    return SERVICE_COLORS[service as BookingService];
  }
  return DEFAULT_SERVICE_COLOR;
}
