/** Fixed service/purpose list for booking requests (FR-9). Not admin-editable in v1. */
export const BOOKING_SERVICES = [
  "Liturgy",
  "Sunday School",
  "Meeting",
  "Bible Study",
  "Choir Practice",
  "Scouts/Sports Activity",
  "Retreat/Event",
  "Maintenance",
] as const;

export type BookingService = (typeof BOOKING_SERVICES)[number];

export function isBookingService(value: string): value is BookingService {
  return (BOOKING_SERVICES as readonly string[]).includes(value);
}
