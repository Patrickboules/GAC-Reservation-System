/** Server-enforced cap on a member's simultaneously open pending requests. */
export const MAX_OPEN_PENDING_BOOKINGS = 5;

/** Latest time-of-day (minutes since midnight) a booking's end_time may be —
 * 22:30 (10:30 PM). No booking's start or end may run later than this;
 * enforced in the time-range picker (components/kit/time-range-picker.tsx),
 * the next-free-slot suggestion (lib/bookings/next-free-slot.ts), and
 * server-side in app/(app)/bookings/actions.ts's requestBooking/updateBooking. */
export const LATEST_BOOKING_END_MINUTES = 22 * 60 + 30;
